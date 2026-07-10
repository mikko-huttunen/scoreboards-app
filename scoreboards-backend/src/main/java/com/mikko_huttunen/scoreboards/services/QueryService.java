package com.mikko_huttunen.scoreboards.services;

import com.mikko_huttunen.scoreboards.dtos.SessionDTO;
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
import static org.springframework.data.mongodb.core.aggregation.Aggregation.match;

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
        if (!includeDeleted) {
            addisActiveFilter(query, entityClass, false);
        }

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
        if (!includeDeleted) {
            addisActiveFilter(query, entityClass, false);
        }

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

        return aggregateList(aggregation, Membership.class, User.class);
    }

    public Optional<List<Scoreboard>> fetchScoreboardsWithPartialData(Set<String> scoreboardIds) {
        Aggregation aggregation = queryBuilder.scoreboardsWithPartialDataQuery(scoreboardIds);

        return aggregateList(aggregation, Scoreboard.class, Scoreboard.class);
    }

    public Optional<Scoreboard> fetchScoreboardWithData(String scoreboardId) {
        Aggregation scoreboardAggregation = queryBuilder.scoreboardWithDataQuery(scoreboardId);

        return aggregate(scoreboardAggregation, Scoreboard.class, Scoreboard.class);
    }

    public Optional<SessionDTO> fetchSessionWithPointCategoriesAndResultEntries(String sessionId) {
        Aggregation aggregation = queryBuilder.sessionWithPointCategoriesAndResultEntriesQuery(sessionId);

        return aggregate(aggregation, Session.class, SessionDTO.class);
    }

    public Optional<Invitation> fetchInvitationWithResolvedUsernamesByInvitationId(String invitationId) {
        Aggregation aggregation = queryBuilder.invitationWithUsernamesByInvitationIdQuery(invitationId);

        Optional<Invitation> invitationOpt = aggregate(aggregation, Invitation.class, Invitation.class);
        invitationOpt.ifPresent(invitation -> {
            invitation.setInviterName(invitation.getInviterName());
            invitation.setReceiverName(invitation.getReceiverName());
        });

        return invitationOpt;
    }

    public Optional<List<Invitation>> fetchInvitationsWithResolvedUsernamesByUserId(String userId) {
        Aggregation aggregation = queryBuilder.invitationsWithUsernamesByUserIdQuery(Set.of(userId));

        Optional<List<Invitation>> invitationsOpt = aggregateList(aggregation, Invitation.class, Invitation.class);
        invitationsOpt.ifPresent(invitations -> invitations.forEach(invitation -> {
            invitation.setInviterName(invitation.getInviterName());
            invitation.setReceiverName(invitation.getReceiverName());
        }));

        return invitationsOpt;
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