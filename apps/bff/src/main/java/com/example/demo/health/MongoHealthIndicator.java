package com.example.demo.health;

import lombok.extern.slf4j.Slf4j;
import org.bson.Document;
import org.springframework.boot.actuate.health.Health;
import org.springframework.boot.actuate.health.ReactiveHealthIndicator;
import org.springframework.data.mongodb.core.ReactiveMongoTemplate;
import org.springframework.stereotype.Component;
import reactor.core.publisher.Mono;

/**
 * Custom Reactive Health Indicator for MongoDB
 * Checks connectivity and provides detailed status information
 */
@Slf4j
@Component
public class MongoHealthIndicator implements ReactiveHealthIndicator {

    private final ReactiveMongoTemplate reactiveMongoTemplate;

    public MongoHealthIndicator(ReactiveMongoTemplate reactiveMongoTemplate) {
        this.reactiveMongoTemplate = reactiveMongoTemplate;
    }

    @Override
    public Mono<Health> health() {
        return Mono.defer(() -> {
            // Execute ping command to check connectivity
            Document pingCommand = new Document("ping", 1);

            return reactiveMongoTemplate.executeCommand(pingCommand)
                    .flatMap(result -> {
                        // Get database name
                        String databaseName = reactiveMongoTemplate.getMongoDatabase()
                                .block().getName();

                        // Count collections as additional health check
                        return reactiveMongoTemplate.getCollectionNames()
                                .collectList()
                                .map(collections -> {
                                    log.debug("MongoDB health check passed - Database: {}, Collections: {}",
                                            databaseName, collections.size());

                                    return Health.up()
                                            .withDetail("database", databaseName)
                                            .withDetail("collections", collections.size())
                                            .withDetail("status", "Connected")
                                            .build();
                                });
                    })
                    .onErrorResume(e -> {
                        log.error("MongoDB health check failed", e);
                        return Mono.just(Health.down()
                                .withDetail("error", e.getClass().getSimpleName())
                                .withDetail("message", e.getMessage())
                                .build());
                    });
        });
    }
}
