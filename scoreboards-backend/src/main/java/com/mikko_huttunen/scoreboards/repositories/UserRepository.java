package com.mikko_huttunen.scoreboards.repositories;

import com.mikko_huttunen.scoreboards.models.User;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.Set;

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
     * Find users by IDs if active.
     * @param ids The user IDs
     * @return List of users if found and active
     */
    List<User> findByIdIn(Set<String> ids);
}

