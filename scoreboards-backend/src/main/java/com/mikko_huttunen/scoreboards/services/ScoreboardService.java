package com.mikko_huttunen.scoreboards.services;

import com.mikko_huttunen.scoreboards.models.*;
import com.mikko_huttunen.scoreboards.repositories.*;
import com.mikko_huttunen.scoreboards.security.AuthProvider;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

/**
 * Service class for handling Scoreboard business logic.
 * Provides methods for CRUD operations with appropriate logging and error handling.
 */
@Service
public class ScoreboardService {
    
    private static final Logger logger = LoggerFactory.getLogger(ScoreboardService.class);
    
    private final ScoreboardRepository scoreboardRepository;
    private final UserRepository userRepository;
    private final AuthProvider authProvider;
    private final MongoDBService mongoDBService;

    @Autowired
    public ScoreboardService(
            ScoreboardRepository scoreboardRepository,
            UserRepository userRepository, AuthProvider authProvider, MongoDBService mongoDBService) {
        this.scoreboardRepository = scoreboardRepository;
        this.userRepository = userRepository;
        this.authProvider = authProvider;
        this.mongoDBService = mongoDBService;
    }

    /**
     * Create a new scoreboard with point categories.
     * @param dto The DTO containing scoreboard and point category data
     * @return The created scoreboard with point category IDs
     */
    @Transactional
    public Scoreboard createScoreboard(CreateScoreboardDTO dto) {
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

        String auth0UserId = authProvider.requireAuth0UserId();
        Optional<User> user = userRepository.findByAuth0IdAndIsActiveTrue(auth0UserId);
        if (user.isPresent()) {
            try {
                // Create the scoreboard first
                Scoreboard scoreboard = new Scoreboard();
                scoreboard.setName(dto.getName().trim());
                scoreboard.setUsers(Collections.singleton(user.get().getId()));
                scoreboard.setPointCategories(new ArrayList<>());

                Scoreboard savedScoreboard = mongoDBService.create(scoreboard);

                //Update user's scoreboards
                mongoDBService.update(
                        user.get().getId(),
                        User.class,
                        u -> u.getScoreboards().add(savedScoreboard.getId()));


                // Create point categories
                List<String> pointCategoryIds = new ArrayList<>();
                for (CreateScoreboardDTO.PointCategoryData categoryData : dto.getPointCategories()) {
                    if (categoryData.getName() == null || categoryData.getName().trim().isEmpty()) {
                        logger.warn("Skipping point category with empty name");
                        continue;
                    }
                    if (categoryData.getColor() == null || categoryData.getColor().trim().isEmpty()) {
                        logger.warn("Skipping point category with empty color");
                        continue;
                    }

                    PointCategory pointCategory = new PointCategory();
                    pointCategory.setName(categoryData.getName().trim());
                    pointCategory.setColor(categoryData.getColor().trim());
                    pointCategory.setScoreboardId(savedScoreboard.getId());

                    PointCategory savedPointCategory = mongoDBService.create(pointCategory);
                    pointCategoryIds.add(savedPointCategory.getId());
                }

                // Update scoreboard with point category IDs
                Optional<Scoreboard> updatedScoreboard = mongoDBService.update(
                        savedScoreboard.getId(),
                        Scoreboard.class,
                        sb -> sb.setPointCategories(pointCategoryIds));

                if (updatedScoreboard.isEmpty()) {
                    logger.error("Failed to update scoreboard with point category IDs");
                    throw new RuntimeException("Failed to update scoreboard with point category IDs");
                }

                logger.info("Successfully created scoreboard with {} point categories", pointCategoryIds.size());

                return updatedScoreboard.get();
            } catch (Exception e) {
                logger.error("Error creating scoreboard: {}", e.getMessage(), e);
                throw new RuntimeException("Failed to create scoreboard", e);
            }
        } else {
            logger.warn("User with Auth0 User ID {} not found or is inactive", auth0UserId);
            throw new IllegalArgumentException("User is not authorized to create a scoreboard");
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
        Query query = new Query(Criteria.where("isActive").is(true));
        return mongoDBService.find(query, Scoreboard.class);
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
    public Optional<Scoreboard> updateScoreboard(String id, Scoreboard updatedScoreboard) {
        List<String> pointCategoryIds = updatedScoreboard.getPointCategories();

        pointCategoryIds.forEach(pcId -> mongoDBService.update(pcId, PointCategory.class, pc -> {
            PointCategory pointCategory = new PointCategory();
            pointCategory.setName(pc.getName());
            pointCategory.setColor(pc.getColor());
            pointCategory.setScoreboardId(pc.getScoreboardId());
            pointCategory.setLastModified(new Date());
        }));

        return mongoDBService.update(id, Scoreboard.class, sb -> sb.setName(updatedScoreboard.getName()));
    }
    
    /**
     * Soft delete scoreboards by setting isActive to false.
     * @param ids List of IDs of the scoreboards to delete
     * @return all the deleted scoreboards
     */
    @Transactional
    public List<Scoreboard> deleteScoreboards(Set<String> ids) {
        try {
            List<Scoreboard> deletedScoreboards = new ArrayList<>();

            ids.forEach(id -> {
                Scoreboard deletedScoreboard = mongoDBService.delete(id, Scoreboard.class);

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
                Set<String> users = deletedScoreboard.getUsers();
                mongoDBService.updateAll(users, User.class, u -> {
                    u.getScoreboards().removeIf(s -> s.equals(id));
                });

                logger.info("Successfully deleted scoreboard with ID: {}", id);
                deletedScoreboards.add(deletedScoreboard);
            });

            return deletedScoreboards;
        } catch (Exception e) {
            logger.error("Error deleting scoreboards with IDs {}: {}", ids.toString(), e.getMessage(), e);
            throw new RuntimeException("Failed to delete scoreboards with IDs: " + ids, e);
        }
    }

    @Transactional
    public boolean leaveScoreboard(String id) {
        String auth0UserId = authProvider.requireAuth0UserId();
        logger.info("User {} attempting to leave scoreboard {}", auth0UserId, id);

        if (id == null || id.trim().isEmpty()) {
            logger.error("Attempted to leave scoreboard with null or empty ID");
            throw new IllegalArgumentException("Scoreboard ID cannot be null or empty");
        }

        try {
            Optional<User> userOpt = userRepository.findByAuth0IdAndIsActiveTrue(auth0UserId);
            if (userOpt.isEmpty()) {
                logger.warn("User not found with Auth0 user ID {} or is inactive", auth0UserId);
                throw new IllegalArgumentException("User not found or is inactive");
            }

            User user = userOpt.get();

            user.getScoreboards().remove(id);
            user.setLastModified(new Date());
            userRepository.save(user);
            logger.info("Successfully removed scoreboard {} from user {}", id, user.getId());

            Optional<Scoreboard> scoreboardOpt = scoreboardRepository.findByIdAndIsActiveTrue(id);
            if (scoreboardOpt.isEmpty()) {
                logger.warn("Scoreboard {} not found or is inactive", id);
                return false;
            }

            Scoreboard scoreboard = scoreboardOpt.get();

            scoreboard.getUsers().remove(user.getId());
            scoreboard.setLastModified(new Date());
            scoreboardRepository.save(scoreboard);
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
        String auth0UserId = authProvider.requireAuth0UserId();
        logger.info("User {} attempting to remove user {} from scoreboard {}", auth0UserId, userId, scoreboardId);
        
        if (scoreboardId == null || scoreboardId.trim().isEmpty()) {
            logger.error("Scoreboard ID cannot be null or empty");
            throw new IllegalArgumentException("Scoreboard ID cannot be null or empty");
        }
        
        if (userId == null || userId.trim().isEmpty()) {
            logger.error("User ID to remove cannot be null or empty");
            throw new IllegalArgumentException("User ID to remove cannot be null or empty");
        }
        
        try {
            // Verify scoreboard exists and user is the creator
            Optional<Scoreboard> scoreboardOpt = scoreboardRepository.findByIdAndIsActiveTrue(scoreboardId);
            if (scoreboardOpt.isEmpty()) {
                logger.warn("Scoreboard {} not found or is inactive", scoreboardId);
                return false;
            }
            
            Scoreboard scoreboard = scoreboardOpt.get();

            Optional<User> currentUserOpt = userRepository.findByAuth0IdAndIsActiveTrue(auth0UserId);
            if (currentUserOpt.isEmpty()) {
                logger.warn("User not found with Auth0 user ID {} or is inactive", auth0UserId);
                throw new IllegalArgumentException("User not found or is inactive");
            }

            String currentUserId = currentUserOpt.get().getId();

            if (currentUserId != null && !currentUserId.trim().isEmpty()) {
                if (!scoreboard.getCreatedBy().equals(currentUserId)) {
                    logger.error("User {} is not the creator of scoreboard {}", currentUserId, scoreboardId);
                    throw new IllegalArgumentException("Only the creator can kick users from a scoreboard");
                }

                if (currentUserId.equals(userId)) {
                    logger.error("Creator {} cannot remove themselves from scoreboard {}", currentUserId, scoreboardId);
                    throw new IllegalArgumentException("Cannot remove yourself from a scoreboard");
                }
            }

            // Get user to remove
            Optional<User> userOpt = userRepository.findByIdAndIsActiveTrue(userId);
            if (userOpt.isEmpty()) {
                logger.warn("User {} not found or is inactive", userId);
                throw new IllegalArgumentException("User not found or is inactive");
            }

            User user = userOpt.get();
            
            //Remove scoreboard from user
            user.getScoreboards().remove(scoreboardId);
            user.setLastModified(new Date());
            userRepository.save(user);
            logger.info("Successfully removed scoreboard {} from user {}", scoreboardId, userId);

            //Remove user from scoreboard
            scoreboard.getUsers().remove(userId);
            scoreboard.setLastModified(new Date());
            scoreboardRepository.save(scoreboard);
            logger.info("Successfully removed user {} from scoreboard {}", userId, scoreboardId);

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

