package com.example.demo.health;

import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.actuate.health.Health;
import org.springframework.boot.actuate.health.HealthIndicator;
import org.springframework.data.redis.connection.RedisConnection;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.stereotype.Component;

/**
 * Custom Health Indicator for Redis
 * Checks connectivity and provides detailed status information
 */
@Slf4j
@Component
public class RedisHealthIndicator implements HealthIndicator {

    private final RedisConnectionFactory redisConnectionFactory;

    public RedisHealthIndicator(RedisConnectionFactory redisConnectionFactory) {
        this.redisConnectionFactory = redisConnectionFactory;
    }

    @Override
    public Health health() {
        try {
            RedisConnection connection = redisConnectionFactory.getConnection();

            // Execute PING command
            String pong = connection.ping();

            // Get server info
            String serverInfo = "N/A";
            try {
                var properties = connection.serverCommands().info("server");
                if (properties != null) {
                    serverInfo = properties.getProperty("redis_version", "N/A");
                }
            } catch (Exception e) {
                log.debug("Unable to retrieve Redis server info", e);
            }

            // Get database size (number of keys)
            Long dbSize = connection.serverCommands().dbSize();

            connection.close();

            log.debug("Redis health check passed - Version: {}, Keys: {}", serverInfo, dbSize);

            return Health.up()
                    .withDetail("version", serverInfo)
                    .withDetail("keys", dbSize)
                    .withDetail("ping", pong)
                    .withDetail("status", "Connected")
                    .build();

        } catch (Exception e) {
            log.error("Redis health check failed", e);
            return Health.down()
                    .withDetail("error", e.getClass().getSimpleName())
                    .withDetail("message", e.getMessage())
                    .build();
        }
    }
}
