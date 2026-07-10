package com.mikko_huttunen.scoreboards.util;

import org.bson.Document;
import org.springframework.data.mongodb.core.aggregation.Aggregation;
import org.springframework.data.mongodb.core.aggregation.AggregationOperation;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Set;

import static org.springframework.data.mongodb.core.aggregation.Aggregation.lookup;
import static org.springframework.data.mongodb.core.aggregation.Aggregation.match;

@Component
public class QueryBuilder {

    public QueryBuilder() {}

    /**
     * Fetch all users of a scoreboard with all the memberships where user ID matches.
     */
    public Aggregation usersWithMembershipsByScoreboardIdQuery(String scoreboardId) {
        AggregationOperation matchMemberships = match(
                Criteria.where("scoreboardId").is(scoreboardId)
                        .and("isActive").is(true)
        );

        AggregationOperation lookupUsers = lookup(
                "User",
                "userId",
                "_id",
                "user"
        );

        AggregationOperation unwindUser = _ -> new Document("$unwind", "$user");

        AggregationOperation groupByUser = context -> new Document("$group", new Document()
                .append("_id", "$user._id")
                .append("user", new Document("$first", "$user"))
                .append("memberships", new Document("$push", "$$ROOT"))
        );

        AggregationOperation replaceRoot = context -> new Document("$replaceRoot", new Document()
                .append("newRoot", new Document()
                        .append("$mergeObjects", List.of("$user", new Document("memberships", "$memberships")))
                )
        );

        AggregationOperation sortUsers = _ -> new Document("$sort", new Document("name", 1));

        return Aggregation.newAggregation(
                matchMemberships,
                lookupUsers,
                unwindUser,
                groupByUser,
                replaceRoot,
                sortUsers
        );
    }

    /**
     * Fetch a single user with all memberships where Auth0 ID matches.
     */
    public Aggregation userWithMembershipsByAuth0IdQuery(String auth0Id) {
        return Aggregation.newAggregation(
                match(Criteria.where("auth0Id").is(auth0Id).and("isActive").is(true)),
                lookup("Membership", "_id", "userId", "memberships"),
                context -> new Document("$set", new Document("memberships",
                        new Document("$filter", new Document()
                                .append("input", "$memberships")
                                .append("as", "m")
                                .append("cond", new Document("$eq", List.of("$$m.isActive", true)))
                        )
                ))
        );
    }

    /**
     * Fetch a scoreboard with all memberships and sessions where user ID matches,
     * then attach those memberships and sessions to each matching scoreboard.
     */
    public Aggregation scoreboardsWithPartialDataQuery(Set<String> scoreboardIds) {
        return Aggregation.newAggregation(
                match(Criteria.where("_id").in(scoreboardIds).and("isActive").is(true)),
                lookup("Membership", "_id", "scoreboardId", "memberships"),
                context -> new Document("$set", new Document("memberships",
                        new Document("$filter", new Document()
                                .append("input", "$memberships")
                                .append("as", "m")
                                .append("cond", new Document("$eq", List.of("$$m.isActive", true)))
                        )
                )),
                lookup("Session", "_id", "scoreboardId", "sessions"),
                context -> new Document("$set", new Document("sessions",
                        new Document("$sortArray", new Document()
                                .append("input",
                                        new Document("$filter", new Document()
                                                .append("input", "$sessions")
                                                .append("as", "s")
                                                .append("cond", new Document("$eq", List.of("$$s.isActive", true)))
                                        )
                                )
                                .append("sortBy", new Document("lastModified", -1))
                        )
                ))
        );
    }

