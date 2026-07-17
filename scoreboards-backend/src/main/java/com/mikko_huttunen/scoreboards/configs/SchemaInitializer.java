package com.mikko_huttunen.scoreboards.configs;

import com.mongodb.client.MongoDatabase;
import org.bson.Document;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.mongodb.core.MongoTemplate;

import java.util.Arrays;

@Configuration
public class SchemaInitializer {

    @Bean
    public CommandLineRunner initDatabase(MongoTemplate mongoTemplate) {
        return args -> {
            applySchema(mongoTemplate, "User", createUserSchema());
            applySchema(mongoTemplate, "Scoreboard", createScoreboardSchema());
            applySchema(mongoTemplate, "Membership", createMembershipSchema());
            applySchema(mongoTemplate, "Invitation", createInvitationSchema());
            applySchema(mongoTemplate, "Session", createSessionSchema());
            applySchema(mongoTemplate, "PointCategory", createPointCategorySchema());
            applySchema(mongoTemplate, "ResultEntry", createResultEntrySchema());
        };
    }

    private void applySchema(MongoTemplate mongoTemplate, String collectionName, Document schema) {
        if (!mongoTemplate.collectionExists(collectionName)) {
            mongoTemplate.createCollection(collectionName);
        }

        MongoDatabase db = mongoTemplate.getDb();
        Document command = new Document("collMod", collectionName)
                .append("validator", new Document("$jsonSchema", schema))
                .append("validationLevel", "strict")
                .append("validationAction", "error");
        
        try {
            db.runCommand(command);
            System.out.println("Applied JSON schema validation to collection: " + collectionName);
        } catch (Exception e) {
            System.err.println("Failed to apply schema to " + collectionName + ": " + e.getMessage());
        }
    }

    private Document createUserSchema() {
        return new Document("bsonType", "object")
                .append("required", Arrays.asList("auth0Id", "name", "email", "isActive"))
                .append("properties", new Document()
                        .append("auth0Id", new Document("bsonType", "string"))
                        .append("name", new Document("bsonType", "string"))
                        .append("email", new Document("bsonType", "string")
                                .append("pattern", "^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,6}$"))
                        .append("emailVerified", new Document("bsonType", "bool"))
                        .append("avatar", new Document("bsonType", "string"))
                        .append("isActive", new Document("bsonType", "bool"))
                        .append("type", new Document("bsonType", "string"))
                        .append("created", new Document("bsonType", "date"))
                        .append("lastModified", new Document("bsonType", "date"))
                        .append("createdBy", new Document("bsonType", "string"))
                );
    }

    private Document createScoreboardSchema() {
        return new Document("bsonType", "object")
                .append("required", Arrays.asList("name", "memberships", "pointCategories", "isActive"))
                .append("properties", new Document()
                        .append("name", new Document("bsonType", "string"))
                        .append("memberships", new Document("bsonType", "array"))
                        .append("pointCategories", new Document("bsonType", "array"))
                        .append("sessions", new Document("bsonType", "array"))
                        .append("resultEntries", new Document("bsonType", "array"))
                        .append("isActive", new Document("bsonType", "bool"))
                        .append("type", new Document("bsonType", "string"))
                        .append("created", new Document("bsonType", "date"))
                        .append("lastModified", new Document("bsonType", "date"))
                        .append("createdBy", new Document("bsonType", "string"))
                );
    }

    private Document createMembershipSchema() {
        return new Document("bsonType", "object")
                .append("required", Arrays.asList("scoreboardId", "userId", "permissions", "isActive"))
                .append("properties", new Document()
                        .append("scoreboardId", new Document("bsonType", "string"))
                        .append("userId", new Document("bsonType", "string"))
                        .append("permissions", new Document("bsonType", "array")
                                .append("items", new Document("enum", Arrays.asList("OWNER", "SESSIONS"))))
                        .append("isActive", new Document("bsonType", "bool"))
                        .append("type", new Document("bsonType", "string"))
                        .append("created", new Document("bsonType", "date"))
                        .append("lastModified", new Document("bsonType", "date"))
                        .append("createdBy", new Document("bsonType", "string"))
                );
    }

