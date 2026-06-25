package com.mikko_huttunen.scoreboards.services;

import com.fasterxml.jackson.databind.JsonNode;
import com.mikko_huttunen.scoreboards.Constants.Types;
import com.mikko_huttunen.scoreboards.models.*;
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

import static org.springframework.data.mongodb.core.query.Criteria.where;

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
    @Transactional
    public User createUser() {
        String auth0UserId = authProvider.requireAuth0UserId();

        JsonNode auth0User = auth0ManagementService.getUser(auth0UserId);

        String email = auth0User.get("email").asText();
        String name = auth0User.get("name").asText();
        String avatar = auth0User.get("picture").asText();

        Date now = new Date();

        User user = new User();
        user.setType(Types.USER);
        user.setId(UUID.randomUUID().toString());
        user.setAuth0Id(auth0UserId);
        user.setEmail(email.trim().toLowerCase());
        user.setName(name != null && !name.trim().isEmpty() ? name : email);
        user.setAvatar(avatar);
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

        return mongoDBService.find(query, User.class, false).stream().findFirst();
    }

    /**
     * Update user information.
     * @param userData Map containing the new user data
     * @return Optional containing the updated user if found
     */
    @Transactional
    public User updateUser(Map <String, String> userData) {
        User user = currentUserContext.requireCurrentUser();
        String name = userData.get("name");

        auth0ManagementService.updateUser(user.getAuth0Id(), name);

        Optional<User> updatedUserOpt = mongoDBService.update(user.getId(), User.class, userToUpdate ->
                userToUpdate.setName(name));

        User updatedUser = updatedUserOpt.orElseThrow(() -> new RuntimeException("Failed to update user"));

        //Update username in all sessions and invitations created by the user
        Query sessionQuery = new Query(Criteria.where("createdBy").is(user.getId()));

        mongoDBService.updateByQuery(sessionQuery, Session.class, session ->
                session.setCreatedByName(updatedUser.getName()));

        Query invitationQuery = new Query(new Criteria().orOperator(
                where("createdBy").is(user.getId()),
                where("receiverId").is(user.getId())
        ));

        mongoDBService.updateByQuery(invitationQuery, Invitation.class, invitation -> {
            if (invitation.getReceiverId().equals(user.getId())) {
                invitation.setReceiverName(updatedUser.getName());
            }
            if (invitation.getCreatedBy().equals(user.getId())) {
                invitation.setCreatedByName(updatedUser.getName());
            }
        });

        return updatedUser;
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

