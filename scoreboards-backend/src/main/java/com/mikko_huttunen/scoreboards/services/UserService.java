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
    private final QueryService queryService;
    private final ScoreboardService scoreboardService;
    private final UserRepository userRepository;
    private final CurrentUserContext currentUserContext;
    
    @Autowired
    public UserService(
            Auth0ManagementService auth0ManagementService,
            AuthProvider authProvider,
            QueryService queryService,
            ScoreboardService scoreboardService,
            UserRepository userRepository,
            CurrentUserContext currentUserContext) {
        this.auth0ManagementService = auth0ManagementService;
        this.authProvider = authProvider;
        this.queryService = queryService;
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
        logger.info("Creating new user");
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
        logger.info("Created new user with ID: {}", createdUser.getId());

        return createdUser;
    }

    /**
     * Get the current user.
     * @return The current user
     */
    public User getCurrentUser() {
        String auth0UserId = authProvider.requireAuth0UserId();
        Query query = new Query(Criteria.where("auth0Id").is(auth0UserId));

        Optional<User> user = queryService.find(query, User.class, false).stream().findFirst();
        //If user doesn't exist in, create a new one
        if (user.isEmpty()) {
            return createUser();
        }

        logger.info("Found user with ID: {}", user.get().getId());
        return user.get();
    }

    /**
     * Get all users for a scoreboard.
     * @param scoreboardId The scoreboard ID
     * @return List of users associated with the scoreboard
     */
    public List<User> getScoreboardUsers(String scoreboardId) {
        logger.info("Fetching users for scoreboard ID: {}", scoreboardId);

        Optional<List<User>> usersOpt = queryService.fetchUsersWithMembershipsByScoreboardId(scoreboardId);
        List<User> users = usersOpt.orElseThrow(() -> new IllegalArgumentException("Scoreboard not found"));

        logger.info("Found {} users for scoreboard ID: {}", users.size(), scoreboardId);
        return users;
    }

    /**
     * Update user information.
     * @param userData Map containing the new user data
     * @return The updated user
     */
    @Transactional
    public User updateUser(Map <String, String> userData) {
        User user = currentUserContext.requireCurrentUser();
        logger.info("Updating user with ID: {}", user.getId());

        String name = userData.get("name");

        auth0ManagementService.updateUser(user.getAuth0Id(), name);

        Optional<User> updatedUserOpt = queryService.updateById(user.getId(), User.class, userToUpdate ->
                userToUpdate.setName(name));

        User updatedUser = updatedUserOpt.orElseThrow(() -> new RuntimeException("Failed to update user"));

        //Update username in all sessions and invitations created by the user
        Query sessionQuery = new Query(Criteria.where("createdBy").is(user.getId()));

        queryService.update(sessionQuery, Session.class, session ->
                session.setCreatedByName(updatedUser.getName()));

        Query invitationQuery = new Query(new Criteria().orOperator(
                where("createdBy").is(user.getId()),
                where("receiverId").is(user.getId())
        ));

        queryService.update(invitationQuery, Invitation.class, invitation -> {
            if (invitation.getReceiverId().equals(user.getId())) {
                invitation.setReceiverName(updatedUser.getName());
            }
            if (invitation.getCreatedBy().equals(user.getId())) {
                invitation.setInviterName(updatedUser.getName());
            }
        });

        logger.info("Successfully updated user with ID: {}", updatedUser.getId());
        return updatedUser;
    }

    /**
     * Delete user (soft delete) and all related data.
     * @return the deleted user
     */
    @Transactional
    public User deleteUser() {
        User user = currentUserContext.requireCurrentUser();
        logger.info("Deleting user with ID: {}", user.getId());

        auth0ManagementService.deleteUser(user.getAuth0Id());

        List<Scoreboard> scoreboards = scoreboardService.getScoreboardsByUser();
        Set<String> createdScoreboardsIds = scoreboards.stream().filter(sb ->
                sb.getCreatedBy().equals(user.getId())).map(Scoreboard::getId).collect(Collectors.toSet());

        scoreboardService.deleteScoreboards(createdScoreboardsIds);

        User deletedUser = queryService.deleteById(user.getId(), User.class);
        logger.info("Successfully deleted user with ID: {}", deletedUser.getId());
        return deletedUser;
    }
}

