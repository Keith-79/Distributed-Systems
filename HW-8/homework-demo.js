// homework-demo.js
const KafkaClient = require("./client");

// Promisify the callback-based client for easy sequencing
function makeRequestAsync(client, topic, payload) {
  return new Promise((resolve, reject) => {
    client.makeRequest(topic, payload, (err, res) => {
      if (err) return reject(err);
      resolve(res);
    });
  });
}

(async () => {
  const client = new KafkaClient();
  console.log("─ DEMO START ─");

  try {
    // PART 1: CREATE 3 users + LIST
    console.log("\n# PART 1: CREATE 3 users + LIST");
    const u1 = await makeRequestAsync(client, "request_topic", { operation: "CREATE_USER", name: "Alice", email: "alice@example.com", age: 28 });
    const u2 = await makeRequestAsync(client, "request_topic", { operation: "CREATE USER", name: "Bob", email: "bob@work.com", age: 34 }); // space variant
    const u3 = await makeRequestAsync(client, "request_topic", { operation: "create_user", name: "Charlie", email: "charlie@mail.net", age: 41 }); // lowercase variant

    const list1 = await makeRequestAsync(client, "request_topic", { operation: "LIST_USERS" });
    console.log("SUMMARY → First list count:", list1.count);

    // PART 2: GET, UPDATE, DELETE
    console.log("\n# PART 2: GET, UPDATE, DELETE");
    const get1 = await makeRequestAsync(client, "request_topic", { operation: "GET_USER", userId: u1.userId });
    const upd2 = await makeRequestAsync(client, "request_topic", { operation: "UPDATE_USER", userId: u2.userId, updates: { age: 35, email: "bob+updated@work.com" } });
    const del3 = await makeRequestAsync(client, "request_topic", { operation: "DELETE_USER", userId: u3.userId });

    // PART 3: Final LIST + Error demos (to show ❌ lines)
    console.log("\n# PART 3: Final LIST + Errors");
    const list2 = await makeRequestAsync(client, "request_topic", { operation: "LIST_USERS" });
    console.log("SUMMARY → Final list count:", list2.count);

    // Error cases (these should trigger the ❌ lines from client.js)
    try { await makeRequestAsync(client, "request_topic", { operation: "CREATE_USER", name: "Bad", email: "not-an-email", age: 20 }); } catch (e) {}
    try { await makeRequestAsync(client, "request_topic", { operation: "GET_USER", userId: "00000000-0000-0000-0000-000000000000" }); } catch (e) {}
    try { await makeRequestAsync(client, "request_topic", { operation: "UPDATE_USER", userId: u1.userId, updates: { age: -5 } }); } catch (e) {}
    try { await makeRequestAsync(client, "request_topic", { operation: "SOMETHING_ELSE" }); } catch (e) {}

    console.log("\n─ DEMO END ─");
  } catch (fatal) {
    console.error("Fatal demo error:", fatal);
    process.exit(1);
  }
})();
