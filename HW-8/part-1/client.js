const RPC = require("./rpc");

/**
 * Client wrapper for making Kafka RPC requests
 */
class KafkaClient {
  constructor() {
    this.rpc = new RPC();
  }

  /**
   * Make a request to Kafka
   * @param {string} queueName - Topic name to send request to
   * @param {object} payload - Request data
   * @param {function} callback - Callback (error, response)
   */
  makeRequest(queueName, payload, callback) {
    console.log(`📤 Making request to queue: ${queueName}`);
    console.log("📦 Payload:", JSON.stringify(payload, null, 2));
    
    this.rpc.makeRequest(queueName, payload, function (error, response) {
      if (error) {
        console.error("❌ Request failed:", error.message);
        callback(error, null);
      } else {
        console.log("✅ Request successful");
        console.log("📥 Response:", JSON.stringify(response, null, 2));
        callback(null, response);
      }
    });
  }
}

module.exports = KafkaClient;