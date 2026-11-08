import apiClient from '../api/Interceptor';
import type { Session } from '../types/Session';
import type { PointCategory } from '../types/PointCategory.ts';
import type { ResultEntry } from '../types/ResultEntry.ts';
import type { Comment } from '../types/Comment.ts';
import { getErrorMessage } from '../utils/Utils.ts';

const API_BASE_URL = '/api/sessions';

export type CreateSessionData = {
  name: string;
  description: string;
  scoreboardId: string;
  participants: string[];
  pointCategories: string[];
};

export type UpdateSessionResultData = {
  pointCategoryId: string;
  points: number;
};

export type UpdateSessionResultEntryData = {
  id?: string;
  userId: string;
  results: UpdateSessionResultData[];
};

export type UpdateSessionData = {
  name: string;
  description?: string;
  participants: string[];
  pointCategories: string[];
  resultEntries: UpdateSessionResultEntryData[];
  tieWinner?: string;
};

export type SessionData = {
  id: string;
  type: string;
  name: string;
  description: string;
  scoreboardId: string;
  createdBy: string;
  createdByName: string;
  isPending: boolean;
  finishedAt?: Date | null;
  editedAt?: Date | null;
  participants: Set<string>;
  isTieResolved?: boolean;
  tieWinner?: string | null;
  pointCategoryDetails: PointCategory[];
  resultEntryDetails: ResultEntry[];
  comments?: Comment[];
  created: Date;
  lastModified: Date;
  isActive: boolean;
};

/**
 * Service for interacting with the Sessions API.
 * All methods require an authentication token.
 */
export class SessionService {
  /**
   * Create a new session.
   * @param data Session data
   * @returns Promise resolving to created session
   */
  static async createSession(data: CreateSessionData): Promise<Session> {
    try {
      const response = await apiClient.post<Session>(API_BASE_URL, data);
      return response.data;
    } catch (error) {
      const errorMessage = getErrorMessage(error);
      throw new Error(errorMessage);
    }
  }

  /**
   * Get all active sessions for a specific scoreboard.
   * @param scoreboardId The scoreboard ID
   * @param isPending Whether to fetch pending sessions
   * @returns Promise resolving to an array of sessions
   */
  static async getSessionsByScoreboardId(
    scoreboardId: string,
    isPending: boolean
  ): Promise<SessionData[]> {
    try {
      const response = await apiClient.get<SessionData[]>(
        `${API_BASE_URL}/scoreboard/${scoreboardId}`,
        {
          params: { isPending },
        }
      );
      return response.data;
    } catch (error) {
      const errorMessage = getErrorMessage(error);
      throw new Error(`Failed to fetch sessions: ${errorMessage}`);
    }
  }

  /**
   * Get a session by ID.
   * @param id Session ID
   * @returns Promise resolving to session or null if not found
   */
  static async getSessionById(id: string): Promise<SessionData | null> {
    try {
      const response = await apiClient.get<SessionData>(
        `${API_BASE_URL}/${id}`
      );
      return response.data;
    } catch (error) {
      const errorMessage = getErrorMessage(error);
      throw new Error(`Failed to fetch session: ${errorMessage}`);
    }
  }

  /**
   * Update an existing session.
   * @param id Session ID
   * @param data Updated session data and scores
   * @returns Promise resolving to updated session or null if not found
   */
  static async updateSession(
    id: string,
    data: {
      name: string;
      description: string;
      resultEntries: UpdateSessionResultEntryData[];
      tieWinner?: string;
    }
  ): Promise<SessionData | null> {
    try {
      const response = await apiClient.put<SessionData>(
        `${API_BASE_URL}/${id}`,
        data
      );
      return response.data;
    } catch (error) {
      const errorMessage = getErrorMessage(error);
      throw new Error(`Failed to update session: ${errorMessage}`);
    }
  }

  /**
   * Resolve a session's tie breaker by recording the chosen winner.
   * @param id Session ID
   * @param tieWinner User ID of the participant picked as the winner
   * @returns Promise resolving to the updated session
   */
  static async resolveTieWinner(
    id: string,
    tieWinner: string
  ): Promise<SessionData | null> {
    try {
      const response = await apiClient.put<SessionData>(
        `${API_BASE_URL}/${id}/tie-winner`,
        { tieWinner }
      );
      return response.data;
    } catch (error) {
      const errorMessage = getErrorMessage(error);
      throw new Error(errorMessage);
    }
  }

  /**
   * Delete a session (soft delete).
   * @param id Session ID
   * @returns Promise resolving to true if deleted, false if not found
   */
  static async deleteSession(id: string): Promise<Session | null> {
    try {
      const response = await apiClient.delete<Session>(`${API_BASE_URL}/${id}`);
      return response.data;
    } catch (error) {
      const errorMessage = getErrorMessage(error);
      throw new Error(errorMessage);
    }
  }

  /**
   * Finish a session (check all participants submitted and mark as complete).
   * @param id Session ID
   * @returns Promise resolving to finished session or null if not found
   */
  static async finishSession(id: string): Promise<Session | null> {
    try {
      const response = await apiClient.put<Session>(
        `${API_BASE_URL}/${id}/finish`
      );
      return response.data;
    } catch (error) {
      const errorMessage = getErrorMessage(error);
      throw new Error(errorMessage);
    }
  }
}
