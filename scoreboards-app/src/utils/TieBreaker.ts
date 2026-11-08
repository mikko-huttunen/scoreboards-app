import type { ResultEntry } from '../types/ResultEntry.ts';

/**
 * Shared session winner calculation.
 *
 * A session is won by whoever holds the highest total points. When two or more participants
 * share a positive top total the session is tied, and every tied participant keeps a share of
 * the win until a tie breaker winner is recorded on the session.
 */

export type TieBreakerSession = {
  participants: Set<string> | string[];
  tieWinner?: string | null;
};

/**
 * Sum each participant's points for a single session.
 * @param resultEntries Result entries from any number of sessions
 * @param sessionId The session to total up
 * @param participantIds Optional set limiting the totals to current participants
 */
export const getSessionTotalsByUserId = (
  resultEntries: ResultEntry[],
  sessionId: string,
  participantIds?: Set<string>
): Map<string, number> => {
  const totals = new Map<string, number>();

  for (const entry of resultEntries ?? []) {
    if (entry.sessionId !== sessionId) continue;
    if (entry.isPending) continue;
    if (!entry.isActive) continue;
    if (participantIds && !participantIds.has(entry.userId)) continue;

    const total = (entry.results ?? []).reduce(
      (sum, result) => sum + (result.points ?? 0),
      0
    );

    totals.set(entry.userId, (totals.get(entry.userId) ?? 0) + total);
  }

  return totals;
};

/**
 * Find the participants sharing the highest total.
 * @returns The leading user IDs, empty when nobody scored above zero
 */
export const getTopScorerIds = (totals: Map<string, number>): string[] => {
  if (totals.size === 0) return [];

  const bestTotal = Math.max(...totals.values());
  if (bestTotal <= 0) return [];

  return Array.from(totals.entries())
    .filter(([, total]) => total === bestTotal)
    .map(([userId]) => userId);
};

/**
 * Find the participants locked in an unresolved tie for the lead.
 * @returns The tied user IDs, empty when there is a clear leader or no scores at all
 */
export const getTiedUserIds = (totals: Map<string, number>): string[] => {
  const topScorerIds = getTopScorerIds(totals);
  return topScorerIds.length > 1 ? topScorerIds : [];
};

/**
 * Decide who won a session, honouring a recorded tie breaker winner.
 * @returns A single user ID when the session has a clear or tie-broken winner, every tied user
 *          ID while the tie is unresolved, and an empty array when there is no winner
 */
export const getSessionWinnerIds = (
  session: TieBreakerSession,
  resultEntries: ResultEntry[],
  sessionId: string
): string[] => {
  const participantIds = new Set(Array.from(session.participants ?? []));
  const totals = getSessionTotalsByUserId(
    resultEntries,
    sessionId,
    participantIds
  );

  const topScorerIds = getTopScorerIds(totals);
  if (topScorerIds.length <= 1) return topScorerIds;

  // Tied: the recorded tie breaker winner takes it outright, otherwise the win stays split.
  const tieWinner = session.tieWinner;
  return tieWinner && topScorerIds.includes(tieWinner)
    ? [tieWinner]
    : topScorerIds;
};

/**
 * Whether a session is still waiting for someone to settle its tie.
 */
export const hasUnresolvedTie = (
  session: TieBreakerSession & { isTieResolved?: boolean; isPending?: boolean },
  resultEntries: ResultEntry[],
  sessionId: string
): boolean => {
  if (session.isPending) return false;
  if (session.tieWinner) return false;

  const participantIds = new Set(Array.from(session.participants ?? []));
  const totals = getSessionTotalsByUserId(
    resultEntries,
    sessionId,
    participantIds
  );

  return getTiedUserIds(totals).length > 1;
};
