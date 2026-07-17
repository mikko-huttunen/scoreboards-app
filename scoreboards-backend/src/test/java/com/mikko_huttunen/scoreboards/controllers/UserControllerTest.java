package com.mikko_huttunen.scoreboards.controllers;

import com.mikko_huttunen.scoreboards.models.User;
import com.mikko_huttunen.scoreboards.services.UserService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.anyMap;
import static org.mockito.Mockito.*;

/**
 * Unit tests for {@link UserController}.
 */
@ExtendWith(MockitoExtension.class)
class UserControllerTest {

    @Mock
    private UserService userService;

    @InjectMocks
    private UserController userController;

    @Test
    void getCurrentUser_returnsOk() {
        User user = new User();
        user.setId("user-1");
        when(userService.getCurrentUser()).thenReturn(user);

        ResponseEntity<User> response = userController.getCurrentUser();

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals("user-1", response.getBody().getId());
    }

    @Test
    void getScoreboardUsers_returnsOk() {
        when(userService.getScoreboardUsers("sb-1")).thenReturn(List.of(new User()));

        ResponseEntity<List<User>> response = userController.getScoreboardUsers("sb-1");

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(1, response.getBody().size());
    }

    @Test
    void updateCurrentUser_returnsOk() {
        User user = new User();
        user.setId("user-1");
        user.setName("NewName");
        when(userService.updateUser(anyMap())).thenReturn(user);

        ResponseEntity<User> response = userController.updateCurrentUser(Map.of("name", "NewName"));

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals("NewName", response.getBody().getName());
    }

    @Test
    void deleteCurrentUser_returnsOk() {
        User user = new User();
        user.setId("user-1");
        when(userService.deleteUser()).thenReturn(user);

        ResponseEntity<User> response = userController.deleteCurrentUser();

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals("user-1", response.getBody().getId());
    }

    @Test
    void resendVerificationEmail_returnsRemainingTime() {
        when(userService.getResendTimer("auth0|1")).thenReturn(45L);

        ResponseEntity<Number> response =
                userController.resendVerificationEmail(Map.of("auth0Id", "auth0|1"));

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(45L, response.getBody());
        verify(userService).resendEmailVerification("auth0|1");
    }

    @Test
    void checkResendTimer_returnsRemainingTime() {
        when(userService.getResendTimer("user-1")).thenReturn(10L);

        ResponseEntity<Number> response = userController.checkResendTimer("user-1");

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(10L, response.getBody());
    }
}
