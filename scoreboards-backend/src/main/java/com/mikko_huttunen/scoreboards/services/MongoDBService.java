package com.mikko_huttunen.scoreboards.services;

import com.mikko_huttunen.scoreboards.models.Auditable;
import com.mikko_huttunen.scoreboards.models.User;
import com.mikko_huttunen.scoreboards.security.CurrentUserContext;
import com.mikko_huttunen.scoreboards.security.AccessControlValidator;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.lang.reflect.Field;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class MongoDBService {

    private static final Logger logger = LoggerFactory.getLogger(MongoDBService.class);

    private final MongoTemplate mongoTemplate;
    private final CurrentUserContext currentUserContext;
    private final AccessControlValidator accessControlValidator;

    public MongoDBService(
            MongoTemplate mongoTemplate,
            CurrentUserContext currentUserContext,
            AccessControlValidator accessControlValidator
    ) {
        this.mongoTemplate = mongoTemplate;
        this.currentUserContext = currentUserContext;
        this.accessControlValidator = accessControlValidator;
    }

    @Transactional
    public <T extends Auditable> T create(T document) {
        if (document == null) {
            throw new IllegalArgumentException("Document cannot be null");
        }
        return createMany(List.of(document)).getFirst();
    }

    @Transactional
    public <T extends Auditable> List<T> createMany(List<T> documents) {
        if (documents == null || documents.isEmpty()) {
            throw new IllegalArgumentException("Documents cannot be null or empty");
        }

        try {
            Date now = new Date();

            for (T document : documents) {
                setId(document);
                document.setCreated(now);
                document.setLastModified(now);
                document.setCreatedBy(currentUserContext.requireCurrentUser().getId());
                document.setIsActive(true);

                accessControlValidator.validateWriteAccess(document);
            }

            Collection<T> savedDocuments = mongoTemplate.insertAll(documents);
            List<T> savedDocumentsList = (savedDocuments instanceof List<T> list)
                    ? list
                    : new ArrayList<>(savedDocuments);

            logger.info("Created {} documents of type {} with IDs {}",
                    savedDocumentsList.size(),
                    savedDocumentsList.getFirst().getClass().getSimpleName(),
                    savedDocumentsList.stream().map(this::getId).collect(Collectors.toList()));

            return savedDocumentsList;
        } catch (IllegalArgumentException e) {
            throw e;
        } catch (Exception e) {
            logger.error("Failed to create {} documents of type {}: {}", documents.size(), documents.getClass().getSimpleName(), e.getMessage(), e);
            throw new RuntimeException("Failed to create documents", e);
        }
    }

    public <T extends Auditable> Optional<T> findById(String id, Class<T> documentClass, boolean includeDeleted) {
        validateId(id);

        try {
            Query query = new Query(Criteria.where("_id").is(id).and("isActive").is(!includeDeleted));

            T document = mongoTemplate.findOne(query, documentClass);

            if (document == null) {
                return Optional.empty();
            }

            accessControlValidator.validateReadAccess(document);

            return Optional.of(document);
        } catch (IllegalArgumentException e) {
            throw e;
        } catch (Exception e) {
            logger.error("Failed to fetch {} with ID {}: {}", documentClass.getSimpleName(), id, e.getMessage(), e);
            throw new RuntimeException("Failed to fetch document with ID: " + id, e);
        }
    }

    public <T extends Auditable> Optional<T> findById(String id, Class<T> documentClass) {
        if (id == null || id.trim().isEmpty()) {
            logger.warn("Attempted to fetch document with null or empty ID");
            return Optional.empty();
        }
        return findById(id, documentClass, false);
    }

    public <T extends Auditable> List<T> find(Query query, Class<T> documentClass, boolean includeDeleted) {
        if (query == null) {
            query = new Query();
        }

        try {
            query.addCriteria(Criteria.where("isActive").is(!includeDeleted));

            List<T> documents = mongoTemplate.find(query, documentClass);

            accessControlValidator.validateReadAccess(documents);

            return documents;
        } catch (IllegalArgumentException e) {
            throw e;
        } catch (Exception e) {
            logger.error("Failed to fetch {} documents: {}", documentClass.getSimpleName(), e.getMessage(), e);
            throw new RuntimeException("Failed to fetch documents", e);
        }
    }

    public <T extends Auditable> List<T> find(Query query, Class<T> documentClass) {
        if (query == null) {
            query = new Query();
        }
        return find(query, documentClass, false);
    }

    public <T extends Auditable> List<T> findByType(Class<T> documentClass, boolean includeDeleted) {
        Query query = new Query();
        query.addCriteria(Criteria.where("isActive").is(!includeDeleted));
        return find(new Query(), documentClass);
    }

    public <T extends Auditable> List<T> findByType(Class<T> documentClass) {
        return findByType(documentClass, false);
    }

    @Transactional
    public <T extends Auditable> Optional<T> update(String id, Class<T> documentClass, DocumentUpdater<T> updater) {
        validateId(id);

        if (updater == null) {
            throw new IllegalArgumentException("Document updater cannot be null");
        }

        try {
            Optional<T> existingDocumentOpt = findById(id, documentClass);

            if (existingDocumentOpt.isEmpty()) {
                return Optional.empty();
            }

            T existingDocument = existingDocumentOpt.get();

            accessControlValidator.validateWriteAccess(existingDocument);

            updater.update(existingDocument);

            existingDocument.setLastModified(new Date());

            T savedDocument = mongoTemplate.save(existingDocument);
            logger.info("Updated {} with ID {}", documentClass.getSimpleName(), id);

            // Clear the cached user context after updating user
            if (documentClass == User.class) {
                currentUserContext.clear();
            }

            return Optional.of(savedDocument);
        } catch (IllegalArgumentException e) {
            throw e;
        } catch (Exception e) {
            logger.error("Failed to update {} with ID {}: {}", documentClass.getSimpleName(), id, e.getMessage(), e);
            throw new RuntimeException("Failed to update document with ID: " + id, e);
        }
    }

    @Transactional
    public <T extends Auditable> List<T> updateAll(Set<String> ids, Class<T> documentClass, DocumentUpdater<T> updater) {
        ids.forEach(this::validateId);

        if (documentClass == null) {
            throw new IllegalArgumentException("Document class cannot be null");
        }
        if (updater == null) {
            throw new IllegalArgumentException("Document updater cannot be null");
        }

        try {
            Query query = new Query(Criteria.where("_id").in(ids));
            List<T> documents = find(query, documentClass);

            if (documents.isEmpty()) {
                return List.of();
            }

            Date now = new Date();
            for (T document : documents) {
                accessControlValidator.validateWriteAccess(document);
                updater.update(document);
                document.setLastModified(now);
            }

            var bulkOps = mongoTemplate.bulkOps(
                    org.springframework.data.mongodb.core.BulkOperations.BulkMode.UNORDERED,
                    documentClass
            );

            for (T document : documents) {
                Object idValue = getId(document);
                Query byId = new Query(Criteria.where("_id").is(idValue));
                bulkOps.replaceOne(byId, document);
            }

            bulkOps.execute();

            // Clear the cached user context after updating user
            if (documentClass == User.class) {
                currentUserContext.clear();
            }

            logger.info("Updated {} documents of type {} with ids {}", documents.size(), documentClass.getSimpleName(), ids);
            return documents;
        } catch (IllegalArgumentException e) {
            throw e;
        } catch (Exception e) {
            logger.error("Failed to update documents {} of type {} with ids {}: {}", ids.size(), documentClass.getSimpleName(), ids, e.getMessage(), e);
            throw new RuntimeException("Failed to update documents using query", e);
        }
    }

    @Transactional
    public <T extends Auditable> List<T> updateByQuery(Query query, Class<T> documentClass, DocumentUpdater<T> updater) {
        if (query == null) {
            throw new IllegalArgumentException("Query cannot be null");
        }
        if (documentClass == null) {
            throw new IllegalArgumentException("Document class cannot be null");
        }

        try {
            List<T> documents = find(query, documentClass);

            if (documents.isEmpty()) {
                return List.of();
            }

            Date now = new Date();
            for (T document : documents) {
                accessControlValidator.validateWriteAccess(document);
                updater.update(document);
                document.setLastModified(now);
            }

            var bulkOps = mongoTemplate.bulkOps(
                    org.springframework.data.mongodb.core.BulkOperations.BulkMode.UNORDERED,
                    documentClass
            );

            for (T document : documents) {
                Object idValue = getId(document);
                Query byId = new Query(Criteria.where("_id").is(idValue));
                bulkOps.replaceOne(byId, document);
            }

            bulkOps.execute();

            // Clear the cached user context after updating user
            if (documentClass == User.class) {
                currentUserContext.clear();
            }

            logger.info("Updated {} documents of type {} using query", documents.size(), documentClass.getSimpleName());
            return documents;
        } catch (IllegalArgumentException e) {
            throw e;
        } catch (Exception e) {
            logger.error("Failed to update documents of type {} using query: {}", documentClass.getSimpleName(), e.getMessage(), e);
            throw new RuntimeException("Failed to update documents using query", e);
        }
    }

    @Transactional
    public <T extends Auditable> List<T> deleteByQuery(Query query, Class<T> documentClass) {
        if (query == null) {
            throw new IllegalArgumentException("Query cannot be null");
        }
        if (documentClass == null) {
            throw new IllegalArgumentException("Document class cannot be null");
        }

        try {
            List<T> documents = find(query, documentClass);

            if (documents.isEmpty()) {
                return List.of();
            }

            Date now = new Date();
            for (T document : documents) {
                accessControlValidator.validateDeleteAccess(document);
                document.setIsActive(false);
                document.setLastModified(now);
            }

            var bulkOps = mongoTemplate.bulkOps(
                    org.springframework.data.mongodb.core.BulkOperations.BulkMode.UNORDERED,
                    documentClass
            );

            for (T document : documents) {
                Object idValue = getId(document);
                Query byId = new Query(Criteria.where("_id").is(idValue));
                bulkOps.replaceOne(byId, document);
            }

            bulkOps.execute();

            logger.info("Deleted {} documents of type {} using query", documents.size(), documentClass.getSimpleName());
            return documents;
        } catch (IllegalArgumentException e) {
            throw e;
        } catch (Exception e) {
            logger.error("Failed to delete documents of type {} using query: {}", documentClass.getSimpleName(), e.getMessage(), e);
            throw new RuntimeException("Failed to delete documents using query", e);
        }
    }

    @Transactional
    public <T extends Auditable> List<T> deleteAll(Set<String> ids, Class<T> documentClass) {
        ids.forEach(this::validateId);

        if (documentClass == null) {
            throw new IllegalArgumentException("Document class cannot be null");
        }

        try {
            Query query = new Query(Criteria.where("_id").in(ids));
            List<T> documents = find(query, documentClass);

            if (documents.isEmpty()) {
                return List.of();
            }

            for (T document : documents) {
                accessControlValidator.validateDeleteAccess(document);

                document.setIsActive(false);
                document.setLastModified(new Date());
            }

            var bulkOps = mongoTemplate.bulkOps(
                    org.springframework.data.mongodb.core.BulkOperations.BulkMode.UNORDERED,
                    documentClass
            );

            for (T document : documents) {
                Object idValue = getId(document);
                Query byId = new Query(Criteria.where("_id").is(idValue));
                bulkOps.replaceOne(byId, document);
            }

            bulkOps.execute();

            logger.info("Deleted {} documents of type {} with IDs {}",
                    documents.size(),
                    documents.getClass().getSimpleName(),
                    documents.stream().map(this::getId).collect(Collectors.toList()));

            return documents;
        } catch (IllegalArgumentException e) {
            throw e;
        } catch (Exception e) {
            logger.error("Failed to delete {} documents of type {} with ids {}: {}", ids.size(), documentClass.getSimpleName(), ids, e.getMessage(), e);
            throw new RuntimeException("Failed to delete documents", e);
        }
    }

    @Transactional
    public <T extends Auditable> T deleteById(String id, Class<T> documentClass) {
        return deleteAll(Set.of(id), documentClass).getFirst();
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

        throw new IllegalArgumentException("Document class does not contain an ID field: " + documentClass.getSimpleName());
    }

    @FunctionalInterface
    public interface DocumentUpdater<T> {
        void update(T document);
    }
}