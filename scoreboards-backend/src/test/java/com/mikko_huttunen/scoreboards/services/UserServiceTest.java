package com.mikko_huttunen.scoreboards.services;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.mikko_huttunen.scoreboards.models.Scoreboard;
import com.mikko_huttunen.scoreboards.models.User;
import com.mikko_huttunen.scoreboards.repositories.UserRepository;
import com.mikko_huttunen.scoreboards.security.AuthProvider;
import com.mikko_huttunen.scoreboards.security.CurrentUserContext;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.mongodb.core.query.Query;

import java.time.Duration;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * Unit tests for {@link UserService}.
 */
@ExtendWith(MockitoExtension.class)
class UserServiceTest {

    @Mock
    private Auth0ManagementService auth0ManagementService;
    @Mock
    private AuthProvider authProvider;
    @Mock
    private QueryService queryService;
    @Mock
    private ScoreboardService scoreboardService;
    @Mock
    private UserRepository userRepository;
    @Mock
    private CurrentUserContext currentUserContext;
    @Mock
    private TimerService timerService;

    @InjectMocks
    private UserService userService;

    private final ObjectMapper objectMapper = new ObjectMapper();

    private User user;

    @BeforeEach
    void setUp() {
        user = new User();
        user.setId("user-1");
        user.setName("Alice");
        user.setAuth0Id("auth0|123");
    }

    private JsonNode auth0UserNode(String email, boolean verified, String name, String picture) {
        ObjectNode node = objectMapper.createObjectNode();
        node.put("email", email);
        node.put("email_verified", verified);
        node.put("name", name);
        node.put("picture", picture);
        return node;
    }

    // ---------------------------------------------------------------------
    // createUser
    // ---------------------------------------------------------------------

