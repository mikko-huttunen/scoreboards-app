package com.mikko_huttunen.scoreboards.controllers;

import com.mikko_huttunen.scoreboards.models.User;
import com.mikko_huttunen.scoreboards.services.UserService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
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

        Optional<User> user = userService.getCurrentUser();
        if (user.isPresent()) {
            User existingUser = user.get();
            logger.info("GET /api/users/user - Successfully retrieved user");
            return ResponseEntity.status(org.springframework.http.HttpStatus.OK).body(existingUser);
        } else {
            // User doesn't exist in database, create from Auth0 info
            logger.info("GET /api/users/user - User not found, creating new user");
            User newUser = userService.createUser();
            return ResponseEntity.status(org.springframework.http.HttpStatus.OK).body(newUser);
        }
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
        logger.info("PUT /api/users/user - Successfully updated user");
        return ResponseEntity.ok(updatedUser);
    }

    /**
     * Delete the current authenticated user.
     * @return ResponseEntity with no content if deleted successfully
     */
    @DeleteMapping("/user")
    public ResponseEntity<Void> deleteCurrentUser() {
        logger.info("DELETE /api/users/user - Deleting current user");

        User deleted = userService.deleteUser();
        if (deleted.getIsActive() == false) {
            logger.info("DELETE /api/users/user - Successfully deleted user");
            return ResponseEntity.noContent().build();
        } else {
            logger.warn("DELETE /api/users/user - User not found");
            return ResponseEntity.notFound().build();
        }
    }
}