#!/usr/bin/env python3
# agents_demo.py — Two tiny agents (Planner, Reviewer) + Finalizer using a local Ollama model via LangChain.
# Python 3.11/3.12. Requires:
#   pip install langchain langchain-ollama
#   ollama pull smollm:1.7b   (or: ollama pull phi3:mini)

from __future__ import annotations
import argparse, json, re, sys, time
from dataclasses import dataclass
from typing import List
from collections import Counter
from datetime import datetime,timezone 


try:
    from langchain_ollama import ChatOllama
    from langchain_core.messages import SystemMessage, HumanMessage
except Exception:
    print("ERROR: install LangChain packages: pip install langchain langchain-ollama", file=sys.stderr)
    raise


STOPWORDS = {
    "the","a","an","and","or","for","to","of","in","on","with","by","at","is","are","be","this","that",
    "it","as","from","into","about","over","under","after","before","between","within","without","we",
    "you","they","i","our","your","their","using","use","used","via","how","what","why","when"
}

def sanitize_tag(tag: str) -> str:
    t = str(tag).strip().lower()
    t = t.replace("_", " ")
    t = re.sub(r"^[#\s]+", "", t)
    t = re.sub(r"[^a-z0-9\s\-&/]", "", t)
    t = re.sub(r"\s+", " ", t).strip()
    return t

def strip_placeholder_tags(tags):
    bad = {"tag","tag1","tag2","tag3","category","topic","placeholder"}
    keep = []
    for t in tags or []:
        s = sanitize_tag(t)
        if s and s not in bad and not re.fullmatch(r"tag\d*", s):
            keep.append(s)
    return keep

def is_placeholder_summary(s: str) -> bool:
    if not s: return True
    s = s.strip().lower()
    return s in {"...", "tbd", "summary"}

def enforce_summary_limit(summary: str, limit: int = 25) -> str:
    s = " ".join(summary.strip().split())
    words = re.findall(r"\b\w+\b", s)
    if len(words) > limit:
        s = " ".join(words[:limit])
    s = re.sub(r"\b(and|or|of|to|in|on|with|by|for|as|the|a|an)$", "", s).strip()
    return s + ("" if s.endswith((".", "!", "?")) else ".")

def _valid_phrase(p: str) -> bool:
    w = p.split()
    if len(w) < 2:
        return False
    for tok in w:
        if tok in STOPWORDS or len(tok) < 3:
            return False
    return True

from collections import Counter

from collections import Counter, defaultdict

def extract_phrases_from_text(text: str, max_phrases: int = 50) -> list[str]:
    text = (text or "").lower()
    sentences = re.split(r"[.!?]+|\n+", text)

    cnt2, cnt3 = Counter(), Counter()
    next_after = defaultdict(Counter)  

    for sent in sentences:
        toks = [w for w in re.findall(r"[a-zA-Z0-9]+", sent)]
        run, runs = [], []
        for w in toks:
            if w not in STOPWORDS and len(w) >= 3:
                run.append(w)
            else:
                if len(run) >= 2: runs.append(run[:])
                run = []
        if len(run) >= 2: runs.append(run)

        for r in runs:
            for i in range(len(r) - 1):
                b = f"{r[i]} {r[i+1]}"
                cnt2[b] += 1
                if i + 2 < len(r):
                    next_after[b][r[i+2]] += 1
            for i in range(len(r) - 2):
                t = f"{r[i]} {r[i+1]} {r[i+2]}"
                cnt3[t] += 1

    def ok(p: str) -> bool:
        ws = p.split()
        if len(ws) < 2: return False
        return all((w not in STOPWORDS and len(w) >= 3) for w in ws)

    def verbish_bigram(b: str) -> bool:
        last = b.split()[-1]
        short_verbish = (len(last) <= 5) and (last.endswith("s") or last.endswith("ed") or last.endswith("ing"))
        if not short_verbish:
            return False
        followers = next_after.get(b, {})
        return any(tok in STOPWORDS for tok in followers)

    pruned3 = Counter()
    for tri, c in cnt3.items():
        if not ok(tri): continue
        w = tri.split()
        first2 = f"{w[0]} {w[1]}"
        last2  = f"{w[1]} {w[2]}"
        if cnt2[first2] >= c or cnt2[last2] >= c:
            continue
        pruned3[tri] = c

 
    valid2 = Counter({b:c for b,c in cnt2.items() if ok(b) and not verbish_bigram(b)})

    ordered = [p for p,_ in pruned3.most_common()] + [p for p,_ in valid2.most_common()]

    out, seen = [], set()
    for p in ordered:
        if p not in seen:
            seen.add(p); out.append(p)
        if len(out) >= max_phrases:
            break
    return out


