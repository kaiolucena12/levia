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
  Flame,
  Plus,
  Target,
  Utensils,
} from "lucide-react";

/* =========================================================
   DATA DE HOJE - RECIFE
========================================================= */

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

/* =========================================================
   INÍCIO DA SEMANA
========================================================= */

function getWeekStart() {
  const today =
    todayBrazil();

  const [
    year,
    month,
    day,
  ] =
    today
      .split("-")
      .map(Number);

  const date =
    new Date(
      year,
      month - 1,
      day,
      12,
      0,
      0
    );

  const weekday =
    date.getDay();

  const difference =
    weekday === 0
      ? -6
      : 1 - weekday;

  date.setDate(
    date.getDate() +
      difference
  );

  const newYear =
    date.getFullYear();

  const newMonth =
    String(
      date.getMonth() +
        1
    ).padStart(
      2,
      "0"
    );

  const newDay =
    String(
      date.getDate()
    ).padStart(
      2,
      "0"
    );

  return `${newYear}-${newMonth}-${newDay}`;
}

/* =========================================================
   IMC
========================================================= */

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
      (
        heightM *
        heightM
      )
    ).toFixed(1)
  );
}

function getBMIText(
  bmi: number | null
) {
  if (
    bmi === null
  ) {
    return "Complete altura e peso";
  }

  if (
    bmi < 18.5
  ) {
    return "Abaixo da faixa de referência";
  }

  if (
    bmi < 25
  ) {
    return "Faixa de referência";
  }

  if (
    bmi < 30
  ) {
    return "Acima da faixa de referência";
  }

  return "Acima da faixa de referência";
}

/* =========================================================
   TIPOS
========================================================= */

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

type CaloriesToday = {
  min: number;
  max: number;
  mealsCount: number;
};

type NutritionEstimateRow = {
  id: string;
  meal_id: string | null;
  kcal_min:
    | number
    | string
    | null;
  kcal_max:
    | number
    | string
    | null;
  created_at?: string;

  meals?:
    | {
        meal_date?: string;
        user_id?: string;
      }
    | {
        meal_date?: string;
        user_id?: string;
      }[]
    | null;
};

/* =========================================================
   DASHBOARD
========================================================= */

