import axios from 'axios';
import apiClient from '../api/Interceptor';
import type { Session } from '../types/Session';

const API_BASE_URL = '/api/sessions';

export type CreateSessionData = {
  scoreboardId: string;
  scoreboardName: string;
  participants: string[];
  pointCategories: string[];
};

export type UpdateSessionData = {
  participants?: string[];
  pointCategories?: string[];
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
      if (axios.isAxiosError(error)) {
        throw new Error(`Failed to create session: ${error.message}`);
      }
      throw new Error(`Failed to create session: ${error}`);
    }
  }

  /**
   * Get all active sessions for a specific scoreboard.
   * @param scoreboardId The scoreboard ID
   * @returns Promise resolving to array of sessions
   */
  static async getSessionsByScoreboardId(
    scoreboardId: string
  ): Promise<Session[]> {
    try {
      const response = await apiClient.get<Session[]>(
        `${API_BASE_URL}/scoreboard/${scoreboardId}`
      );
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`Failed to fetch sessions: ${error.message}`);
      }
      throw new Error(`Failed to fetch sessions: ${error}`);
    }
  }

  /**
   * Get a session by ID.
   * @param id Session ID
   * @returns Promise resolving to session or null if not found
   */
  static async getSessionById(id: string): Promise<Session | null> {
    try {
      const response = await apiClient.get<Session>(`${API_BASE_URL}/${id}`);
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`Failed to fetch session: ${error.message}`);
      }
      throw new Error(`Failed to fetch session: ${error}`);
    }
  }

  /**
   * Update an existing session.
   * @param id Session ID
   * @param data Updated session data
   * @returns Promise resolving to updated session or null if not found
   */
  static async updateSession(
    id: string,
    data: UpdateSessionData
  ): Promise<Session | null> {
    try {
      const response = await apiClient.put<Session>(
        `${API_BASE_URL}/${id}`,
        data
      );
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`Failed to update session: ${error.message}`);
      }
      throw new Error(`Failed to update session: ${error}`);
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
      if (axios.isAxiosError(error)) {
        throw new Error(`Failed to delete session: ${error.message}`);
      }
      throw new Error(`Failed to delete session: ${error}`);
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
      if (axios.isAxiosError(error)) {
        if (error.response) {
          throw new Error(error.response?.data);
        }
        throw new Error(`Failed to finish session: ${error.message}`);
      }
      throw new Error(`Failed to finish session: ${error}`);
    }
  }
}
