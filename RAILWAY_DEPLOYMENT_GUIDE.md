# Railway Kafka Deployment Guide for CareerMate

## Overview

Your setup has **3 separate systems** using Kafka:
1. **Java Application** (careermate-java) - Production notification system
2. **Node.js Producer** - Test service for `teste` topic
3. **Node.js Consumer** - Test service for `teste` topic

**These will NOT conflict** because they use different topics and consumer groups.

---

## Railway Services Architecture

```
┌─────────────────┐
│   Zookeeper     │  Port: 2181
│  (Internal)     │  DNS: zookeeper.railway.internal
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│     Kafka       │  Port: 9092 (internal)
│   (Broker)      │  DNS: kafka.railway.internal
└────────┬────────┘
         │
    ┌────┴────┬─────────────┬──────────────┐
    ▼         ▼             ▼              ▼
┌────────┐ ┌────────┐ ┌──────────┐ ┌──────────┐
│ Java   │ │Producer│ │ Consumer │ │   Web    │
│ App    │ │ (Test) │ │  (Test)  │ │   App    │
└────────┘ └────────┘ └──────────┘ └──────────┘
```

---

## Railway Environment Variables

### 1. Zookeeper Service
```bash
PORT=2181
ZOOKEEPER_CLIENT_PORT=2181
ZOOKEEPER_TICK_TIME=2000
```

### 2. Kafka Service
```bash
# Core Kafka Settings
KAFKA_BROKER_ID=1
KAFKA_ZOOKEEPER_CONNECT=zookeeper.railway.internal:2181

# Listeners (Internal only - for Railway services)
KAFKA_ADVERTISED_LISTENERS=PLAINTEXT://kafka.railway.internal:9092
KAFKA_LISTENERS=PLAINTEXT://0.0.0.0:9092
KAFKA_LISTENER_SECURITY_PROTOCOL_MAP=PLAINTEXT:PLAINTEXT
KAFKA_INTER_BROKER_LISTENER_NAME=PLAINTEXT

# Single Broker Configuration
KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR=1
KAFKA_TRANSACTION_STATE_LOG_MIN_ISR=1
KAFKA_TRANSACTION_STATE_LOG_REPLICATION_FACTOR=1
KAFKA_DEFAULT_REPLICATION_FACTOR=1
KAFKA_MIN_INSYNC_REPLICAS=1

# Auto-create Topics
KAFKA_AUTO_CREATE_TOPICS_ENABLE=true
KAFKA_NUM_PARTITIONS=3

# Performance Settings
KAFKA_LOG_RETENTION_HOURS=168
KAFKA_LOG_SEGMENT_BYTES=1073741824

PORT=9092
```

### 3. Java Application (careermate-java)
```bash
# Kafka Connection
KAFKA_BOOTSTRAP_SERVERS=kafka.railway.internal:9092
KAFKA_SECURITY_PROTOCOL=PLAINTEXT

# Database (your existing Neon config)
DB_HOST=ep-royal-cell-a1y59f8b-pooler.ap-southeast-1.aws.neon.tech
DB_NAME=neondb
DB_USER_LOCAL=neondb_owner
DB_PASSWORD_LOCAL=npg_cR86PjhwTQtV
DB_PORT=5432

# Other existing env vars...
EMAIL_NAME=careermatesender@gmail.com
EMAIL_PASSWORD=xxrk zhny difr lwqu
GOOGLE_APPLICATION_CREDENTIALS=src/main/resources/firebase-service-account.json
# ... etc
```

### 4. Node.js Producer (Test Service)
```bash
BROKERS=kafka.railway.internal:9092
```

### 5. Node.js Consumer (Test Service)
```bash
BROKERS=kafka.railway.internal:9092
```

---

## Topic Configuration

### Java Application Topics (Production)
- `admin-notifications` - For admin users
- `recruiter-notifications` - For recruiter users  
- `candidate-notifications` - For candidate users
- **Config**: 3 partitions, replication factor 1, consumer group: `careermate-group`

### Node.js Test Topics
- `teste` - For testing Kafka connectivity
- **Config**: Will be auto-created, consumer group: `teste-group`

**No conflicts** - Different topics, different consumer groups!

---

## Java Application Kafka Configuration Summary

Your Java code is already production-ready with:

✅ **Replication Factor 1** - Perfect for single broker
```java
.replicas(1)
```

✅ **Cloud Kafka Support** - Already configured for security
```java
private void addSecurityProperties(Map<String, Object> props) {
    // SASL, SSL, security protocol support
}
```

✅ **Manual Acknowledgment** - Better reliability
```java
factory.getContainerProperties().setAckMode(ContainerProperties.AckMode.MANUAL);
```

