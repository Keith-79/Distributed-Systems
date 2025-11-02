const crypto = require("crypto");
const connection = require("./connection");

const TIMEOUT = 8000; // 8 seconds timeout for responses

/**
 * Kafka RPC Implementation
 * Implements request-response pattern over Kafka using correlation IDs
 */
function KafkaRPC() {
  this.connection = connection;
  this.requests = {}; // Store pending requests
  this.responseQueueReady = false;
  this.producer = this.connection.getProducer();
}

/**
 * Make an RPC request to Kafka
 * @param {string} topicName - The topic to send request to
 * @param {object} content - The request payload
 * @param {function} callback - Callback function (err, response)
 */
KafkaRPC.prototype.makeRequest = function (topicName, content, callback) {
  const self = this;
  
  // Generate unique correlation ID for this request
  const correlationId = crypto.randomBytes(16).toString("hex");
  
  // Set up timeout handler
  const timeoutId = setTimeout(
    function (corrId) {
      console.log(`Request ${corrId} timed out after ${TIMEOUT}ms`);
      callback(new Error(`Request timeout: ${corrId}`), null);
      delete self.requests[corrId];
    },
    TIMEOUT,
    correlationId
  );
  
  // Store request details
  const requestEntry = {
    callback: callback,
    timeout: timeoutId
  };
  
  self.requests[correlationId] = requestEntry;
  
  // Ensure response queue is set up before sending
  self.setupResponseQueue(function () {
    const payload = [
      {
        topic: topicName,
        messages: JSON.stringify({
          correlationId: correlationId,
          replyTo: "response_topic",
          data: content,
          timestamp: new Date().toISOString()
        }),
        partition: 0
      }
    ];
    
    console.log(`Sending request ${correlationId} to topic: ${topicName}`);
    
    self.producer.send(payload, function (err, data) {
      if (err) {
        console.error("Error sending request:", err);
        clearTimeout(timeoutId);
        delete self.requests[correlationId];
        callback(err, null);
      } else {
        console.log(`Request ${correlationId} sent successfully`);
      }
    });
  });
};

/**
 * Set up the response queue consumer (only once)
 */
KafkaRPC.prototype.setupResponseQueue = function (next) {
  if (this.responseQueueReady) {
    return next();
  }
  
  const self = this;
  
  console.log("Setting up response queue consumer...");
  
  const consumer = self.connection.getConsumer("response_topic");
  
  consumer.on("message", function (message) {
    try {
      const response = JSON.parse(message.value);
      const correlationId = response.correlationId;
      
      console.log(`Received response for ${correlationId}`);
      
      // Check if this is a response to a pending request
      if (correlationId in self.requests) {
        const entry = self.requests[correlationId];
        
        // Clear timeout
        clearTimeout(entry.timeout);
        
        // Remove from pending requests
        delete self.requests[correlationId];
        
        // Call the original callback
        if (response.error) {
          entry.callback(new Error(response.error), null);
        } else {
          entry.callback(null, response.data);
        }
      } else {
        console.log(`No pending request found for ${correlationId}`);
      }
    } catch (err) {
      console.error("Error processing response:", err);
    }
  });
  
  consumer.on("error", function (err) {
    console.error("Response consumer error:", err);
  });
  
  self.responseQueueReady = true;
  console.log("Response queue ready");
  
  return next();
};

module.exports = KafkaRPC;