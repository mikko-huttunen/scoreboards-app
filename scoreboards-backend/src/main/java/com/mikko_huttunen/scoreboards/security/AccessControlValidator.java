/*
package com.mikko_huttunen.scoreboards.security;

import com.mikko_huttunen.scoreboards.models.*;
import org.springframework.stereotype.Component;

import java.util.Collection;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

@Component
public class AccessControlValidator {

    private final CurrentUserContext currentUserContext;
    private User currentUser;

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

        currentUser = currentUserContext.requireCurrentUser();

        if (document instanceof User requestedUser) {
            validateUserAccess(currentUser, requestedUser, requireCreator);
            return;
        }

        if (document instanceof Scoreboard scoreboard) {
            validateScoreboardAccess(currentUser, scoreboard, requireCreator);
            return;
        }

        if (document instanceof PointCategory pointCategory) {
            validatePointCategoryAccess(pointCategory);
            return;
        }

        if (document instanceof Session session) {
            validateSessionAccess(currentUser, session, requireCreator);
            return;
        }

        if (document instanceof ResultEntry resultEntry) {
            validateResultEntryAccess(currentUser, resultEntry);
            return;
        }

        if (document instanceof Invitation invitation) {
            validateInvitationAccess(currentUser, invitation);
            return;
        }

        throw new IllegalArgumentException("Unsupported MongoDB document type: " + document.getClass().getSimpleName());
    }

    private void validateUserAccess(User currentUser, User requestedUser, boolean requireCreator) {
        boolean isCurrentUser = Objects.equals(currentUser.getId(), requestedUser.getId());
        if (requireCreator) {
            if (isCurrentUser) return;
            throw new IllegalArgumentException("User is not authorized to access this user");
        }

        if (isCurrentUser) return;

        Set<String> currentUserScoreboardIds = currentUser.getMemberships().stream()
                .map(Membership::getScoreboardId).collect(Collectors.toSet());
        Set<String> requestedUserScoreboardIds = requestedUser.getMemberships().stream()
                .map(Membership::getScoreboardId).collect(Collectors.toSet());

        boolean shareAnyScoreboards = currentUserScoreboardIds.stream().anyMatch(requestedUserScoreboardIds::contains);

        if (shareAnyScoreboards) return;
        throw new IllegalArgumentException("User is not authorized to access this user");
    }

    private void validateScoreboardAccess(User currentUser, Scoreboard scoreboard, boolean requireCreator) {
        boolean isCreator = isCreator(scoreboard.getCreatedBy());
        if (requireCreator) {
            if (isCreator) return;
            throw new IllegalArgumentException("User is not authorized to access this scoreboard");
        }

        if (isCreator) return;
        if (hasMembership(currentUser, scoreboard.getId())) return;
        throw new IllegalArgumentException("User is not authorized to access this scoreboard");
    }

    private void validatePointCategoryAccess(PointCategory pointCategory) {
        if (isCreator(pointCategory.getCreatedBy())) return;
        throw new IllegalArgumentException("User is not authorized to access this point category");
    }

    private void validateSessionAccess(User currentUser, Session session, boolean requireCreator) {
        if (requireCreator) {
            if (isCreator(session.getCreatedBy())) return;
            throw new IllegalArgumentException("User is not authorized to access this session");
        }

        if (hasMembership(currentUser, session.getScoreboardId())) {
            boolean isParticipant = session.getParticipants().contains(currentUser.getId());

            if (isParticipant) return;
        }

        throw new IllegalArgumentException("User is not authorized to access this session");
    }

    private void validateResultEntryAccess(User currentUser, ResultEntry resultEntry) {
        if (isCreator(resultEntry.getCreatedBy())) return;
        if (hasMembership(currentUser, resultEntry.getScoreboardId())) return;
        throw new IllegalArgumentException("User is not authorized to access this result entry");
    }

    private void validateInvitationAccess(User currentUser, Invitation invitation) {
        if (isCreator(invitation.getCreatedBy()) && hasMembership(currentUser, invitation.getScoreboardId())) return;

        boolean isReceiver = Objects.equals(invitation.getReceiverId(), currentUser.getId());
        if (isReceiver) return;

        throw new IllegalArgumentException("User is not authorized to access this invitation");
    }

    private boolean hasMembership(User currentUser, String scoreboardId) {
        return currentUser.getMemberships().stream().anyMatch(ms ->
                Objects.equals(ms.getScoreboardId(), scoreboardId));
    }

    private boolean isCreator(String createdById) {
        return Objects.equals(createdById, currentUser.getId());
    }
}
 */