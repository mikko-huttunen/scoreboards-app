import apiClient from '../api/Interceptor';
import type { PointCategory } from '../types/PointCategory';
import { getErrorMessage } from '../utils/Utils.ts';

const API_BASE_URL = '/api/point-categories';

/**
 * Service for interacting with the Point Categories API.
 * All methods require an authentication token.
 */
export class PointCategoryService {
  /**
   * Get all active point categories for a specific scoreboard.
   * @param scoreboardId The scoreboard ID
   * @returns Promise resolving to an array of point categories
   */
  static async getPointCategoriesByScoreboard(
    scoreboardId: string
  ): Promise<PointCategory[]> {
    try {
      const response = await apiClient.get<PointCategory[]>(
        `${API_BASE_URL}/scoreboard/${scoreboardId}`
      );

      return response.data;
    } catch (error) {
      const errorMessage = getErrorMessage(error);
      throw new Error(`Failed to fetch point categories: ${errorMessage}`);
    }
  }

  /**
   * Get a point category by ID.
   * @param id Point category ID
   * @returns Promise resolving to point category or null if not found
   */
  static async getPointCategoryById(id: string): Promise<PointCategory | null> {
    try {
      const response = await apiClient.get<PointCategory | null>(
        `${API_BASE_URL}/${id}`
      );
      return response.data;
    } catch (error) {
      const errorMessage = getErrorMessage(error);
      throw new Error(`Failed to fetch point category: ${errorMessage}`);
    }
  }
}
