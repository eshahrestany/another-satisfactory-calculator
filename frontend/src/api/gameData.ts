import type { Item, Recipe, Building, Generator } from '../types/gameData';
import { apiFetch } from './client';

export const fetchItems = () => apiFetch<Item[]>('/items');
export const fetchRecipes = () => apiFetch<Recipe[]>('/recipes');
export const fetchBuildings = () => apiFetch<Building[]>('/buildings');
export const fetchGenerators = () => apiFetch<Generator[]>('/generators');
