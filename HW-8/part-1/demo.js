const KafkaClient = require("./client");

/**
 * Demo Script - Shows how to use Kafka RPC
 */

const client = new KafkaClient();

console.log("🚀 Kafka RPC Demo Starting...\n");

// Give producer time to connect
setTimeout(() => {
  runDemos();
}, 2000);

function runDemos() {
  console.log("=" .repeat(60));
  console.log("DEMO 1: Simple User Greeting");
  console.log("=".repeat(60) + "\n");
  
  // Demo 1: Simple request
  client.makeRequest(
    "request_topic",
    { 
      name: "Alice",
      age: 25
    },
    function (err, response) {
      if (err) {
        console.error("Demo 1 Error:", err);
      } else {
        console.log("\n✓ Demo 1 Complete!\n");
        
        // Run Demo 2 after Demo 1 completes
        setTimeout(runDemo2, 2000);
      }
    }
  );
}

function runDemo2() {
  console.log("=".repeat(60));
  console.log("DEMO 2: Calculator Request");
  console.log("=".repeat(60) + "\n");
  
  client.makeRequest(
    "request_topic",
    {
      operation: "calculate",
      a: 10,
      b: 25
    },
    function (err, response) {
      if (err) {
        console.error("Demo 2 Error:", err);
      } else {
        console.log("\n✓ Demo 2 Complete!\n");
        
        // Run Demo 3 after Demo 2 completes
        setTimeout(runDemo3, 2000);
      }
    }
  );
}

function runDemo3() {
  console.log("=".repeat(60));
  console.log("DEMO 3: Custom Data Request");
  console.log("=".repeat(60) + "\n");
  
  client.makeRequest(
    "request_topic",
    {
      action: "fetch_data",
      userId: "12345",
      filters: {
        startDate: "2025-01-01",
        endDate: "2025-10-25"
      }
    },
    function (err, response) {
      if (err) {
        console.error("Demo 3 Error:", err);
      } else {
        console.log("\n✓ Demo 3 Complete!\n");
        console.log("=".repeat(60));
        console.log("🎉 ALL DEMOS COMPLETED SUCCESSFULLY!");
        console.log("=".repeat(60));
        
        // Exit after all demos complete
        setTimeout(() => {
          console.log("\n👋 Exiting demo...\n");
          process.exit(0);
        }, 2000);
      }
    }
  );
}

// Handle errors
process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err);
  process.exit(1);
});

process.on("SIGINT", () => {
  console.log("\n\n👋 Demo interrupted by user");
  process.exit(0);
});