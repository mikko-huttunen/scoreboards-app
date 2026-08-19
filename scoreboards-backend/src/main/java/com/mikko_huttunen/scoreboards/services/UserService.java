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
import org.springframework.web.multipart.MultipartFile;

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
    private final TimerService timerService;
    private final S3Service s3Service;

    @Autowired
    public UserService(
            Auth0ManagementService auth0ManagementService,
            AuthProvider authProvider,
            QueryService queryService,
            ScoreboardService scoreboardService,
            UserRepository userRepository,
            CurrentUserContext currentUserContext,
            TimerService timerService,
            S3Service s3Service) {
        this.auth0ManagementService = auth0ManagementService;
        this.authProvider = authProvider;
        this.queryService = queryService;
        this.scoreboardService = scoreboardService;
        this.userRepository = userRepository;
        this.currentUserContext = currentUserContext;
        this.timerService = timerService;
        this.s3Service = s3Service;
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
        Boolean isEmailVerified = auth0User.get("email_verified").asBoolean();
        String name = auth0User.get("name").asText();
        String avatar = auth0User.get("picture").asText();

        Date now = new Date();

        User user = new User();
        user.setType(Types.USER);
        user.setId(UUID.randomUUID().toString());
        user.setAuth0Id(auth0UserId);
        user.setEmail(email.trim().toLowerCase());
        user.setEmailVerified(isEmailVerified);

        String username = name.length() > 15 ? name.substring(0, 15) : name;
        user.setName(username);

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
        if (user.isEmpty()) {
            return createUser();
        }

        logger.info("Found user with ID: {}", user.get().getId());
        return resolveAvatarUrl(user.get());
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
        return users.stream().map(this::resolveAvatarUrl).toList();
    }

    /**
     * Update user information (name and/or avatar).
     * @param name Optional new display name
     * @param avatar Optional avatar image file
     * @return The updated user
     */
    @Transactional
    public User updateUser(String name, MultipartFile avatar) {
        User user = currentUserContext.requireCurrentUser();
        logger.info("Updating user with ID: {}", user.getId());

        int maxNameLength = 15;

        if (name != null) {
            name = name.trim();
            if (name.isEmpty()) {
                throw new IllegalArgumentException("User name cannot be empty");
            }
            if (name.length() > maxNameLength) {
                logger.error("User name cannot be longer than {} characters", maxNameLength);
                throw new IllegalArgumentException("User name cannot be longer than 15 characters");
            }
        }

        boolean hasAvatar = avatar != null && !avatar.isEmpty();

        String previousAvatar = user.getAvatar();

        String newAvatarUrl = null;
        if (hasAvatar) {
            String originalFilename = avatar.getOriginalFilename();
            String extension = "";

            if (originalFilename != null && originalFilename.contains(".")) {
                extension = originalFilename.substring(originalFilename.lastIndexOf('.'));
            }

            String keyName = "avatars/" + user.getId() + "/" + UUID.randomUUID() + extension;

            try {
                newAvatarUrl = s3Service.uploadFile(keyName, avatar);
            } catch (Exception e) {
                logger.error("Failed to upload avatar for user {}: {}", user.getId(), e.getMessage());
                throw new RuntimeException("Failed to upload avatar image", e);
            }
        }

        String finalName = name;
        String finalNewAvatarUrl = newAvatarUrl;

        Optional<User> updatedUserOpt = queryService.updateById(user.getId(), User.class, userToUpdate -> {
            if (finalName != null) {
                userToUpdate.setName(finalName);
            }
            if (finalNewAvatarUrl != null) {
                userToUpdate.setAvatar(finalNewAvatarUrl);
            }
        });

        User updatedUser = updatedUserOpt.orElseThrow(() -> new RuntimeException("Failed to update user"));

        if (hasAvatar && previousAvatar != null && !Objects.equals(previousAvatar, updatedUser.getAvatar())) {
            try {
                s3Service.deleteFile(previousAvatar);
            } catch (Exception e) {
                logger.warn("Failed to delete previous avatar for user {}: {}", user.getId(), e.getMessage());
            }
        }

        logger.info("Successfully updated user with ID: {}", updatedUser.getId());
        return resolveAvatarUrl(updatedUser);
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
        s3Service.deleteFile(user.getAvatar());

        User deletedUser = queryService.deleteById(user.getId(), User.class);
        logger.info("Successfully deleted user with ID: {}", deletedUser.getId());
        return deletedUser;
    }

    /**
     * Resend email verification email for the current authenticated user.
     */
    public void resendEmailVerification(String auth0Id) {
        logger.info("Resending verification email for user with Auth0 ID: {}", auth0Id);

        long remainingTime = timerService.getRemainingTime(auth0Id).getSeconds();
        if (remainingTime > 0) {
            logger.info("User with Auth0 ID: {} has already been sent a verification email. Resend timer: {} seconds",
                    auth0Id, remainingTime);
            throw new IllegalArgumentException("User has already been sent a verification email");
        }

        auth0ManagementService.resendEmailVerification(auth0Id);
        timerService.startTimer(auth0Id, 60);

        logger.info("Successfully resent verification email for user with Auth0 ID: {}", auth0Id);
    }

    public Long getResendTimer(String userId) {
        logger.info("Getting resend timer for user with ID: {}", userId);

        Long remainingTime = timerService.getRemainingTime(userId).getSeconds();

        logger.info("Resend timer for user with ID: {} is {} seconds", userId, remainingTime);
        return remainingTime;
    }

    private User resolveAvatarUrl(User user) {
        if (user == null) {
            return null;
        }

        user.setAvatar(s3Service.resolveUrl(user.getAvatar()));
        return user;
    }
}