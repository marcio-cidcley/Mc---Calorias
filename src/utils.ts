import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function calculateTDEE(profile: {
  weight: number;
  height: number;
  age: number;
  gender: 'male' | 'female' | 'other';
  activityLevel: string;
}) {
  // Mifflin-St Jeor Equation
  let bmr = (10 * profile.weight) + (6.25 * profile.height) - (5 * profile.age);
  if (profile.gender === 'male') bmr += 5;
  else bmr -= 161;

  const multipliers: Record<string, number> = {
    sedentario: 1.2,
    leve: 1.375,
    moderado: 1.55,
    ativo: 1.725,
    muito_ativo: 1.9
  };

  return Math.round(bmr * (multipliers[profile.activityLevel] || 1.2));
}

export function getMacroGoals(calories: number, goal: 'lose' | 'maintain' | 'gain') {
  let adjustedCalories = calories;
  if (goal === 'lose') adjustedCalories -= 500;
  if (goal === 'gain') adjustedCalories += 500;

  // Standard 40/30/30 split
  return {
    calories: adjustedCalories,
    carbs: Math.round((adjustedCalories * 0.4) / 4),
    protein: Math.round((adjustedCalories * 0.3) / 4),
    fat: Math.round((adjustedCalories * 0.3) / 9)
  };
}
