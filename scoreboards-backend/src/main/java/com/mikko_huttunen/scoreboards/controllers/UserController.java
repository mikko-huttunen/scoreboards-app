package com.mikko_huttunen.scoreboards.controllers;

import com.mikko_huttunen.scoreboards.models.User;
import com.mikko_huttunen.scoreboards.security.AuthProvider;
import com.mikko_huttunen.scoreboards.services.UserService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Optional;

/**
 * REST controller for User operations.
 * Provides endpoints for CRUD operations on users.
 */
@RestController
@RequestMapping("/api/users")
@CrossOrigin(origins = "*")
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

        try {
            Optional<User> user = userService.getCurrentUser();
            if (user.isPresent()) {
                User existingUser = user.get();
                logger.info("GET /api/users/user - Successfully retrieved user");
                return ResponseEntity.ok(existingUser);
            } else {
                // User doesn't exist in database, create from Auth0 info
                logger.info("GET /api/users/user - User not found, creating new user");
                User newUser = userService.createUser();
                return ResponseEntity.ok(newUser);
            }
        } catch (Exception e) {
            logger.error("GET /api/users/user - Error fetching user: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
    
    /**
     * Update the current authenticated user.
     * @param name The new name (optional)
     * @return ResponseEntity containing the updated user
     */
    @PutMapping("/user")
    public ResponseEntity<User> updateCurrentUser(@RequestParam(required = false) String name) {
        logger.info("PUT /api/users/user - Updating current user");
        
        try {
            Optional<User> updatedUser = userService.updateUser(name);
            if (updatedUser.isPresent()) {
                logger.info("PUT /api/users/user - Successfully updated user");
                return ResponseEntity.ok(updatedUser.get());
            } else {
                logger.warn("PUT /api/users/user - User not found");
                return ResponseEntity.notFound().build();
            }
        } catch (IllegalArgumentException e) {
            logger.warn("PUT /api/users/user - Invalid request: {}", e.getMessage());
            return ResponseEntity.badRequest().build();
        } catch (Exception e) {
            logger.error("PUT /api/users/user - Error updating user: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
    
    /**
     * Delete the current authenticated user.
     * @return ResponseEntity with no content if deleted successfully
     */
    @DeleteMapping("/user")
    public ResponseEntity<Void> deleteCurrentUser() {
        logger.info("DELETE /api/users/user - Deleting current user");
        
        try {
            User deleted = userService.deleteUser();
            if (deleted.getIsActive() == false) {
                logger.info("DELETE /api/users/user - Successfully deleted user");
                return ResponseEntity.noContent().build();
            } else {
                logger.warn("DELETE /api/users/user - User not found");
                return ResponseEntity.notFound().build();
            }
        } catch (IllegalArgumentException e) {
            logger.warn("DELETE /api/users/user - Invalid request: {}", e.getMessage());
            return ResponseEntity.badRequest().build();
        } catch (Exception e) {
            logger.error("DELETE /api/users/user - Error deleting user: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
    
    /**
     * Get all users for a scoreboard (creator and joined users).
     * GET /api/users/scoreboard/{scoreboardId}
     */
    @GetMapping("/scoreboard/{scoreboardId}")
    public ResponseEntity<List<User>> getUsersForScoreboard(@PathVariable String scoreboardId) {
        logger.info("GET /api/users/scoreboard/{} - Fetching users for scoreboard", scoreboardId);
        
        try {
            List<User> users = userService.getUsersForScoreboard(scoreboardId);
            logger.info("GET /api/users/scoreboard/{} - Successfully retrieved {} users", scoreboardId, users.size());
            return ResponseEntity.ok(users);
        } catch (Exception e) {
            logger.error("GET /api/users/scoreboard/{} - Error fetching users: {}", scoreboardId, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
}

