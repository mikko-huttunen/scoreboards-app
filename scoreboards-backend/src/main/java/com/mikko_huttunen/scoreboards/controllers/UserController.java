package com.mikko_huttunen.scoreboards.controllers;

import com.mikko_huttunen.scoreboards.models.User;
import com.mikko_huttunen.scoreboards.services.UserService;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * REST controller for User operations.
 * Provides endpoints for CRUD operations on users.
 */
@RestController
@RequestMapping("/api/users")
public class UserController {

    private static final Logger logger = LoggerFactory.getLogger(UserController.class);

    private final UserService userService;

    @Autowired
    public UserController(UserService userService) {
        this.userService = userService;
    }

    /**
     * Get the current authenticated user.
     * @return ResponseEntity containing the user
     */
    @GetMapping("/user")
    public ResponseEntity<User> getCurrentUser() {
        logger.info("GET /api/users/user - Fetching current user");

        User user = userService.getCurrentUser();
        return ResponseEntity.status(HttpStatus.OK).body(user);
    }

    /**
     * Get all members for a scoreboard.
     * @param scoreboardId The ID of the scoreboard
     * @return ResponseEntity containing a list of users
     */
    @GetMapping("/{scoreboardId}/users")
    public ResponseEntity<List<User>> getScoreboardUsers(@PathVariable String scoreboardId) {
        logger.info("GET /api/scoreboard/{}/users - Fetching users for scoreboard", scoreboardId);

        List<User> users = userService.getScoreboardUsers(scoreboardId);

        return ResponseEntity.status(HttpStatus.OK).body(users);
    }

    /**
     * Update the current authenticated user.
     * @param userData Map containing the new user data
     * @return ResponseEntity containing the updated user
     */
    @PutMapping("/user")
    public ResponseEntity<User> updateCurrentUser(@RequestBody Map<String, String> userData) {
        logger.info("PUT /api/users/user - Updating current user");

        User updatedUser = userService.updateUser(userData);
        return ResponseEntity.status(HttpStatus.OK).body(updatedUser);
    }

    /**
     * Delete the current authenticated user.
     * @return ResponseEntity with no content if deleted successfully
     */
    @DeleteMapping("/user")
    public ResponseEntity<User> deleteCurrentUser() {
        logger.info("DELETE /api/users/user - Deleting current user");

        User deleted = userService.deleteUser();
        return ResponseEntity.status(HttpStatus.OK).body(deleted);
    }

    /**
     * Resend verification email for the current authenticated user.
     * @param body Map containing the Auth0 ID of the user
     * @return ResponseEntity containing the remaining resend cooldown time in seconds
     */
    @PostMapping("/user/resend-verification-email")
    public ResponseEntity<Number> resendVerificationEmail(@Valid @RequestBody Map<String, String> body) {
        logger.info("POST /api/users/user/resend-verification-email - Resending verification email");

        String auth0Id = body.get("auth0Id");
        userService.resendEmailVerification(auth0Id);

        Long remainingTime = userService.getResendTimer(auth0Id);

        return ResponseEntity.status(HttpStatus.OK).body(remainingTime);
    }

    /**
     * Check the remaining time for resending the verification email.
     * @param userId The ID of the user
     * @return ResponseEntity containing the remaining resend cooldown time in seconds
     */
    @GetMapping("/user/resend-timer/{userId}")
    public ResponseEntity<Number> checkResendTimer(@PathVariable String userId) {
        logger.info("GET /api/users/user/resend-timer - Checking resend timer");

        Long remainingTime = userService.getResendTimer(userId);

        return ResponseEntity.status(HttpStatus.OK).body(remainingTime);
    }
}