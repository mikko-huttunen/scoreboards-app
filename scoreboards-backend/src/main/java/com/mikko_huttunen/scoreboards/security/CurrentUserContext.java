package com.mikko_huttunen.scoreboards.security;

import com.mikko_huttunen.scoreboards.models.User;
import com.mikko_huttunen.scoreboards.repositories.UserRepository;
import org.springframework.stereotype.Component;
import org.springframework.web.context.annotation.RequestScope;

@Component
@RequestScope
public class CurrentUserContext {

    private final AuthProvider authProvider;
    private final UserRepository userRepository;

    private User currentUser;

    public CurrentUserContext(AuthProvider authProvider, UserRepository userRepository) {
        this.authProvider = authProvider;
        this.userRepository = userRepository;
    }

    public User requireCurrentUser() {
        if (currentUser != null) {
            return currentUser;
        }
        return refresh();
    }

    public User refresh() {
        String auth0UserId = authProvider.requireAuth0UserId();
        currentUser = userRepository.findByAuth0IdAndIsActiveTrue(auth0UserId)
                .orElseThrow(() -> new IllegalArgumentException("User is not authorized"));
        return currentUser;
    }
}