"use client";

import {
  FormEvent,
  useCallback,
  useEffect,
  useState,
} from "react";

import AuthGuard from "@/components/AuthGuard";
import AppShell from "@/components/AppShell";
import { supabase } from "@/lib/supabase";

import type {
  Activity,
  DailyLog,
  Meal,
} from "@/lib/types";

import {
  Activity as ActivityIcon,
  Droplets,
  Moon,
  Plus,
  Trash2,
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

const mealTypes = [
  "Café da manhã",
  "Lanche",
  "Almoço",
  "Lanche da tarde",
  "Jantar",
  "Ceia",
];

export default function DiarioPage() {
  const [userId, setUserId] =
    useState("");

  const [meals, setMeals] =
    useState<Meal[]>([]);

  const [
    activities,
    setActivities,
  ] =
    useState<Activity[]>([]);

  const [daily, setDaily] =
    useState<DailyLog | null>(
      null
    );

  const [
    mealType,
    setMealType,
  ] =
    useState(
      "Café da manhã"
    );

  const [
    mealDescription,
    setMealDescription,
  ] = useState("");

  const [
    activityName,
    setActivityName,
  ] = useState("");

  const [
    minutes,
    setMinutes,
  ] = useState("");

  const [
    steps,
    setSteps,
  ] = useState("");

  const [
    water,
    setWater,
  ] = useState("");

  const [
    sleep,
    setSleep,
  ] = useState("");

  const [
    notes,
    setNotes,
  ] = useState("");

  const [
    message,
    setMessage,
  ] = useState("");

  const [
    loading,
    setLoading,
  ] = useState(true);

  /*
   * Carrega tudo do dia atual.
   */
  const load =
    useCallback(
      async (
        showLoading = false
      ) => {
        if (showLoading) {
          setLoading(true);
        }

        try {
          const {
            data: auth,
            error:
              authError,
          } =
            await supabase.auth.getUser();

          if (
            authError ||
            !auth.user
          ) {
            return;
          }

          const currentUserId =
            auth.user.id;

          setUserId(
            currentUserId
          );

          const today =
            todayBrazil();

          const [
            mealRes,
            activityRes,
            dailyRes,
          ] =
            await Promise.all([
              supabase
                .from(
                  "meals"
                )
                .select("*")
                .eq(
                  "user_id",
                  currentUserId
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

              supabase
                .from(
                  "activities"
                )
                .select("*")
                .eq(
                  "user_id",
                  currentUserId
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

              supabase
                .from(
                  "daily_logs"
                )
                .select("*")
                .eq(
                  "user_id",
                  currentUserId
                )
                .eq(
                  "log_date",
                  today
                )
                .maybeSingle(),
            ]);

          if (
            mealRes.error
          ) {
            console.error(
              "Erro ao carregar refeições:",
              mealRes.error
            );
          }

          if (
            activityRes.error
          ) {
            console.error(
              "Erro ao carregar atividades:",
              activityRes.error
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

          setMeals(
            mealRes.data ||
              []
          );

          setActivities(
            activityRes.data ||
              []
          );

          setDaily(
            dailyRes.data ||
              null
          );

          /*
           * Atualiza os campos de hábitos
           * com os valores atuais do banco.
           */
          if (
            dailyRes.data
          ) {
            setWater(
              dailyRes.data
                .water_ml
                ?.toString() ||
                ""
            );

            setSleep(
              dailyRes.data
                .sleep_hours
                ?.toString() ||
                ""
            );

            setNotes(
              dailyRes.data
                .notes ||
                ""
            );
          } else {
            setWater("");
            setSleep("");
            setNotes("");
          }
        } finally {
          setLoading(false);
        }
      },
      []
    );

  /*
   * Carregamento inicial.
   */
  useEffect(() => {
    load(true);
  }, [load]);

  /*
   * IMPORTANTE:
   *
   * Quando a Lívia registra:
   * - refeição
   * - água
   * - atividade
   * - peso
   *
   * o componente LiviaAssistant dispara:
   *
   * levia:data-updated
   *
   * Este listener atualiza o Diário
   * automaticamente.
   */
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
          ?.actions || [];

      /*
       * Só recarrega o Diário
       * se a alteração puder
       * afetar esta tela.
       */
      const shouldReload =
        actions.length ===
          0 ||
        actions.some(
          (action) =>
            [
              "meal",
              "water",
              "activity",
            ].includes(
              action
            )
        );

      if (
        shouldReload
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

  /*
   * Se o usuário voltar para a aba
   * depois de um tempo, atualiza.
   */
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

  async function addMeal(
    e: FormEvent
  ) {
    e.preventDefault();

    setMessage("");

    if (
      !userId ||
      !mealDescription.trim()
    ) {
      return;
    }

    const {
      error,
    } =
      await supabase
        .from("meals")
        .insert({
          user_id:
            userId,

          meal_type:
            mealType,

          description:
            mealDescription.trim(),

          meal_date:
            todayBrazil(),
        });

    if (error) {
      console.error(
        "Erro ao salvar refeição:",
        error
      );

      setMessage(
        `Não foi possível salvar a refeição: ${error.message}`
      );

      return;
    }

    setMealDescription("");

    setMessage(
      "Refeição salva."
    );

    await load();

    window.dispatchEvent(
      new CustomEvent(
        "levia:data-updated",
        {
          detail: {
            actions: [
              "meal",
            ],
          },
        }
      )
    );
  }

  async function addActivity(
    e: FormEvent
  ) {
    e.preventDefault();

    setMessage("");

    if (
      !userId ||
      !activityName.trim()
    ) {
      return;
    }

    const duration =
      minutes
        ? Number(
            minutes
          )
        : null;

    const stepCount =
      steps
        ? Number(
            steps
          )
        : null;

    const {
      error,
    } =
      await supabase
        .from(
          "activities"
        )
        .insert({
          user_id:
            userId,

          name:
            activityName.trim(),

          duration_minutes:
            duration,

          steps:
            stepCount,

          activity_date:
            todayBrazil(),
        });

    if (error) {
      console.error(
        "Erro ao salvar atividade:",
        error
      );

      setMessage(
        `Não foi possível salvar a atividade: ${error.message}`
      );

      return;
    }

    setActivityName("");
    setMinutes("");
    setSteps("");

    setMessage(
      "Atividade salva."
    );

    await load();

    window.dispatchEvent(
      new CustomEvent(
        "levia:data-updated",
        {
          detail: {
            actions: [
              "activity",
            ],
          },
        }
      )
    );
  }

  async function saveDaily(
    e: FormEvent
  ) {
    e.preventDefault();

    setMessage("");

    if (!userId) {
      return;
    }

    const {
      error,
    } =
      await supabase
        .from(
          "daily_logs"
        )
        .upsert(
          {
            user_id:
              userId,

            log_date:
              todayBrazil(),

            water_ml:
              water
                ? Number(
                    water
                  )
                : null,

            sleep_hours:
              sleep
                ? Number(
                    sleep
                  )
                : null,

            notes:
              notes.trim() ||
              null,

            updated_at:
              new Date()
                .toISOString(),
          },
          {
            onConflict:
              "user_id,log_date",
          }
        );

    if (error) {
      console.error(
        "Erro ao salvar hábitos:",
        error
      );

      setMessage(
        `Não foi possível atualizar os hábitos: ${error.message}`
      );

      return;
    }

    setMessage(
      "Hábitos do dia atualizados."
    );

    await load();

    window.dispatchEvent(
      new CustomEvent(
        "levia:data-updated",
        {
          detail: {
            actions: [
              "water",
            ],
          },
        }
      )
    );
  }

  async function remove(
    table:
      | "meals"
      | "activities",

    id: string
  ) {
    setMessage("");

    const {
      error,
    } =
      await supabase
        .from(table)
        .delete()
        .eq(
          "id",
          id
        )
        .eq(
          "user_id",
          userId
        );

    if (error) {
      console.error(
        "Erro ao excluir:",
        error
      );

      setMessage(
        `Não foi possível excluir: ${error.message}`
      );

      return;
    }

    await load();

    window.dispatchEvent(
      new CustomEvent(
        "levia:data-updated"
      )
    );
  }

  return (
    <AuthGuard>
      <AppShell>
        <div className="page">
          <header className="page-header">
            <div>
              <span className="eyebrow">
                MEU DIA
              </span>

              <h1>
                Diário
              </h1>

              <p>
                Registre o que
                aconteceu hoje
                sem complicar.
              </p>
            </div>
          </header>

          {message && (
            <div className="success-message">
              {message}
            </div>
          )}

          {loading ? (
            <div className="card">
              Carregando seu
              diário...
            </div>
          ) : (
            <>
              <section className="two-column">
                {/* REFEIÇÃO */}

                <form
                  className="card form-card"
                  onSubmit={
                    addMeal
                  }
                >
                  <div className="card-heading">
                    <div className="heading-with-icon">
                      <Utensils
                        size={
                          20
                        }
                      />

                      <div>
                        <span className="eyebrow">
                          ALIMENTAÇÃO
                        </span>

                        <h2>
                          Adicionar
                          refeição
                        </h2>
                      </div>
                    </div>
                  </div>

                  <label>
                    Refeição

                    <select
                      value={
                        mealType
                      }
                      onChange={(
                        e
                      ) =>
                        setMealType(
                          e
                            .target
                            .value
                        )
                      }
                    >
                      {mealTypes.map(
                        (
                          item
                        ) => (
                          <option
                            key={
                              item
                            }
                            value={
                              item
                            }
                          >
                            {
                              item
                            }
                          </option>
                        )
                      )}
                    </select>
                  </label>

                  <label>
                    O que você
                    comeu?

                    <textarea
                      value={
                        mealDescription
                      }
                      onChange={(
                        e
                      ) =>
                        setMealDescription(
                          e
                            .target
                            .value
                        )
                      }
                      placeholder="Ex.: 2 ovos mexidos, 1 pão francês, café com leite e uma banana."
                      rows={
                        5
                      }
                      required
                    />
                  </label>

                  <button
                    type="submit"
                    className="primary-button"
                  >
                    <Plus
                      size={
                        17
                      }
                    />

                    Salvar
                    refeição
                  </button>
                </form>

                {/* ATIVIDADE */}

                <form
                  className="card form-card"
                  onSubmit={
                    addActivity
                  }
                >
                  <div className="card-heading">
                    <div className="heading-with-icon">
                      <ActivityIcon
                        size={
                          20
                        }
                      />

                      <div>
                        <span className="eyebrow">
                          MOVIMENTO
                        </span>

                        <h2>
                          Adicionar
                          atividade
                        </h2>
                      </div>
                    </div>
                  </div>

                  <label>
                    Atividade

                    <input
                      value={
                        activityName
                      }
                      onChange={(
                        e
                      ) =>
                        setActivityName(
                          e
                            .target
                            .value
                        )
                      }
                      placeholder="Ex.: Caminhada"
                      required
                    />
                  </label>

                  <div className="form-row">
                    <label>
                      Minutos

                      <input
                        type="number"
                        min="0"
                        value={
                          minutes
                        }
                        onChange={(
                          e
                        ) =>
                          setMinutes(
                            e
                              .target
                              .value
                          )
                        }
                        placeholder="30"
                      />
                    </label>

                    <label>
                      Passos

                      <input
                        type="number"
                        min="0"
                        value={
                          steps
                        }
                        onChange={(
                          e
                        ) =>
                          setSteps(
                            e
                              .target
                              .value
                          )
                        }
                        placeholder="5000"
                      />
                    </label>
                  </div>

                  <button
                    type="submit"
                    className="primary-button"
                  >
                    <Plus
                      size={
                        17
                      }
                    />

                    Salvar
                    atividade
                  </button>
                </form>
              </section>

              {/* HÁBITOS */}

              <form
                className="card form-card"
                onSubmit={
                  saveDaily
                }
              >
                <div className="card-heading">
                  <div>
                    <span className="eyebrow">
                      HÁBITOS
                    </span>

                    <h2>
                      Resumo do
                      dia
                    </h2>
                  </div>
                </div>

                <div className="form-row three">
                  <label>
                    <span className="label-with-icon">
                      <Droplets
                        size={
                          16
                        }
                      />

                      Água (ml)
                    </span>

                    <input
                      type="number"
                      min="0"
                      value={
                        water
                      }
                      onChange={(
                        e
                      ) =>
                        setWater(
                          e
                            .target
                            .value
                        )
                      }
                      placeholder="2000"
                    />
                  </label>

                  <label>
                    <span className="label-with-icon">
                      <Moon
                        size={
                          16
                        }
                      />

                      Sono
                      (horas)
                    </span>

                    <input
                      type="number"
                      min="0"
                      max="24"
                      step="0.1"
                      value={
                        sleep
                      }
                      onChange={(
                        e
                      ) =>
                        setSleep(
                          e
                            .target
                            .value
                        )
                      }
                      placeholder="7.5"
                    />
                  </label>

                  <label>
                    Observações

                    <input
                      value={
                        notes
                      }
                      onChange={(
                        e
                      ) =>
                        setNotes(
                          e
                            .target
                            .value
                        )
                      }
                      placeholder="Como foi seu dia?"
                    />
                  </label>
                </div>

                <button
                  type="submit"
                  className="secondary-button"
                >
                  Atualizar
                  hábitos
                </button>
              </form>

              {/* LISTAS */}

              <section className="two-column">
                <div className="card">
                  <div className="card-heading">
                    <h2>
                      Refeições
                      registradas
                    </h2>
                  </div>

                  {meals.length ===
                  0 ? (
                    <p className="muted">
                      Nenhuma
                      ainda.
                    </p>
                  ) : (
                    <div className="record-list">
                      {meals.map(
                        (
                          item
                        ) => (
                          <div
                            className="record-item"
                            key={
                              item.id
                            }
                          >
                            <div>
                              <b>
                                {
                                  item.meal_type
                                }
                              </b>

                              <p>
                                {
                                  item.description
                                }
                              </p>
                            </div>

                            <button
                              type="button"
                              onClick={() =>
                                remove(
                                  "meals",
                                  item.id
                                )
                              }
                              className="icon-button"
                              aria-label="Excluir refeição"
                            >
                              <Trash2
                                size={
                                  16
                                }
                              />
                            </button>
                          </div>
                        )
                      )}
                    </div>
                  )}
                </div>

                <div className="card">
                  <div className="card-heading">
                    <h2>
                      Atividades
                      registradas
                    </h2>
                  </div>

                  {activities.length ===
                  0 ? (
                    <p className="muted">
                      Nenhuma
                      ainda.
                    </p>
                  ) : (
                    <div className="record-list">
                      {activities.map(
                        (
                          item
                        ) => (
                          <div
                            className="record-item"
                            key={
                              item.id
                            }
                          >
                            <div>
                              <b>
                                {
                                  item.name
                                }
                              </b>

                              <p>
                                {item.duration_minutes
                                  ? `${item.duration_minutes} min`
                                  : ""}

                                {item.duration_minutes &&
                                item.steps
                                  ? " • "
                                  : ""}

                                {item.steps
                                  ? `${item.steps} passos`
                                  : ""}
                              </p>
                            </div>

                            <button
                              type="button"
                              onClick={() =>
                                remove(
                                  "activities",
                                  item.id
                                )
                              }
                              className="icon-button"
                              aria-label="Excluir atividade"
                            >
                              <Trash2
                                size={
                                  16
                                }
                              />
                            </button>
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