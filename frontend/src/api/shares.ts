import { apiFetch } from './client';
import type { SavedFactory } from '../types/factory';

export async function createOrGetShare(factoryId: string): Promise<{ token: string }> {
  return apiFetch(`/factories/${factoryId}/share`, { method: 'POST' });
}

export async function getSharedFactory(token: string): Promise<SavedFactory> {
  return apiFetch(`/share/${token}`);
}
