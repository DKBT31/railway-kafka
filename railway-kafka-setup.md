# Deploy Kafka to Railway - Complete Guide

## Overview
Railway doesn't support multi-container deployments in a single service, so we'll deploy Kafka using **Upstash Kafka** (recommended) or **separate Railway services** for Zookeeper and Kafka.

---

## Option 1: Upstash Kafka (Recommended - Easiest)

Upstash provides managed Kafka with a free tier - perfect for Railway deployments.

### Steps:

1. **Create Upstash Account**
   - Go to https://upstash.com/
   - Sign up for free account
   - Create a new Kafka cluster

2. **Get Connection Details**
   - Copy the Bootstrap server URL (e.g., `xxx.upstash.io:9092`)
   - Copy Username and Password
   - Select SASL/SCRAM authentication

3. **Update Railway Environment Variables**
   ```env
   KAFKA_BOOTSTRAP_SERVERS=xxx.upstash.io:9092
   KAFKA_SECURITY_PROTOCOL=SASL_SSL
   KAFKA_SASL_MECHANISM=SCRAM-SHA-256
   KAFKA_SASL_USERNAME=your-username
   KAFKA_SASL_PASSWORD=your-password
   ```

4. **Update Spring Boot Application**
   - No code changes needed
   - Spring Boot will automatically use the environment variables

---

## Option 2: Confluent Cloud (Production-Ready)

You had this commented out in your `.env` - this is the best option for production.

### Steps:

1. **Use Existing Confluent Cloud Cluster**
   - Uncomment your existing Confluent config in `.env`:
   ```env
   KAFKA_BOOTSTRAP_SERVERS=pkc-ox31np.ap-southeast-7.aws.confluent.cloud:9092
   KAFKA_SECURITY_PROTOCOL=SASL_SSL
   KAFKA_SASL_MECHANISM=PLAIN
   KAFKA_SASL_USERNAME=OIVBDGICXUZRFHLJ
   KAFKA_SASL_PASSWORD=cfltIcZN7o5XGspBTyBFz2frcd2hBf56ANTADS6AHz7+C99OB9/GAQiC1dMhXYww
   ```

2. **Add to Railway**
   - In Railway dashboard, go to your service
   - Add these variables to Environment Variables
   - Redeploy

---

## Option 3: Self-Hosted Kafka on Railway (Complex)

If you must self-host, here's how to deploy Kafka + Zookeeper as separate Railway services:

### Step 1: Create Zookeeper Service

1. **Create `zookeeper.Dockerfile`:**
```dockerfile
FROM confluentinc/cp-zookeeper:7.5.0

ENV ZOOKEEPER_CLIENT_PORT=2181
ENV ZOOKEEPER_TICK_TIME=2000
ENV ZOOKEEPER_LOG4J_ROOT_LOGLEVEL=WARN
```

2. **Deploy to Railway:**
   - Create new Railway service
   - Connect to GitHub repo with this Dockerfile
   - Or use Railway Template: `Zookeeper`
   - Note the internal URL (e.g., `zookeeper.railway.internal:2181`)

### Step 2: Create Kafka Service

1. **Create `kafka.Dockerfile`:**
```dockerfile
FROM confluentinc/cp-kafka:7.5.0

# Railway provides PORT environment variable
ENV KAFKA_ZOOKEEPER_CONNECT=zookeeper.railway.internal:2181
ENV KAFKA_LISTENER_SECURITY_PROTOCOL_MAP=PLAINTEXT:PLAINTEXT,PLAINTEXT_HOST:PLAINTEXT
ENV KAFKA_INTER_BROKER_LISTENER_NAME=PLAINTEXT
ENV KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR=1
ENV KAFKA_TRANSACTION_STATE_LOG_MIN_ISR=1
ENV KAFKA_TRANSACTION_STATE_LOG_REPLICATION_FACTOR=1
ENV KAFKA_LOG4J_ROOT_LOGLEVEL=WARN

# This will be set at runtime
CMD export KAFKA_ADVERTISED_LISTENERS=PLAINTEXT://kafka.railway.internal:9092,PLAINTEXT_HOST://localhost:29092 && \
    export KAFKA_LISTENERS=PLAINTEXT://0.0.0.0:9092,PLAINTEXT_HOST://0.0.0.0:29092 && \
    /etc/confluent/docker/run
```

2. **Deploy to Railway:**
   - Create new Railway service
   - Connect to GitHub repo with this Dockerfile
   - Expose port 9092 (Railway will assign public port)
   - Note the service URL

### Step 3: Update Your Application

