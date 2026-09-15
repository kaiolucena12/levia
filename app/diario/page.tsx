"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import AuthGuard from "@/components/AuthGuard";
import AppShell from "@/components/AppShell";
import { supabase } from "@/lib/supabase";
import type { Activity, DailyLog, Meal } from "@/lib/types";
import { Activity as ActivityIcon, Droplets, Moon, Plus, Trash2, Utensils } from "lucide-react";

function today() {
  return new Date().toISOString().slice(0, 10);
}

const mealTypes = ["Café da manhã", "Lanche", "Almoço", "Lanche da tarde", "Jantar", "Ceia"];

export default function DiarioPage() {
  const [userId, setUserId] = useState("");
  const [meals, setMeals] = useState<Meal[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [daily, setDaily] = useState<DailyLog | null>(null);

  const [mealType, setMealType] = useState("Café da manhã");
  const [mealDescription, setMealDescription] = useState("");
  const [activityName, setActivityName] = useState("");
  const [minutes, setMinutes] = useState("");
  const [steps, setSteps] = useState("");
  const [water, setWater] = useState("");
  const [sleep, setSleep] = useState("");
  const [notes, setNotes] = useState("");
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return;
    setUserId(auth.user.id);

    const [mealRes, activityRes, dailyRes] = await Promise.all([
      supabase.from("meals").select("*").eq("meal_date", today()).order("created_at"),
      supabase.from("activities").select("*").eq("activity_date", today()).order("created_at"),
      supabase.from("daily_logs").select("*").eq("log_date", today()).maybeSingle(),
    ]);

    setMeals(mealRes.data || []);
    setActivities(activityRes.data || []);
    setDaily(dailyRes.data || null);

    if (dailyRes.data) {
      setWater(dailyRes.data.water_ml?.toString() || "");
      setSleep(dailyRes.data.sleep_hours?.toString() || "");
      setNotes(dailyRes.data.notes || "");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function addMeal(e: FormEvent) {
    e.preventDefault();
    if (!userId || !mealDescription.trim()) return;

    const { error } = await supabase.from("meals").insert({
      user_id: userId,
      meal_type: mealType,
      description: mealDescription.trim(),
      meal_date: today(),
    });

    if (error) return setMessage(error.message);
    setMealDescription("");
    setMessage("Refeição salva.");
    load();
  }

  async function addActivity(e: FormEvent) {
    e.preventDefault();
    if (!userId || !activityName.trim()) return;

    const { error } = await supabase.from("activities").insert({
      user_id: userId,
      name: activityName.trim(),
      duration_minutes: minutes ? Number(minutes) : null,
      steps: steps ? Number(steps) : null,
      activity_date: today(),
    });

    if (error) return setMessage(error.message);
    setActivityName("");
    setMinutes("");
    setSteps("");
    setMessage("Atividade salva.");
    load();
  }

  async function saveDaily(e: FormEvent) {
    e.preventDefault();
    if (!userId) return;

    const { error } = await supabase.from("daily_logs").upsert(
      {
        user_id: userId,
        log_date: today(),
        water_ml: water ? Number(water) : null,
        sleep_hours: sleep ? Number(sleep) : null,
        notes: notes || null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,log_date" }
    );

    if (error) return setMessage(error.message);
    setMessage("Hábitos do dia atualizados.");
    load();
  }

  async function remove(table: "meals" | "activities", id: string) {
    await supabase.from(table).delete().eq("id", id);
    load();
  }

  return (
    <AuthGuard>
      <AppShell>
        <div className="page">
          <header className="page-header">
            <div>
              <span className="eyebrow">MEU DIA</span>
              <h1>Diário</h1>
              <p>Registre o que aconteceu hoje sem complicar.</p>
            </div>
          </header>

          {message && <div className="success-message">{message}</div>}

          <section className="two-column">
            <form className="card form-card" onSubmit={addMeal}>
              <div className="card-heading">
                <div className="heading-with-icon">
                  <Utensils size={20} />
                  <div>
                    <span className="eyebrow">ALIMENTAÇÃO</span>
                    <h2>Adicionar refeição</h2>
                  </div>
                </div>
              </div>

              <label>
                Refeição
                <select value={mealType} onChange={(e) => setMealType(e.target.value)}>
                  {mealTypes.map((item) => <option key={item}>{item}</option>)}
                </select>
              </label>

              <label>
                O que você comeu?
                <textarea
                  value={mealDescription}
                  onChange={(e) => setMealDescription(e.target.value)}
                  placeholder="Ex.: 2 ovos mexidos, 1 pão francês, café com leite e uma banana."
                  rows={5}
                  required
                />
              </label>

              <button className="primary-button">
                <Plus size={17} /> Salvar refeição
              </button>
            </form>

            <form className="card form-card" onSubmit={addActivity}>
              <div className="card-heading">
                <div className="heading-with-icon">
                  <ActivityIcon size={20} />
                  <div>
                    <span className="eyebrow">MOVIMENTO</span>
                    <h2>Adicionar atividade</h2>
                  </div>
                </div>
              </div>

              <label>
                Atividade
                <input
                  value={activityName}
                  onChange={(e) => setActivityName(e.target.value)}
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
                    value={minutes}
                    onChange={(e) => setMinutes(e.target.value)}
                    placeholder="30"
                  />
                </label>

                <label>
                  Passos
                  <input
                    type="number"
                    min="0"
                    value={steps}
                    onChange={(e) => setSteps(e.target.value)}
                    placeholder="5000"
                  />
                </label>
              </div>

              <button className="primary-button">
                <Plus size={17} /> Salvar atividade
              </button>
            </form>
          </section>

          <form className="card form-card" onSubmit={saveDaily}>
            <div className="card-heading">
              <div>
                <span className="eyebrow">HÁBITOS</span>
                <h2>Resumo do dia</h2>
              </div>
            </div>

            <div className="form-row three">
              <label>
                <span className="label-with-icon"><Droplets size={16}/> Água (ml)</span>
                <input type="number" min="0" value={water} onChange={(e) => setWater(e.target.value)} placeholder="2000" />
              </label>

              <label>
                <span className="label-with-icon"><Moon size={16}/> Sono (horas)</span>
                <input type="number" min="0" max="24" step="0.1" value={sleep} onChange={(e) => setSleep(e.target.value)} placeholder="7.5" />
              </label>

              <label>
                Observações
                <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Como foi seu dia?" />
              </label>
            </div>

            <button className="secondary-button">Atualizar hábitos</button>
          </form>

          <section className="two-column">
            <div className="card">
              <div className="card-heading"><h2>Refeições registradas</h2></div>
              {meals.length === 0 ? <p className="muted">Nenhuma ainda.</p> : (
                <div className="record-list">
                  {meals.map((item) => (
                    <div className="record-item" key={item.id}>
                      <div><b>{item.meal_type}</b><p>{item.description}</p></div>
                      <button onClick={() => remove("meals", item.id)} className="icon-button" aria-label="Excluir"><Trash2 size={16}/></button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="card">
              <div className="card-heading"><h2>Atividades registradas</h2></div>
              {activities.length === 0 ? <p className="muted">Nenhuma ainda.</p> : (
                <div className="record-list">
                  {activities.map((item) => (
                    <div className="record-item" key={item.id}>
                      <div><b>{item.name}</b><p>{item.duration_minutes ? `${item.duration_minutes} min` : ""} {item.steps ? `• ${item.steps} passos` : ""}</p></div>
                      <button onClick={() => remove("activities", item.id)} className="icon-button" aria-label="Excluir"><Trash2 size={16}/></button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        </div>
      </AppShell>
    </AuthGuard>
  );
}
