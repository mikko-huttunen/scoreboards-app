package com.mikko_huttunen.scoreboards.services;

import com.mikko_huttunen.scoreboards.dtos.PointCategoryDTO;
import com.mikko_huttunen.scoreboards.dtos.ScoreboardDTO;
import com.mikko_huttunen.scoreboards.models.*;
import com.mikko_huttunen.scoreboards.repositories.*;
import com.mikko_huttunen.scoreboards.security.AuthProvider;
import com.mikko_huttunen.scoreboards.security.CurrentUserContext;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

/**
 * Service class for handling Scoreboard business logic.
 * Provides methods for CRUD operations with appropriate logging and error handling.
 */
@Service
public class ScoreboardService {
    
    private static final Logger logger = LoggerFactory.getLogger(ScoreboardService.class);

    private final AuthProvider authProvider;
    private final MongoDBService mongoDBService;
    private final CurrentUserContext currentUserContext;
    private final PointCategoryService pointCategoryService;

    @Autowired
    public ScoreboardService(
            AuthProvider authProvider,
            MongoDBService mongoDBService,
            CurrentUserContext currentUserContext, PointCategoryService pointCategoryService) {
        this.authProvider = authProvider;
        this.mongoDBService = mongoDBService;
        this.currentUserContext = currentUserContext;
        this.pointCategoryService = pointCategoryService;
    }

    /**
     * Create a new scoreboard with point categories.
     * @param dto The DTO containing scoreboard and point category data
     * @return The created scoreboard with point category IDs
     */
    @Transactional
    public Scoreboard createScoreboard(ScoreboardDTO dto) {
        if (dto == null) {
            logger.error("Attempted to create scoreboard with null DTO");
            throw new IllegalArgumentException("DTO cannot be null");
        }

        if (dto.getName() == null || dto.getName().trim().isEmpty()) {
            logger.error("Attempted to create scoreboard with null or empty name");
            throw new IllegalArgumentException("Scoreboard name cannot be null or empty");
        }

        if (dto.getPointCategories() == null || dto.getPointCategories().isEmpty()) {
            logger.error("Attempted to create scoreboard with no point categories");
            throw new IllegalArgumentException("At least one point category is required");
        }

        try {
            User user = currentUserContext.requireCurrentUser();

            // Create the scoreboard first
            Scoreboard scoreboard = new Scoreboard();
            scoreboard.setName(dto.getName().trim());
            scoreboard.setUsers(Collections.singleton(user.getId()));
            scoreboard.setPointCategories(new HashSet<>());

            Scoreboard savedScoreboard = mongoDBService.create(scoreboard);

            //Update user's scoreboards
            mongoDBService.update(
                    user.getId(),
                    User.class,
                    u -> u.getScoreboards().add(savedScoreboard.getId()));

            List<PointCategory> createdPointCategories = pointCategoryService.createPointCategories(
                    dto.getPointCategories(), savedScoreboard.getId());
            Set<String> pointCategoryIds = createdPointCategories.stream().map(
                    PointCategory::getId).collect(Collectors.toSet());

            // Update scoreboard with point category IDs
            Optional<Scoreboard> updatedScoreboard = mongoDBService.update(
                    savedScoreboard.getId(),
                    Scoreboard.class,
                    sb -> sb.setPointCategories(pointCategoryIds));

            if (updatedScoreboard.isEmpty()) {
                logger.error("Failed to update scoreboard with point category IDs");
                throw new RuntimeException("Failed to update scoreboard with point category IDs");
            }

            logger.info("Successfully created scoreboard with point categories: {}", pointCategoryIds);

            return updatedScoreboard.get();
        } catch (Exception e) {
            logger.error("Error creating scoreboard: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to create scoreboard", e);
        }
    }

    /**
     * Fetch all active scoreboards that an authenticated user has created or joined.
     * @return List of scoreboards the user has access to (created or joined)
     */
    public List<Scoreboard> getScoreboardsByUser() {
        String auth0UserId = authProvider.requireAuth0UserId();
        Query userQuery = new Query(Criteria.where("auth0Id").is(auth0UserId));

        Optional<User> user = mongoDBService.find(userQuery, User.class).stream().findFirst();
        if (user.isEmpty()) {
            logger.warn("User with Auth0 User ID {} not found", auth0UserId);
            return List.of();
        }

        Query scoreboardQuery = new Query(Criteria.where("users").in(user.get().getId()));
        return mongoDBService.find(scoreboardQuery, Scoreboard.class);
    }
    
