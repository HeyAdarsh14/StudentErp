# Monitoring and Performance Configuration

## Environment Variables for Monitoring

```bash
# Performance Monitoring
PERFORMANCE_METRICS_ENABLED=true
PERFORMANCE_SLOW_THRESHOLD=1000
PERFORMANCE_MEMORY_THRESHOLD=1024

# Health Check Configuration
HEALTH_CHECK_TIMEOUT=5000
HEALTH_CHECK_DB_ENABLED=true

# Logging Configuration
LOG_PERFORMANCE_REQUESTS=true
LOG_SLOW_REQUESTS=true
LOG_ERROR_CONTEXT=true
```

## Monitoring Endpoints

### Health Checks
- `GET /health` - Basic health check with database status
- `GET /health/detailed` - Comprehensive system health information

### Performance Metrics
- `GET /metrics` - Current performance metrics and statistics
- `POST /metrics/reset` - Reset performance counters (development only)

## Performance Thresholds

| Metric | Threshold | Action |
|--------|-----------|---------|
| Response Time | > 1000ms | Log as slow request |
| Memory Usage | > 1GB | Log warning |
| Error Rate | > 5% | Alert |
| Database Connection | Disconnected | Health check fails |

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