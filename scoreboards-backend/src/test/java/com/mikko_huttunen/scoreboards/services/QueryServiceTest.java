package com.mikko_huttunen.scoreboards.services;

import com.mikko_huttunen.scoreboards.dtos.SessionDTO;
import com.mikko_huttunen.scoreboards.models.Invitation;
import com.mikko_huttunen.scoreboards.models.Membership;
import com.mikko_huttunen.scoreboards.models.PointCategory;
import com.mikko_huttunen.scoreboards.models.Scoreboard;
import com.mikko_huttunen.scoreboards.models.Session;
import com.mikko_huttunen.scoreboards.models.User;
import com.mikko_huttunen.scoreboards.security.AccessControlValidator;
import com.mikko_huttunen.scoreboards.security.CurrentUserContext;
import com.mikko_huttunen.scoreboards.util.QueryBuilder;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.mongodb.core.BulkOperations;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.aggregation.Aggregation;
import org.springframework.data.mongodb.core.aggregation.AggregationResults;
import org.springframework.data.mongodb.core.query.Query;

import java.util.List;
import java.util.Optional;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * Unit tests for {@link QueryService}.
 */
@ExtendWith(MockitoExtension.class)
class QueryServiceTest {

    @Mock
    private MongoTemplate mongoTemplate;
    @Mock
    private AccessControlValidator accessControlValidator;
    @Mock
    private CurrentUserContext currentUserContext;
    @Mock
    private QueryBuilder queryBuilder;

    @InjectMocks
    private QueryService queryService;

    private User currentUser;

    @BeforeEach
    void setUp() {
        currentUser = new User();
        currentUser.setId("user-1");
    }

    private PointCategory pointCategory(String id) {
        PointCategory pc = new PointCategory();
        pc.setId(id);
        pc.setName("Cat");
        pc.setColor("#FFFFFF");
        pc.setScoreboardId("sb-1");
        return pc;
    }

    // ---------------------------------------------------------------------
    // create
    // ---------------------------------------------------------------------

    @Test
    void create_setsAuditableFieldsAndInserts() {
        when(currentUserContext.requireCurrentUser()).thenReturn(currentUser);
        PointCategory pc = pointCategory(null);
        when(mongoTemplate.insertAll(anyList())).thenReturn(List.of(pc));

        PointCategory result = queryService.create(pc);

        assertNotNull(result.getId()); // id assigned via reflection
        assertEquals("PointCategory", result.getType());
        assertEquals("user-1", result.getCreatedBy());
        assertTrue(result.getIsActive());
        assertNotNull(result.getCreated());
        verify(accessControlValidator).validateWriteAccess(pc);
        verify(mongoTemplate).insertAll(anyList());
    }

    @Test
    void create_preservesExistingId() {
        when(currentUserContext.requireCurrentUser()).thenReturn(currentUser);
        PointCategory pc = pointCategory("existing-id");
        when(mongoTemplate.insertAll(anyList())).thenReturn(List.of(pc));

        PointCategory result = queryService.create(pc);

        assertEquals("existing-id", result.getId());
    }

    @Test
    void create_clearsUserContextForMembership() {
        when(currentUserContext.requireCurrentUser()).thenReturn(currentUser);
        Membership m = new Membership();
        m.setScoreboardId("sb-1");
        m.setUserId("user-1");
        m.setPermissions(Set.of());
        when(mongoTemplate.insertAll(anyList())).thenReturn(List.of(m));

        queryService.create(m);

        verify(currentUserContext).clear();
    }

    // ---------------------------------------------------------------------
    // findById / find
    // ---------------------------------------------------------------------

    @Test
    void findById_returnsDocumentWhenPresent() {
        PointCategory pc = pointCategory("pc-1");
        when(mongoTemplate.findOne(any(Query.class), eq(PointCategory.class))).thenReturn(pc);

        Optional<PointCategory> result = queryService.findById("pc-1", PointCategory.class, false);

        assertTrue(result.isPresent());
        assertEquals("pc-1", result.get().getId());
        verify(accessControlValidator).validateReadAccess(pc);
    }

    @Test
    void findById_returnsEmptyWhenAbsent() {
        when(mongoTemplate.findOne(any(Query.class), eq(PointCategory.class))).thenReturn(null);

        Optional<PointCategory> result = queryService.findById("missing", PointCategory.class, false);

        assertTrue(result.isEmpty());
    }

    @Test
    void find_returnsDocuments() {
        PointCategory pc = pointCategory("pc-1");
        when(mongoTemplate.find(any(Query.class), eq(PointCategory.class))).thenReturn(List.of(pc));

        List<PointCategory> result = queryService.find(new Query(), PointCategory.class, false);

        assertEquals(1, result.size());
        verify(accessControlValidator).validateReadAccess(anyList());
    }