    /**
     * Fetch a scoreboard with point categories, memberships, sessions, and result entries
     * where scoreboard ID matches.
     */
    public Aggregation scoreboardWithDataQuery(String scoreboardId) {
        AggregationOperation matchScoreboard = match(
                Criteria.where("_id").is(scoreboardId)
                        .and("isActive").is(true)
        );

        AggregationOperation lookupMemberships = context -> new Document("$lookup", new Document()
                .append("from", "Membership")
                .append("let", new Document("scoreboardId", "$_id"))
                .append("pipeline", List.of(
                        new Document("$match", new Document("$expr", new Document("$and", List.of(
                                new Document("$eq", List.of("$scoreboardId", "$$scoreboardId")),
                                new Document("$eq", List.of("$isActive", true))
                        ))))
                ))
                .append("as", "memberships")
        );

        AggregationOperation lookupPointCategories = context -> new Document("$lookup", new Document()
                .append("from", "PointCategory")
                .append("let", new Document("scoreboardId", "$_id"))
                .append("pipeline", List.of(
                        new Document("$match", new Document("$expr", new Document("$and", List.of(
                                new Document("$eq", List.of("$scoreboardId", "$$scoreboardId")),
                                new Document("$eq", List.of("$isActive", true))
                        ))))
                ))
                .append("as", "pointCategories")
        );

        AggregationOperation lookupSessions = context -> new Document("$lookup", new Document()
                .append("from", "Session")
                .append("let", new Document("scoreboardId", "$_id"))
                .append("pipeline", List.of(
                        new Document("$match", new Document("$expr", new Document("$and", List.of(
                                new Document("$eq", List.of("$scoreboardId", "$$scoreboardId")),
                                new Document("$eq", List.of("$isActive", true))
                        )))),
                        new Document("$sort", new Document("lastModified", -1))
                ))
                .append("as", "sessions")
        );

        AggregationOperation lookupResultEntries = context -> new Document("$lookup", new Document()
                .append("from", "ResultEntry")
                .append("let", new Document("scoreboardId", "$_id"))
                .append("pipeline", List.of(
                        new Document("$match", new Document("$expr", new Document("$and", List.of(
                                new Document("$eq", List.of("$scoreboardId", "$$scoreboardId")),
                                new Document("$eq", List.of("$isActive", true))
                        ))))
                ))
                .append("as", "resultEntries")
        );

        AggregationOperation addCreatedByIdsFromSessions = context -> new Document("$addFields", new Document()
                .append("createdByIds",
                        new Document("$setUnion", List.of(
                                new Document("$map", new Document()
                                        .append("input", "$sessions")
                                        .append("as", "s")
                                        .append("in", "$$s.createdBy")
                                )
                        ))
                )
        );

        AggregationOperation lookupUsersForSessionCreators = context -> new Document("$lookup", new Document()
                .append("from", "User")
                .append("let", new Document("createdByIds", "$createdByIds"))
                .append("pipeline", List.of(
                        new Document("$match", new Document("$expr", new Document("$in", List.of("$_id", "$$createdByIds"))))
                ))
                .append("as", "createdByUsers")
        );

        AggregationOperation setSessionsWithCreatedByName = context -> new Document("$set", new Document()
                .append("sessions",
                        new Document("$map", new Document()
                                .append("input", "$sessions") // ✅ already sorted by $sort above
                                .append("as", "s")
                                .append("in", new Document("$mergeObjects", List.of(
                                        "$$s",
                                        new Document("createdByName",
                                                new Document("$let", new Document()
                                                        .append("vars", new Document("u", new Document("$arrayElemAt", List.of(
                                                                new Document("$filter", new Document()
                                                                        .append("input", "$createdByUsers")
                                                                        .append("as", "cu")
                                                                        .append("cond", new Document("$eq", List.of("$$cu._id", "$$s.createdBy")))
                                                                ),
                                                                0
                                                        ))))
                                                        .append("in", "$$u.name")
                                                )
                                        ),
                                        new Document("resultEntries",
                                                new Document("$map", new Document()
                                                        .append("input", new Document("$filter", new Document()
                                                                .append("input", "$resultEntries")
                                                                .append("as", "re")
                                                                .append("cond", new Document("$eq", List.of("$$re.sessionId", "$$s._id")))
                                                        ))
                                                        .append("as", "re")
                                                        .append("in", "$$re._id")
                                                )
                                        )))
                                )
                        )
                )
                // optional: keep createdByUsers out of response
                .append("createdByUsers", "$$REMOVE")
        );

        return Aggregation.newAggregation(
                matchScoreboard,
                lookupMemberships,
                lookupPointCategories,
                lookupSessions,
                lookupResultEntries,

                addCreatedByIdsFromSessions,
                lookupUsersForSessionCreators,
                setSessionsWithCreatedByName
        );
    }

    public Aggregation sessionsWithResolvedCreatedByNamesQuery(Set<String> sessionIds) {
        AggregationOperation matchSessions = match(
                Criteria.where("_id").in(sessionIds)
                        .and("isActive").is(true)
        );

        AggregationOperation lookupSessionCreatorUser = lookup(
                "User",
                "createdBy",
                "_id",
                "createdByUser"
        );

        AggregationOperation setCreatedByName = _ -> new Document("$set", new Document()
                .append("createdByName", new Document("$arrayElemAt",
                        List.of("$createdByUser.name", 0)
                ))
        );

        AggregationOperation sort = _ -> new Document("$sort", new Document("name", 1));

        return Aggregation.newAggregation(
                matchSessions,
                lookupSessionCreatorUser,
                setCreatedByName,
                sort
        );
    }

