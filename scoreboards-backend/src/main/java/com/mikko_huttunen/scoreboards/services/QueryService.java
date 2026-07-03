package com.mikko_huttunen.scoreboards.services;

import com.mikko_huttunen.scoreboards.models.*;
import com.mikko_huttunen.scoreboards.security.AccessControlValidator;
import com.mikko_huttunen.scoreboards.security.CurrentUserContext;
import com.mikko_huttunen.scoreboards.util.QueryBuilder;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.aggregation.Aggregation;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.lang.reflect.Field;
import java.util.*;
import java.util.stream.Collectors;

import static org.springframework.data.mongodb.core.BulkOperations.BulkMode.UNORDERED;

/**
 * Query service for globally reusable MongoDB CRUD and aggregation queries.
 * Uses MongoTemplate directly so it can operate across multiple collections.
 */
@Service
public class QueryService {

    private static final Logger logger = LoggerFactory.getLogger(QueryService.class);
    private final MongoTemplate mongoTemplate;
    private final AccessControlValidator accessControlValidator;
    private final CurrentUserContext currentUserContext;
    private final QueryBuilder queryBuilder;

    @Autowired
    public QueryService(MongoTemplate mongoTemplate, AccessControlValidator accessControlValidator, CurrentUserContext currentUserContext, QueryBuilder queryBuilder) {
        this.mongoTemplate = mongoTemplate;
        this.accessControlValidator = accessControlValidator;
        this.currentUserContext = currentUserContext;
        this.queryBuilder = queryBuilder;
    }

    // -------------------------------------------------------------------------
    // Generic CRUD / query helpers
    // -------------------------------------------------------------------------

    @Transactional
    public <T extends Auditable> T create(T entity) {
        return create(List.of(entity)).getFirst();
    }

    @Transactional
    public <T extends Auditable> List<T> create(List<T> entities) {
        for (T entity : entities) {
            setAuditableFields(entity);
            accessControlValidator.validateWriteAccess(entity);
        }

        Collection<T> savedDocuments = mongoTemplate.insertAll(entities);
        List<T> savedDocumentsList = (savedDocuments instanceof List<T> list)
                ? list
                : new ArrayList<>(savedDocuments);

        Class<?> documentClass = savedDocumentsList.getFirst().getClass();

        // Clear the cached user context after creating membership
        if (documentClass == Membership.class) {
            currentUserContext.clear();
        }

        logger.info("Created {} documents of type {} with IDs {}",
                savedDocumentsList.size(),
                documentClass.getSimpleName(),
                savedDocumentsList.stream().map(this::getId).collect(Collectors.toList()));

        return savedDocumentsList;
    }

    @Transactional
    public <T extends Auditable> Optional<T> findById(String id, Class<T> entityClass, boolean includeDeleted) {
        return findById(id, entityClass, includeDeleted, true);
    }

    @Transactional
    private <T extends Auditable> Optional<T> findById(String id, Class<T> entityClass, boolean includeDeleted, boolean validateAccess) {
        Query query = new Query(Criteria.where("_id").is(id));
        addisActiveFilter(query, entityClass, includeDeleted);

        T document = mongoTemplate.findOne(query, entityClass);

        if (validateAccess) accessControlValidator.validateReadAccess(document);

        return Optional.ofNullable(document);
    }

    @Transactional
    public <T extends Auditable> List<T> find(Query query, Class<T> entityClass, boolean includeDeleted) {
        return find(query, entityClass, includeDeleted, true);
    }

    @Transactional
    private <T extends Auditable> List<T> find(Query query, Class<T> entityClass, boolean includeDeleted, boolean validateAccess) {
        Query effectiveQuery = query == null ? new Query() : query;
        addisActiveFilter(effectiveQuery, entityClass, includeDeleted);

        List<T> documents = mongoTemplate.find(effectiveQuery, entityClass);

        if (validateAccess) accessControlValidator.validateReadAccess(documents);

        return documents;
    }

