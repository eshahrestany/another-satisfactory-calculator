export interface Item {
  id: string;
  name: string;
  category: string;
  is_resource: boolean;
  is_liquid: boolean;
}

export interface RecipeIngredient {
  item_id: string;
  amount: number;
}

export interface Recipe {
  id: string;
  name: string;
  is_alternate: boolean;
  building_id: string;
  duration_seconds: number;
  ingredients: RecipeIngredient[];
  products: RecipeIngredient[];
}

export interface Building {
  id: string;
  name: string;
  power_consumption_mw: number;
}
