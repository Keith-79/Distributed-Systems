const kafka = require("kafka-node");

/**
 * Setup Script - Creates required Kafka topics
 */

console.log("🔧 Setting up Kafka topics...\n");

const client = new kafka.KafkaClient({ kafkaHost: "localhost:9092" });
const admin = new kafka.Admin(client);

const topics = [
  {
    topic: "request_topic",
    partitions: 1,
    replicationFactor: 1
  },
  {
    topic: "response_topic",
    partitions: 1,
    replicationFactor: 1
  }
];

admin.createTopics(topics, (err, result) => {
  if (err) {
    if (err.message && err.message.includes("already exists")) {
      console.log("✓ Topics already exist");
    } else {
      console.error("✗ Error creating topics:", err);
    }
  } else {
    console.log("✓ Topics created successfully:");
    topics.forEach(t => console.log(`  - ${t.topic}`));
  }
  
  console.log("\n📋 Listing all topics...");
  
  admin.listTopics((err, res) => {
    if (err) {
      console.error("✗ Error listing topics:", err);
    } else {
      console.log("\nAvailable topics:");
      const topicList = res[1].metadata;
      Object.keys(topicList).forEach(topic => {
        console.log(`  - ${topic}`);
      });
    }
    
    console.log("\n✅ Setup complete!");
    process.exit(0);
  });
});