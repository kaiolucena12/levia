"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import Link from "next/link";

import AuthGuard from "@/components/AuthGuard";
import AppShell from "@/components/AppShell";

import { supabase } from "@/lib/supabase";

import type {
  Activity,
  DailyLog,
  Meal,
  WeightEntry,
} from "@/lib/types";

import {
  Activity as ActivityIcon,
  ArrowDownRight,
  Droplets,
  Plus,
  Target,
  Utensils,
} from "lucide-react";

function todayBrazil() {
  return new Intl.DateTimeFormat(
    "en-CA",
    {
      timeZone: "America/Recife",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }
  ).format(new Date());
}

function getWeekStart() {
  const now = new Date();

  const brazilDate =
    new Date(
      new Intl.DateTimeFormat(
        "en-US",
        {
          timeZone: "America/Recife",
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        }
      ).format(now)
    );

  const day =
    brazilDate.getDay();

  const difference =
    day === 0
      ? -6
      : 1 - day;

  brazilDate.setDate(
    brazilDate.getDate() +
      difference
  );

  const year =
    brazilDate.getFullYear();

  const month =
    String(
      brazilDate.getMonth() + 1
    ).padStart(2, "0");

  const date =
    String(
      brazilDate.getDate()
    ).padStart(2, "0");

  return `${year}-${month}-${date}`;
}

function getBMI(
  weight?: number,
  heightCm?: number
) {
  if (
    !weight ||
    !heightCm
  ) {
    return null;
  }

  const heightM =
    heightCm / 100;

  if (
    heightM <= 0
  ) {
    return null;
  }

  return Number(
    (
      Number(weight) /
      (heightM * heightM)
    ).toFixed(1)
  );
}

function getBMIText(
  bmi: number | null
) {
  if (bmi === null) {
    return "Complete altura e peso";
  }

  if (bmi < 18.5) {
    return "Abaixo da faixa de referência";
  }

  if (bmi < 25) {
    return "Faixa de referência";
  }

  if (bmi < 30) {
    return "Acima da faixa de referência";
  }

  return "Acima da faixa de referência";
}

type Profile = {
  name: string | null;
  sex: string | null;
  height_cm: number | null;
};

type WeeklyGoal = {
  nutrition_days_target: number;
  activity_days_target: number;
  notes: string | null;
};