    // ---------------------------------------------------------------------
    // update
    // ---------------------------------------------------------------------

    @Test
    void updateById_updatesMatchingDocument() {
        PointCategory pc = pointCategory("pc-1");
        when(mongoTemplate.find(any(Query.class), eq(PointCategory.class))).thenReturn(List.of(pc));
        BulkOperations bulkOps = mock(BulkOperations.class);
        when(mongoTemplate.bulkOps(eq(BulkOperations.BulkMode.UNORDERED), eq(PointCategory.class)))
                .thenReturn(bulkOps);

        Optional<PointCategory> result = queryService.updateById("pc-1", PointCategory.class,
                doc -> doc.setName("Renamed"));

        assertTrue(result.isPresent());
        assertEquals("Renamed", result.get().getName());
        verify(accessControlValidator).validateWriteAccess(pc);
        verify(bulkOps).execute();
    }

    @Test
    void updateById_throwsForNullId() {
        assertThrows(IllegalArgumentException.class,
                () -> queryService.updateById(null, PointCategory.class, doc -> {}));
    }

    @Test
    void update_returnsEmptyListWhenNoDocuments() {
        when(mongoTemplate.find(any(Query.class), eq(PointCategory.class))).thenReturn(List.of());

        List<PointCategory> result = queryService.update(new Query(), PointCategory.class, doc -> {});

        assertTrue(result.isEmpty());
        verify(mongoTemplate, never()).bulkOps(any(BulkOperations.BulkMode.class), eq(PointCategory.class));
    }

    @Test
    void update_clearsUserContextForUserClass() {
        User u = new User();
        u.setId("user-1");
        u.setName("Old");
        when(mongoTemplate.find(any(Query.class), eq(User.class))).thenReturn(List.of(u));
        BulkOperations bulkOps = mock(BulkOperations.class);
        when(mongoTemplate.bulkOps(eq(BulkOperations.BulkMode.UNORDERED), eq(User.class)))
                .thenReturn(bulkOps);

        queryService.updateAll(Set.of("user-1"), User.class, doc -> doc.setName("New"));

        assertEquals("New", u.getName());
        verify(currentUserContext).clear();
    }

    // ---------------------------------------------------------------------
    // delete
    // ---------------------------------------------------------------------

    @Test
    void deleteById_marksDocumentInactive() {
        PointCategory pc = pointCategory("pc-1");
        when(mongoTemplate.find(any(Query.class), eq(PointCategory.class))).thenReturn(List.of(pc));
        BulkOperations bulkOps = mock(BulkOperations.class);
        when(mongoTemplate.bulkOps(eq(BulkOperations.BulkMode.UNORDERED), eq(PointCategory.class)))
                .thenReturn(bulkOps);

        PointCategory result = queryService.deleteById("pc-1", PointCategory.class);

        assertFalse(result.getIsActive());
        verify(accessControlValidator).validateDeleteAccess(pc);
        verify(bulkOps).execute();
    }

    @Test
    void deleteAll_returnsEmptyWhenNothingFound() {
        when(mongoTemplate.find(any(Query.class), eq(PointCategory.class))).thenReturn(List.of());

        List<PointCategory> result = queryService.deleteAll(Set.of("pc-1"), PointCategory.class);

        assertTrue(result.isEmpty());
    }

    @Test
    void deleteAll_throwsForEmptyId() {
        java.util.Set<String> ids = new java.util.HashSet<>();
        ids.add("");
        assertThrows(IllegalArgumentException.class,
                () -> queryService.deleteAll(ids, PointCategory.class));
    }

    // ---------------------------------------------------------------------
    // aggregate / aggregateList
    // ---------------------------------------------------------------------

    @SuppressWarnings("unchecked")
    @Test
    void aggregate_returnsMappedResult() {
        Scoreboard sb = new Scoreboard();
        sb.setId("sb-1");
        AggregationResults<Scoreboard> results = mock(AggregationResults.class);
        when(results.getUniqueMappedResult()).thenReturn(sb);
        when(mongoTemplate.aggregate(any(Aggregation.class), eq(Scoreboard.class), eq(Scoreboard.class)))
                .thenReturn(results);

        Aggregation agg = Aggregation.newAggregation(Aggregation.match(new org.springframework.data.mongodb.core.query.Criteria()));
        Optional<Scoreboard> result = queryService.aggregate(agg, Scoreboard.class, Scoreboard.class);

        assertTrue(result.isPresent());
        verify(accessControlValidator).validateReadAccess(sb);
    }

    @SuppressWarnings("unchecked")
    @Test
    void aggregate_returnsEmptyWhenNull() {
        AggregationResults<Scoreboard> results = mock(AggregationResults.class);
        when(results.getUniqueMappedResult()).thenReturn(null);
        when(mongoTemplate.aggregate(any(Aggregation.class), eq(Scoreboard.class), eq(Scoreboard.class)))
                .thenReturn(results);

        Aggregation agg = Aggregation.newAggregation(Aggregation.match(new org.springframework.data.mongodb.core.query.Criteria()));
        Optional<Scoreboard> result = queryService.aggregate(agg, Scoreboard.class, Scoreboard.class);

        assertTrue(result.isEmpty());
    }

