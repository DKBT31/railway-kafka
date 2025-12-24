require("dotenv").config();
const { Kafka } = require("kafkajs");
const config = require("./config");

// Validate environment variables
if (!process.env.BROKERS) {
  console.error("ERROR: BROKERS environment variable is not set!");
  process.exit(1);
}

const kafka = new Kafka({
  clientId: "consumer-teste",
  brokers: process.env.BROKERS.split(","),
  retry: {
    initialRetryTime: 100,
    retries: 8,
  },
});

const consumer = kafka.consumer({ groupId: `${config.kafkaTopic}-group` });

const run = async () => {
  console.log("🚀 Connecting to Kafka...");
  console.log(`📡 Brokers: ${process.env.BROKERS}`);
  console.log(`📝 Topic: ${config.kafkaTopic}`);
  console.log(`👥 Group ID: ${config.kafkaTopic}-group`);

  await consumer.connect();
  console.log("✅ Consumer connected successfully!");

  await consumer.subscribe({ topic: config.kafkaTopic, fromBeginning: true });
  console.log(`✅ Subscribed to topic: ${config.kafkaTopic}`);
  console.log("⏳ Waiting for messages...");

  await consumer.run({
    eachMessage: async ({ topic, partition, message }) => {
      console.log("📨 Message received:", {
        topic,
        partition,
        offset: message.offset,
        value: message.value.toString(),
        timestamp: new Date().toISOString(),
      });
    },
  });
};

const errorTypes = ['unhandledRejection', 'uncaughtException'];
const signalTraps = ['SIGTERM', 'SIGINT', 'SIGUSR2'];

errorTypes.forEach(type => {
  process.on(type, async (e) => {
    try {
      console.log(`❌ ${type}:`, e);
      await consumer.disconnect();
      process.exit(0);
    } catch (_) {
      process.exit(1);
    }
  });
});

signalTraps.forEach(type => {
  process.once(type, async () => {
    try {
      console.log(`\n🛑 ${type} received, disconnecting...`);
      await consumer.disconnect();
    } finally {
      process.kill(process.pid, type);
    }
  });
});

run().catch((error) => {
  console.error("❌ Consumer error:", error);
  process.exit(1);
});