def _upgrade_single_words_to_phrases(cleaned: list[str], phrases: list[str]) -> list[str]:
    seen = set(cleaned)
    for i, t in enumerate(list(cleaned)):
        if " " not in t:
            for p in phrases:
                if re.search(rf"\b{re.escape(t)}\b", p) and p not in seen:
                    cleaned[i] = p
                    seen.add(p)
                    break
    return cleaned

def enforce_three_tags(tags: List[str], title: str, content: str) -> List[str]:
    fulltext = f"{title} {content}".lower()

    cleaned, seen = [], set()
    for t in tags or []:
        s = sanitize_tag(t)
        if s and s in fulltext and s not in seen:
            cleaned.append(s); seen.add(s)

    phr_title = extract_phrases_from_text(title, max_phrases=50)
    phr_content = extract_phrases_from_text(content, max_phrases=50)
    phrases = []
    for p in (phr_content + phr_title):
        if p not in phrases:
            phrases.append(p)

    cleaned = _upgrade_single_words_to_phrases(cleaned, phrases)
    cleaned = [t for t in cleaned if " " in t]
    seen = set(cleaned)

    for p in phrases:
        if len(cleaned) >= 3: break
        if p not in seen:
            cleaned.append(p); seen.add(p)

    if len(cleaned) < 3:
        toks = [w.lower() for w in re.findall(r"[a-zA-Z0-9]+", fulltext)]
        chosen_words = set()
        for ph in cleaned:
            chosen_words.update(ph.split())
        cntw = Counter([w for w in toks if len(w) > 3 and w not in STOPWORDS and w not in chosen_words])
        for w, _ in cntw.most_common(50):
            if len(cleaned) >= 3: break
            if w not in seen:
                cleaned.append(w); seen.add(w)

    for g in ("concepts","overview","techniques"):
        if len(cleaned) >= 3: break
        if g not in seen:
            cleaned.append(g); seen.add(g)

    return cleaned[:3]

PLANNER_SYSTEM = (
    "You are Planner. Given a blog title and content, produce exactly three topical tags and a concise one-sentence summary.\n"
    "- Tags: lowercase, 2–3 word noun phrases drawn verbatim from the title/content; use spaces (no underscores); no hashtags; no duplicates; no punctuation; avoid single words unless no phrases exist in the text.\n"
    "- Summary: 12–25 words, one sentence, specific, based only on the provided text.\n"
    "Return ONE JSON object only (no prose, no code fences): "
    "{\"tags\": [\"tag1\",\"tag2\",\"tag3\"], \"summary_draft\": \"...\"}\n"
    "Never use placeholders."
)

REVIEWER_SYSTEM = (
    "You are Reviewer. Validate the Planner JSON against the title+content.\n"
    "Checks: relevance; exactly 3 tags; lowercase; from the text; no hashtags; no duplicates; summary <= 25 words; clarity.\n"
    "If changes are needed, provide corrected fields.\n"
    "Return ONE JSON object only (no prose, no code fences):\n"
    "{\n"
    "  \"approved\": true|false,\n"
    "  \"changed\": true|false,\n"
    "  \"reasons\": \"short explanation\",\n"
    "  \"suggested_tags\": [\"tag1\",\"tag2\",\"tag3\"],\n"
    "  \"suggested_summary\": \"...\"\n"
    "}\n"
    "Set changed=true if your suggested tags/summary differ from Planner's, else false."
)

