import type { FactoryConfig, FactoryMeta, SavedFactory } from '../types/factory';
import { apiFetch } from './client';

export const listFactories = () => apiFetch<FactoryMeta[]>('/factories');

export const getFactory = (id: string) => apiFetch<SavedFactory>(`/factories/${id}`);

export const createFactory = (name: string, config: FactoryConfig) =>
  apiFetch<SavedFactory>('/factories', {
    method: 'POST',
    body: JSON.stringify({ name, config }),
  });

export const updateFactory = (id: string, name?: string, config?: FactoryConfig) =>
  apiFetch<SavedFactory>(`/factories/${id}`, {
    method: 'PUT',
    body: JSON.stringify({ name, config }),
  });

export const deleteFactory = (id: string) =>
  apiFetch<void>(`/factories/${id}`, { method: 'DELETE' });
