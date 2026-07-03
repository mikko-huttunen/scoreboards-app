package com.mikko_huttunen.scoreboards.security;

import com.mikko_huttunen.scoreboards.models.Membership;
import com.mikko_huttunen.scoreboards.models.User;
import org.bson.Document;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.convert.MongoConverter;
import org.springframework.data.mongodb.core.aggregation.Aggregation;
import org.springframework.data.mongodb.core.aggregation.AggregationOperation;
import org.springframework.data.mongodb.core.aggregation.AggregationResults;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.stereotype.Component;
import org.springframework.web.context.annotation.RequestScope;

import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Component
@RequestScope
public class CurrentUserContext {

    private final AuthProvider authProvider;
    private final MongoTemplate mongoTemplate;
    private final MongoConverter mongoConverter;

    private User currentUser;

    public CurrentUserContext(
            AuthProvider authProvider,
            MongoTemplate mongoTemplate,
            MongoConverter mongoConverter) {
        this.authProvider = authProvider;
        this.mongoTemplate = mongoTemplate;
        this.mongoConverter = mongoConverter;
    }

    public User requireCurrentUser() {
        if (currentUser != null) {
            return currentUser;
        }

        return refresh();
    }

    public User refresh() {
        loadUser();
        return currentUser;
    }

    public void clear() {
        currentUser = null;
    }

    private void loadUser() {
        String auth0UserId = authProvider.requireAuth0UserId();

        AggregationOperation matchUser = Aggregation.match(
                Criteria.where("auth0Id").is(auth0UserId)
                        .and("isActive").is(true)
        );

        //Fetch the user and their active memberships via $lookup
        AggregationOperation lookupMemberships = _ -> new Document("$lookup", new Document()
                .append("from", "Membership")
                .append("let", new Document("userId", "$_id"))
                .append("pipeline", List.of(
                        new Document("$match", new Document("$expr", new Document("$and", List.of(
                                new Document("$eq", List.of("$userId", "$$userId")),
                                new Document("$eq", List.of("$isActive", true))
                        ))))
                ))
                .append("as", "memberships")
        );

        AggregationOperation project = _ -> new Document("$project", new Document()
                .append("user", "$$ROOT")
                .append("memberships", 1)
        );

        Aggregation aggregation = Aggregation.newAggregation(matchUser, lookupMemberships, project);

        AggregationResults<Document> results =
                mongoTemplate.aggregate(aggregation, "User", Document.class);

        Document doc = results.getUniqueMappedResult();
        if (doc == null || doc.get("user") == null) {
            throw new IllegalArgumentException("User is not authorized");
        }

        // Use injected MongoConverter (no mongoTemplate.getConverter())
        Document userDoc = (Document) doc.get("user");
        this.currentUser = mongoConverter.read(User.class, userDoc);

        Object membershipsRaw = doc.get("memberships");
        if (membershipsRaw == null) {
            this.currentUser.setMemberships(Set.of());
            return;
        }

        // $lookup returns an array of documents -> convert each entry
        @SuppressWarnings("unchecked")
        List<Document> membershipDocs = (List<Document>) membershipsRaw;

        Set<Membership> memberships = membershipDocs.stream()
                .map(m -> mongoConverter.read(Membership.class, m))
                .collect(Collectors.toSet());

        this.currentUser.setMemberships(memberships);
    }
}