/**
 * ForgeMind Inventory Service (M1)
 * 
 * Client for server-side inventory API (/inventory)
 * Handles GET/POST/PATCH/DELETE with optimistic locking
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL, REQUEST_TIMEOUT_MS } from '../config/api';
import { fetchWithTimeout } from './http';
import {
  OwnedAttire,
  NewOwnedAttireInput,
  UpdateOwnedAttireInput,
} from '../types/owned-attire';

const STORAGE_KEYS = {
  SESSION_TOKEN: '@forgemind:session_token',
} as const;

interface ImportItem {
  client_id: string;
  entry_method: 'photo' | 'text' | 'voice';
  entry_language?: string;
  original_input_text?: string;
  photo_urls?: (string | null)[];
  auto_categorized_type: string;
  auto_categorized_color?: string;
  auto_categorized_style?: string;
  flexibility_tag: 'restyle-willing' | 'dye-willing' | 'as-is-only';
  condition_rating: number;
  acquired_date?: string;
  acquisition_cost?: number;
  notes?: string;
  original_project_ref?: string | undefined;
}

interface ImportResult {
  imported: number;
  skipped: number;
  total: number;
}

export class InventoryService {
  /**
   * GET /inventory
   * Fetch all inventory items for authenticated user
   */
  static async listItems(): Promise<OwnedAttire[]> {
    const token = await AsyncStorage.getItem(STORAGE_KEYS.SESSION_TOKEN);
    if (!token) {
      throw new Error('No session token');
    }

    const response = await fetchWithTimeout(
      `${API_BASE_URL}/inventory`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      },
      REQUEST_TIMEOUT_MS,
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch inventory: ${response.status}`);
    }

    const data = await response.json();
    return data.items;
  }

  /**
   * POST /inventory
   * Create new inventory item
   */
  static async createItem(input: NewOwnedAttireInput): Promise<OwnedAttire> {
    const token = await AsyncStorage.getItem(STORAGE_KEYS.SESSION_TOKEN);
    if (!token) {
      throw new Error('No session token');
    }

    const response = await fetchWithTimeout(
      `${API_BASE_URL}/inventory`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(input),
      },
      REQUEST_TIMEOUT_MS,
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Unknown error' }));
      throw new Error(error.message || `Failed to create item: ${response.status}`);
    }

    return response.json();
  }

  /**
   * PATCH /inventory/:item_id
   * Update inventory item (with optimistic locking)
   */
  static async updateItem(
    attireId: string,
    input: UpdateOwnedAttireInput & { version: number },
  ): Promise<OwnedAttire> {
    const token = await AsyncStorage.getItem(STORAGE_KEYS.SESSION_TOKEN);
    if (!token) {
      throw new Error('No session token');
    }

    const response = await fetchWithTimeout(
      `${API_BASE_URL}/inventory/${attireId}`,
      {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(input),
      },
      REQUEST_TIMEOUT_MS,
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Unknown error' }));
      throw new Error(error.message || `Failed to update item: ${response.status}`);
    }

    return response.json();
  }

  /**
   * DELETE /inventory/:item_id
   * Delete inventory item (must be free)
   */
  static async deleteItem(attireId: string): Promise<void> {
    const token = await AsyncStorage.getItem(STORAGE_KEYS.SESSION_TOKEN);
    if (!token) {
      throw new Error('No session token');
    }

    const response = await fetchWithTimeout(
      `${API_BASE_URL}/inventory/${attireId}`,
      {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
      REQUEST_TIMEOUT_MS,
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Unknown error' }));
      throw new Error(error.message || `Failed to delete item: ${response.status}`);
    }
  }

  /**
   * POST /inventory/import
   * One-time import of local items to server
   */
  static async importItems(items: ImportItem[]): Promise<ImportResult> {
    const token = await AsyncStorage.getItem(STORAGE_KEYS.SESSION_TOKEN);
    if (!token) {
      throw new Error('No session token');
    }

    const response = await fetchWithTimeout(
      `${API_BASE_URL}/inventory/import`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ items }),
      },
      REQUEST_TIMEOUT_MS,
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Unknown error' }));
      throw new Error(error.message || `Failed to import items: ${response.status}`);
    }

    return response.json();
  }
}
