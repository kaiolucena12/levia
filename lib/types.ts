export type WeightEntry = {
  id: string;
  user_id: string;
  weight: number;
  recorded_at: string;
  created_at: string;
};

export type Meal = {
  id: string;
  user_id: string;
  meal_type: string;
  description: string;
  meal_date: string;
  created_at: string;
};

export type Activity = {
  id: string;
  user_id: string;
  name: string;
  duration_minutes: number | null;
  steps: number | null;
  activity_date: string;
  created_at: string;
};

export type DailyLog = {
  id: string;
  user_id: string;
  log_date: string;
  water_ml: number | null;
  sleep_hours: number | null;
  hunger_level: number | null;
  mood_level: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};