    @Transactional
    public <T extends Auditable> Optional<T> updateById(String id, Class<T> entityClass, DocumentUpdater<T> updater) {
        validateId(id);
        Query query = new Query(Criteria.where("_id").is(id));

        return Optional.of(update(query, entityClass, updater).getFirst());
    }

    @Transactional
    public <T extends Auditable> List<T> updateAll(Set<String> ids, Class<T> entityClass, DocumentUpdater<T> updater) {
        ids.forEach(this::validateId);
        Query query = new Query(Criteria.where("_id").in(ids));

        return update(query, entityClass, updater);
    }

    @Transactional
    public <T extends Auditable> List<T> update(Query query, Class<T> entityClass, DocumentUpdater<T> updater) {
        List<T> documents = find(query, entityClass, false, false);

        if (documents.isEmpty()) {
            return List.of();
        }

        var bulkOps = mongoTemplate.bulkOps(UNORDERED, entityClass);

        for (T document : documents) {
            accessControlValidator.validateWriteAccess(document);
            updater.update(document);
            updateLastModified(document);

            Object idValue = getId(document);
            Query byId = new Query(Criteria.where("_id").is(idValue));
            bulkOps.replaceOne(byId, document);
        }

        bulkOps.execute();

        if (entityClass == User.class || entityClass == Membership.class) {
            currentUserContext.clear();
        }

        logger.info("Updated {} documents of type {} with IDs {}",
                documents.size(),
                entityClass.getSimpleName(),
                documents.stream().map(this::getId).collect(Collectors.toList()));
        return documents;
    }

    @Transactional
    public <T extends Auditable> T deleteById(String id, Class<T> entityClass) {
        validateId(id);
        Query query = new Query(Criteria.where("_id").is(id));

        return delete(query, entityClass).getFirst();
    }

    @Transactional
    public <T extends Auditable> List<T> deleteAll(Set<String> ids, Class<T> entityClass) {
        ids.forEach(this::validateId);
        Query query = new Query(Criteria.where("_id").in(ids));

        return delete(query, entityClass);
    }
    @Transactional
    public <T extends Auditable> List<T> delete(Query query, Class<T> entityClass) {
        List<T> documents = find(query, entityClass, false, false);

        if (documents.isEmpty()) {
            return List.of();
        }

        var bulkOps = mongoTemplate.bulkOps(UNORDERED, entityClass);

        for (T document : documents) {
            accessControlValidator.validateDeleteAccess(document);
            updateLastModified(document);
            setInactive(document);

            Object idValue = getId(document);
            Query byId = new Query(Criteria.where("_id").is(idValue));
            bulkOps.replaceOne(byId, document);
        }

        bulkOps.execute();

        logger.info("Deleted {} documents of type {} with IDs {}",
                documents.size(),
                entityClass.getSimpleName(),
                documents.stream().map(this::getId).collect(Collectors.toList()));
        return documents;
    }

    // -------------------------------------------------------------------------
    // Fetch by Aggregation (supports $lookup)
    // -------------------------------------------------------------------------

    public <T> Optional<T> aggregate(Aggregation aggregation, Class<?> inputType, Class<T> outputType) {
        T mappedResults = mongoTemplate.aggregate(aggregation, inputType, outputType).getUniqueMappedResult();
        if (mappedResults == null) {
            return Optional.empty();
        }

        accessControlValidator.validateReadAccess(mappedResults);

        return Optional.of(mappedResults);
    }

    public <T> Optional<List<T>> aggregateList(Aggregation aggregation, Class<?> inputType, Class<T> outputType) {
        List<T> mappedResults = mongoTemplate.aggregate(aggregation, inputType, outputType).getMappedResults();
        if (mappedResults.isEmpty()) {
            return Optional.empty();
        }

        accessControlValidator.validateReadAccess(mappedResults);

        return Optional.of(mappedResults);
    }

    // -------------------------------------------------------------------------
    // Specialized lookup queries
    // -------------------------------------------------------------------------

