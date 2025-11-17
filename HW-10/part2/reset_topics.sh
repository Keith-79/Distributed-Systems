#!/bin/bash
BOOT="localhost:9092"
echo "🧹 Resetting HW-10 topics..."
for T in inbox tasks drafts final; do
  kafka-topics --bootstrap-server $BOOT --delete --topic $T >/dev/null 2>&1
  kafka-topics --bootstrap-server $BOOT --create --topic $T --partitions 1 --replication-factor 1
  echo "Recreated topic: $T"
done
echo "✅ All topics reset."