    private Document createInvitationSchema() {
        return new Document("bsonType", "object")
                .append("required", Arrays.asList("receiverId", "scoreboardId", "isActive"))
                .append("properties", new Document()
                        .append("receiverId", new Document("bsonType", "string"))
                        .append("receiverName", new Document("bsonType", "string"))
                        .append("inviterName", new Document("bsonType", "string"))
                        .append("scoreboardId", new Document("bsonType", "string"))
                        .append("scoreboardName", new Document("bsonType", "string"))
                        .append("permissions", new Document("bsonType", "array")
                                .append("items", new Document("enum", Arrays.asList("OWNER", "SESSIONS"))))
                        .append("acceptedDate", new Document("bsonType", Arrays.asList("date", "null")))
                        .append("isActive", new Document("bsonType", "bool"))
                        .append("type", new Document("bsonType", "string"))
                        .append("created", new Document("bsonType", "date"))
                        .append("lastModified", new Document("bsonType", "date"))
                        .append("createdBy", new Document("bsonType", "string"))
                );
    }

    private Document createSessionSchema() {
        return new Document("bsonType", "object")
                .append("required", Arrays.asList("scoreboardId", "name", "isPending", "participants", "pointCategories", "isActive"))
                .append("properties", new Document()
                        .append("scoreboardId", new Document("bsonType", "string"))
                        .append("name", new Document("bsonType", "string"))
                        .append("comment", new Document("bsonType", "string"))
                        .append("createdByName", new Document("bsonType", "string"))
                        .append("isPending", new Document("bsonType", "bool"))
                        .append("participants", new Document("bsonType", "array")
                                .append("items", new Document("bsonType", "string")))
                        .append("pointCategories", new Document("bsonType", "array")
                                .append("items", new Document("bsonType", "string")))
                        .append("resultEntries", new Document("bsonType", "array")
                                .append("items", new Document("bsonType", "string")))
                        .append("isActive", new Document("bsonType", "bool"))
                        .append("type", new Document("bsonType", "string"))
                        .append("created", new Document("bsonType", "date"))
                        .append("lastModified", new Document("bsonType", "date"))
                        .append("createdBy", new Document("bsonType", "string"))
                );
    }

    private Document createPointCategorySchema() {
        return new Document("bsonType", "object")
                .append("required", Arrays.asList("name", "scoreboardId", "color", "isActive"))
                .append("properties", new Document()
                        .append("name", new Document("bsonType", "string"))
                        .append("scoreboardId", new Document("bsonType", "string"))
                        .append("color", new Document("bsonType", "string")
                                .append("pattern", "^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$"))
                        .append("isActive", new Document("bsonType", "bool"))
                        .append("type", new Document("bsonType", "string"))
                        .append("created", new Document("bsonType", "date"))
                        .append("lastModified", new Document("bsonType", "date"))
                        .append("createdBy", new Document("bsonType", "string"))
                );
    }

    private Document createResultEntrySchema() {
        return new Document("bsonType", "object")
                .append("required", Arrays.asList("scoreboardId", "sessionId", "userId", "isPending", "results", "totalPoints", "isActive"))
                .append("properties", new Document()
                        .append("scoreboardId", new Document("bsonType", "string"))
                        .append("sessionId", new Document("bsonType", "string"))
                        .append("userId", new Document("bsonType", "string"))
                        .append("isPending", new Document("bsonType", "bool"))
                        .append("results", new Document("bsonType", "array")
                                .append("items", new Document("bsonType", "object")
                                        .append("required", Arrays.asList("pointCategoryId", "points"))
                                        .append("properties", new Document()
                                                .append("pointCategoryId", new Document("bsonType", "string"))
                                                .append("points", new Document("bsonType", "double"))
                                        )))
                        .append("totalPoints", new Document("bsonType", "double"))
                        .append("isActive", new Document("bsonType", "bool"))
                        .append("type", new Document("bsonType", "string"))
                        .append("created", new Document("bsonType", "date"))
                        .append("lastModified", new Document("bsonType", "date"))
                        .append("createdBy", new Document("bsonType", "string"))
                );
    }
}
