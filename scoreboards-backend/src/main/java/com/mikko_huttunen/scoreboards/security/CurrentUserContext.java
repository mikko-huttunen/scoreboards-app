package com.mikko_huttunen.scoreboards.security;

import com.mikko_huttunen.scoreboards.models.User;
import com.mikko_huttunen.scoreboards.util.QueryBuilder;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.aggregation.Aggregation;
import org.springframework.stereotype.Component;
import org.springframework.web.context.annotation.RequestScope;

@Component
@RequestScope
public class CurrentUserContext {

    private final AuthProvider authProvider;
    private final MongoTemplate mongoTemplate;
    private final QueryBuilder queryBuilder;

    private User currentUser;

    public CurrentUserContext(
            AuthProvider authProvider,
            MongoTemplate mongoTemplate,
            QueryBuilder queryBuilder) {
        this.authProvider = authProvider;
        this.mongoTemplate = mongoTemplate;
        this.queryBuilder = queryBuilder;
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

        Aggregation aggregation = queryBuilder.userWithMembershipsByAuth0IdQuery(auth0UserId);

        User user = mongoTemplate.aggregate(aggregation, User.class, User.class).getUniqueMappedResult();
        if (user == null) {
            throw new IllegalArgumentException("User is not authorized");
        }

        this.currentUser = user;
    }
}