# Monitoring and Performance Configuration

> **📋 Project Repository**: [Student ERP System](https://github.com/HeyAdarsh14/StudentErp) - Complete documentation and source code

## Environment Variables for Monitoring

```bash
# Performance Monitoring
PERFORMANCE_METRICS_ENABLED=true
PERFORMANCE_SLOW_THRESHOLD=1000
PERFORMANCE_MEMORY_THRESHOLD=1024
METRIC_COLLECTION_INTERVAL=60000

# Health Check Configuration
HEALTH_CHECK_TIMEOUT=5000
HEALTH_CHECK_DB_ENABLED=true
HEALTH_CHECK_REDIS_ENABLED=true
HEALTH_CHECK_EXTERNAL_API_ENABLED=true

# Logging Configuration
LOG_PERFORMANCE_REQUESTS=true
LOG_SLOW_REQUESTS=true
LOG_ERROR_CONTEXT=true
LOG_LEVEL=info
LOG_FORMAT=json

# Alerting Configuration
ALERT_EMAIL_ENABLED=true
ALERT_SLACK_ENABLED=true
ALERT_THRESHOLD_ERROR_RATE=5
ALERT_THRESHOLD_RESPONSE_TIME=2000

# APM Configuration
APM_ENABLED=true
APM_PROVIDER=newrelic
APM_SAMPLING_RATE=0.1
```

## Monitoring Endpoints

### Health Checks
- `GET /health` - Basic health check with database status
- `GET /health/detailed` - Comprehensive system health information

### Performance Metrics
- `GET /metrics` - Current performance metrics and statistics
- `POST /metrics/reset` - Reset performance counters (development only)

## Performance Thresholds

| Metric | Threshold | Action | Severity |
|--------|-----------|---------|----------|
| Response Time | > 1000ms | Log as slow request | Warning |
| Response Time | > 2000ms | Send alert | Critical |
| Memory Usage | > 1GB | Log warning | Warning |
| Memory Usage | > 1.5GB | Send alert | Critical |
| Error Rate | > 5% | Send alert | Error |
| Error Rate | > 10% | Emergency alert | Critical |
| Database Connection | Disconnected | Health check fails | Critical |
| CPU Usage | > 80% | Log warning | Warning |
| CPU Usage | > 95% | Send alert | Critical |
| Disk Usage | > 85% | Log warning | Warning |
| Disk Usage | > 95% | Send alert | Critical |

## Advanced Monitoring Metrics

### Application Performance Metrics
- **Request Rate**: Requests per second by endpoint
- **Response Time Distribution**: P50, P95, P99 percentiles  
- **Error Rates**: By status code and endpoint
- **Throughput**: Data transferred per second
- **Concurrent Users**: Active user sessions
- **Database Query Performance**: Query execution times
- **Cache Hit Rates**: Redis/memory cache efficiency

### Business Logic Metrics
- **User Activities**: Login frequency, feature usage
- **Academic Operations**: Assignment submissions, grade updates
- **System Usage**: Peak hours, resource utilization
- **API Usage**: Endpoint popularity, client distribution

### Custom Metrics Dashboard
```javascript
// Available custom metrics
{
  "student_enrollments_per_hour": 0,
  "assignment_submissions_per_day": 0, 
  "faculty_login_frequency": 0,
  "fee_payments_processed": 0,
  "system_backup_status": "success|failed",
  "active_websocket_connections": 0
}
```

## Correlation ID Usage

All requests automatically get a correlation ID for tracking:
- Generated automatically if not provided
- Returned in `x-correlation-id` header
- Logged with all error and performance entries
- Useful for debugging across distributed systems

## Integration with Monitoring Tools

### Prometheus/Grafana
```javascript
// Example metrics export for Prometheus
GET /metrics?format=prometheus
```

### New Relic/DataDog
```javascript
// Performance data is logged and can be forwarded
// to external monitoring platforms
```

### Health Check Monitoring
```bash
# Use in Docker health checks
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:5000/health || exit 1
```

## Development Usage

> **🔧 Setup Instructions**: See [Development Setup Guide](https://github.com/HeyAdarsh14/StudentErp#development-setup) for complete installation steps

```bash
# Check environment setup
npm run env:validate

# Monitor health during development
npm run health:check

# View current metrics
npm run metrics:view
```

## Production Considerations

1. **Memory Metrics**: Metrics are stored in memory - consider Redis for production
2. **Log Volume**: Performance logging can be verbose in high traffic
3. **Security**: Metrics endpoint should be secured in production
4. **Retention**: Configure appropriate log retention policies

## Observability Stack Integration

### ELK Stack (Elasticsearch, Logstash, Kibana)
```yaml
# docker-compose.monitoring.yml
version: '3.8'
services:
  elasticsearch:
    image: docker.elastic.co/elasticsearch/elasticsearch:7.14.0
    environment:
      - discovery.type=single-node
    ports:
      - "9200:9200"
      
  kibana:
    image: docker.elastic.co/kibana/kibana:7.14.0
    ports:
      - "5601:5601"
    environment:
      ELASTICSEARCH_HOSTS: http://elasticsearch:9200
```

### Prometheus & Grafana Configuration
```yaml
# prometheus.yml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'college-erp-backend'
    static_configs:
      - targets: ['localhost:5000']
    metrics_path: '/metrics'
    scrape_interval: 30s
```

### Alert Manager Rules
```yaml
# alerts.yml
groups:
- name: college-erp-alerts
  rules:
  - alert: HighErrorRate
    expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.05
    for: 5m
    annotations:
      summary: "High error rate detected"
      
  - alert: SlowResponseTime
    expr: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 2
    for: 10m
    annotations:
      summary: "95th percentile response time is above 2 seconds"
```

## Monitoring Best Practices

### 1. The Four Golden Signals
- **Latency**: Request response times
- **Traffic**: Request rate and volume  
- **Errors**: Error rate and types
- **Saturation**: Resource utilization

### 2. SLI/SLO Configuration
```javascript
// Service Level Indicators (SLIs)
const SLIs = {
  availability: "99.9%",           // Uptime target
  response_time: "< 500ms (95th)", // Response speed
  error_rate: "< 1%",              // Error threshold  
  throughput: "> 1000 req/min"     // Processing capacity
};

// Service Level Objectives (SLOs)
const SLOs = {
  monthly_uptime: "99.9%",
  daily_error_budget: "0.1%",
  response_time_budget: "5% above threshold"
};
```

### 3. Incident Response Runbook
```markdown
## Critical Alert Response

1. **Immediate Response (0-5 minutes)**
   - Acknowledge alert
   - Check system health dashboard
   - Verify if incident affects users

2. **Investigation (5-15 minutes)**   
   - Review recent deployments
   - Check error logs and metrics
   - Identify root cause

3. **Mitigation (15-30 minutes)**
   - Apply immediate fixes
   - Scale resources if needed
   - Communicate with stakeholders

4. **Resolution & Follow-up**
   - Implement permanent fix
   - Update documentation
   - Conduct post-mortem
```

### 4. Performance Monitoring Checklist
- [ ] Health checks configured for all services
- [ ] Custom business metrics defined
- [ ] Alert thresholds set based on historical data
- [ ] Dashboards created for different stakeholders
- [ ] Log aggregation and search configured
- [ ] APM tracing enabled for request flow
- [ ] Capacity planning metrics tracked
- [ ] Incident response procedures documented

## Troubleshooting Common Issues

> **🐛 Report Issues**: Found a bug or need help? [Create an issue](https://github.com/HeyAdarsh14/StudentErp/issues) on our GitHub repository

### High Memory Usage
```bash
# Check memory-intensive queries
GET /metrics/memory-usage
GET /metrics/database-connections
GET /admin/slow-queries
```

### Database Performance
```bash
# Monitor database performance
GET /health/database/detailed
GET /metrics/database/query-times
GET /metrics/database/connection-pool
```

### API Rate Limiting
```bash
# Check rate limiting status
GET /metrics/rate-limiting
GET /admin/blocked-ips
```