    /**
     * Fetch session with point categories and result entries where session ID matches.
     * Also resolves createdByName by looking up the User document by createdBy.
     */
    public Aggregation sessionWithPointCategoriesAndResultEntriesQuery(String sessionId) {
        AggregationOperation matchSession = match(
                Criteria.where("_id").is(sessionId)
                        .and("isActive").is(true)
        );

        AggregationOperation lookupPointCategories = context -> new Document("$lookup", new Document()
                .append("from", "PointCategory")
                .append("let", new Document("scoreboardId", "$scoreboardId"))
                .append("pipeline", List.of(
                        new Document("$match", new Document("$expr", new Document("$and", List.of(
                                new Document("$eq", List.of("$scoreboardId", "$$scoreboardId")),
                                new Document("$eq", List.of("$isActive", true))
                        ))))
                ))
                .append("as", "pointCategoryDetails")
        );

        AggregationOperation lookupResultEntries = context -> new Document("$lookup", new Document()
                .append("from", "ResultEntry")
                .append("let", new Document("sessionId", "$_id"))
                .append("pipeline", List.of(
                        new Document("$match", new Document("$expr", new Document("$and", List.of(
                                new Document("$eq", List.of("$sessionId", "$$sessionId")),
                                new Document("$eq", List.of("$isActive", true))
                        ))))
                ))
                .append("as", "resultEntryDetails")
        );

        AggregationOperation lookupCreatedByUser = lookup(
                "User",
                "createdBy",
                "_id",
                "createdByUser"
        );

        AggregationOperation setCreatedByName = _ -> new Document("$set", new Document()
                .append("createdByName", new Document("$arrayElemAt",
                        List.of("$createdByUser.name", 0)
                ))
        );

        AggregationOperation sort = _ -> new Document("$sort", new Document("name", 1));

        return Aggregation.newAggregation(
                matchSession,
                lookupPointCategories,
                lookupResultEntries,
                lookupCreatedByUser,
                setCreatedByName,
                sort
        );
    }

    private List<AggregationOperation> addInvitationUsernameLookupsAndSetNames() {
        AggregationOperation lookupReceiverUser = lookup(
                "User",
                "receiverId",
                "_id",
                "receiverUser"
        );

        AggregationOperation lookupInviterUser = lookup(
                "User",
                "createdBy",
                "_id",
                "inviterUser"
        );

        AggregationOperation setReceiverAndInviterNames = _ -> new Document("$set", new Document()
                .append("receiverName", new Document("$arrayElemAt",
                        List.of("$receiverUser.name", 0)
                ))
                .append("inviterName", new Document("$arrayElemAt",
                        List.of("$inviterUser.name", 0)
                ))
        );

        return List.of(
                lookupReceiverUser,
                lookupInviterUser,
                setReceiverAndInviterNames
        );
    }

    /**
     * Fetch invitations for multiple users and ensure receiverName / inviterName are refreshed from User.
     * Uses receiverId and createdBy to resolve the latest usernames.
     */
    public Aggregation invitationsWithUsernamesByUserIdQuery(Set<String> userIds) {
        Criteria criteria = new Criteria().orOperator(
                Criteria.where("receiverId").in(userIds),
                Criteria.where("createdBy").in(userIds)
        ).andOperator(Criteria.where("isActive").is(true));

        List<AggregationOperation> pipeline = new ArrayList<>();
        pipeline.add(match(criteria));
        pipeline.addAll(addInvitationUsernameLookupsAndSetNames());

        return Aggregation.newAggregation(pipeline);
    }

    /**
     * Fetch a single invitation by invitationId and ensure receiverName / inviterName are refreshed from User.
     * Username resolution is performed after fetching by resolving receiverId/createdBy -> User.
     */
    public Aggregation invitationWithUsernamesByInvitationIdQuery(String invitationId) {
        Criteria criteria = Criteria.where("_id").is(invitationId).and("isActive").is(true);

        List<AggregationOperation> pipeline = new ArrayList<>();
        pipeline.add(match(criteria));
        pipeline.addAll(addInvitationUsernameLookupsAndSetNames());

        return Aggregation.newAggregation(pipeline);
    }
}