export default function DashboardPage() {
  const [
    name,
    setName,
  ] =
    useState(
      "você"
    );

  const [
    weights,
    setWeights,
  ] =
    useState<
      WeightEntry[]
    >([]);

  const [
    meals,
    setMeals,
  ] =
    useState<
      Meal[]
    >([]);

  const [
    weekMeals,
    setWeekMeals,
  ] =
    useState<
      Meal[]
    >([]);

  const [
    activities,
    setActivities,
  ] =
    useState<
      Activity[]
    >([]);

  const [
    weekActivities,
    setWeekActivities,
  ] =
    useState<
      Activity[]
    >([]);

  const [
    daily,
    setDaily,
  ] =
    useState<
      DailyLog | null
    >(null);

  const [
    profile,
    setProfile,
  ] =
    useState<
      Profile | null
    >(null);

  const [
    goals,
    setGoals,
  ] =
    useState<
      WeeklyGoal | null
    >(null);

  const [
    todayCalories,
    setTodayCalories,
  ] =
    useState<
      CaloriesToday | null
    >(null);

  const [
    loading,
    setLoading,
  ] =
    useState(
      true
    );

  /* =======================================================
     CARREGAR DADOS
  ======================================================= */

  const load =
    useCallback(
      async (
        showLoading =
          false
      ) => {
        if (
          showLoading
        ) {
          setLoading(
            true
          );
        }

        try {
          const {
            data:
              auth,
            error:
              authError,
          } =
            await supabase.auth.getUser();

          if (
            authError ||
            !auth.user
          ) {
            setLoading(
              false
            );

            return;
          }

          const userId =
            auth.user.id;

          const today =
            todayBrazil();

          const weekStart =
            getWeekStart();

          setName(
            auth.user
              .user_metadata
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
            caloriesRes,
          ] =
            await Promise.all([
              /* PESOS */

              supabase
                .from(
                  "weight_entries"
                )
                .select(
                  "*"
                )
                .eq(
                  "user_id",
                  userId
                )
                .order(
                  "recorded_at",
                  {
                    ascending:
                      false,
                  }
                )
                .limit(
                  30
                ),

              /* REFEIÇÕES DE HOJE */

              supabase
                .from(
                  "meals"
                )
                .select(
                  "*"
                )
                .eq(
                  "user_id",
                  userId
                )
                .eq(
                  "meal_date",
                  today
                )
                .order(
                  "created_at",
                  {
                    ascending:
                      true,
                  }
                ),

              /* REFEIÇÕES DA SEMANA */

              supabase
                .from(
                  "meals"
                )
                .select(
                  "*"
                )
                .eq(
                  "user_id",
                  userId
                )
                .gte(
                  "meal_date",
                  weekStart
                )
                .lte(
                  "meal_date",
                  today
                ),

              /* ATIVIDADES DE HOJE */

              supabase
                .from(
                  "activities"
                )
                .select(
                  "*"
                )
                .eq(
                  "user_id",
                  userId
                )
                .eq(
                  "activity_date",
                  today
                )
                .order(
                  "created_at",
                  {
                    ascending:
                      true,
                  }
                ),

              /* ATIVIDADES DA SEMANA */

              supabase
                .from(
                  "activities"
                )
                .select(
                  "*"
                )
                .eq(
                  "user_id",
                  userId
                )
                .gte(
                  "activity_date",
                  weekStart
                )
                .lte(
                  "activity_date",
                  today
                ),

              /* HÁBITOS */

              supabase
                .from(
                  "daily_logs"
                )
                .select(
                  "*"
                )
                .eq(
                  "user_id",
                  userId
                )
                .eq(
                  "log_date",
                  today
                )
                .order(
                  "updated_at",
                  {
                    ascending:
                      false,
                  }
                )
                .limit(
                  1
                )
                .maybeSingle(),

              /* PERFIL */

              supabase
                .from(
                  "profiles"
                )
                .select(
                  "name,sex,height_cm"
                )
                .eq(
                  "id",
                  userId
                )
                .maybeSingle(),

              /* METAS */

              supabase
                .from(
                  "weekly_goals"
                )
                .select(
                  "nutrition_days_target,activity_days_target,notes"
                )
                .eq(
                  "user_id",
                  userId
                )
                .eq(
                  "week_start",
                  weekStart
                )
                .maybeSingle(),

              /* CALORIAS */

              supabase
                .from(
                  "meal_nutrition_estimates"
                )
                .select(`
                  id,
                  meal_id,
                  kcal_min,
                  kcal_max,
                  created_at,
                  meals!inner (
                    meal_date,
                    user_id
                  )
                `)
                .eq(
                  "user_id",
                  userId
                )
                .eq(
                  "meals.user_id",
                  userId
                )
                .eq(
                  "meals.meal_date",
                  today
                )
                .order(
                  "created_at",
                  {
                    ascending:
                      false,
                  }
                ),
            ]);

          /* =================================================
             ERROS
          ================================================= */

          if (
            weightsRes.error
          ) {
            console.error(
              "Erro ao carregar pesos:",
              weightsRes.error
            );
          }

          if (
            mealsRes.error
          ) {
            console.error(
              "Erro ao carregar refeições:",
              mealsRes.error
            );
          }

          if (
            weekMealsRes.error
          ) {
            console.error(
              "Erro ao carregar refeições da semana:",
              weekMealsRes.error
            );
          }

          if (
            activitiesRes.error
          ) {
            console.error(
              "Erro ao carregar atividades:",
              activitiesRes.error
            );
          }

          if (
            weekActivitiesRes.error
          ) {
            console.error(
              "Erro ao carregar atividades da semana:",
              weekActivitiesRes.error
            );
          }

          if (
            dailyRes.error
          ) {
            console.error(
              "Erro ao carregar hábitos:",
              JSON.stringify(
                dailyRes.error,
                null,
                2
              )
            );
          }

          if (
            profileRes.error
          ) {
            console.error(
              "Erro ao carregar perfil:",
              profileRes.error
            );
          }

          if (
            goalsRes.error
          ) {
            console.error(
              "Erro ao carregar metas:",
              goalsRes.error
            );
          }

          if (
            caloriesRes.error
          ) {
            console.error(
              "Erro ao carregar calorias:",
              JSON.stringify(
                caloriesRes.error,
                null,
                2
              )
            );
          }

          /* =================================================
             ESTADOS
          ================================================= */

          setWeights(
            weightsRes.data ||
              []
          );

          setMeals(
            mealsRes.data ||
              []
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

          /* =================================================
             CALORIAS DO DIA
          ================================================= */

          if (
            caloriesRes.error
          ) {
            setTodayCalories(
              null
            );
          } else {
            const calorieRows =
              (
                caloriesRes.data ||
                []
              ) as unknown as NutritionEstimateRow[];

            /*
             * Só usa a estimativa mais recente
             * de cada refeição.
             */
            const uniqueMeals =
              new Map<
                string,
                NutritionEstimateRow
              >();

            for (
              const row of calorieRows
            ) {
              const key =
                row.meal_id ||
                row.id;

              if (
                !uniqueMeals.has(
                  key
                )
              ) {
                uniqueMeals.set(
                  key,
                  row
                );
              }
            }

            const finalRows =
              Array.from(
                uniqueMeals.values()
              );

            if (
              finalRows.length ===
              0
            ) {
              setTodayCalories(
                null
              );
            } else {
              const totalMin =
                finalRows.reduce(
                  (
                    sum,
                    item
                  ) => {
                    const value =
                      Number(
                        item.kcal_min
                      );

                    return (
                      sum +
                      (
                        Number.isFinite(
                          value
                        )
                          ? value
                          : 0
                      )
                    );
                  },
                  0
                );

              const totalMax =
                finalRows.reduce(
                  (
                    sum,
                    item
                  ) => {
                    const value =
                      Number(
                        item.kcal_max
                      );

                    return (
                      sum +
                      (
                        Number.isFinite(
                          value
                        )
                          ? value
                          : 0
                      )
                    );
                  },
                  0
                );

              setTodayCalories(
                {
                  min:
                    Math.round(
                      totalMin
                    ),

                  max:
                    Math.round(
                      totalMax
                    ),

                  mealsCount:
                    finalRows.length,
                }
              );
            }
          }
        } catch (
          error
        ) {
          console.error(
            "Erro ao carregar dashboard:",
            error
          );
        } finally {
          setLoading(
            false
          );
        }
      },
      []
    );

  /* =======================================================
     CARREGAMENTO INICIAL
  ======================================================= */

  useEffect(() => {
    load(true);
  }, [load]);

  /* =======================================================
     ATUALIZA QUANDO LÍVIA SALVAR
  ======================================================= */

  useEffect(() => {
    function handleLiviaUpdate(
      event: Event
    ) {
      const customEvent =
        event as CustomEvent<{
          actions?: string[];
        }>;

      const actions =
        customEvent.detail
          ?.actions ||
        [];

      const relevantActions =
        [
          "meal",
          "nutrition",
          "water",
          "weight",
          "activity",
          "weekly_goals",
        ];

      if (
        actions.length ===
          0 ||
        actions.some(
          (
            action
          ) =>
            relevantActions.includes(
              action
            )
        )
      ) {
        load();
      }
    }

    window.addEventListener(
      "levia:data-updated",
      handleLiviaUpdate
    );

    return () => {
      window.removeEventListener(
        "levia:data-updated",
        handleLiviaUpdate
      );
    };
  }, [load]);

  /* =======================================================
     ATUALIZA AO VOLTAR PARA A ABA
  ======================================================= */

  useEffect(() => {
    function handleVisibility() {
      if (
        document.visibilityState ===
        "visible"
      ) {
        load();
      }
    }

    document.addEventListener(
      "visibilitychange",
      handleVisibility
    );

    return () => {
      document.removeEventListener(
        "visibilitychange",
        handleVisibility
      );
    };
  }, [load]);

  /* =======================================================
     PESO
  ======================================================= */

  const currentWeight =
    weights[0]
      ?.weight;

  const oldestWeight =
    weights[
      weights.length -
        1
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
          ).toFixed(
            1
          )
        )
      : null;

  /* =======================================================
     IMC
  ======================================================= */

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

  /* =======================================================
     METAS
  ======================================================= */

  const nutritionDays =
    useMemo(
      () => {
        return new Set(
          weekMeals.map(
            (
              item
            ) =>
              item.meal_date
          )
        ).size;
      },
      [
        weekMeals,
      ]
    );

  const activityDays =
    useMemo(
      () => {
        return new Set(
          weekActivities.map(
            (
              item
            ) =>
              item.activity_date
          )
        ).size;
      },
      [
        weekActivities,
      ]
    );

  const nutritionTarget =
    goals
      ?.nutrition_days_target ||
    5;

  const activityTarget =
    goals
      ?.activity_days_target ||
    3;

  /* =======================================================
     TELA
  ======================================================= */

  return (
    <AuthGuard>
      <AppShell>
        <div className="page">
          {/* CABEÇALHO */}

          <header className="page-header">
            <div>
              <span className="eyebrow">
                HOJE
              </span>

              <h1>
                Olá, {name}.
              </h1>

              <p>
                Um dia de cada
                vez. Veja como
                está sua rotina.
              </p>
            </div>

            <Link
              className="primary-button inline-button"
              href="/diario"
            >
              <Plus
                size={
                  18
                }
              />

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
              {/* =============================================
                  CARDS PRINCIPAIS
              ============================================= */}

              <section className="stats-grid dashboard-stats-three">
                {/* PESO */}

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

                {/* ÁGUA */}

                <div className="stat-card">
                  <div className="stat-icon">
                    <Droplets
                      size={
                        20
                      }
                    />
                  </div>

                  <span className="stat-label">
                    Água
                  </span>

                  <strong>
                    {daily?.water_ml
                      ? `${(
                          Number(
                            daily.water_ml
                          ) /
                          1000
                        ).toFixed(
                          1
                        )} L`
                      : "—"}
                  </strong>

                  <small>
                    registrados
                    hoje
                  </small>
                </div>

                {/* IMC */}

                <div className="stat-card">
                  <div className="stat-icon">
                    <Target
                      size={
                        20
                      }
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

                {/* CALORIAS */}

                <div className="stat-card">
                  <div className="stat-icon">
                    <Flame
                      size={
                        20
                      }
                    />
                  </div>

                  <span className="stat-label">
                    Calorias estimadas
                    hoje
                  </span>

                  <strong>
                    {todayCalories
                      ? todayCalories.min ===
                        todayCalories.max
                        ? `~ ${todayCalories.min} kcal`
                        : `${todayCalories.min}–${todayCalories.max} kcal`
                      : "—"}
                  </strong>

                  <small>
                    {todayCalories
                      ? `${todayCalories.mealsCount} ${
                          todayCalories.mealsCount ===
                          1
                            ? "refeição calculada"
                            : "refeições calculadas"
                        }`
                      : "nenhuma estimativa disponível"}
                  </small>
                </div>
              </section>

              {/* =============================================
                  METAS
              ============================================= */}

              <section className="card goals-card">
                <div className="card-heading">
                  <div>
                    <span className="eyebrow">
                      METAS DA
                      SEMANA
                    </span>

                    <h2>
                      Seu plano
                      semanal
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
                  {/* ALIMENTAÇÃO */}

                  <div className="goal-item">
                    <div className="goal-icon">
                      <Utensils
                        size={
                          20
                        }
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
                              (
                                nutritionDays /
                                nutritionTarget
                              ) *
                                100
                            )}%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* ATIVIDADE */}

                  <div className="goal-item">
                    <div className="goal-icon">
                      <ActivityIcon
                        size={
                          20
                        }
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
                              (
                                activityDays /
                                activityTarget
                              ) *
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
                    {
                      goals.notes
                    }
                  </p>
                )}
              </section>

              {/* =============================================
                  REFEIÇÕES E ATIVIDADES
              ============================================= */}

              <section className="dashboard-grid dashboard-grid-two">
                {/* REFEIÇÕES */}

                <div className="card">
                  <div className="card-heading">
                    <div>
                      <span className="eyebrow">
                        ALIMENTAÇÃO
                      </span>

                      <h2>
                        Refeições
                        de hoje
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
                        size={
                          26
                        }
                      />

                      <p>
                        Nenhuma
                        refeição
                        registrada
                        hoje.
                      </p>
                    </div>
                  ) : (
                    <div className="timeline-list">
                      {meals.map(
                        (
                          meal
                        ) => (
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

                {/* ATIVIDADES */}

                <div className="card">
                  <div className="card-heading">
                    <div>
                      <span className="eyebrow">
                        MOVIMENTO
                      </span>

                      <h2>
                        Atividades
                        de hoje
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
                        size={
                          26
                        }
                      />

                      <p>
                        Nenhuma
                        atividade
                        registrada
                        hoje.
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