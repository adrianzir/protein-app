import { z } from 'zod';

// Respuesta estructurada del modelo para una foto (lo mismo que devolverá la Edge Function en la Fase 3).
export const FoodItemSchema = z.object({
  name_es: z.string().describe('Nombre en español neutro, como lo escribiría un usuario'),
  name_en: z.string().describe('English name, for nutrition database lookup'),
  grams: z.number().describe('Best estimate of the edible weight as served, in grams'),
  grams_low: z.number().describe('Plausible lower bound for the weight, in grams'),
  grams_high: z.number().describe('Plausible upper bound for the weight, in grams'),
  confidence: z.number().describe('0 to 1: how sure you are about what the food is'),
  kcal_100g: z.number(),
  protein_100g: z.number(),
  carbs_100g: z.number(),
  fat_100g: z.number(),
});

export const PhotoAnalysisSchema = z.object({
  is_food: z.boolean().describe('False if the photo does not show food or drink to log'),
  items: z.array(FoodItemSchema),
  notes: z.string().describe('Short note on what limited the estimate (in Spanish), or empty'),
});

export type FoodItem = z.infer<typeof FoodItemSchema>;
export type PhotoAnalysis = z.infer<typeof PhotoAnalysisSchema>;
