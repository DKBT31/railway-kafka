# Railway Kafka Quick Reference

## Environment Variables Summary

### Kafka Service
```bash
KAFKA_ADVERTISED_LISTENERS=PLAINTEXT://kafka.railway.internal:9092
KAFKA_LISTENERS=PLAINTEXT://0.0.0.0:9092
KAFKA_LISTENER_SECURITY_PROTOCOL_MAP=PLAINTEXT:PLAINTEXT
KAFKA_ZOOKEEPER_CONNECT=zookeeper.railway.internal:2181
KAFKA_INTER_BROKER_LISTENER_NAME=PLAINTEXT
KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR=1
KAFKA_TRANSACTION_STATE_LOG_MIN_ISR=1
KAFKA_TRANSACTION_STATE_LOG_REPLICATION_FACTOR=1
KAFKA_DEFAULT_REPLICATION_FACTOR=1
KAFKA_MIN_INSYNC_REPLICAS=1
KAFKA_AUTO_CREATE_TOPICS_ENABLE=true
PORT=9092
```

### Java Application
```bash
KAFKA_BOOTSTRAP_SERVERS=kafka.railway.internal:9092
KAFKA_SECURITY_PROTOCOL=PLAINTEXT
```

### Node.js Producer/Consumer
```bash
BROKERS=kafka.railway.internal:9092
```

## Quick Commands

### Delete Test Topic
```bash
kafka-topics --bootstrap-server localhost:9092 --delete --topic teste
```

### List All Topics
```bash
kafka-topics --bootstrap-server localhost:9092 --list
```

### Describe Topic
```bash
kafka-topics --bootstrap-server localhost:9092 --describe --topic teste
```

### View Consumer Groups
```bash
kafka-consumer-groups --bootstrap-server localhost:9092 --list
```

## Service Startup Order
1. Zookeeper (wait for "Online")
2. Kafka (wait for "started")
3. Java/Producer/Consumer (any order)

## Common Issues

**"LEADER_NOT_AVAILABLE"** → Delete and recreate topic with replication factor 1

**"ENOTFOUND kafka.railway.internal"** → Services must be in same Railway project

**Connection timeout** → Check Zookeeper is healthy first
