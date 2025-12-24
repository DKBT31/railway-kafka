require("dotenv").config();
const { Kafka, Partitioners } = require("kafkajs");
const config = require("./config");

// Validate environment variables
if (!process.env.BROKERS) {
  console.error("ERROR: BROKERS environment variable is not set!");
  process.exit(1);
}

const kafka = new Kafka({
  clientId: "producer-teste",
  brokers: process.env.BROKERS.split(","),
  retry: {
    initialRetryTime: 100,
    retries: 8,
  },
});

const producer = kafka.producer({
  createPartitioner: Partitioners.LegacyPartitioner,
});

const run = async () => {
  console.log("🚀 Connecting to Kafka...");
  console.log(`📡 Brokers: ${process.env.BROKERS}`);
  console.log(`📝 Topic: ${config.kafkaTopic}`);

  await producer.connect();
  console.log("✅ Producer connected successfully!");

  for (let i = 0; i < 10; i++) {
    await producer.send({
      topic: config.kafkaTopic,
      messages: [{ value: `Kafka message ${i}` }],
    });
    console.log(`📤 Sent message ${i}`);
  }

  console.log("✅ All messages sent! Disconnecting...");
  await producer.disconnect();
};

run().catch((error) => {
  console.error("❌ Producer error:", error);
  process.exit(1);
});
