package com.mikko_huttunen.scoreboards.services;

import com.fasterxml.jackson.databind.JsonNode;
import com.mikko_huttunen.scoreboards.models.Scoreboard;
import com.mikko_huttunen.scoreboards.models.User;
import com.mikko_huttunen.scoreboards.repositories.UserRepository;
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
 * Service class for handling User business logic.
 * Provides methods for CRUD operations with Auth0 integration.
 */
@Service
public class UserService {
    
    private static final Logger logger = LoggerFactory.getLogger(UserService.class);

    private final Auth0ManagementService auth0ManagementService;
    private final AuthProvider authProvider;
    private final MongoDBService mongoDBService;
    private final ScoreboardService scoreboardService;
    private final UserRepository userRepository;
    private final CurrentUserContext currentUserContext;
    
    @Autowired
    public UserService(
            Auth0ManagementService auth0ManagementService,
            AuthProvider authProvider,
            MongoDBService mongoDBService, ScoreboardService scoreboardService, UserRepository userRepository, CurrentUserContext currentUserContext) {
        this.auth0ManagementService = auth0ManagementService;
        this.authProvider = authProvider;
        this.mongoDBService = mongoDBService;
        this.scoreboardService = scoreboardService;
        this.userRepository = userRepository;
        this.currentUserContext = currentUserContext;
    }
    
    /**
     * Create a user on the first login.
     * @return The created user
     */
    public User createUser() {
        String auth0UserId = authProvider.requireAuth0UserId();
        String email = "";
        String name = "";

        try {
            JsonNode auth0User = auth0ManagementService.getUser(auth0UserId);
            if (auth0User != null) {
                email = auth0User.get("email").asText();
                name = auth0User.get("name").asText();
            }
        } catch (Exception e) {
            logger.error("Failed to fetch user from Auth0 Management API for user {}: {}", auth0UserId, e.getMessage());
            return null;
        }

        Date now = new Date();

        User user = new User();
        user.setId(UUID.randomUUID().toString());
        user.setAuth0Id(auth0UserId);
        user.setEmail(email.trim().toLowerCase());
        user.setName(name != null && !name.trim().isEmpty() ? name : email);
        user.setCreated(now);
        user.setLastModified(now);
        user.setIsActive(true);

        User createdUser = userRepository.save(user);
        logger.info("Successfully created user with ID: {}", createdUser.getId());
        return createdUser;
    }

    /**
     * Get the current user.
     * @return Optional containing the user if found and active
     */
    public Optional<User> getCurrentUser() {
        String auth0UserId = authProvider.requireAuth0UserId();
        Query query = new Query(Criteria.where("auth0Id").is(auth0UserId));

        return mongoDBService.find(query, User.class).stream().findFirst();
    }

    /**
     * Get user by ID.
     * @param id The user ID
     * @return Optional containing the user if found and active
     */
    public Optional<User> getUserById(String id) {
        return mongoDBService.findById(id, User.class);
    }

    /**
     * Get user by email.
     * @param email The user email
     * @return Optional containing the user if found and active
     */
    public User getUserByEmail(String email) {
        Query query = new Query(Criteria.where("email").is(email.trim().toLowerCase()));
        return mongoDBService.find(query, User.class).stream().findFirst().orElse(null);
    }

    /**
     * Get all users for a scoreboard (creator and joined users).
     * @param scoreboardId The scoreboard ID
     * @return List of users associated with the scoreboard
     */
    public List<User> getUsersForScoreboard(String scoreboardId) {
        Query query = new Query(Criteria.where("scoreboards").in(scoreboardId));
        return mongoDBService.find(query, User.class);
    }

    /**
     * Update user information.
     * @param name The new name (optional)
     * @return Optional containing the updated user if found
     */
    @Transactional
    public Optional<User> updateUser(String name) {
        User user = currentUserContext.requireCurrentUser();

        try {
            //Update Auth0 user
            auth0ManagementService.updateUser(user.getAuth0Id(), name);

            return mongoDBService.update(user.getId(), User.class, userToUpdate -> {
                userToUpdate.setName(name);
            });
        } catch (Exception e) {
            logger.error("Error updating user {}: {}", user.getId(), e.getMessage(), e);
            throw new RuntimeException("Failed to update user: " + user.getId(), e);
        }
    }

    /**
     * Delete user (soft delete) and all related data.
     * @return the deleted user
     */
    @Transactional
    public User deleteUser() {
        User user = currentUserContext.requireCurrentUser();

        try {
            //Delete user from Auth0
            auth0ManagementService.deleteUser(user.getAuth0Id());

            //Delete user from scoreboards
            List<Scoreboard> scoreboards = scoreboardService.getScoreboardsByUser();
            Set<String> createdScoreboardsIds = scoreboards.stream().filter(sb ->
                    sb.getCreatedBy().equals(user.getId())).map(Scoreboard::getId).collect(Collectors.toSet());

            //Delete scoreboards created by the user
            scoreboardService.deleteScoreboards(createdScoreboardsIds);

            return mongoDBService.deleteById(user.getId(), User.class);
        } catch (Exception e) {
            logger.error("Error deleting user {}: {}", user.getId(), e.getMessage(), e);
            throw new RuntimeException("Failed to delete user: " + user.getId(), e);
        }
    }
}