    /**
     * Fetch all active scoreboards.
     * @return List of all active scoreboards
     */
    public List<Scoreboard> getAllScoreboards() {
        return mongoDBService.findByType(Scoreboard.class);
    }
    
    /**
     * Fetch a scoreboard by ID.
     * @param id The scoreboard ID
     * @return Optional containing the scoreboard if found and active
     */
    public Optional<Scoreboard> getScoreboardById(String id) {
        return mongoDBService.findById(id, Scoreboard.class);
    }
    
    /**
     * Update an existing scoreboard.
     * @param id The ID of the scoreboard to update
     * @param updatedScoreboard The updated scoreboard data
     * @return Optional containing the updated scoreboard if found and updated successfully
     */
    @Transactional
    public Optional<Scoreboard> updateScoreboard(String id, ScoreboardDTO updatedScoreboard) {
        if (updatedScoreboard == null) {
            throw new IllegalArgumentException("Updated scoreboard cannot be null");
        }

        Optional<Scoreboard> existingScoreboardOpt = getScoreboardById(id);
        if (existingScoreboardOpt.isEmpty()) {
            return Optional.empty();
        }

        Scoreboard existingScoreboard = existingScoreboardOpt.get();

        List<PointCategoryDTO> pointCategoriesToUpdate = new ArrayList<>();
        List<PointCategoryDTO> pointCategoriesToCreate = new ArrayList<>();

        Set<String> existingPointCategoryIds = existingScoreboard.getPointCategories();
        Set<String> currentPointCategoryIds = updatedScoreboard.getPointCategories().stream()
                .map(PointCategoryDTO::getId).collect(Collectors.toSet());
        Set<String> pointCategoriesToDelete = existingPointCategoryIds.stream()
                .filter(pcId -> !currentPointCategoryIds.contains(pcId))
                .collect(Collectors.toSet());

        pointCategoryService.deletePointCategories(pointCategoriesToDelete);

        updatedScoreboard.getPointCategories().forEach(updatedCategory -> {
            if (updatedCategory.getId() == null || updatedCategory.getId().trim().isEmpty()) {
                pointCategoriesToCreate.add(updatedCategory);
            }
            else {
                pointCategoriesToUpdate.add(updatedCategory);
            }
        });

        Set<String> updatedPointCategoryIds = new HashSet<>();

        if (!pointCategoriesToCreate.isEmpty()) {
            List<PointCategory> newPointCategories = pointCategoryService.createPointCategories(
                    pointCategoriesToCreate, existingScoreboard.getId());
            Set<String> pointCategoryIds = newPointCategories.stream()
                    .map(PointCategory::getId).collect(Collectors.toSet());
            updatedPointCategoryIds.addAll(pointCategoryIds);
        }

        if (!pointCategoriesToUpdate.isEmpty()) {
            List<PointCategory> updatedPointCategories = pointCategoryService.updatePointCategories(
                    pointCategoriesToUpdate, existingScoreboard.getId());
            Set<String> pointCategoryIds = updatedPointCategories.stream()
                    .map(PointCategory::getId).collect(Collectors.toSet());
            updatedPointCategoryIds.addAll(pointCategoryIds);
        }

        if (!pointCategoriesToDelete.isEmpty()) {
            pointCategoryService.deletePointCategories(pointCategoriesToDelete);
        }

        return mongoDBService.update(id, Scoreboard.class, sb -> {
            sb.setName(updatedScoreboard.getName().trim());
            sb.setPointCategories(updatedPointCategoryIds);
        });
    }
    