    public Optional<List<User>> fetchUsersWithMembershipsByScoreboardId(String scoreboardId) {
        Aggregation aggregation = queryBuilder.usersWithMembershipsByScoreboardIdQuery(scoreboardId);

        Optional<List<User>> usersOpt = aggregateList(aggregation, User.class, User.class);
        usersOpt.ifPresent(users -> users.forEach(user -> user.setMemberships(
                user.getMemberships()
                        .stream()
                        .filter(membership -> Boolean.TRUE.equals(membership.getIsActive()))
                        .collect(LinkedHashSet::new, Set::add, Set::addAll)
        )));

        return usersOpt;
    }

    public Optional<User> fetchUserWithMembershipsByAuth0Id(String auth0Id) {
        Aggregation aggregation = queryBuilder.userWithMembershipsByAuth0IdQuery(auth0Id);

        Optional<User> userOpt = aggregate(aggregation, User.class, User.class);
        userOpt.ifPresent(user -> user.setMemberships(
                user.getMemberships()
                        .stream()
                        .filter(membership -> Boolean.TRUE.equals(membership.getIsActive()))
                        .collect(LinkedHashSet::new, Set::add, Set::addAll)
        ));

        return userOpt;
    }

    public Optional<Scoreboard> fetchScoreboardWithMemberships(String scoreboardId) {
        Aggregation aggregation = queryBuilder.scoreboardWithMembershipsQuery(scoreboardId);

        Optional<Scoreboard> scoreboardOpt = aggregate(aggregation, Scoreboard.class, Scoreboard.class);
        scoreboardOpt.ifPresent(scoreboard -> scoreboard.setMemberships(
                scoreboard.getMemberships()
                        .stream()
                        .filter(membership -> Boolean.TRUE.equals(membership.getIsActive()))
                        .toList()
        ));

        return scoreboardOpt;
    }

    public Optional<Scoreboard> fetchScoreboardWithData(String scoreboardId) {
        Aggregation aggregation = queryBuilder.scoreboardWithDataQuery(scoreboardId);

        Optional<Scoreboard> scoreboardOpt = aggregate(aggregation, Scoreboard.class, Scoreboard.class);
        scoreboardOpt.ifPresent(scoreboard -> {
            scoreboard.setMemberships(
                    scoreboard.getMemberships()
                            .stream()
                            .filter(membership -> Boolean.TRUE.equals(membership.getIsActive()))
                            .toList()
            );
            scoreboard.setPointCategories(
                    scoreboard.getPointCategories()
                            .stream()
                            .filter(pointCategory -> Boolean.TRUE.equals(pointCategory.getIsActive()))
                            .toList()
            );
            scoreboard.setSessions(
                    scoreboard.getSessions()
                            .stream()
                            .filter(session -> Boolean.TRUE.equals(session.getIsActive()))
                            .toList()
            );
            scoreboard.setResultEntries(
                    scoreboard.getResultEntries()
                            .stream()
                            .filter(resultEntry -> Boolean.TRUE.equals(resultEntry.getIsActive()))
                            .toList()
            );
        });

        return scoreboardOpt;
    }

    public Optional<Scoreboard> fetchScoreboardWithPointCategories(String scoreboardId) {
        Aggregation aggregation = queryBuilder.scoreboardWithPointCategoriesQuery(scoreboardId);

        Optional<Scoreboard> scoreboardOpt = aggregate(aggregation, Scoreboard.class, Scoreboard.class);
        scoreboardOpt.ifPresent(scoreboard -> scoreboard.setPointCategories(
                scoreboard.getPointCategories()
                        .stream()
                        .filter(pointCategory -> Boolean.TRUE.equals(pointCategory.getIsActive()))
                        .toList()
        ));

        return scoreboardOpt;
    }

    public Optional<Session.SessionDetails> fetchSessionWithPointCategoriesAndResultEntries(String scoreboardId, String sessionId) {
        Aggregation aggregation = queryBuilder.sessionWithPointCategoriesAndResultEntriesQuery(scoreboardId, sessionId);

        Optional<Session.SessionDetails> sessionOpt = aggregate(aggregation, Session.class, Session.SessionDetails.class);
        sessionOpt.ifPresent(session -> {
            session.setPointCategoryDetails(
                    session.getPointCategoryDetails()
                            .stream()
                            .filter(pointCategory -> Boolean.TRUE.equals(pointCategory.getIsActive()))
                            .toList()
            );
            session.setResultEntryDetails(
                    session.getResultEntryDetails()
                            .stream()
                            .filter(resultEntry -> Boolean.TRUE.equals(resultEntry.getIsActive()))
                            .toList()
            );
        });

        return sessionOpt;
    }