    @SuppressWarnings("unchecked")
    @Test
    void aggregateList_returnsEmptyWhenNoResults() {
        AggregationResults<Scoreboard> results = mock(AggregationResults.class);
        when(results.getMappedResults()).thenReturn(List.of());
        when(mongoTemplate.aggregate(any(Aggregation.class), eq(Scoreboard.class), eq(Scoreboard.class)))
                .thenReturn(results);

        Aggregation agg = Aggregation.newAggregation(Aggregation.match(new org.springframework.data.mongodb.core.query.Criteria()));
        Optional<List<Scoreboard>> result = queryService.aggregateList(agg, Scoreboard.class, Scoreboard.class);

        assertTrue(result.isEmpty());
    }

    // ---------------------------------------------------------------------
    // Specialized lookup queries
    // ---------------------------------------------------------------------

    @SuppressWarnings("unchecked")
    @Test
    void fetchUsersWithMembershipsByScoreboardId_delegatesToBuilderAndAggregate() {
        Aggregation agg = Aggregation.newAggregation(Aggregation.match(new org.springframework.data.mongodb.core.query.Criteria()));
        when(queryBuilder.usersWithMembershipsByScoreboardIdQuery("sb-1")).thenReturn(agg);
        AggregationResults<User> results = mock(AggregationResults.class);
        when(results.getMappedResults()).thenReturn(List.of(currentUser));
        when(mongoTemplate.aggregate(eq(agg), eq(Membership.class), eq(User.class))).thenReturn(results);

        Optional<List<User>> result = queryService.fetchUsersWithMembershipsByScoreboardId("sb-1");

        assertTrue(result.isPresent());
        assertEquals(1, result.get().size());
    }

    @SuppressWarnings("unchecked")
    @Test
    void fetchScoreboardWithData_delegatesToBuilderAndAggregate() {
        Aggregation agg = Aggregation.newAggregation(Aggregation.match(new org.springframework.data.mongodb.core.query.Criteria()));
        when(queryBuilder.scoreboardWithDataQuery("sb-1")).thenReturn(agg);
        Scoreboard sb = new Scoreboard();
        sb.setId("sb-1");
        AggregationResults<Scoreboard> results = mock(AggregationResults.class);
        when(results.getUniqueMappedResult()).thenReturn(sb);
        when(mongoTemplate.aggregate(eq(agg), eq(Scoreboard.class), eq(Scoreboard.class))).thenReturn(results);

        Optional<Scoreboard> result = queryService.fetchScoreboardWithData("sb-1");

        assertTrue(result.isPresent());
        assertEquals("sb-1", result.get().getId());
    }

    @SuppressWarnings("unchecked")
    @Test
    void fetchSessionWithPointCategoriesAndResultEntries_delegates() {
        Aggregation agg = Aggregation.newAggregation(Aggregation.match(new org.springframework.data.mongodb.core.query.Criteria()));
        when(queryBuilder.sessionWithPointCategoriesAndResultEntriesQuery("s-1")).thenReturn(agg);
        SessionDTO dto = new SessionDTO();
        dto.setId("s-1");
        AggregationResults<SessionDTO> results = mock(AggregationResults.class);
        when(results.getUniqueMappedResult()).thenReturn(dto);
        when(mongoTemplate.aggregate(eq(agg), eq(Session.class), eq(SessionDTO.class))).thenReturn(results);

        Optional<SessionDTO> result = queryService.fetchSessionWithPointCategoriesAndResultEntries("s-1");

        assertTrue(result.isPresent());
    }

    @SuppressWarnings("unchecked")
    @Test
    void fetchInvitationWithResolvedUsernamesByInvitationId_delegates() {
        Aggregation agg = Aggregation.newAggregation(Aggregation.match(new org.springframework.data.mongodb.core.query.Criteria()));
        when(queryBuilder.invitationWithUsernamesByInvitationIdQuery("inv-1")).thenReturn(agg);
        Invitation invitation = new Invitation();
        invitation.setId("inv-1");
        AggregationResults<Invitation> results = mock(AggregationResults.class);
        when(results.getUniqueMappedResult()).thenReturn(invitation);
        when(mongoTemplate.aggregate(eq(agg), eq(Invitation.class), eq(Invitation.class))).thenReturn(results);

        Optional<Invitation> result = queryService.fetchInvitationWithResolvedUsernamesByInvitationId("inv-1");

        assertTrue(result.isPresent());
        assertEquals("inv-1", result.get().getId());
    }
}
