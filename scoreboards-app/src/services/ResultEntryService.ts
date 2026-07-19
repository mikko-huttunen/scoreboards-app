import apiClient from '../api/Interceptor';
import type { ResultEntry } from '../types/ResultEntry';
import type { Result } from '../types/Result.ts';
import { getErrorMessage } from '../utils/Utils.ts';

const API_BASE_URL = '/result-entries';

export type ResultEntryData = {
  scoreboardId: string;
  sessionId: string;
  results: Result[];
  totalPoints?: number;
};

/**
 * Service for interacting with the Result Entries API.
 * All methods require an authentication token.
 */
export class ResultEntryService {
  static async createResultEntry(data: ResultEntryData): Promise<ResultEntry> {
    try {
      const response = await apiClient.post<ResultEntry>(API_BASE_URL, data);
      return response.data;
    } catch (error) {
      const errorMessage = getErrorMessage(error);
      throw new Error(errorMessage);
    }
  }
  /**
   * Get all result entries for a specific scoreboard.
   * @param scoreboardId The scoreboard ID
   * @returns Promise resolving to an array of result entries
   */
  static async getResultEntriesByScoreboard(
    scoreboardId: string
  ): Promise<ResultEntry[]> {
    try {
      const response = await apiClient.get<ResultEntry[]>(
        `${API_BASE_URL}/scoreboard/${scoreboardId}`
      );
      return response.data;
    } catch (error) {
      const errorMessage = getErrorMessage(error);
      throw new Error(
        `Failed to fetch result entries by scoreboard: ${errorMessage}`
      );
    }
  }

  /**
   * Get all active result entries for the current user.
   * @returns Promise resolving to array of result entries
   */
  static async getResultEntriesByUser(): Promise<ResultEntry[]> {
    try {
      const response = await apiClient.get<ResultEntry[]>(
        `${API_BASE_URL}/user`
      );
      return response.data;
    } catch (error) {
      const errorMessage = getErrorMessage(error);
      throw new Error(
        `Failed to fetch result entries by user: ${errorMessage}`
      );
    }
  }

  /**
   * Get a result entry by ID.
   * @param id Result entry ID
   * @returns Promise resolving to result entry or null if not found
   */
  static async getResultEntryById(id: string): Promise<ResultEntry | null> {
    try {
      const response = await apiClient.get<ResultEntry | null>(
        `${API_BASE_URL}/${id}`
      );
      return response.data;
    } catch (error) {
      const errorMessage = getErrorMessage(error);
      throw new Error(`Failed to fetch result entry by ID: ${errorMessage}`);
    }
  }

  /**
   * Update an existing result entry.
   * @param id Result entry ID
   * @param data
   * @returns Promise resolving to updated result entry or null if not found
   */
  static async updateResultEntry(
    id: string,
    data: ResultEntryData
  ): Promise<ResultEntry | null> {
    try {
      const response = await apiClient.put<ResultEntry | null>(
        `${API_BASE_URL}/${id}`,
        data
      );
      return response.data;
    } catch (error) {
      const errorMessage = getErrorMessage(error);
      throw new Error(errorMessage);
    }
  }
}