    @Test
    void createUser_mapsAuth0FieldsAndSaves() {
        when(authProvider.requireAuth0UserId()).thenReturn("auth0|123");
        when(auth0ManagementService.getUser("auth0|123"))
                .thenReturn(auth0UserNode("Test@Example.com", true, "Bob", "http://avatar"));
        when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));

        User result = userService.createUser();

        assertEquals("auth0|123", result.getAuth0Id());
        assertEquals("test@example.com", result.getEmail());
        assertTrue(result.getEmailVerified());
        assertEquals("Bob", result.getName());
        assertEquals("http://avatar", result.getAvatar());
        assertNotNull(result.getId());
    }

    @Test
    void createUser_truncatesLongNameTo15Chars() {
        when(authProvider.requireAuth0UserId()).thenReturn("auth0|123");
        when(auth0ManagementService.getUser("auth0|123"))
                .thenReturn(auth0UserNode("a@b.com", false, "ThisNameIsWayTooLong", "pic"));
        when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));

        User result = userService.createUser();

        assertEquals("ThisNameIsWayTo", result.getName());
        assertEquals(15, result.getName().length());
    }

    // ---------------------------------------------------------------------
    // getCurrentUser
    // ---------------------------------------------------------------------

    @Test
    void getCurrentUser_returnsExistingUser() {
        when(authProvider.requireAuth0UserId()).thenReturn("auth0|123");
        when(queryService.find(any(Query.class), eq(User.class), eq(false)))
                .thenReturn(List.of(user));

        User result = userService.getCurrentUser();

        assertEquals("user-1", result.getId());
        verify(userRepository, never()).save(any());
    }

    @Test
    void getCurrentUser_createsUserWhenNotFound() {
        when(authProvider.requireAuth0UserId()).thenReturn("auth0|123");
        when(queryService.find(any(Query.class), eq(User.class), eq(false)))
                .thenReturn(List.of());
        when(auth0ManagementService.getUser("auth0|123"))
                .thenReturn(auth0UserNode("new@user.com", true, "New", "pic"));
        when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));

        User result = userService.getCurrentUser();

        assertEquals("new@user.com", result.getEmail());
        verify(userRepository).save(any(User.class));
    }

    // ---------------------------------------------------------------------
    // getScoreboardUsers
    // ---------------------------------------------------------------------

    @Test
    void getScoreboardUsers_returnsUsers() {
        when(queryService.fetchUsersWithMembershipsByScoreboardId("sb-1"))
                .thenReturn(Optional.of(List.of(user)));

        List<User> result = userService.getScoreboardUsers("sb-1");

        assertEquals(1, result.size());
    }

    @Test
    void getScoreboardUsers_throwsWhenEmpty() {
        when(queryService.fetchUsersWithMembershipsByScoreboardId("sb-1"))
                .thenReturn(Optional.empty());

        assertThrows(IllegalArgumentException.class,
                () -> userService.getScoreboardUsers("sb-1"));
    }

    // ---------------------------------------------------------------------
    // updateUser
    // ---------------------------------------------------------------------

    @Test
    void updateUser_updatesName() {
        when(currentUserContext.requireCurrentUser()).thenReturn(user);
        User updated = new User();
        updated.setId("user-1");
        updated.setName("NewName");
        when(queryService.updateById(eq("user-1"), eq(User.class), any()))
                .thenAnswer(inv -> {
                    QueryService.DocumentUpdater<User> updater = inv.getArgument(2);
                    updater.update(updated);
                    return Optional.of(updated);
                });

        User result = userService.updateUser(Map.of("name", "NewName"));

        assertEquals("NewName", result.getName());
    }

    @Test
    void updateUser_throwsWhenNameTooLong() {
        when(currentUserContext.requireCurrentUser()).thenReturn(user);

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> userService.updateUser(Map.of("name", "ThisNameIsWayTooLong")));
        assertEquals("User name cannot be longer than 15 characters", ex.getMessage());
    }

    @Test
    void updateUser_throwsWhenUpdateFails() {
        when(currentUserContext.requireCurrentUser()).thenReturn(user);
        when(queryService.updateById(eq("user-1"), eq(User.class), any())).thenReturn(Optional.empty());

        assertThrows(RuntimeException.class,
                () -> userService.updateUser(Map.of("name", "Ok")));
    }

    // ---------------------------------------------------------------------
    // deleteUser
    // ---------------------------------------------------------------------

    @Test
    void deleteUser_deletesAuth0OwnedScoreboardsAndUser() {
        when(currentUserContext.requireCurrentUser()).thenReturn(user);

        Scoreboard owned = new Scoreboard();
        owned.setId("sb-owned");
        owned.setCreatedBy("user-1");
        Scoreboard joined = new Scoreboard();
        joined.setId("sb-joined");
        joined.setCreatedBy("other");
        when(scoreboardService.getScoreboardsByUser()).thenReturn(List.of(owned, joined));

        when(queryService.deleteById("user-1", User.class)).thenReturn(user);

        User result = userService.deleteUser();

        assertEquals("user-1", result.getId());
        verify(auth0ManagementService).deleteUser("auth0|123");
        verify(scoreboardService).deleteScoreboards(Set.of("sb-owned"));
        verify(queryService).deleteById("user-1", User.class);
    }

    // ---------------------------------------------------------------------
    // resendEmailVerification
    // ---------------------------------------------------------------------

    @Test
    void resendEmailVerification_sendsAndStartsTimer() {
        when(timerService.getRemainingTime("auth0|123")).thenReturn(Duration.ZERO);

        userService.resendEmailVerification("auth0|123");

        verify(auth0ManagementService).resendEmailVerification("auth0|123");
        verify(timerService).startTimer("auth0|123", 60);
    }

    @Test
    void resendEmailVerification_throwsWhenTimerActive() {
        when(timerService.getRemainingTime("auth0|123")).thenReturn(Duration.ofSeconds(30));

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> userService.resendEmailVerification("auth0|123"));
        assertEquals("User has already been sent a verification email", ex.getMessage());
        verify(auth0ManagementService, never()).resendEmailVerification(anyString());
    }

    // ---------------------------------------------------------------------
    // getResendTimer
    // ---------------------------------------------------------------------

    @Test
    void getResendTimer_returnsRemainingSeconds() {
        when(timerService.getRemainingTime("user-1")).thenReturn(Duration.ofSeconds(42));

        Long result = userService.getResendTimer("user-1");

        assertEquals(42L, result);
    }
}
