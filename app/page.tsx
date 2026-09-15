"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import AuthGuard from "@/components/AuthGuard";
import AppShell from "@/components/AppShell";
import { supabase } from "@/lib/supabase";
import type { Activity, DailyLog, Meal, WeightEntry } from "@/lib/types";
import {
  ArrowDownRight,
  Droplets,
  Plus,
  Utensils,
  Activity as ActivityIcon,
} from "lucide-react";

function today() {
  return new Date().toISOString().slice(0, 10);
}

export default function DashboardPage() {
  const [name, setName] = useState("você");
  const [weights, setWeights] = useState<WeightEntry[]>([]);
  const [meals, setMeals] = useState<Meal[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [daily, setDaily] = useState<DailyLog | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return;

    setName(auth.user.user_metadata?.name || auth.user.email?.split("@")[0] || "você");

    const [weightsRes, mealsRes, activitiesRes, dailyRes] = await Promise.all([
      supabase.from("weight_entries").select("*").order("recorded_at", { ascending: false }).limit(30),
      supabase.from("meals").select("*").eq("meal_date", today()).order("created_at", { ascending: true }),
      supabase.from("activities").select("*").eq("activity_date", today()).order("created_at", { ascending: true }),
      supabase.from("daily_logs").select("*").eq("log_date", today()).maybeSingle(),
    ]);

    setWeights(weightsRes.data || []);
    setMeals(mealsRes.data || []);
    setActivities(activitiesRes.data || []);
    setDaily(dailyRes.data || null);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const currentWeight = weights[0]?.weight;
  const oldestWeight = weights[weights.length - 1]?.weight;
  const difference =
    currentWeight && oldestWeight ? Number((currentWeight - oldestWeight).toFixed(1)) : null;

  const steps = useMemo(() => activities.reduce((sum, item) => sum + (item.steps || 0), 0), [activities]);

  return (
    <AuthGuard>
      <AppShell>
        <div className="page">
          <header className="page-header">
            <div>
              <span className="eyebrow">HOJE</span>
              <h1>Olá, {name}.</h1>
              <p>Um dia de cada vez. Veja como está sua rotina.</p>
            </div>

            <Link className="primary-button inline-button" href="/diario">
              <Plus size={18} />
              Registrar agora
            </Link>
          </header>

          {loading ? (
            <div className="card">Carregando seus dados...</div>
          ) : (
            <>
              <section className="stats-grid">
                <div className="stat-card featured">
                  <span className="stat-label">Peso atual</span>
                  <strong>{currentWeight ? `${currentWeight} kg` : "—"}</strong>
                  <small>
                    {difference === null ? (
                      "Registre seu primeiro peso"
                    ) : difference < 0 ? (
                      <>
                        <ArrowDownRight size={14} /> {Math.abs(difference)} kg no período
                      </>
                    ) : (
                      `${difference > 0 ? "+" : ""}${difference} kg no período`
                    )}
                  </small>
                </div>

                <div className="stat-card">
                  <div className="stat-icon"><Droplets size={20} /></div>
                  <span className="stat-label">Água</span>
                  <strong>{daily?.water_ml ? `${(daily.water_ml / 1000).toFixed(1)} L` : "—"}</strong>
                  <small>registrados hoje</small>
                </div>
              </section>

              <section className="dashboard-grid dashboard-grid-two">
                <div className="card">
                  <div className="card-heading">
                    <div>
                      <span className="eyebrow">ALIMENTAÇÃO</span>
                      <h2>Refeições de hoje</h2>
                    </div>
                    <Link href="/diario" className="small-link">Adicionar</Link>
                  </div>

                  {meals.length === 0 ? (
                    <div className="empty-state">
                      <Utensils size={26} />
                      <p>Nenhuma refeição registrada hoje.</p>
                    </div>
                  ) : (
                    <div className="timeline-list">
                      {meals.map((meal) => (
                        <div className="timeline-item" key={meal.id}>
                          <span className="timeline-dot" />
                          <div>
                            <b>{meal.meal_type}</b>
                            <p>{meal.description}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="card">
                  <div className="card-heading">
                    <div>
                      <span className="eyebrow">MOVIMENTO</span>
                      <h2>Atividades de hoje</h2>
                    </div>
                    <Link href="/diario" className="small-link">Adicionar</Link>
                  </div>

                  {activities.length === 0 ? (
                    <div className="empty-state">
                      <ActivityIcon size={26} />
                      <p>Nenhuma atividade registrada hoje.</p>
                    </div>
                  ) : (
                    <div className="timeline-list">
                      {activities.map((activity) => (
                        <div className="timeline-item" key={activity.id}>
                          <span className="timeline-dot" />
                          <div>
                            <b>{activity.name}</b>
                            <p>
                              {activity.duration_minutes ? `${activity.duration_minutes} min` : "Sem duração informada"}
                              {activity.steps ? ` • ${activity.steps.toLocaleString("pt-BR")} passos` : ""}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </section>
            </>
          )}
        </div>
      </AppShell>
    </AuthGuard>
  );
}
