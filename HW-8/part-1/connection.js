const kafka = require("kafka-node");

/**
 * Kafka Connection Provider
 * Manages Kafka client, producer, and consumer connections
 */
function ConnectionProvider() {
  this.kafkaHost = "localhost:9092";
  
  /**
   * Get or create a Kafka consumer for a specific topic
   */
  this.getConsumer = function (topicName) {
    const client = new kafka.KafkaClient({ kafkaHost: this.kafkaHost });
    
    const consumer = new kafka.Consumer(
      client,
      [{ topic: topicName, partition: 0 }],
      {
        autoCommit: true,
        fetchMaxWaitMs: 1000,
        fetchMaxBytes: 1024 * 1024
      }
    );

    client.on("ready", function () {
      console.log(`Consumer connected to Kafka at ${this.kafkaHost}`);
    });

    client.on("error", function (err) {
      console.error("Consumer client error:", err);
    });

    return consumer;
  };

  /**
   * Get or create a Kafka producer (singleton pattern)
   */
  this.getProducer = function () {
    if (!this.kafkaProducerConnection) {
      const client = new kafka.KafkaClient({ kafkaHost: this.kafkaHost });
      
      this.kafkaProducerConnection = new kafka.HighLevelProducer(client);

      this.kafkaProducerConnection.on("ready", function () {
        console.log("Producer connected and ready");
      });

      this.kafkaProducerConnection.on("error", function (err) {
        console.error("Producer error:", err);
      });
    }
    return this.kafkaProducerConnection;
  };
}

module.exports = new ConnectionProvider();