    public List<Invitation> fetchInvitationsWithResolvedUserNames(String userId) {
        Query invitationQuery = queryBuilder.invitationsWithUserNamesQuery(userId);

        List<Invitation> invitations = mongoTemplate.find(invitationQuery, Invitation.class);
        if (invitations.isEmpty()) {
            return List.of();
        }

        Set<String> userIds = new LinkedHashSet<>();
        for (Invitation invitation : invitations) {
            if (invitation.getReceiverId() != null) {
                userIds.add(invitation.getReceiverId());
            }
            if (invitation.getCreatedBy() != null) {
                userIds.add(invitation.getCreatedBy());
            }
        }

        Query userQuery = new Query(Criteria.where("_id").in(userIds).and("isActive").is(true));
        List<User> users = mongoTemplate.find(userQuery, User.class);

        Map<String, String> userNamesById = new HashMap<>();
        for (User user : users) {
            userNamesById.put(user.getId(), user.getName());
        }

        for (Invitation invitation : invitations) {
            String receiverName = userNamesById.get(invitation.getReceiverId());
            String inviterName = userNamesById.get(invitation.getCreatedBy());

            if (receiverName != null) {
                invitation.setReceiverName(receiverName);
            }
            if (inviterName != null) {
                invitation.setInviterName(inviterName);
            }
        }

        return invitations;
    }

    // -------------------------------------------------------------------------
    // Helper methods
    // -------------------------------------------------------------------------

    private <T extends Auditable> void setAuditableFields(T entity) {
        Date now = new Date();

        setId(entity);
        entity.setType(entity.getClass().getSimpleName());
        entity.setCreated(now);
        entity.setLastModified(now);
        entity.setCreatedBy(currentUserContext.requireCurrentUser().getId());
        entity.setIsActive(true);
    }

    private <T extends Auditable> void updateLastModified(T document) {
        document.setLastModified(new Date());
    }

    private <T extends Auditable> void setInactive(T document) {
        document.setIsActive(false);
    }

    private void validateId(String id) {
        if (id == null || id.trim().isEmpty()) {
            throw new IllegalArgumentException("Document ID cannot be null or empty");
        }
    }

    private <T> void setId(T document) {
        try {
            Field idField = getIdField(document.getClass());
            idField.setAccessible(true);
            // Check if the ID field is already set before setting a new one
            if (idField.get(document) != null) return;
            idField.set(document, UUID.randomUUID().toString());
        } catch (Exception e) {
            throw new IllegalArgumentException("Failed to assign document ID", e);
        }
    }

    private <T> Object getId(T document) {
        try {
            Field idField = getIdField(document.getClass());
            idField.setAccessible(true);
            return idField.get(document);
        } catch (Exception e) {
            throw new IllegalArgumentException("Failed to retrieve document ID", e);
        }
    }

    private Field getIdField(Class<?> documentClass) {
        Class<?> currentClass = documentClass;

        while (currentClass != null) {
            for (Field field : currentClass.getDeclaredFields()) {
                if ("id".equals(field.getName()) || field.isAnnotationPresent(Id.class)) {
                    return field;
                }
            }

            currentClass = currentClass.getSuperclass();
        }

        assert documentClass != null;
        throw new IllegalArgumentException("Document class does not contain an ID field: " + documentClass.getSimpleName());
    }

    private <T> void addisActiveFilter(Query query, Class<T> entityClass, boolean includeDeleted) {
        if (Auditable.class.isAssignableFrom(entityClass)) {
            query.addCriteria(Criteria.where("isActive").is(!includeDeleted));
        }
    }

    @FunctionalInterface
    public interface DocumentUpdater<T> {
        void update(T document);
    }
}