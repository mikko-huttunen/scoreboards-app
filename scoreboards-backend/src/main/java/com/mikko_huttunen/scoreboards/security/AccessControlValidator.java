package com.mikko_huttunen.scoreboards.security;

import com.mikko_huttunen.scoreboards.models.*;
import org.springframework.stereotype.Component;

import java.util.Collection;
import java.util.Objects;
import java.util.Set;

@Component
public class AccessControlValidator {

    private final CurrentUserContext currentUserContext;

    public AccessControlValidator(CurrentUserContext currentUserContext) {
        this.currentUserContext = currentUserContext;
    }

    public void validateReadAccess(Object document) {
        validateAccess(document, false);
    }

    public void validateWriteAccess(Object document) {
        validateAccess(document, false);
    }

    public void validateDeleteAccess(Object document) {
        validateAccess(document, true);
    }

    public <T> void validateReadAccess(Collection<T> documents) {
        documents.forEach(this::validateReadAccess);
    }

    private void validateAccess(Object document, boolean requireCreator) {
        if (document == null) {
            throw new IllegalArgumentException("Document cannot be null");
        }

        User currentUser = currentUserContext.requireCurrentUser();

        if (document instanceof User user) {
            validateUserAccess(currentUser, user);
            return;
        }

        if (document instanceof Scoreboard scoreboard) {
            validateScoreboardAccess(currentUser, scoreboard, requireCreator);
            return;
        }

        if (document instanceof PointCategory pointCategory) {
            validateScoreboardIdAccess(currentUser, pointCategory.getScoreboardId());
            return;
        }

        if (document instanceof Session session) {
            validateSessionAccess(currentUser, session);
            return;
        }

        if (document instanceof ResultEntry resultEntry) {
            validateScoreboardIdAccess(currentUser, resultEntry.getScoreboardId());
            return;
        }

        if (document instanceof Result result) {
            validateScoreboardIdAccess(currentUser, result.getScoreboardId());
            return;
        }

        if (document instanceof Invitation invitation) {
            validateInvitationAccess(currentUser, invitation, requireCreator);
            return;
        }

        throw new IllegalArgumentException("Unsupported MongoDB document type: " + document.getClass().getSimpleName());
    }

    private void validateUserAccess(User currentUser, User requestedUser) {
        if (Objects.equals(currentUser.getId(), requestedUser.getId())) {
            return;
        }

        Set<String> currentUserScoreboards = currentUser.getScoreboards();
        Set<String> requestedUserScoreboards = requestedUser.getScoreboards();

        if (currentUserScoreboards == null || requestedUserScoreboards == null) {
            throw new IllegalArgumentException("User is not authorized to access this user document");
        }

        boolean shareAnyScoreboard = requestedUserScoreboards.stream()
                .anyMatch(currentUserScoreboards::contains);

        if (!shareAnyScoreboard) {
            throw new IllegalArgumentException("User is not authorized to access this user document");
        }
    }

    private void validateScoreboardAccess(User currentUser, Scoreboard scoreboard, boolean requireCreator) {
        if (requireCreator) {
            if (!Objects.equals(scoreboard.getCreatedBy(), currentUser.getId())) {
                throw new IllegalArgumentException("User is not authorized to access this scoreboard");
            }
            return;
        }

        if (scoreboard.getUsers() == null || !scoreboard.getUsers().contains(currentUser.getId())) {
            throw new IllegalArgumentException("User is not authorized to access this scoreboard");
        }
    }

    private void validateScoreboardIdAccess(User currentUser, String scoreboardId) {
        if (scoreboardId == null || scoreboardId.trim().isEmpty()) {
            throw new IllegalArgumentException("Document does not contain a valid scoreboard ID");
        }

        if (currentUser.getScoreboards() == null || !currentUser.getScoreboards().contains(scoreboardId)) {
            throw new IllegalArgumentException("User is not authorized to access this document");
        }
    }

    private void validateSessionAccess(User currentUser, Session session) {
        if (!Objects.equals(currentUser.getId(), session.getCreatedBy())) {
            throw new IllegalArgumentException("User is not authorized to access this session");
        }
    }

    private void validateInvitationAccess(User currentUser, Invitation invitation, boolean requireCreator) {
        if (requireCreator) {
            if (!Objects.equals(invitation.getCreatedBy(), currentUser.getId())) {
                throw new IllegalArgumentException("User is not authorized to access this invitation");
            }
            return;
        }

        boolean isReceiver = Objects.equals(invitation.getReceiverId(), currentUser.getId());
        boolean hasScoreboardAccess = currentUser.getScoreboards() != null
                && currentUser.getScoreboards().contains(invitation.getScoreboardId());

        if (!isReceiver && !hasScoreboardAccess) {
            throw new IllegalArgumentException("User is not authorized to access this invitation");
        }
    }
}