    /**
     * Delete scoreboards (soft delete).
     * @param ids List of IDs of the scoreboards to delete
     * @return all the deleted scoreboards
     */
    @Transactional
    public List<Scoreboard> deleteScoreboards(Set<String> ids) {
        try {
            List<Scoreboard> deletedScoreboards = mongoDBService.deleteAll(ids, Scoreboard.class);

            deletedScoreboards.forEach(deleted -> {
                String id = deleted.getId();

                //Delete active invitations
                Query invitationQuery = new Query(Criteria.where("scoreboardId").is(id));
                mongoDBService.deleteByQuery(invitationQuery, Invitation.class);

                //Delete all related sessions
                Query sessionQuery = new Query(Criteria.where("scoreboardId").is(id));
                mongoDBService.deleteByQuery(sessionQuery, Session.class);

                //Delete all related point categories
                Query pointCategoryQuery = new Query(Criteria.where("scoreboardId").is(id));
                mongoDBService.deleteByQuery(pointCategoryQuery, PointCategory.class);

                //Delete related result entries
                Query resultEntryQuery = new Query(Criteria.where("scoreboardId").is(id));
                mongoDBService.deleteByQuery(resultEntryQuery, ResultEntry.class);

                //Delete related results
                Query resultQuery = new Query(Criteria.where("scoreboardId").is(id));
                mongoDBService.deleteByQuery(resultQuery, Result.class);

                //Delete scoreboard from users
                Set<String> users = deleted.getUsers();
                mongoDBService.updateAll(users, User.class, u -> {
                    u.getScoreboards().removeIf(s -> s.equals(id));
                });
            });

            logger.info("Successfully deleted scoreboards with IDs: {}", ids);
            return deletedScoreboards;
        } catch (Exception e) {
            logger.error("Error deleting scoreboards with IDs {}: {}", ids, e.getMessage(), e);
            throw new RuntimeException("Failed to delete scoreboards with IDs: " + ids, e);
        }
    }

    @Transactional
    public boolean leaveScoreboard(String id) {
        try {
            //Remove scoreboard from user
            User user = currentUserContext.requireCurrentUser();
            mongoDBService.update(user.getId(), User.class, u -> u.getScoreboards().remove(id));
            logger.info("Successfully removed scoreboard {} from user {}", id, user.getId());

            //Remove user from scoreboard
            mongoDBService.update(id, Scoreboard.class, sb -> sb.getUsers().remove(user.getId()));
            logger.info("Successfully removed user {} from scoreboard {}", user.getId(), id);

            return true;
        } catch (Exception e) {
            logger.error("Error leaving scoreboard with ID {}: {}", id, e.getMessage(), e);
            throw new RuntimeException("Failed to leave scoreboard with ID: " + id, e);
        }
    }
    
    /**
     * Remove a user from a scoreboard.
     * @param scoreboardId The scoreboard ID
     * @param userId The user ID to remove
     * @return true if the user was successfully removed, false otherwise
     */
    @Transactional
    public boolean removeUserFromScoreboard(String scoreboardId, String userId) {
        try {
            User currentUser = currentUserContext.requireCurrentUser();

            if (currentUser.getId().equals(userId)) {
                logger.error("Creator {} cannot remove themselves from scoreboard {}", currentUser.getId(), scoreboardId);
                throw new IllegalArgumentException("Cannot remove yourself from a scoreboard");
            }

            //Remove user from scoreboard
            mongoDBService.update(scoreboardId, Scoreboard.class, sb -> {
                if (sb.getCreatedBy().equals(currentUser.getId())) {
                    sb.getUsers().remove(userId);
                } else {
                    logger.error("User {} is not the creator of scoreboard {}", currentUser.getId(), scoreboardId);
                    throw new IllegalArgumentException("Only the creator can remove users from a scoreboard");
                }
            });

            //Remove scoreboard from user
            mongoDBService.update(userId, User.class, u -> u.getScoreboards().remove(scoreboardId));

            return true;
        } catch (IllegalArgumentException e) {
            logger.error("Validation error removing user: {}", e.getMessage());
            throw e;
        } catch (Exception e) {
            logger.error("Error removing user {} from scoreboard {}: {}", userId, scoreboardId, e.getMessage(), e);
            throw new RuntimeException("Failed to remove user from scoreboard: " + e.getMessage(), e);
        }
    }
}

