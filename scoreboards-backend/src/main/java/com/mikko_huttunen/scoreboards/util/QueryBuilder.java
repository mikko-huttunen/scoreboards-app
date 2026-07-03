package com.mikko_huttunen.scoreboards.util;

import org.springframework.data.mongodb.core.aggregation.Aggregation;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.stereotype.Component;

import static org.springframework.data.mongodb.core.aggregation.Aggregation.lookup;
import static org.springframework.data.mongodb.core.aggregation.Aggregation.match;

@Component
public class QueryBuilder {

    public QueryBuilder() {}

    /**
     * Fetch all users of a scoreboard with all the memberships where user ID matches.
     */
    public Aggregation usersWithMembershipsByScoreboardIdQuery(String scoreboardId) {
        return Aggregation.newAggregation(
                match(Criteria.where("isActive").is(true)),
                lookup("Membership", "_id", "userId", "memberships"),
                match(Criteria.where("memberships.scoreboardId").is(scoreboardId))
        );
    }

    /**
     * Fetch a single user with all memberships where Auth0 ID matches.
     */
    public Aggregation userWithMembershipsByAuth0IdQuery(String auth0Id) {
        return Aggregation.newAggregation(
                match(Criteria.where("auth0Id").is(auth0Id).and("isActive").is(true)),
                lookup("Membership", "_id", "userId", "memberships")
        );
    }

    /**
     * Fetch a scoreboard with all memberships where scoreboard ID matches.
     */
    public Aggregation scoreboardWithMembershipsQuery(String scoreboardId) {
        return Aggregation.newAggregation(
                match(Criteria.where("_id").is(scoreboardId).and("isActive").is(true)),
                lookup("Membership", "_id", "scoreboardId", "memberships")
        );
    }

    /**
     * Fetch a scoreboard with point categories, memberships, sessions and result entries
     * where scoreboard ID matches.
     */
    public Aggregation scoreboardWithDataQuery(String scoreboardId) {
        return Aggregation.newAggregation(
                match(Criteria.where("_id").is(scoreboardId).and("isActive").is(true)),
                lookup("Membership", "_id", "scoreboardId", "memberships"),
                lookup("PointCategory", "_id", "scoreboardId", "pointCategories"),
                lookup("Session", "_id", "scoreboardId", "sessions"),
                lookup("ResultEntry", "_id", "scoreboardId", "resultEntries")
        );
    }

    /**
     * Fetch a scoreboard with point categories where scoreboard ID matches.
     */
    public Aggregation scoreboardWithPointCategoriesQuery(String scoreboardId) {
        return Aggregation.newAggregation(
                match(Criteria.where("_id").is(scoreboardId).and("isActive").is(true)),
                lookup("PointCategory", "_id", "scoreboardId", "pointCategories")
        );
    }

    /**
     * Fetch session with point categories where scoreboard ID matches
     * and with result entries where session ID matches.
     */
    public Aggregation sessionWithPointCategoriesAndResultEntriesQuery(String scoreboardId, String sessionId) {
        return Aggregation.newAggregation(
                match(Criteria.where("_id").is(sessionId)
                        .and("scoreboardId").is(scoreboardId)
                        .and("isActive").is(true)),
                lookup("PointCategory", "pointCategories", "_id", "pointCategoryDetails"),
                lookup("ResultEntry", "_id", "sessionId", "resultEntryDetails")
        );
    }

    /**
     * Fetch invitations for a user and ensure receiverName / inviterName are refreshed from User.
     * Uses receiverId and createdBy to resolve the latest usernames.
     */
    public Query invitationsWithUserNamesQuery(String userId) {
        return new Query(new Criteria().andOperator(
                Criteria.where("isActive").is(true),
                new Criteria().orOperator(
                        Criteria.where("receiverId").is(userId),
                        Criteria.where("createdBy").is(userId)
                )
        ));
    }
}