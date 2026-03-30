import type { SolveRequest, SolveResponse } from '../types/solver';
import { apiFetch } from './client';

export const solveProdution = (request: SolveRequest) =>
  apiFetch<SolveResponse>('/solve', {
    method: 'POST',
    body: JSON.stringify(request),
  });
