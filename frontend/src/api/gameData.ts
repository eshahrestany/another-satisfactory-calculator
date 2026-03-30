import type { Item, Recipe, Building } from '../types/gameData';
import { apiFetch } from './client';

export const fetchItems = () => apiFetch<Item[]>('/items');
export const fetchRecipes = () => apiFetch<Recipe[]>('/recipes');
export const fetchBuildings = () => apiFetch<Building[]>('/buildings');