✅ **Idempotent Producer** - Prevents duplicates
```java
configProps.put(ProducerConfig.ENABLE_IDEMPOTENCE_CONFIG, true);
```

---

## Deployment Steps

### Step 1: Deploy Services (in order)
1. **Zookeeper** - Deploy first, wait until "Online"
2. **Kafka** - Deploy second, wait until "Online" 
3. **Java Application** - Deploy with env vars above
4. **Producer/Consumer** (optional) - For testing only

### Step 2: Verify Kafka is Running
Check Kafka logs for:
```
[KafkaServer id=1] started
```

### Step 3: Delete Test Topic (if exists)
If you get "LEADER_NOT_AVAILABLE" errors for `teste` topic:
```bash
# Connect to Kafka container shell on Railway
kafka-topics --bootstrap-server localhost:9092 --delete --topic teste
```

### Step 4: Test Java Application
Your Java app will auto-create topics on first use. Monitor logs for:
```
Successfully connected to Kafka broker
```

---

## Troubleshooting

### ✅ Consumer Shows "Consumer has joined the group"
**Status**: SUCCESS! Your Kafka is working correctly.
- Initial crashes with "LEADER_NOT_AVAILABLE" are normal on first deploy
- Consumer auto-restarts and successfully connects

### 🔧 Fix Leadership Election Errors (Optional)
If you want to eliminate the initial crash/restart cycle:

**Step 1**: Connect to Kafka container shell on Railway

**Step 2**: Delete the problematic topic:
```bash
kafka-topics --bootstrap-server localhost:9092 --delete --topic teste
```

**Step 3**: Manually recreate with correct settings:
```bash
kafka-topics --bootstrap-server localhost:9092 --create \
  --topic teste \
  --partitions 3 \
  --replication-factor 1 \
  --config min.insync.replicas=1
```

**Step 4**: Restart Producer/Consumer services

---

### Error: "getaddrinfo ENOTFOUND kafka.railway.internal"
**Solution**: Services must be in the **same Railway project** to use internal DNS.

### Error: "LEADER_NOT_AVAILABLE"
**Solution**: See "Fix Leadership Election Errors" above.

### Error: Connection Timeout
**Solution**: Verify Zookeeper is running and healthy:
```bash
# Check Zookeeper logs for
[ZooKeeperServer] binding to port 0.0.0.0/0.0.0.0:2181
```

### Java App Not Connecting
**Check environment variables**:
- `KAFKA_BOOTSTRAP_SERVERS=kafka.railway.internal:9092`
- `KAFKA_SECURITY_PROTOCOL=PLAINTEXT`

### Zookeeper Warning: "ZooKeeperServer not running"
**Status**: Normal during startup. Ignore if Zookeeper shows "PrepRequestProcessor started" afterward.

---

## Node.js vs Java - Compatibility

✅ **Fully Compatible!** Both can use the same Kafka cluster because:

1. **Different Topics**: Java uses `*-notifications`, Node.js uses `teste`
2. **Different Consumer Groups**: Java uses `careermate-group`, Node.js uses `teste-group`
3. **Same Protocol**: Both use PLAINTEXT on internal network
4. **Same Serialization**: Both send string/JSON messages

The Node.js producer/consumer are just **test services** to verify Kafka is working. Your production Java application will work independently.

---

## Production Recommendations

### Option 1: Keep Self-Hosted (Current Setup)
✅ Full control
✅ No additional costs
❌ Need to manage Zookeeper + Kafka
❌ Railway memory limits (~8GB)

### Option 2: Switch to Confluent Cloud (Recommended)
✅ Managed service - no maintenance
✅ Better scalability
✅ Built-in monitoring
✅ Already configured in your code (commented out)

**Your code already supports Confluent Cloud!** Just uncomment in `.env`:
```bash
# KAFKA_BOOTSTRAP_SERVERS=pkc-ox31np.ap-southeast-7.aws.confluent.cloud:9092
# KAFKA_SECURITY_PROTOCOL=SASL_SSL
# KAFKA_SASL_MECHANISM=PLAIN
# KAFKA_SASL_USERNAME=your-api-key
# KAFKA_SASL_PASSWORD=your-api-secret
```

---

## Next Steps

1. ✅ Deploy Zookeeper, Kafka, Java app to Railway with env vars above
2. ✅ Verify Kafka health in logs
3. ✅ Test notification system in your Java application
4. ✅ (Optional) Deploy Producer/Consumer for testing
5. ✅ Monitor memory usage - upgrade plan if needed

**Your setup is production-ready! No conflicts between Node.js and Java.** 🎉
