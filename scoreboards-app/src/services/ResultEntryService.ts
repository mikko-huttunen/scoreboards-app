import type { ResultEntry } from '../types/ResultEntry';

const API_BASE_URL = '/api/result-entries';

export type CreateResultEntryData = {
  scoreboardId: string;
  sessionId: string;
  results: Array<{
    pointCategoryId: string;
    points: number;
  }>;
  totalPoints?: number;
};

/**
 * Service for interacting with the Result Entries API.
 * All methods require an authentication token.
 */
export class ResultEntryService {
  /**
   * Get all active result entries for a specific session.
   * @param sessionId The session ID
   * @param token Authentication token
   * @returns Promise resolving to array of result entries
   */
  static async getResultEntriesBySession(
    sessionId: string,
    token: string
  ): Promise<ResultEntry[]> {
    const response = await fetch(`${API_BASE_URL}/session/${sessionId}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch result entries: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Get a result entry by session ID and current user.
   * @param sessionId The session ID
   * @param token Authentication token
   * @returns Promise resolving to result entry or null if not found
   */
  static async getResultEntryBySessionAndUser(
    sessionId: string,
    token: string
  ): Promise<ResultEntry | null> {
    const response = await fetch(`${API_BASE_URL}/session/${sessionId}/user`, {
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
      throw new Error(`Failed to fetch result entry: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Get all active result entries for the current user.
   * @param token Authentication token
   * @returns Promise resolving to array of result entries
   */
  static async getResultEntriesByUser(token: string): Promise<ResultEntry[]> {
    const response = await fetch(`${API_BASE_URL}/user`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch result entries: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Get a result entry by ID.
   * @param id Result entry ID
   * @param token Authentication token
   * @returns Promise resolving to result entry or null if not found
   */
  static async getResultEntryById(
    id: string,
    token: string
  ): Promise<ResultEntry | null> {
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
      throw new Error(`Failed to fetch result entry: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Create a new result entry with results.
   * @param data Result entry data
   * @param token Authentication token
   * @returns Promise resolving to created result entry
   */
  static async createResultEntry(
    data: CreateResultEntryData,
    token: string
  ): Promise<ResultEntry> {
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
        `Failed to create result entry: ${response.statusText} - ${errorText}`
      );
    }

    return response.json();
  }

  /**
   * Update an existing result entry.
   * @param id Result entry ID
   * @param resultIds List of result IDs
   * @param token Authentication token
   * @returns Promise resolving to updated result entry or null if not found
   */
  static async updateResultEntry(
    id: string,
    resultIds: string[],
    token: string
  ): Promise<ResultEntry | null> {
    const response = await fetch(`${API_BASE_URL}/${id}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(resultIds),
    });

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Failed to update result entry: ${response.statusText} - ${errorText}`
      );
    }

    return response.json();
  }

  /**
   * Delete a result entry (soft delete).
   * @param id Result entry ID
   * @param token Authentication token
   * @returns Promise resolving to true if deleted, false if not found
   */
  static async deleteResultEntry(id: string, token: string): Promise<boolean> {
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
        errorData.error ||
          `Failed to delete result entry: ${response.statusText}`
      );
    }

    return true;
  }
}