Add to Railway environment variables:
```env
KAFKA_BOOTSTRAP_SERVERS=kafka.railway.internal:9092
KAFKA_SECURITY_PROTOCOL=PLAINTEXT
```

---

## Step-by-Step: Railway Deployment (Using Upstash)

### 1. Install Railway CLI (Optional)
```powershell
npm install -g @railway/cli
railway login
```

### 2. Create Upstash Kafka Cluster
- Sign up at https://upstash.com/
- Create Kafka cluster (Free tier available)
- Note connection details

### 3. Update Railway Project

**Via Railway Dashboard:**
1. Go to your Railway project
2. Click on your service
3. Go to "Variables" tab
4. Add these variables:
   ```
   KAFKA_BOOTSTRAP_SERVERS=<your-upstash-endpoint>:9092
   KAFKA_SECURITY_PROTOCOL=SASL_SSL
   KAFKA_SASL_MECHANISM=SCRAM-SHA-256
   KAFKA_SASL_USERNAME=<your-username>
   KAFKA_SASL_PASSWORD=<your-password>
   ```
5. Click "Deploy"

**Via Railway CLI:**
```powershell
cd "c:\Users\thuan\IdeaProjects\be-java"
railway variables set KAFKA_BOOTSTRAP_SERVERS=<endpoint>:9092
railway variables set KAFKA_SECURITY_PROTOCOL=SASL_SSL
railway variables set KAFKA_SASL_MECHANISM=SCRAM-SHA-256
railway variables set KAFKA_SASL_USERNAME=<username>
railway variables set KAFKA_SASL_PASSWORD=<password>
railway up
```

---

## Update Your Spring Boot Configuration

Ensure your `application.properties` or `application.yml` reads from environment variables:

```properties
# Kafka Configuration
spring.kafka.bootstrap-servers=${KAFKA_BOOTSTRAP_SERVERS}
spring.kafka.properties.security.protocol=${KAFKA_SECURITY_PROTOCOL:PLAINTEXT}
spring.kafka.properties.sasl.mechanism=${KAFKA_SASL_MECHANISM:}
spring.kafka.properties.sasl.jaas.config=${KAFKA_SASL_JAAS_CONFIG:}

# For SASL authentication
spring.kafka.properties.sasl.jaas.config=org.apache.kafka.common.security.scram.ScramLoginModule required username="${KAFKA_SASL_USERNAME}" password="${KAFKA_SASL_PASSWORD}";
```

---

## Testing Kafka Connection

Add this test endpoint to verify Kafka is working:

```java
@RestController
@RequestMapping("/api/kafka")
public class KafkaTestController {
    
    @Autowired
    private KafkaTemplate<String, String> kafkaTemplate;
    
    @GetMapping("/test")
    public String testKafka() {
        try {
            kafkaTemplate.send("test-topic", "Test message from Railway!");
            return "Kafka connection successful!";
        } catch (Exception e) {
            return "Kafka connection failed: " + e.getMessage();
        }
    }
}
```

---

## Troubleshooting

### Issue: Connection Timeout
**Solution:** Check if bootstrap server URL is correct and accessible from Railway

### Issue: Authentication Failed
**Solution:** Verify SASL username and password are correct

### Issue: Topic Not Found
**Solution:** Create topics in Upstash/Confluent dashboard first

### Issue: SSL/TLS Error
**Solution:** Make sure `KAFKA_SECURITY_PROTOCOL=SASL_SSL` is set correctly

---

## Cost Comparison

| Option | Monthly Cost | Pros | Cons |
|--------|--------------|------|------|
| **Upstash Free Tier** | $0 | Easy setup, managed | Limited throughput |
| **Upstash Pro** | $120 | Managed, scalable | Cost |
| **Confluent Cloud** | $1+ | Production-ready | Complex pricing |
| **Self-hosted Railway** | $5-20 | Full control | Complex setup, reliability |

---

## Recommendation

**For Development/Testing:** Use Upstash free tier
**For Production:** Use Confluent Cloud (you already have it configured!)

Your existing Confluent Cloud config looks ready to use:
```env
KAFKA_BOOTSTRAP_SERVERS=pkc-ox31np.ap-southeast-7.aws.confluent.cloud:9092
KAFKA_SECURITY_PROTOCOL=SASL_SSL
KAFKA_SASL_MECHANISM=PLAIN
KAFKA_SASL_USERNAME=OIVBDGICXUZRFHLJ
KAFKA_SASL_PASSWORD=cfltIcZN7o5XGspBTyBFz2frcd2hBf56ANTADS6AHz7+C99OB9/GAQiC1dMhXYww
```

Just uncomment these in your `.env` and add them to Railway! 🚀
