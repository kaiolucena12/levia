"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

import {
  Plus,
  Dumbbell,
  Search,
  X,
  Trash2,
  ChevronRight,
  Save,
  Pencil,
  Target,
} from "lucide-react";

type Exercise = {
  id: string;
  name: string;
  name_pt: string | null;
  equipment: string | null;
  primary_muscles: string[];
  secondary_muscles: string[];
  instructions: string[];
  gif_url: string | null;
  source: string | null;
  external_id: string | null;
};

type WorkoutItem = {
  id: string;
  workout_plan_id: string;
  exercise_id: string | null;
  exercise_name: string | null;
  sets: number | null;
  reps: string | null;
  weight_kg: number | null;
  rest_seconds: number | null;
  position: number;
  exercise?: Exercise | null;
};

type WorkoutPlan = {
  id: string;
  name: string;
  description: string | null;
  active: boolean;
  workout_items?: WorkoutItem[];
};

type DraftExercise = {
  exercise: Exercise;
  sets: string;
  reps: string;
  weight: string;
  rest: string;
};

export default function TreinoPage() {
  const [loading, setLoading] = useState(true);

  const [plans, setPlans] = useState<WorkoutPlan[]>([]);
  const [exercises, setExercises] = useState<Exercise[]>([]);

  const [creating, setCreating] = useState(false);

  const [planName, setPlanName] = useState("");
  const [description, setDescription] = useState("");

  const [exerciseSearch, setExerciseSearch] = useState("");
  const [draftExercises, setDraftExercises] = useState<DraftExercise[]>([]);

  const [selectedExercise, setSelectedExercise] =
    useState<Exercise | null>(null);

  const [saving, setSaving] = useState(false);
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);

  useEffect(() => {
    loadEverything();
  }, []);

  async function loadEverything() {
    setLoading(true);

    await Promise.all([
      loadPlans(),
      loadExercises(),
    ]);

    setLoading(false);
  }

  async function loadExercises() {
    const { data, error } = await supabase
      .from("exercises")
      .select(`
        id,
        name,
        name_pt,
        equipment,
        primary_muscles,
        secondary_muscles,
        instructions,
        gif_url,
        source,
        external_id
      `)
      .order("name_pt", {
        ascending: true,
        nullsFirst: false,
      });

    if (error) {
      console.error("Erro ao carregar exercícios:", error);
      return;
    }

    setExercises((data || []) as Exercise[]);
  }

  async function loadPlans() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    const { data: plansData, error: plansError } = await supabase
      .from("workout_plans")
      .select(`
        id,
        name,
        description,
        active
      `)
      .eq("user_id", user.id)
      .order("created_at", {
        ascending: true,
      });

    if (plansError) {
      console.error("Erro ao carregar treinos:", plansError);
      return;
    }

    const planIds = (plansData || []).map((plan) => plan.id);

    let items: WorkoutItem[] = [];

    if (planIds.length > 0) {
      const { data: itemsData, error: itemsError } = await supabase
        .from("workout_items")
        .select(`
          id,
          workout_plan_id,
          exercise_id,
          exercise_name,
          sets,
          reps,
          weight_kg,
          rest_seconds,
          position
        `)
        .in("workout_plan_id", planIds)
        .order("position", {
          ascending: true,
        });

      if (itemsError) {
        console.error("Erro ao carregar exercícios do treino:", itemsError);
      } else {
        items = (itemsData || []) as WorkoutItem[];
      }
    }

    const exerciseIds = items
      .map((item) => item.exercise_id)
      .filter(Boolean) as string[];

    let exerciseMap = new Map<string, Exercise>();

    if (exerciseIds.length > 0) {
      const { data: exerciseData } = await supabase
        .from("exercises")
        .select(`
          id,
          name,
          name_pt,
          equipment,
          primary_muscles,
          secondary_muscles,
          instructions,
          gif_url,
          source,
          external_id
        `)
        .in("id", exerciseIds);

      for (const exercise of (exerciseData || []) as Exercise[]) {
        exerciseMap.set(exercise.id, exercise);
      }
    }

    const normalizedPlans = (plansData || []).map((plan) => ({
      ...plan,
      workout_items: items
        .filter((item) => item.workout_plan_id === plan.id)
        .map((item) => ({
          ...item,
          exercise: item.exercise_id
            ? exerciseMap.get(item.exercise_id) || null
            : null,
        })),
    }));

    setPlans(normalizedPlans);
  }

  const filteredExercises = useMemo(() => {
    const term = exerciseSearch.trim().toLowerCase();

    if (!term) return exercises.slice(0, 40);

    return exercises
      .filter((exercise) => {
        const name = (exercise.name_pt || exercise.name).toLowerCase();
        const original = exercise.name.toLowerCase();
        const muscles = (exercise.primary_muscles || [])
          .join(" ")
          .toLowerCase();

        return (
          name.includes(term) ||
          original.includes(term) ||
          muscles.includes(term)
        );
      })
      .slice(0, 50);
  }, [exerciseSearch, exercises]);

  function addExercise(exercise: Exercise) {
    const alreadyAdded = draftExercises.some(
      (item) => item.exercise.id === exercise.id
    );

    if (alreadyAdded) return;

    setDraftExercises((current) => [
      ...current,
      {
        exercise,
        sets: "3",
        reps: "12",
        weight: "",
        rest: "60",
      },
    ]);
  }

  function removeDraftExercise(exerciseId: string) {
    setDraftExercises((current) =>
      current.filter((item) => item.exercise.id !== exerciseId)
    );
  }

  function updateDraftExercise(
    exerciseId: string,
    field: "sets" | "reps" | "weight" | "rest",
    value: string
  ) {
    setDraftExercises((current) =>
      current.map((item) =>
        item.exercise.id === exerciseId
          ? {
              ...item,
              [field]: value,
            }
          : item
      )
    );
  }

  function startEditWorkout(plan: WorkoutPlan) {
    setEditingPlanId(plan.id);
    setCreating(true);

    setPlanName(plan.name);
    setDescription(plan.description || "");
    setExerciseSearch("");

    const items: DraftExercise[] = (plan.workout_items || [])
      .filter((item) => item.exercise)
      .map((item) => ({
        exercise: item.exercise as Exercise,
        sets: item.sets !== null ? String(item.sets) : "",
        reps: item.reps || "",
        weight: item.weight_kg !== null ? String(item.weight_kg) : "",
        rest: item.rest_seconds !== null ? String(item.rest_seconds) : "",
      }));

    setDraftExercises(items);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  function resetForm() {
    setCreating(false);
    setEditingPlanId(null);
    setPlanName("");
    setDescription("");
    setExerciseSearch("");
    setDraftExercises([]);
  }

  async function saveWorkout() {
    if (!planName.trim()) {
      alert("Digite o nome do treino.");
      return;
    }

    if (draftExercises.length === 0) {
      alert("Adicione pelo menos um exercício.");
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    setSaving(true);

    let planId = editingPlanId;

    if (editingPlanId) {
      const { error: updateError } = await supabase
        .from("workout_plans")
        .update({
          name: planName.trim(),
          description: description.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", editingPlanId)
        .eq("user_id", user.id);

      if (updateError) {
        console.error("Erro ao atualizar treino:", updateError);
        alert("Não foi possível atualizar o treino.");
        setSaving(false);
        return;
      }

      const { error: deleteItemsError } = await supabase
        .from("workout_items")
        .delete()
        .eq("workout_plan_id", editingPlanId);

      if (deleteItemsError) {
        console.error("Erro ao atualizar exercícios:", deleteItemsError);
        alert("Não foi possível atualizar os exercícios.");
        setSaving(false);
        return;
      }
    } else {
      const { data: plan, error: planError } = await supabase
        .from("workout_plans")
        .insert({
          user_id: user.id,
          name: planName.trim(),
          description: description.trim() || null,
          active: true,
        })
        .select("id")
        .single();

      if (planError || !plan) {
        console.error("Erro ao criar treino:", planError);
        alert("Não foi possível salvar o treino.");
        setSaving(false);
        return;
      }

      planId = plan.id;
    }

    if (!planId) {
      setSaving(false);
      return;
    }

    const rows = draftExercises.map((item, index) => ({
      workout_plan_id: planId,
      exercise_id: item.exercise.id,
      exercise_name: item.exercise.name_pt || item.exercise.name,
      sets: item.sets ? Number(item.sets) : null,
      reps: item.reps || null,
      weight_kg: item.weight
        ? Number(item.weight.replace(",", "."))
        : null,
      rest_seconds: item.rest ? Number(item.rest) : null,
      position: index,
    }));

    const { error: itemsError } = await supabase
      .from("workout_items")
      .insert(rows);

    if (itemsError) {
      console.error("Erro ao salvar exercícios:", itemsError);
      alert("Não foi possível salvar os exercícios do treino.");
      setSaving(false);
      return;
    }

    resetForm();
    await loadPlans();
    setSaving(false);
  }

  async function deleteWorkout(planId: string) {
    const confirmed = window.confirm(
      "Deseja realmente excluir este treino?"
    );

    if (!confirmed) return;

    const { error } = await supabase
      .from("workout_plans")
      .delete()
      .eq("id", planId);

    if (error) {
      console.error("Erro ao excluir treino:", error);
      return;
    }

    await loadPlans();
  }

  if (loading) {
    return (
      <div className="workout-manager-loading">
        Carregando seus treinos...
      </div>
    );
  }

  return (
    <div className="workout-manager-page">
      <div className="workout-manager-header">
        <div>
          <span className="page-eyebrow">
            Atividade física
          </span>

          <h1>Meus treinos</h1>

          <p>
            Organize suas fichas e consulte a execução dos exercícios.
          </p>
        </div>

        <button
          type="button"
          className="workout-create-button"
          onClick={() => setCreating(true)}
        >
          <Plus size={18} />
          Criar treino
        </button>
      </div>

      {!creating && plans.length === 0 && (
        <section className="workout-empty-card">
          <div className="workout-empty-icon">
            <Dumbbell size={30} />
          </div>

          <h2>Nenhum treino criado</h2>

          <p>
            Crie sua primeira ficha e adicione os exercícios que fazem parte
            da sua rotina.
          </p>

          <button
            type="button"
            onClick={() => setCreating(true)}
          >
            <Plus size={17} />
            Criar meu primeiro treino
          </button>
        </section>
      )}

      {!creating && plans.length > 0 && (
        <div className="workout-plan-list">
          {plans.map((plan) => (
            <WorkoutPlanCard
              key={plan.id}
              plan={plan}
              onExerciseOpen={setSelectedExercise}
              onEdit={() => startEditWorkout(plan)}
              onDelete={() => deleteWorkout(plan.id)}
            />
          ))}
        </div>
      )}

      {creating && (
        <section className="workout-builder">
          <div className="workout-builder-top">
            <div>
              <span>
                {editingPlanId ? "Editando treino" : "Novo treino"}
              </span>
              <h2>
                {editingPlanId ? "Atualize sua ficha" : "Monte sua ficha"}
              </h2>
            </div>

            <button
              type="button"
              className="workout-builder-close"
              onClick={resetForm}
            >
              <X size={20} />
            </button>
          </div>

          <div className="workout-builder-fields">
            <div className="workout-builder-field">
              <label>Nome do treino</label>

              <input
                type="text"
                value={planName}
                onChange={(event) =>
                  setPlanName(event.target.value)
                }
                placeholder="Ex.: Treino A, Perna, Superior..."
              />
            </div>

            <div className="workout-builder-field">
              <label>Descrição</label>

              <input
                type="text"
                value={description}
                onChange={(event) =>
                  setDescription(event.target.value)
                }
                placeholder="Ex.: Perna e glúteo"
              />
            </div>
          </div>

          <div className="workout-builder-section">
            <div className="workout-builder-section-title">
              <div>
                <span>Etapa 1</span>
                <h3>Escolha os exercícios</h3>
              </div>

              <strong>
                {draftExercises.length} selecionado
                {draftExercises.length === 1 ? "" : "s"}
              </strong>
            </div>

            <div className="workout-exercise-search">
              <Search size={18} />

              <input
                type="text"
                value={exerciseSearch}
                onChange={(event) =>
                  setExerciseSearch(event.target.value)
                }
                placeholder="Buscar exercício..."
              />

              {exerciseSearch && (
                <button
                  type="button"
                  onClick={() => setExerciseSearch("")}
                >
                  <X size={16} />
                </button>
              )}
            </div>

            <div className="workout-exercise-picker">
              {filteredExercises.map((exercise) => {
                const name =
                  exercise.name_pt || exercise.name;

                const selected = draftExercises.some(
                  (item) => item.exercise.id === exercise.id
                );

                return (
                  <button
                    type="button"
                    key={exercise.id}
                    className={
                      selected
                        ? "workout-picker-item selected"
                        : "workout-picker-item"
                    }
                    onClick={() => addExercise(exercise)}
                    disabled={selected}
                  >
                    <div className="workout-picker-image">
                      {exercise.gif_url ? (
                        <img
                          src={exercise.gif_url}
                          alt={name}
                        />
                      ) : (
                        <Dumbbell size={20} />
                      )}
                    </div>

                    <div>
                      <strong>{name}</strong>

                      <span>
                        {translateMuscle(
                          exercise.primary_muscles?.[0]
                        )}
                      </span>
                    </div>

                    <Plus size={17} />
                  </button>
                );
              })}
            </div>
          </div>

          {draftExercises.length > 0 && (
            <div className="workout-builder-section">
              <div className="workout-builder-section-title">
                <div>
                  <span>Etapa 2</span>
                  <h3>Configure sua ficha</h3>
                </div>
              </div>

              <div className="workout-draft-list">
                {draftExercises.map((item, index) => {
                  const name =
                    item.exercise.name_pt ||
                    item.exercise.name;

                  return (
                    <article
                      key={item.exercise.id}
                      className="workout-draft-item"
                    >
                      <div className="workout-draft-main">
                        <div className="workout-draft-index">
                          {index + 1}
                        </div>

                        <div className="workout-draft-image">
                          {item.exercise.gif_url ? (
                            <img
                              src={item.exercise.gif_url}
                              alt={name}
                            />
                          ) : (
                            <Dumbbell size={22} />
                          )}
                        </div>

                        <div>
                          <strong>{name}</strong>

                          <span>
                            {translateMuscle(
                              item.exercise.primary_muscles?.[0]
                            )}
                          </span>
                        </div>
                      </div>

                      <div className="workout-draft-fields">
                        <label>
                          <span>Séries</span>

                          <input
                            type="number"
                            min="1"
                            value={item.sets}
                            onChange={(event) =>
                              updateDraftExercise(
                                item.exercise.id,
                                "sets",
                                event.target.value
                              )
                            }
                          />
                        </label>

                        <label>
                          <span>Repetições</span>

                          <input
                            type="text"
                            value={item.reps}
                            onChange={(event) =>
                              updateDraftExercise(
                                item.exercise.id,
                                "reps",
                                event.target.value
                              )
                            }
                          />
                        </label>

                        <label>
                          <span>Carga</span>

                          <div className="workout-field-unit">
                            <input
                              type="text"
                              inputMode="decimal"
                              value={item.weight}
                              onChange={(event) =>
                                updateDraftExercise(
                                  item.exercise.id,
                                  "weight",
                                  event.target.value
                                )
                              }
                              placeholder="—"
                            />

                            <small>kg</small>
                          </div>
                        </label>

                        <label>
                          <span>Descanso</span>

                          <div className="workout-field-unit">
                            <input
                              type="number"
                              min="0"
                              value={item.rest}
                              onChange={(event) =>
                                updateDraftExercise(
                                  item.exercise.id,
                                  "rest",
                                  event.target.value
                                )
                              }
                            />

                            <small>s</small>
                          </div>
                        </label>
                      </div>

                      <button
                        type="button"
                        className="workout-draft-delete"
                        onClick={() =>
                          removeDraftExercise(
                            item.exercise.id
                          )
                        }
                      >
                        <Trash2 size={17} />
                      </button>
                    </article>
                  );
                })}
              </div>
            </div>
          )}

          <div
            className="workout-builder-actions"
            style={{ justifyContent: "flex-start" }}
          >
            <button
              type="button"
              className="workout-save-button"
              onClick={saveWorkout}
              disabled={saving}
            >
              <Save size={17} />

              {saving
                ? "Salvando..."
                : editingPlanId
                ? "Salvar alterações"
                : "Salvar treino"}
            </button>

            <button
              type="button"
              className="workout-cancel-button"
              onClick={resetForm}
            >
              Cancelar
            </button>
          </div>
        </section>
      )}

      {selectedExercise && (
        <ExerciseModal
          exercise={selectedExercise}
          onClose={() => setSelectedExercise(null)}
        />
      )}
    </div>
  );
}

function WorkoutPlanCard({
  plan,
  onExerciseOpen,
  onEdit,
  onDelete,
}: {
  plan: WorkoutPlan;
  onExerciseOpen: (exercise: Exercise) => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <section className="workout-plan-card">
      <div className="workout-plan-header">
        <div className="workout-plan-title-area">
          <div className="workout-plan-icon">
            <Dumbbell size={21} />
          </div>

          <div>
            <span>Ficha de treino</span>
            <h2>{plan.name}</h2>

            {plan.description && (
              <p>{plan.description}</p>
            )}
          </div>
        </div>

        <div
          className="workout-plan-actions"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <button
            type="button"
            className="workout-plan-edit"
            onClick={onEdit}
            style={{
              height: "36px",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "6px",
              padding: "0 12px",
              border: "none",
              borderRadius: "11px",
              background: "#eef4eb",
              color: "#41532f",
              cursor: "pointer",
              font: "inherit",
              fontSize: "11px",
              fontWeight: 600,
            }}
          >
            <Pencil size={16} />
            Editar
          </button>

          <button
            type="button"
            className="workout-plan-delete"
            onClick={onDelete}
            title="Excluir treino"
          >
            <Trash2 size={17} />
          </button>
        </div>
      </div>

      <div className="workout-plan-exercises">
        {(plan.workout_items || []).map((item, index) => {
          const exercise = item.exercise;

          const displayName =
            exercise?.name_pt ||
            exercise?.name ||
            item.exercise_name ||
            "Exercício";

          return (
            <article
              className="workout-plan-exercise"
              key={item.id}
            >
              <div className="workout-plan-number">
                {index + 1}
              </div>

              <div className="workout-plan-thumb">
                {exercise?.gif_url ? (
                  <img
                    src={exercise.gif_url}
                    alt={displayName}
                  />
                ) : (
                  <Dumbbell size={21} />
                )}
              </div>

              <div className="workout-plan-exercise-info">
                <strong>{displayName}</strong>

                <div>
                  {item.sets && (
                    <span>
                      {item.sets} séries
                    </span>
                  )}

                  {item.reps && (
                    <span>
                      {item.reps} rep.
                    </span>
                  )}

                  {item.weight_kg !== null && (
                    <span>
                      {item.weight_kg} kg
                    </span>
                  )}

                  {item.rest_seconds !== null && (
                    <span>
                      {item.rest_seconds}s descanso
                    </span>
                  )}
                </div>
              </div>

              {exercise && (
                <button
                  type="button"
                  className="workout-how-button"
                  onClick={() => onExerciseOpen(exercise)}
                >
                  Como fazer
                  <ChevronRight size={16} />
                </button>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}

function ExerciseModal({
  exercise,
  onClose,
}: {
  exercise: Exercise;
  onClose: () => void;
}) {
  const displayName =
    exercise.name_pt || exercise.name;

  return (
    <div
      className="exercise-modal-backdrop"
      onMouseDown={onClose}
    >
      <div
        className="exercise-modal"
        onMouseDown={(event) =>
          event.stopPropagation()
        }
      >
        <button
          type="button"
          className="exercise-modal-close"
          onClick={onClose}
        >
          <X size={20} />
        </button>

        <div className="exercise-modal-gif">
          {exercise.gif_url ? (
            <img
              src={exercise.gif_url}
              alt={`Demonstração de ${displayName}`}
              loading="eager"
            />
          ) : (
            <div className="exercise-modal-gif-empty">
              <Dumbbell size={34} />
              <span>Demonstração ainda não disponível.</span>
            </div>
          )}
        </div>

        <div className="exercise-modal-body">
          <span className="exercise-modal-label">
            Exercício
          </span>

          <h2>{displayName}</h2>

          <div className="exercise-info-grid">
            <div>
              <span>Músculo principal</span>

              <strong>
                {translateMuscle(
                  exercise.primary_muscles?.[0]
                )}
              </strong>
            </div>

            <div>
              <span>Equipamento</span>

              <strong>
                {translateEquipment(
                  exercise.equipment
                )}
              </strong>
            </div>
          </div>

          <div className="exercise-instructions">
            <h3>Como fazer</h3>

            {exercise.instructions?.length ? (
              <ol>
                {exercise.instructions.map(
                  (instruction, index) => (
                    <li key={index}>
                      {instruction}
                    </li>
                  )
                )}
              </ol>
            ) : (
              <p>
                Instruções ainda não disponíveis.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function translateMuscle(
  muscle?: string | null
) {
  const map: Record<string, string> = {
    abductors: "Abdutores",
    adductors: "Adutores",
    abdominals: "Abdômen",
    biceps: "Bíceps",
    calves: "Panturrilhas",
    chest: "Peitoral",
    forearms: "Antebraços",
    glutes: "Glúteos",
    hamstrings: "Posterior de coxa",
    lats: "Dorsais",
    "lower back": "Lombar",
    "middle back": "Costas",
    neck: "Pescoço",
    quadriceps: "Quadríceps",
    shoulders: "Ombros",
    traps: "Trapézio",
    triceps: "Tríceps",
  };

  if (!muscle) return "Não informado";

  return map[muscle.toLowerCase()] || muscle;
}

function translateEquipment(
  equipment?: string | null
) {
  const map: Record<string, string> = {
    machine: "Máquina",
    dumbbell: "Halteres",
    barbell: "Barra",
    cable: "Cabo",
    bands: "Faixa elástica",
    kettlebells: "Kettlebell",
    "body only": "Peso corporal",
    "e-z curl bar": "Barra W",
    "medicine ball": "Medicine ball",
    other: "Outro",
  };

  if (!equipment) return "Não informado";

  return map[equipment.toLowerCase()] || equipment;
}