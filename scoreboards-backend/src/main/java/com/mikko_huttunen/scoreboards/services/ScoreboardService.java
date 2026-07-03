package com.mikko_huttunen.scoreboards.services;

import com.mikko_huttunen.scoreboards.dtos.PointCategoryDTO;
import com.mikko_huttunen.scoreboards.dtos.ScoreboardDTO;
import com.mikko_huttunen.scoreboards.enums.Permission;
import com.mikko_huttunen.scoreboards.models.*;
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

    private final QueryService queryService;
    private final CurrentUserContext currentUserContext;
    private final PointCategoryService pointCategoryService;

    @Autowired
    public ScoreboardService(
            QueryService queryService,
            CurrentUserContext currentUserContext,
            PointCategoryService pointCategoryService) {
        this.queryService = queryService;
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
        User user = currentUserContext.requireCurrentUser();
        logger.info("Creating new scoreboard by user: {}", user.getId());

        UUID scoreboardId = UUID.randomUUID();

        Membership membership = new Membership();
        membership.setScoreboardId(scoreboardId.toString());
        membership.setUserId(user.getId());
        membership.setPermissions(Set.of(Permission.OWNER));

        queryService.create(membership);

        pointCategoryService.createPointCategories(
                dto.getPointCategories(), scoreboardId.toString());

        Scoreboard scoreboard = new Scoreboard();
        scoreboard.setId(scoreboardId.toString());
        scoreboard.setName(dto.getName().trim());

        Scoreboard createdScoreboard = queryService.create(scoreboard);

        logger.info("Successfully created scoreboard with ID: {}", createdScoreboard.getId());
        return createdScoreboard;
    }

    /**
     * Fetch all active scoreboards that an authenticated user has created or joined.
     * @return List of scoreboards the user has access to (created or joined)
     */
    public List<Scoreboard> getScoreboardsByUser() {
        User user = currentUserContext.requireCurrentUser();
        logger.info("Fetching scoreboards for user: {}", user.getId());

        Set<String> scoreboardIds = user.getMemberships().stream()
                .map(Membership::getScoreboardId).collect(Collectors.toSet());

        Query query = new Query(Criteria.where("_id").in(scoreboardIds));
        List<Scoreboard> scoreboards = queryService.find(query, Scoreboard.class, false);

        scoreboards.forEach(s ->
                s.setMemberships(user.getMemberships().stream().filter(m ->
                        m.getScoreboardId().equals(s.getId())).toList()));

        logger.info("Found {} scoreboards for user: {}", scoreboards.size(), user.getId());
        return scoreboards;
    }

    /**
     * Fetch a scoreboard with related data.
     * @param scoreboardId The scoreboard ID
     * @return The scoreboard with related data
     */
    public Scoreboard getScoreboardWithData(String scoreboardId) {
        logger.info("Fetching scoreboard: {} with data", scoreboardId);

        Optional<Scoreboard> scoreboardOpt = queryService.fetchScoreboardWithData(scoreboardId);
        Scoreboard scoreboard = scoreboardOpt.orElseThrow(() -> new IllegalArgumentException("Scoreboard not found"));

        logger.info("Found scoreboard with ID: {} with data", scoreboard.getId());
        return scoreboard;
    }
    
    /**
     * Fetch a scoreboard by ID.
     * @param scoreboardId The scoreboard ID
     * @return The scoreboard if found
     */
    public Scoreboard getScoreboardById(String scoreboardId) {
        logger.info("Fetching scoreboard by ID: {}", scoreboardId);

        Optional<Scoreboard> scoreboardOpt = queryService.findById(scoreboardId, Scoreboard.class, false);
        Scoreboard scoreboard = scoreboardOpt.orElseThrow(() -> new IllegalArgumentException("Scoreboard not found"));

        Query membershipQuery = new Query(Criteria.where("scoreboardId").is(scoreboardId));
        List<Membership> memberships = queryService.find(membershipQuery, Membership.class, false);
        scoreboard.setMemberships(memberships);

        logger.info("Found scoreboard with ID: {}", scoreboard.getId());
        return scoreboard;
    }
    
    /**
     * Update an existing scoreboard.
     * @param scoreboardId The ID of the scoreboard to update
     * @param updatedScoreboardData The updated scoreboard data
     * @return The updated scoreboard if found and updated successfully
     */
    @Transactional
    public Scoreboard updateScoreboard(String scoreboardId, ScoreboardDTO updatedScoreboardData) {
        logger.info("Updating scoreboard with ID: {}", scoreboardId);

        List<PointCategory> existingPointCategories =
                pointCategoryService.getPointCategoriesByScoreboardId(scoreboardId);

        List<PointCategoryDTO> pointCategoriesToUpdate = new ArrayList<>();
        List<PointCategoryDTO> pointCategoriesToCreate = new ArrayList<>();

        Set<String> existingPointCategoryIds = existingPointCategories.stream()
                .map(PointCategory::getId).collect(Collectors.toSet());
        Set<String> currentPointCategoryIds = updatedScoreboardData.getPointCategories().stream()
                .map(PointCategoryDTO::getId).collect(Collectors.toSet());
        Set<String> pointCategoriesToDelete = existingPointCategoryIds.stream()
                .filter(pcId -> !currentPointCategoryIds.contains(pcId))
                .collect(Collectors.toSet());

        updatedScoreboardData.getPointCategories().forEach(updatedCategory -> {
            if (updatedCategory.getId() == null || updatedCategory.getId().trim().isEmpty()) {
                pointCategoriesToCreate.add(updatedCategory);
            }
            else {
                pointCategoriesToUpdate.add(updatedCategory);
            }
        });

        if (!pointCategoriesToCreate.isEmpty()) {
            pointCategoryService.createPointCategories(pointCategoriesToCreate, scoreboardId);
        }

        if (!pointCategoriesToUpdate.isEmpty()) {
            pointCategoryService.updatePointCategories(pointCategoriesToUpdate, scoreboardId);
        }

        if (!pointCategoriesToDelete.isEmpty()) {
            pointCategoryService.deletePointCategories(pointCategoriesToDelete);
        }

        Optional<Scoreboard> updatedScoreboardOpt = queryService.updateById(scoreboardId, Scoreboard.class, sb -> {
            sb.setName(updatedScoreboardData.getName().trim());
        });

        Scoreboard updatedScoreboard = updatedScoreboardOpt.orElseThrow(() ->
                new IllegalArgumentException("Scoreboard not found"));

        //Update scoreboard name in invitations
        Query invitationQuery = new Query(Criteria.where("scoreboardId").is(scoreboardId));
        queryService.update(invitationQuery, Invitation.class, invitation ->
                invitation.setScoreboardName(updatedScoreboard.getName()));

        logger.info("Successfully updated scoreboard with ID: {}", updatedScoreboard.getId());
        return updatedScoreboard;
    }
    
    /**
     * Delete scoreboards (soft delete).
     * @param ids List of IDs of the scoreboards to delete
     * @return all the deleted scoreboards
     */
    @Transactional
    public List<Scoreboard> deleteScoreboards(Set<String> ids) {
        logger.info("Deleting scoreboards with IDs: {}", ids);
        List<Scoreboard> deletedScoreboards = queryService.deleteAll(ids, Scoreboard.class);

        deletedScoreboards.forEach(deleted -> {
            String id = deleted.getId();

            //Delete active invitations
            Query invitationQuery = new Query(Criteria.where("scoreboardId").is(id));
            queryService.delete(invitationQuery, Invitation.class);

            //Delete all related sessions
            Query sessionQuery = new Query(Criteria.where("scoreboardId").is(id));
            queryService.delete(sessionQuery, Session.class);

            //Delete all related point categories
            Query pointCategoryQuery = new Query(Criteria.where("scoreboardId").is(id));
            queryService.delete(pointCategoryQuery, PointCategory.class);

            //Delete related result entries
            Query resultEntryQuery = new Query(Criteria.where("scoreboardId").is(id));
            queryService.delete(resultEntryQuery, ResultEntry.class);
        });

        logger.info("Successfully deleted scoreboards with IDs: {}", ids);
        return deletedScoreboards;
    }

    /**
     * Handle user leaving a scoreboard.
     * @param scoreboardId The scoreboard ID to leave from
     * @return true if the user was successfully removed, false otherwise
     */
    @Transactional
    public boolean leaveScoreboard(String scoreboardId) {
        User user = currentUserContext.requireCurrentUser();
        logger.info("User: {} is leaving the scoreboard: {}", user.getId(), scoreboardId);

        //Remove membership from scoreboard
        queryService.updateById(scoreboardId, Scoreboard.class, scoreboard -> scoreboard.getMemberships()
                .removeIf(ms -> ms.getUserId().equals(user.getId())));

        //Remove membership from user
        queryService.updateById(user.getId(), User.class, userToUpdate -> userToUpdate.getMemberships()
                .removeIf(ms -> ms.getScoreboardId().equals(scoreboardId)));

        logger.info("User: {} successfully left the scoreboard: {}", user.getId(), scoreboardId);
        return true;
    }
    
    /**
     * Remove a user from a scoreboard.
     * @param scoreboardId The scoreboard ID
     * @param userId The user ID to remove
     * @return true if the user was successfully removed, false otherwise
     */
    @Transactional
    public boolean removeUserFromScoreboard(String scoreboardId, String userId) {
        User currentUser = currentUserContext.requireCurrentUser();
        logger.info("Removing user {} from scoreboard {}", userId, scoreboardId);

        if (currentUser.getId().equals(userId)) {
            logger.error("Creator {} cannot remove themselves from scoreboard {}", currentUser.getId(), scoreboardId);
            throw new IllegalArgumentException("Cannot remove yourself from a scoreboard");
        }

        //Remove membership from scoreboard
        queryService.updateById(scoreboardId, Scoreboard.class, scoreboard -> {
            if (scoreboard.getCreatedBy().equals(currentUser.getId())) {
                scoreboard.getMemberships().removeIf(ms -> ms.getUserId().equals(userId));
            } else {
                logger.error("User {} is not the creator of scoreboard {}", currentUser.getId(), scoreboardId);
                throw new IllegalArgumentException("Only the creator can remove users from a scoreboard");
            }
        });

        //Remove membership from user
        queryService.updateById(userId, User.class, userToUpdate ->
                userToUpdate.getMemberships().removeIf(ms ->
                        ms.getScoreboardId().equals(scoreboardId)));

        logger.info("Successfully removed user {} from scoreboard {}", userId, scoreboardId);
        return true;
    }
}

