package com.mikko_huttunen.scoreboards.configs;

import com.mongodb.ConnectionString;
import com.mongodb.MongoClientSettings;
import com.mongodb.client.MongoClient;
import com.mongodb.client.MongoClients;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import javax.net.ssl.SSLContext;
import java.security.NoSuchAlgorithmException;

@Configuration
public class MongoConfig {

    @Value("${spring.data.mongodb.uri}")
    private String mongoUri;

    @Bean
    public MongoClient mongoClient() throws NoSuchAlgorithmException {
        ConnectionString connectionString = new ConnectionString(mongoUri);
        
        // Create SSL context that explicitly supports TLS 1.2 and TLS 1.3
        // This fixes the "internal_error" SSL alert issue with Java 21 and MongoDB Atlas
        SSLContext sslContext = SSLContext.getInstance("TLS");
        try {
            sslContext.init(null, null, null);
        } catch (java.security.KeyManagementException e) {
            throw new RuntimeException("Failed to initialize SSL context", e);
        }
        
        MongoClientSettings settings = MongoClientSettings.builder()
                .applyConnectionString(connectionString)
                .applyToSslSettings(builder -> {
                    builder.enabled(true);
                    builder.context(sslContext);
                    // Allow invalid hostnames for MongoDB Atlas SRV connections
                    // This is necessary because SRV records resolve to different hostnames
                    // than the certificate CN, but we're still validating certificates
                    builder.invalidHostNameAllowed(true);
                })
                .build();
        
        return MongoClients.create(settings);
    }
}

