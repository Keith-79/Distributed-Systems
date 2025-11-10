import redis
import requests
import numpy as np
import json
import time
import re
from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity
from typing import Dict, List, Tuple, Optional

class SemanticCache:
    def __init__(self, redis_host="localhost", redis_port=6380, similarity_threshold=0.85):
        """Initialize semantic cache with Redis and embedding model"""
        self.redis_client = redis.Redis(host=redis_host, port=redis_port, decode_responses=False)  
        self.similarity_threshold = similarity_threshold
        self.ollama_url = "http://localhost:11434"
        
        # Initialize sentence transformer for embeddings
        print("Loading embedding model...")
        self.embedding_model = SentenceTransformer('all-MiniLM-L6-v2')  
        print("✓ Embedding model loaded")
        
        # Test connections
        try:
            self.redis_client.ping()
            print("✓ Connected to Redis successfully")
        except redis.ConnectionError:
            print("✗ Failed to connect to Redis!")
            raise
    
    def _normalize_query(self, text: str) -> str:
        """Normalize query text for better matching"""
        t = (text or "").lower()
        # Common abbreviation expansions
        t = t.replace("nyc", "new york").replace("la", "los angeles")
        t = t.replace("s.f.", "san francisco").replace("sf", "san francisco")
        # Remove punctuation
        t = re.sub(r"[^\w\s]", " ", t)
        # Normalize whitespace
        t = re.sub(r"\s+", " ", t).strip()
        return t
    
    def _get_embedding(self, text: str) -> np.ndarray:
        """Get embedding vector for text using SentenceTransformer"""
        # Normalize the text before embedding
        normalized_text = self._normalize_query(text)
        embedding = self.embedding_model.encode([normalized_text])
        return embedding[0]
    
    def _vector_to_bytes(self, vector: np.ndarray) -> bytes:
        """Convert numpy vector to bytes for Redis storage"""
        return vector.astype(np.float32).tobytes()
    
    def _bytes_to_vector(self, vector_bytes: bytes) -> np.ndarray:
        """Convert bytes back to numpy vector"""
        return np.frombuffer(vector_bytes, dtype=np.float32)
    
    def _search_similar_queries(self, query_embedding: np.ndarray, top_k: int = 5) -> List[Dict]:
        """Search for semantically similar cached queries using manual similarity calculation"""
        try:
            # Get all cached keys
            keys = self.redis_client.keys(b"cache:*")
            
            if not keys:
                return []
            
            similarities = []
            
            for key in keys:
                # Get the stored data
                cached_data = self.redis_client.hgetall(key)
                
                if b'embedding' in cached_data and b'query' in cached_data and b'response' in cached_data:
                    # Convert stored embedding back to vector
                    cached_embedding = self._bytes_to_vector(cached_data[b'embedding'])
                    
                    # Calculate cosine similarity
                    similarity = cosine_similarity(
                        query_embedding.reshape(1, -1),
                        cached_embedding.reshape(1, -1)
                    )[0][0]
                    
                    similarities.append({
                        'key': key.decode('utf-8'),
                        'query': cached_data[b'query'].decode('utf-8'),
                        'response': cached_data[b'response'].decode('utf-8'),
                        'similarity': float(similarity),
                        'timestamp': cached_data.get(b'timestamp', b'').decode('utf-8')
                    })
            
            # Sort by similarity (highest first)
            similarities.sort(key=lambda x: x['similarity'], reverse=True)
            
            return similarities[:top_k]
            
        except Exception as e:
            print(f"Error in similarity search: {e}")
            import traceback
            traceback.print_exc()
            return []
    
    def _call_ollama(self, query: str, model: str = "llama3.1:latest") -> str:
        """Make a request to Ollama LLM"""
        try:
            # First check if Ollama is running
            health_check = requests.get(f"{self.ollama_url}/api/tags", timeout=5)
            if health_check.status_code != 200:
                return "Error: Ollama service is not running. Please start with 'ollama serve'"
            
            response = requests.post(
                f"{self.ollama_url}/api/generate",
                json={
                    "model": model,
                    "prompt": query,
                    "stream": False
                },
                timeout=60
            )
            
            if response.status_code == 200:
                return response.json()['response'].strip()
            else:
                return f"Error: Ollama returned status {response.status_code}"

        except requests.exceptions.ConnectionError:
            return "Error: Cannot connect to Ollama. Please start with 'ollama serve'"
        except Exception as e:
            return f"Error calling Ollama: {str(e)}"
    
    def _store_in_cache(self, query: str, response: str, query_embedding: np.ndarray):
        """Store query and response in Redis with vector embedding"""
        cache_key = f"cache:{int(time.time() * 1000000)}"  
        
        # Store in Redis hash with binary data
        self.redis_client.hset(cache_key, mapping={
            b"query": query.encode('utf-8'),
            b"response": response.encode('utf-8'),
            b"embedding": self._vector_to_bytes(query_embedding),
            b"timestamp": str(int(time.time())).encode('utf-8')
        })
    
    def query(self, user_query: str) -> Tuple[str, bool, float, float]:
        """
        Main query function with semantic caching
        Returns: (response, is_cached, similarity_score, response_time)
        """
        start_time = time.time()
        
        # Get embedding for the query
        query_embedding = self._get_embedding(user_query)
        
        # Search for similar cached queries
        similar_queries = self._search_similar_queries(query_embedding)
        
        # Check if we have a cache hit above threshold
        if similar_queries and similar_queries[0]['similarity'] >= self.similarity_threshold:
            best_match = similar_queries[0]
            response_time = time.time() - start_time
            
            print(f"✓ CACHE HIT - Similarity: {best_match['similarity']:.3f}")
            print(f"   Original query: '{best_match['query']}'")
            print(f"   Current query:  '{user_query}'")
            
            return best_match['response'], True, best_match['similarity'], response_time
        
        else:
            best_similarity = similar_queries[0]['similarity'] if similar_queries else 0.0
            print(f"✗ CACHE MISS - Best similarity: {best_similarity:.3f}")            
            
            # Call Ollama LLM
            llm_start = time.time()
            response = self._call_ollama(user_query)
            llm_time = time.time() - llm_start
            
            # Store in cache for future use
            self._store_in_cache(user_query, response, query_embedding)
            print(f"   Stored in cache")
            print(f"   Ollama response time: {llm_time:.3f}s")
            
            total_time = time.time() - start_time
            
            return response, False, 0.0, total_time
    
    def get_cache_stats(self) -> Dict:
        """Get cache statistics"""
        try:
            # Count cached items
            keys = self.redis_client.keys(b"cache:*")
            cache_count = len(keys)
            
            info = self.redis_client.info()
            
            return {
                "cached_queries": cache_count,
                "redis_memory": info.get("used_memory_human", "N/A"),
                "total_connections": info.get("total_connections_received", "N/A")
            }
        except Exception as e:
            return {"error": str(e)}
    
    def clear_cache(self):
        """Clear all cached data"""
        try:
            keys = self.redis_client.keys(b"cache:*")
            if keys:
                self.redis_client.delete(*keys)
                print(f"✓ Cleared {len(keys)} cached queries")
            else:
                print("✓ Cache was already empty")
        except Exception as e:
            print(f"Error clearing cache: {e}")


