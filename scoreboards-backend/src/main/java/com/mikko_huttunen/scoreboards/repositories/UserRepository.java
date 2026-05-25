package com.mikko_huttunen.scoreboards.repositories;

import com.mikko_huttunen.scoreboards.models.User;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * Repository interface for User entity.
 * Provides CRUD operations and custom query methods for MongoDB.
 */
@Repository
public interface UserRepository extends MongoRepository<User, String> {

    /**
     * Find a user by Auth0 id if active.
     * @param auth0Id The Auth0 user ID
     * @return Optional containing the user if found and active
     */
    Optional<User> findByAuth0IdAndIsActiveTrue(String auth0Id);

    /**
     * Find a user by email if active.
     * @param email The user email
     * @return Optional containing the user if found and active
     */
    Optional<User> findByEmailAndIsActiveTrue(String email);

    /**
     * Find a user by ID if active.
     * @param id The user ID
     * @return Optional containing the user if found and active
     */
    Optional<User> findByIdAndIsActiveTrue(String id);

    /**
     * Find all users who have joined a specific scoreboard (active users only).
     * @param scoreboardId The scoreboard ID
     * @return List of users who have joined the scoreboard
     */
    List<User> findByScoreboardsContainingAndIsActiveTrue(String scoreboardId);
}

