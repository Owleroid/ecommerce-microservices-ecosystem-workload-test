# Load Generator

A comprehensive load testing tool for the microservices ecosystem.

## Features

- **Multiple Scenarios**: Auth, Profile, Avatar upload, and combined tests
- **Load Modes**: Constant RPS or burst mode with configurable spikes
- **Detailed Metrics**: Latency percentiles (P50, P90, P95, P99), error rates, status codes
- **Real-time Progress**: Live monitoring of test progress
- **Dockerized**: Can run as a container for easy deployment

## Installation

```bash
cd services/load-generator
npm install
npm run build
```

## Usage

### CLI Options

```
Options:
  -u, --url <url>                   API base URL (default: "http://localhost")
  -s, --scenario <type>             Test scenario: auth | profile | avatar | all (default: "all")
  -d, --duration <seconds>          Test duration in seconds (default: "60")
  -r, --rps <number>                Requests per second (default: "10")
  -m, --mode <type>                 Load mode: constant | burst (default: "constant")
  -b, --burst-interval <seconds>    Seconds between bursts (burst mode) (default: "10")
  -x, --burst-multiplier <number>   RPS multiplier for bursts (burst mode) (default: "5")
  -v, --verbose                     Verbose output
  -h, --help                        Display help
```

### Scenarios

#### 1. Authentication Flood
Tests the auth service with register and login requests.

```bash
npm start -- --scenario auth --duration 60 --rps 10
```

#### 2. Profile Read/Write
Tests user profile GET and PATCH operations (70% reads, 30% writes).

```bash
npm start -- --scenario profile --duration 120 --rps 5
```

#### 3. Avatar Upload Stress
Tests media service with image uploads of varying sizes.

```bash
npm start -- --scenario avatar --duration 60 --rps 2
```

#### 4. Mixed Scenario
Combines all scenarios (40% auth, 40% profile, 20% avatar).

```bash
npm start -- --scenario all --duration 180 --rps 10
```

### Load Modes

#### Constant Mode
Maintains steady RPS throughout the test.

```bash
npm start -- --scenario auth --duration 60 --rps 10 --mode constant
```

#### Burst Mode
Alternates between normal and burst RPS to simulate traffic spikes.

```bash
npm start -- --scenario auth --duration 120 --rps 10 --mode burst --burst-interval 15 --burst-multiplier 5
```

In burst mode:
- Normal RPS: 10 requests/second
- Burst RPS: 50 requests/second (10 × 5)
- Burst occurs every 15 seconds
- Each burst lasts 5 seconds

## Metrics

The tool outputs comprehensive metrics:

### Request Statistics
- Total requests made
- Successful vs failed requests
- Error rate percentage
- Actual RPS achieved
- Test duration

### Latency Percentiles
- Min, Max, Mean latency
- P50 (median)
- P90, P95, P99 percentiles

### Status Code Distribution
Count and percentage of each HTTP status code

### Error Distribution
Types of errors encountered with counts

## Docker Usage

### Build Image

```bash
docker build -f services/load-generator/Dockerfile -t load-generator .
```

### Run Tests

```bash
# Authentication test
docker run --network host load-generator \
  --url http://localhost \
  --scenario auth \
  --duration 60 \
  --rps 10

# Profile test with custom RPS
docker run --network host load-generator \
  --url http://localhost \
  --scenario profile \
  --duration 120 \
  --rps 15

# Burst mode test
docker run --network host load-generator \
  --url http://localhost \
  --scenario all \
  --duration 180 \
  --rps 10 \
  --mode burst \
  --burst-interval 20 \
  --burst-multiplier 10
```

## Examples

### Quick Tests

```bash
# Quick auth test (30s, 5 RPS)
npm start -- -s auth -d 30 -r 5

# Profile test with higher RPS
npm start -- -s profile -d 60 -r 20

# Avatar upload test (low RPS due to heavy payloads)
npm start -- -s avatar -d 120 -r 1
```

### Stress Tests

```bash
# High RPS auth test
npm start -- -s auth -d 300 -r 50

# Sustained profile test
npm start -- -s profile -d 600 -r 25

# Burst mode stress test
npm start -- -s all -d 300 -r 20 -m burst -b 10 -x 10
```

### Production-like Tests

```bash
# Against remote API
npm start -- \
  --url https://api.example.com \
  --scenario all \
  --duration 600 \
  --rps 30 \
  --mode burst \
  --burst-interval 30 \
  --burst-multiplier 3

# Gradual ramp-up (run multiple tests with increasing RPS)
npm start -- -s all -d 60 -r 5
npm start -- -s all -d 60 -r 10
npm start -- -s all -d 60 -r 20
npm start -- -s all -d 60 -r 40
```

## Integration with Scaled System

Test against the horizontally scaled deployment:

```bash
# Start scaled services
cd infra
./scripts/start-scaled.sh

# Run load test
cd ../services/load-generator
npm start -- --scenario all --duration 300 --rps 30

# Monitor individual instances
docker-compose -f ../../infra/docker-compose.scale.yml logs -f | grep "Request completed"
```

## Interpreting Results

### Good Results
- Error rate < 1%
- P99 latency < 1000ms for most operations
- P95 latency < 500ms
- Actual RPS matches target RPS

### Warning Signs
- Error rate > 5%
- P99 latency > 2000ms
- Status code 503 (service unavailable)
- Actual RPS significantly below target

### Action Items Based on Results
- High latency → Check database query performance
- High error rate → Check service logs for errors
- Low actual RPS → System can't handle target load
- 503 errors → Services overloaded or down

## Tips

1. **Start Small**: Begin with low RPS and increase gradually
2. **Warm Up**: Run a short test first to warm up services
3. **Monitor Services**: Watch service logs during tests
4. **Check Resources**: Monitor CPU, memory, database connections
5. **Realistic Scenarios**: Mix read/write operations like production
6. **Burst Testing**: Use burst mode to test spike handling
7. **Long Duration**: Run longer tests (10+ minutes) to find memory leaks
