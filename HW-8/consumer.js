// consumer.js  (USER CRUD SERVICE)
const kafka = require("kafka-node");
const { randomBytes, randomUUID: uuidMaybe } = require("crypto");

console.log("✅ USER CRUD SERVICE: ready (topics: request_topic/response_topic)");

// ---- In-memory store ----
/** @type {Map<string, {userId:string,name:string,email:string,age:number}>} */
const users = new Map();

// ---- Helpers ----
const uuid = () => (typeof uuidMaybe === "function" ? uuidMaybe() : randomBytes(16).toString("hex"));
const isValidEmail = (email) => typeof email === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
const isPositiveInt = (n) => Number.isInteger(n) && n > 0;
const normalizeOp = (raw) => {
  const t = String(raw || "").replace(/[\s-]+/g, "_").toUpperCase();
  const m = {
    CREATEUSER: "CREATE_USER", CREATE_USER: "CREATE_USER",
    GETUSER: "GET_USER", GET_USER: "GET_USER",
    UPDATEUSER: "UPDATE_USER", UPDATE_USER: "UPDATE_USER",
    DELETEUSER: "DELETE_USER", DELETE_USER: "DELETE_USER",
    LISTUSERS: "LIST_USERS", LIST_USERS: "LIST_USERS",
  };
  return m[t] || t;
};

// ---- Operation handlers ----
const handlers = {
  async CREATE_USER(body) {
    const { name, email, age } = body;
    if (!name || typeof name !== "string") throw new Error("Invalid name");
    if (!isValidEmail(email)) throw new Error("Invalid email");
    if (!isPositiveInt(age)) throw new Error("Invalid age (must be a positive integer)");
    const userId = uuid();
    const user = { userId, name, email, age };
    users.set(userId, user);
    return { success: true, userId, message: "User created" };
  },

  async GET_USER(body) {
    const { userId } = body;
    if (!userId || typeof userId !== "string") throw new Error("Invalid userId");
    const user = users.get(userId);
    if (!user) throw new Error("User not found");
    return { success: true, user };
  },

  async UPDATE_USER(body) {
    const { userId, updates } = body;
    if (!userId || typeof userId !== "string") throw new Error("Invalid userId");
    if (!updates || typeof updates !== "object") throw new Error("Invalid updates");

    const existing = users.get(userId);
    if (!existing) throw new Error("User not found");

    if ("name" in updates) {
      if (!updates.name || typeof updates.name !== "string") throw new Error("Invalid name");
      existing.name = updates.name;
    }
    if ("email" in updates) {
      if (!isValidEmail(updates.email)) throw new Error("Invalid email");
      existing.email = updates.email;
    }
    if ("age" in updates) {
      if (!isPositiveInt(updates.age)) throw new Error("Invalid age (must be a positive integer)");
      existing.age = updates.age;
    }
    users.set(userId, existing);
    return { success: true, user: existing, message: "User updated" };
  },

  async DELETE_USER(body) {
    const { userId } = body;
    if (!userId || typeof userId !== "string") throw new Error("Invalid userId");
    const existed = users.delete(userId);
    if (!existed) throw new Error("User not found");
    return { success: true, message: "User deleted" };
  },

  async LIST_USERS() {
    const list = Array.from(users.values());
    return { success: true, users: list, count: list.length };
  },
};

// ---- Kafka wiring (topics: request_topic / response_topic) ----
const client = new kafka.KafkaClient({ kafkaHost: "localhost:9092" });

const consumer = new kafka.Consumer(
  client,
  [{ topic: "request_topic", partition: 0 }],
  { autoCommit: true }
);

const producer = new kafka.Producer(client);

producer.on("ready", () => console.log("✓ Producer is ready"));
producer.on("error", (err) => console.error("✗ Producer error:", err));
consumer.on("error", (err) => console.error("✗ Consumer error:", err));

consumer.on("message", async function (message) {
  console.log("\n" + "=".repeat(50));
  console.log("📨 Received:", message.value);

  try {
    const payload = JSON.parse(message.value);
    const { correlationId, replyTo, data } = payload;

    const op = normalizeOp(data?.operation);
    let result;
    try {
      const handler = handlers[op];
      if (!handler) throw new Error(`Unknown operation: ${data?.operation || ""}`);
      result = await handler(data);
    } catch (opErr) {
      return sendResponse({ correlationId, replyTo, error: opErr.message });
    }

    return sendResponse({ correlationId, replyTo, data: result });
  } catch (e) {
    console.error("✗ Error processing:", e.message);
    try {
      const fb = JSON.parse(message.value);
      sendResponse({
        correlationId: fb.correlationId,
        replyTo: fb.replyTo || "response_topic",
        error: "Malformed request",
      });
    } catch {}
  }
});

function sendResponse({ correlationId, replyTo = "response_topic", data = null, error = null }) {
  const responsePayload = [
    {
      topic: replyTo,
      messages: JSON.stringify({
        correlationId,
        data,
        error,
        processedAt: new Date().toISOString(),
      }),
      partition: 0,
    },
  ];
  producer.send(responsePayload, (err) => {
    if (err) console.error("✗ Error sending response:", err);
    else {
      console.log(error ? "✓ Error response sent" : "✓ Response sent");
      console.log("=".repeat(50) + "\n");
    }
  });
}

process.on("SIGINT", () => {
  console.log("\n🛑 Shutting down consumer...");
  consumer.close(true, () => process.exit(0));
});

console.log("🚀 Kafka Consumer Service Started");
console.log("📡 Waiting for messages on 'request_topic'...");