def test_semantic_cache():
    """Test the semantic caching system with diverse queries"""
    print("=" * 80)
    print("SEMANTIC CACHE TESTING WITH OLLAMA")
    print("=" * 80)
    
    # Initialize cache
    cache = SemanticCache()
    cache.clear_cache()
    
    # Test queries 
    test_queries = [
        # Original queries
        "Who won the FIFA World Cup in 2022?",
        "Explain how airplanes fly?",
        "What causes earthquakes?",

        # Exact duplicates (should be cache hits)
        "Who won the FIFA World Cup in 2022?",
        "What causes earthquakes?",

        # Paraphrased queries (semantic hits expected)
        "Which country won the 2022 World Cup?",
        "How does an airplane stay in the air?",
        "Why do earthquakes happen?",

        # Completely new queries (cache misses)
        "Who painted the Mona Lisa?",
        "What is the capital of Iceland?"
    ]
    
    results = []
    cache_hits = 0
    total_queries = len(test_queries)
    
    print(f"\n🔍 Testing with {total_queries} diverse queries...\n")
    
    for i, query in enumerate(test_queries, 1):
        print(f"\n{'='*80}")
        print(f"Query {i:2d}: {query}")
        print('-'*80)
        
        response, is_cached, similarity, response_time = cache.query(query)
        
        if is_cached:
            cache_hits += 1
            status = " CACHED"
        else:
            status = " OLLAMA"
        
        print(f"\n{status} | Time: {response_time:.3f}s")
        print(f"Response: {response[:150]}...")
        
        results.append({
            'query': query,
            'is_cached': is_cached,
            'similarity': similarity,
            'response_time': response_time,
            'response_length': len(response)
        })
        
        # Small delay to make output readable
        time.sleep(0.3)
    
    # Calculate performance metrics
    cache_hit_rate = (cache_hits / total_queries) * 100
    cached_times = [r['response_time'] for r in results if r['is_cached']]
    ollama_times = [r['response_time'] for r in results if not r['is_cached']]
    
    avg_cached_time = np.mean(cached_times) if cached_times else 0
    avg_ollama_time = np.mean(ollama_times) if ollama_times else 0
    speedup = avg_ollama_time / avg_cached_time if avg_cached_time > 0 else 1
    
    # Print results
    print("\n" + "=" * 80)
    print(" PERFORMANCE RESULTS")
    print("=" * 80)
    print(f"Total queries:        {total_queries}")
    print(f"Cache hits:           {cache_hits}")
    print(f"Cache misses:         {total_queries - cache_hits}")
    print(f"Cache hit rate:       {cache_hit_rate:.1f}%")
    print(f"\nTiming:")
    print(f"  Avg cached time:    {avg_cached_time:.3f}s")
    print(f"  Avg Ollama time:    {avg_ollama_time:.3f}s") 
    print(f"  Speed improvement:  {speedup:.1f}x faster")
    
    # Cache statistics
    stats = cache.get_cache_stats()
    print(f"\n Cache Stats:")
    for key, value in stats.items():
        print(f"  {key}: {value}")
    
    print(f"\n Test completed! Cache hit rate: {cache_hit_rate:.1f}%")
    print("=" * 80)
    
    return results


if __name__ == "__main__":
    test_semantic_cache()