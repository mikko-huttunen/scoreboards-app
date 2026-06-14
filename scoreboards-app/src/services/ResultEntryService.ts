import axios from 'axios';
import apiClient from '../api/Interceptor';
import type { ResultEntry } from '../types/ResultEntry';
import type { Result } from '../types/Result';

const API_BASE_URL = '/api/result-entries';

export type ResultEntryData = {
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
   * @returns Promise resolving to array of result entries
   */
  static async getResultEntriesBySession(
    sessionId: string
  ): Promise<ResultEntry[]> {
    try {
      const response = await apiClient.get<ResultEntry[]>(
        `${API_BASE_URL}/session/${sessionId}`
      );
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(
          `Failed to fetch result entries by session: ${error.message}`
        );
      }
      throw new Error(`Failed to fetch result entries by session: ${error}`);
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
      if (axios.isAxiosError(error)) {
        throw new Error(
          `Failed to fetch result entries by user: ${error.message}`
        );
      }
      throw new Error(`Failed to fetch result entries by user: ${error}`);
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
      if (axios.isAxiosError(error)) {
        throw new Error(`Failed to fetch result entry by ID: ${error.message}`);
      }
      throw new Error(`Failed to fetch result entry by ID: ${error}`);
    }
  }

  /**
   * Create a new result entry.
   * @param id Result entry ID
   * @returns Promise resolving to array of results of an result entry
   */
  static async getResultsByResultEntryId(id: string): Promise<Result[]> {
    try {
      const response = await apiClient.get<Result[]>(
        `${API_BASE_URL}/${id}/results`
      );
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(
          `Failed to fetch results by result entry ID: ${error.message}`
        );
      }
      throw new Error(`Failed to fetch results by result entry ID: ${error}`);
    }
  }

  /**
   * Update an existing result entry.
   * @param id Result entry ID
   * @param resultIds List of result IDs
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
      if (axios.isAxiosError(error)) {
        throw new Error(`Failed to update result entry: ${error.message}`);
      }
      throw new Error(`Failed to update result entry: ${error}`);
    }
  }

  /**
   * Delete a result entry (soft delete).
   * @param id Result entry ID
   * @returns Promise resolving to deleted result entry or null if not found
   */
  static async deleteResultEntry(id: string): Promise<ResultEntry | null> {
    try {
      const response = await apiClient.delete(`${API_BASE_URL}/${id}`);
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`Failed to delete result entry: ${error.message}`);
      }
      throw new Error(`Failed to delete result entry: ${error}`);
    }
  }
}
