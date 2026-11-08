import apiClient from '../api/Interceptor';
import { getErrorMessage } from '../utils/Utils.ts';
import type { HistoryEvent } from '../types/HistoryEvent.ts';
import type { Page } from '../types/Page.ts';

const API_BASE_URL = '/api/history';

/**
 * Service for interacting with the History Events API.
 */
export class HistoryEventService {
  /**
   * Get paged history events for a scoreboard.
   * Backend returns 10 latest events per page.
   * @param scoreboardId Scoreboard ID
   * @param page Zero-based page index
   * @returns Promise resolving to paged history events
   */
  static async getHistoryEventsByScoreboardId(
    scoreboardId: string,
    page = 0
  ): Promise<Page<HistoryEvent>> {
    try {
      const response = await apiClient.get<Page<HistoryEvent>>(
        `${API_BASE_URL}/scoreboard/${scoreboardId}`,
        {
          params: { page },
        }
      );

      return response.data;
    } catch (error) {
      const errorMessage = getErrorMessage(error);
      throw new Error(`Failed to fetch history events: ${errorMessage}`);
    }
  }
}