def ask_llm_json(llm, system_prompt: str, user_prompt: str) -> dict:
    resp = llm.invoke([
        SystemMessage(content=system_prompt),
        HumanMessage(content=user_prompt),
    ])
    content = getattr(resp, "content", str(resp))
    start = content.find("{")
    if start == -1:
        raise ValueError("Model did not return JSON.")
    depth = 0; end = None
    for i, ch in enumerate(content[start:], start):
        if ch == "{": depth += 1
        elif ch == "}":
            depth -= 1
            if depth == 0:
                end = i + 1; break
    if end is None:
        raise ValueError("JSON object not closed.")
    return json.loads(content[start:end])

def build_user_block_for_planner(title: str, content: str) -> str:
    snippet = content.strip()
    if len(snippet) > 5000: snippet = snippet[:5000]
    return f"Title:\n{title}\n\nContent:\n{snippet}\n\nReturn JSON only."

def build_user_block_for_reviewer(title: str, content: str, planner_json: dict) -> str:
    snippet = content.strip()
    if len(snippet) > 4500: snippet = snippet[:4500]
    return (
        f"Title:\n{title}\n\nContent:\n{snippet}\n\n"
        f"Planner JSON:\n{json.dumps(planner_json, ensure_ascii=False)}\n\n"
        "Return JSON only."
    )

def normalize_tags_for_compare(tags):
    return [sanitize_tag(t) for t in (tags or [])]

def compute_changed(planner: dict, reviewer: dict) -> dict:
    def norm(tags): return [sanitize_tag(t) for t in (tags or [])]
    p_tags = norm(planner.get("tags", []))
    p_sum  = (planner.get("summary_draft") or "").strip()
    r_tags = norm(reviewer.get("suggested_tags", []))
    r_sum  = (reviewer.get("suggested_summary") or "").strip()

    changed = False
    if reviewer.get("approved") is False: changed = True
    if r_tags and r_tags != p_tags:       changed = True
    if r_sum and r_sum != p_sum:          changed = True

    reviewer["changed"] = reviewer.get("changed", changed)
    return reviewer


@dataclass
class FinalResult:
    tags: List[str]
    summary: str

def finalize(planner: dict, reviewer: dict, title: str, content: str) -> FinalResult:
    tags = strip_placeholder_tags(planner.get("tags", []))
    summary = (planner.get("summary_draft") or "").strip()
    if is_placeholder_summary(summary):
        summary = ""

    if (reviewer.get("approved") is False) or reviewer.get("changed", False):
        r_tags = strip_placeholder_tags(reviewer.get("suggested_tags", []))
        if r_tags:
            tags = r_tags
        r_sum = (reviewer.get("suggested_summary") or "").strip()
        if r_sum and not is_placeholder_summary(r_sum):
            summary = r_sum

    tags = enforce_three_tags(tags, title, content)
    summary = enforce_summary_limit(summary if summary else title, 25)
    return FinalResult(tags=tags, summary=summary)

def make_agent_view(role: str, title: str, content: str, tags: list[str], summary: str) -> dict:
    key = ", ".join(tags[:2]) if tags else ""
    title_l = title.strip().rstrip(".")
    if role == "Planner":
        thought = f"The blog post discusses {title_l}."
    elif role == "Reviewer":
        thought = f"Validated tags and summary; focus on {key}."
    else:  
        thought = f"Finalized tags and a concise summary for {title_l}."
    message = summary if summary else f"Summary for: {title_l}"
    return {
        "thought": thought,
        "message": message,
        "data": {"tags": tags, "summary": summary},
        "issues": []
    }