export default function DashboardPage() {
  const [name, setName] =
    useState("você");

  const [weights, setWeights] =
    useState<WeightEntry[]>([]);

  const [meals, setMeals] =
    useState<Meal[]>([]);

  const [
    weekMeals,
    setWeekMeals,
  ] = useState<Meal[]>([]);

  const [
    activities,
    setActivities,
  ] =
    useState<Activity[]>([]);

  const [
    weekActivities,
    setWeekActivities,
  ] =
    useState<Activity[]>([]);

  const [daily, setDaily] =
    useState<DailyLog | null>(
      null
    );

  const [
    profile,
    setProfile,
  ] =
    useState<Profile | null>(
      null
    );

  const [
    goals,
    setGoals,
  ] =
    useState<WeeklyGoal | null>(
      null
    );

  const [loading, setLoading] =
    useState(true);

  const load =
    useCallback(async () => {
      const {
        data: auth,
      } =
        await supabase.auth.getUser();

      if (!auth.user) {
        return;
      }

      const today =
        todayBrazil();

      const weekStart =
        getWeekStart();

      setName(
        auth.user.user_metadata
          ?.name ||
          auth.user.email?.split(
            "@"
          )[0] ||
          "você"
      );

      const [
        weightsRes,
        mealsRes,
        weekMealsRes,
        activitiesRes,
        weekActivitiesRes,
        dailyRes,
        profileRes,
        goalsRes,
      ] =
        await Promise.all([
          supabase
            .from(
              "weight_entries"
            )
            .select("*")
            .order(
              "recorded_at",
              {
                ascending:
                  false,
              }
            )
            .limit(30),

          supabase
            .from("meals")
            .select("*")
            .eq(
              "meal_date",
              today
            )
            .order(
              "created_at",
              {
                ascending: true,
              }
            ),

          supabase
            .from("meals")
            .select("*")
            .gte(
              "meal_date",
              weekStart
            )
            .lte(
              "meal_date",
              today
            ),

          supabase
            .from(
              "activities"
            )
            .select("*")
            .eq(
              "activity_date",
              today
            )
            .order(
              "created_at",
              {
                ascending: true,
              }
            ),

          supabase
            .from(
              "activities"
            )
            .select("*")
            .gte(
              "activity_date",
              weekStart
            )
            .lte(
              "activity_date",
              today
            ),

          supabase
            .from(
              "daily_logs"
            )
            .select("*")
            .eq(
              "log_date",
              today
            )
            .maybeSingle(),

          supabase
            .from("profiles")
            .select(
              "name,sex,height_cm"
            )
            .eq(
              "id",
              auth.user.id
            )
            .maybeSingle(),

          supabase
            .from(
              "weekly_goals"
            )
            .select(
              "nutrition_days_target,activity_days_target,notes"
            )
            .eq(
              "week_start",
              weekStart
            )
            .maybeSingle(),
        ]);

      setWeights(
        weightsRes.data || []
      );

      setMeals(
        mealsRes.data || []
      );

      setWeekMeals(
        weekMealsRes.data ||
          []
      );

      setActivities(
        activitiesRes.data ||
          []
      );

      setWeekActivities(
        weekActivitiesRes.data ||
          []
      );

      setDaily(
        dailyRes.data ||
          null
      );

      setProfile(
        profileRes.data ||
          null
      );

      setGoals(
        goalsRes.data ||
          null
      );

      setLoading(false);
    }, []);

  useEffect(() => {
    load();
  }, [load]);

  const currentWeight =
    weights[0]?.weight;

  const oldestWeight =
    weights[
      weights.length - 1
    ]?.weight;

  const difference =
    currentWeight &&
    oldestWeight
      ? Number(
          (
            Number(
              currentWeight
            ) -
            Number(
              oldestWeight
            )
          ).toFixed(1)
        )
      : null;

  const bmi =
    getBMI(
      currentWeight
        ? Number(
            currentWeight
          )
        : undefined,

      profile?.height_cm ||
        undefined
    );

  const nutritionDays =
    useMemo(() => {
      return new Set(
        weekMeals.map(
          (item) =>
            item.meal_date
        )
      ).size;
    }, [weekMeals]);

  const activityDays =
    useMemo(() => {
      return new Set(
        weekActivities.map(
          (item) =>
            item.activity_date
        )
      ).size;
    }, [weekActivities]);

  const nutritionTarget =
    goals
      ?.nutrition_days_target ||
    5;

  const activityTarget =
    goals
      ?.activity_days_target ||
    3;

  return (
    <AuthGuard>
      <AppShell>
        <div className="page">
          <header className="page-header">
            <div>
              <span className="eyebrow">
                HOJE
              </span>

              <h1>
                Olá, {name}.
              </h1>

              <p>
                Um dia de cada vez.
                Veja como está sua
                rotina.
              </p>
            </div>

            <Link
              className="primary-button inline-button"
              href="/diario"
            >
              <Plus size={18} />

              Registrar agora
            </Link>
          </header>

          {loading ? (
            <div className="card">
              Carregando seus
              dados...
            </div>
          ) : (
            <>
              <section className="stats-grid dashboard-stats-three">
                <div className="stat-card featured">
                  <span className="stat-label">
                    Peso atual
                  </span>

                  <strong>
                    {currentWeight
                      ? `${currentWeight} kg`
                      : "—"}
                  </strong>

                  <small>
                    {difference ===
                    null ? (
                      "Registre seu primeiro peso"
                    ) : difference <
                      0 ? (
                      <>
                        <ArrowDownRight
                          size={
                            14
                          }
                        />

                        {Math.abs(
                          difference
                        )}{" "}
                        kg no período
                      </>
                    ) : (
                      `${
                        difference >
                        0
                          ? "+"
                          : ""
                      }${difference} kg no período`
                    )}
                  </small>
                </div>

                <div className="stat-card">
                  <div className="stat-icon">
                    <Droplets
                      size={20}
                    />
                  </div>

                  <span className="stat-label">
                    Água
                  </span>

                  <strong>
                    {daily?.water_ml
                      ? `${(
                          daily.water_ml /
                          1000
                        ).toFixed(
                          1
                        )} L`
                      : "—"}
                  </strong>

                  <small>
                    registrados hoje
                  </small>
                </div>

                <div className="stat-card">
                  <div className="stat-icon">
                    <Target
                      size={20}
                    />
                  </div>

                  <span className="stat-label">
                    IMC
                  </span>

                  <strong>
                    {bmi ??
                      "—"}
                  </strong>

                  <small>
                    {getBMIText(
                      bmi
                    )}
                  </small>
                </div>
              </section>

              <section className="card goals-card">
                <div className="card-heading">
                  <div>
                    <span className="eyebrow">
                      METAS DA SEMANA
                    </span>

                    <h2>
                      Seu plano semanal
                    </h2>
                  </div>

                  <Link
                    href="/ia"
                    className="small-link"
                  >
                    Falar com a
                    Lívia
                  </Link>
                </div>

                <div className="goal-grid">
                  <div className="goal-item">
                    <div className="goal-icon">
                      <Utensils
                        size={20}
                      />
                    </div>

                    <div className="goal-content">
                      <span>
                        Alimentação
                      </span>

                      <strong>
                        {
                          nutritionDays
                        }{" "}
                        /{" "}
                        {
                          nutritionTarget
                        }{" "}
                        dias
                      </strong>

                      <div className="goal-progress">
                        <span
                          style={{
                            width: `${Math.min(
                              100,
                              (nutritionDays /
                                nutritionTarget) *
                                100
                            )}%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="goal-item">
                    <div className="goal-icon">
                      <ActivityIcon
                        size={20}
                      />
                    </div>

                    <div className="goal-content">
                      <span>
                        Atividade
                        física
                      </span>

                      <strong>
                        {
                          activityDays
                        }{" "}
                        /{" "}
                        {
                          activityTarget
                        }{" "}
                        dias
                      </strong>

                      <div className="goal-progress">
                        <span
                          style={{
                            width: `${Math.min(
                              100,
                              (activityDays /
                                activityTarget) *
                                100
                            )}%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {goals?.notes && (
                  <p className="goal-note">
                    {goals.notes}
                  </p>
                )}
              </section>

              <section className="dashboard-grid dashboard-grid-two">
                <div className="card">
                  <div className="card-heading">
                    <div>
                      <span className="eyebrow">
                        ALIMENTAÇÃO
                      </span>

                      <h2>
                        Refeições de hoje
                      </h2>
                    </div>

                    <Link
                      href="/diario"
                      className="small-link"
                    >
                      Adicionar
                    </Link>
                  </div>

                  {meals.length ===
                  0 ? (
                    <div className="empty-state">
                      <Utensils
                        size={26}
                      />

                      <p>
                        Nenhuma refeição
                        registrada hoje.
                      </p>
                    </div>
                  ) : (
                    <div className="timeline-list">
                      {meals.map(
                        (meal) => (
                          <div
                            className="timeline-item"
                            key={
                              meal.id
                            }
                          >
                            <span className="timeline-dot" />

                            <div>
                              <b>
                                {
                                  meal.meal_type
                                }
                              </b>

                              <p>
                                {
                                  meal.description
                                }
                              </p>
                            </div>
                          </div>
                        )
                      )}
                    </div>
                  )}
                </div>

                <div className="card">
                  <div className="card-heading">
                    <div>
                      <span className="eyebrow">
                        MOVIMENTO
                      </span>

                      <h2>
                        Atividades de
                        hoje
                      </h2>
                    </div>

                    <Link
                      href="/diario"
                      className="small-link"
                    >
                      Adicionar
                    </Link>
                  </div>

                  {activities.length ===
                  0 ? (
                    <div className="empty-state">
                      <ActivityIcon
                        size={26}
                      />

                      <p>
                        Nenhuma atividade
                        registrada hoje.
                      </p>
                    </div>
                  ) : (
                    <div className="timeline-list">
                      {activities.map(
                        (
                          activity
                        ) => (
                          <div
                            className="timeline-item"
                            key={
                              activity.id
                            }
                          >
                            <span className="timeline-dot" />

                            <div>
                              <b>
                                {
                                  activity.name
                                }
                              </b>

                              <p>
                                {activity.duration_minutes
                                  ? `${activity.duration_minutes} min`
                                  : "Sem duração informada"}
                              </p>
                            </div>
                          </div>
                        )
                      )}
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