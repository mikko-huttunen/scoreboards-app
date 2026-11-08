package com.mikko_huttunen.scoreboards.services;

import com.mikko_huttunen.scoreboards.enums.HistoryAction;
import com.mikko_huttunen.scoreboards.models.Comment;
import com.mikko_huttunen.scoreboards.models.Membership;
import com.mikko_huttunen.scoreboards.models.Scoreboard;
import com.mikko_huttunen.scoreboards.models.User;
import com.mikko_huttunen.scoreboards.security.CurrentUserContext;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collections;
import java.util.List;
import java.util.Objects;

@Service
public class CommentService {

    private static final Logger logger = LoggerFactory.getLogger(CommentService.class);
    private static final int DEFAULT_MAX_COMMENT_LENGTH = 100;

    private final QueryService queryService;
    private final CurrentUserContext currentUserContext;
    private final ScoreboardService scoreboardService;
    private final HistoryEventService historyEventService;
    private final S3Service s3Service;

    @Autowired
    public CommentService(
            QueryService queryService,
            CurrentUserContext currentUserContext,
            ScoreboardService scoreboardService,
            HistoryEventService historyEventService,
            S3Service s3Service
    ) {
        this.queryService = queryService;
        this.currentUserContext = currentUserContext;
        this.scoreboardService = scoreboardService;
        this.historyEventService = historyEventService;
        this.s3Service = s3Service;
    }

    public List<Comment> getCommentsByScoreboardId(String scoreboardId) {
        logger.info("Fetching comments for scoreboard: {}", scoreboardId);

        scoreboardService.getScoreboardById(scoreboardId);

        List<Comment> comments = queryService
                .fetchCommentsWithUsernamesByScoreboardId(scoreboardId)
                .orElseGet(Collections::emptyList);

        comments.forEach(comment -> comment.setAvatar(s3Service.resolveUrl(comment.getAvatar())));

        logger.info("Found {} comments for scoreboard: {}", comments.size(), scoreboardId);
        return comments;
    }

    @Transactional
    public Comment createComment(Comment comment) {
        User currentUser = currentUserContext.requireCurrentUser();
        String scoreboardId = comment.getScoreboardId();
        logger.info("Creating comment for scoreboard: {} by user: {}", scoreboardId, currentUser.getId());

        validateComment(comment.getComment());

        scoreboardService.getScoreboardById(scoreboardId);

        boolean userHasMembership = currentUser.getMemberships() != null
                && currentUser.getMemberships().stream()
                .map(Membership::getScoreboardId)
                .anyMatch(scoreboardId::equals);

        if (!userHasMembership) {
            throw new IllegalArgumentException("User is not a member of this scoreboard");
        }

        Comment newComment = new Comment();
        newComment.setScoreboardId(scoreboardId);
        newComment.setUserId(currentUser.getId());
        newComment.setUsername(currentUser.getName());
        newComment.setAvatar(s3Service.resolveUrl(currentUser.getAvatar()));
        newComment.setSessionId(comment.getSessionId() != null && !comment.getSessionId().trim().isEmpty()
                ? comment.getSessionId().trim()
                : null);
        newComment.setComment(comment.getComment().trim());

        Comment createdComment = queryService.create(newComment);

        historyEventService.createCommentHistoryEvent(HistoryAction.CREATE, createdComment);

        logger.info("Successfully created comment with ID: {} for scoreboard: {}",
                createdComment.getId(), scoreboardId);
        return createdComment;
    }

    @Transactional
    public boolean deleteComment(String commentId) {
        User currentUser = currentUserContext.requireCurrentUser();
        logger.info("Deleting comment: {} by user: {}", commentId, currentUser.getId());

        Query query = new Query(Criteria.where("_id").is(commentId));
        Comment existingComment = queryService.find(query, Comment.class, false)
                .stream()
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("Comment not found"));

        Scoreboard scoreboard = scoreboardService.getScoreboardById(existingComment.getScoreboardId());

        boolean isAuthor = Objects.equals(currentUser.getId(), existingComment.getUserId())
                || Objects.equals(currentUser.getId(), existingComment.getCreatedBy());
        boolean isScoreboardCreator = Objects.equals(currentUser.getId(), scoreboard.getCreatedBy());

        if (!isAuthor && !isScoreboardCreator) {
            throw new IllegalArgumentException("User does not have permission to delete this comment");
        }

        queryService.deleteById(commentId, Comment.class);

        historyEventService.createCommentHistoryEvent(HistoryAction.DELETE, existingComment);

        logger.info("Successfully deleted comment: {}", commentId);
        return true;
    }

    @Transactional
    public void deleteCommentsByScoreboardId(String scoreboardId) {
        Query query = new Query(Criteria.where("scoreboardId").is(scoreboardId));
        queryService.delete(query, Comment.class);
    }

    @Transactional
    public void deleteCommentsBySessionId(String sessionId) {
        Query query = new Query(Criteria.where("sessionId").is(sessionId));
        queryService.delete(query, Comment.class);
    }

    private void validateComment(String value) {
        if (value == null || value.trim().isEmpty()) {
            throw new IllegalArgumentException("Comment cannot be empty");
        }

        if (value.trim().length() > DEFAULT_MAX_COMMENT_LENGTH) {
            throw new IllegalArgumentException(
                    "Comment cannot exceed " + DEFAULT_MAX_COMMENT_LENGTH + " characters"
            );
        }
    }
}