def main():
    ap = argparse.ArgumentParser(description="Planner → Reviewer → Finalizer using local Ollama via LangChain.")
    ap.add_argument("--model", default="smollm:1.7b", help="Ollama model (e.g., smollm:1.7b or phi3:mini)")
    ap.add_argument("--title", required=True, help="Blog title")
    group = ap.add_mutually_exclusive_group(required=True)
    group.add_argument("--content", help="Blog content (string)")
    group.add_argument("--content-file", help="Path to a text file with blog content")
    ap.add_argument("--base_url", default="http://localhost:11434", help="Ollama API base URL")
    ap.add_argument("--num_ctx", type=int, default=2048, help="Context window")
    ap.add_argument("--temperature", type=float, default=0.2, help="LLM temperature")
    ap.add_argument("--email", default="", help="Email to include in Publish Package")
    ap.add_argument("--strict", action="store_true", help="Print sections matching the sample run formatting")
    args = ap.parse_args()

    if args.content_file:
        try:
            with open(args.content_file, "r", encoding="utf-8") as f:
                content = f.read()
        except Exception as e:
            print(f"ERROR: could not read --content-file: {e}", file=sys.stderr)
            sys.exit(2)
    else:
        content = args.content or ""

    llm = ChatOllama(
        model=args.model,
        temperature=args.temperature,
        base_url=args.base_url,
        num_ctx=args.num_ctx,
        format="json",
    )

    # --- Planner ---
    t0 = time.perf_counter()
    planner_user = build_user_block_for_planner(args.title, content)
    planner_json = ask_llm_json(llm, PLANNER_SYSTEM, planner_user)
    t1 = time.perf_counter()

    # --- Reviewer ---
    rev_user = build_user_block_for_reviewer(args.title, content, planner_json)
    reviewer_json = ask_llm_json(llm, REVIEWER_SYSTEM, rev_user)
    reviewer_json = compute_changed(planner_json, reviewer_json)
    t2 = time.perf_counter()

    # --- Finalize ---
    final = finalize(planner_json, reviewer_json, args.title, content)
    publish = {"tags": final.tags, "summary": final.summary}

    if args.strict:
        print(f"--- Planner ({int((t1 - t0)*1000)} ms) ---")
        planner_view = make_agent_view("Planner", args.title, content,
                               planner_json.get("tags") or final.tags,
                               planner_json.get("summary_draft","") or final.summary)
        print(json.dumps(planner_view, ensure_ascii=False, indent=2))

        print(f"\n--- Reviewer ({int((t2 - t1)*1000)} ms) ---")
        rev_tags = reviewer_json.get("suggested_tags") or planner_json.get("tags") or final.tags
        rsum = reviewer_json.get("suggested_summary") or reviewer_json.get("suggested end summary")
        rev_sum = rsum or planner_json.get("summary_draft","") or final.summary
        reviewer_view = make_agent_view("Reviewer", args.title, content, rev_tags, rev_sum)
        print(json.dumps(reviewer_view, ensure_ascii=False, indent=2))

        print("\n=== Finalized Output ===")
        finalized_view = make_agent_view("Final", args.title, content, final.tags, final.summary)
        print(json.dumps(finalized_view, ensure_ascii=False, indent=2))

        print("\n=== Publish Package ===")
        dt = datetime.now(timezone.utc).replace(microsecond=0)
        package = {
            "title": args.title,
            "email": args.email,
            "content": content.strip(),
            "agents": [
                {"role": "Planner",  "content": planner_view["message"]},
                {"role": "Reviewer", "content": reviewer_view["message"]},
            ],
            "final": {
                "tags": final.tags,
                "summary": final.summary,
                "issues": []
            },
            "submissionDate": dt.isoformat().replace("+00:00", "Z")
        }
        print(json.dumps(package, ensure_ascii=False, indent=2))
    else:
        print("=== Planner (raw) ===")
        print(json.dumps(planner_json, ensure_ascii=False, indent=2))
        print("\n=== Reviewer (raw) ===")
        print(json.dumps(reviewer_json, ensure_ascii=False, indent=2))

    print("\n=== Publish (strict JSON) ===")
    print(json.dumps(publish, ensure_ascii=False))

if __name__ == "__main__":
    main()
