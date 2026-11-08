package com.mikko_huttunen.scoreboards.controllers;

import com.mikko_huttunen.scoreboards.models.Comment;
import com.mikko_huttunen.scoreboards.services.CommentService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/comments")
public class CommentController {

    private final CommentService commentService;

    @Autowired
    public CommentController(CommentService commentService) {
        this.commentService = commentService;
    }

    @GetMapping("/scoreboard/{scoreboardId}")
    public List<Comment> getCommentsByScoreboardId(@PathVariable String scoreboardId) {
        return commentService.getCommentsByScoreboardId(scoreboardId);
    }

    @PostMapping
    public Comment createComment(@Valid @RequestBody Comment comment) {
        return commentService.createComment(comment);
    }

    @DeleteMapping("/{commentId}")
    public boolean deleteComment(@PathVariable String commentId) {
        return commentService.deleteComment(commentId);
    }
}
