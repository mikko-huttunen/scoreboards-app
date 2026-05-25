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
   * Get all active sessions for a specific scoreboard.
   * @param scoreboardId The scoreboard ID
   * @param token Authentication token
   * @returns Promise resolving to array of sessions
   */
  static async getSessionsByScoreboardId(
    scoreboardId: string,
    token: string
  ): Promise<Session[]> {
    const response = await fetch(
      `${API_BASE_URL}/scoreboard/${encodeURIComponent(scoreboardId)}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch sessions: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Get a session by ID.
   * @param id Session ID
   * @param token Authentication token
   * @returns Promise resolving to session or null if not found
   */
  static async getSessionById(
    id: string,
    token: string
  ): Promise<Session | null> {
    const response = await fetch(`${API_BASE_URL}/${id}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      throw new Error(`Failed to fetch session: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Create a new session.
   * @param data Session data
   * @param token Authentication token
   * @returns Promise resolving to created session
   */
  static async createSession(
    data: CreateSessionData,
    token: string
  ): Promise<Session> {
    const response = await fetch(API_BASE_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Failed to create session: ${response.statusText} - ${errorText}`
      );
    }

    return response.json();
  }

  /**
   * Update an existing session.
   * @param id Session ID
   * @param data Updated session data
   * @param token Authentication token
   * @returns Promise resolving to updated session or null if not found
   */
  static async updateSession(
    id: string,
    data: UpdateSessionData,
    token: string
  ): Promise<Session | null> {
    const response = await fetch(`${API_BASE_URL}/${id}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Failed to update session: ${response.statusText} - ${errorText}`
      );
    }

    return response.json();
  }

  /**
   * Delete a session (soft delete).
   * @param id Session ID
   * @param token Authentication token
   * @returns Promise resolving to true if deleted, false if not found
   */
  static async deleteSession(id: string, token: string): Promise<boolean> {
    const response = await fetch(`${API_BASE_URL}/${id}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (response.status === 404) {
      return false;
    }

    if (!response.ok) {
      const errorData = await response
        .json()
        .catch(() => ({ error: response.statusText }));
      throw new Error(
        errorData.error || `Failed to delete session: ${response.statusText}`
      );
    }

    return true;
  }

  /**
   * Finish a session (check all participants submitted and mark as complete).
   * @param id Session ID
   * @param token Authentication token
   * @returns Promise resolving to finished session or null if not found
   */
  static async finishSession(
    id: string,
    token: string
  ): Promise<Session | null> {
    const response = await fetch(`${API_BASE_URL}/${id}/finish`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Failed to finish session: ${response.statusText} - ${errorText}`
      );
    }

    return response.json();
  }

  /**
   * Get all pending sessions for the current user.
   * @param token Authentication token
   * @returns Promise resolving to array of pending sessions
   */
  static async getPendingSessions(token: string): Promise<Session[]> {
    const response = await fetch(`${API_BASE_URL}/pending`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(
        `Failed to fetch pending sessions: ${response.statusText}`
      );
    }

    return response.json();
  }
}
