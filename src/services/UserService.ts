/**
 * User Management Service
 * API wrapper for user listing and verification endpoints
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../config/api';
import type { GetUsersParams, UsersResponse, VerificationDecision } from '../types/api/users';
import type { ApiUser } from './AuthService';

const STORAGE_KEYS = {
  SESSION_TOKEN: '@forgemind:session_token',
} as const;

async function getAuthToken(): Promise<string | null> {
  return await AsyncStorage.getItem(STORAGE_KEYS.SESSION_TOKEN);
}

/**
 * List users with filters (Head only)
 */
export async function getUsers(params?: GetUsersParams): Promise<UsersResponse> {
  const token = await getAuthToken();
  if (!token) throw new Error('No session token');

  const searchParams = new URLSearchParams();
  if (params?.role) searchParams.append('role', params.role);
  if (params?.verification_status) searchParams.append('verification_status', params.verification_status);
  if (params?.department_verification_status) searchParams.append('department_verification_status', params.department_verification_status);
  if (params?.department) searchParams.append('department', params.department);
  if (params?.search) searchParams.append('search', params.search);
  if (params?.limit) searchParams.append('limit', params.limit.toString());
  if (params?.offset) searchParams.append('offset', params.offset.toString());

  const query = searchParams.toString();
  const url = `${API_BASE_URL}/users${query ? `?${query}` : ''}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to fetch users' }));
    throw new Error(error.message || `HTTP ${response.status}`);
  }

  return await response.json();
}

/**
 * Approve or reject cosplayer marketplace verification (Head only)
 */
export async function updateVerification(userId: string, decision: VerificationDecision): Promise<void> {
  const token = await getAuthToken();
  if (!token) throw new Error('No session token');

  const response = await fetch(`${API_BASE_URL}/users/${userId}/verification`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(decision),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to update verification' }));
    throw new Error(error.message || `HTTP ${response.status}`);
  }
}

/**
 * Approve or reject staff department verification (Head only, own department)
 */
export async function updateDepartmentVerification(userId: string, decision: VerificationDecision): Promise<void> {
  const token = await getAuthToken();
  if (!token) throw new Error('No session token');

  const response = await fetch(`${API_BASE_URL}/users/${userId}/department-verification`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(decision),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to update department verification' }));
    throw new Error(error.message || `HTTP ${response.status}`);
  }
}

/**
 * Refresh current user data from server (GET /auth/me)
 */
export async function refreshCurrentUser(): Promise<ApiUser> {
  const token = await getAuthToken();
  if (!token) throw new Error('No session token');

  const response = await fetch(`${API_BASE_URL}/auth/me`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to refresh user' }));
    throw new Error(error.message || `HTTP ${response.status}`);
  }

  const data = (await response.json()) as { user: ApiUser };
  return data.user;
}
