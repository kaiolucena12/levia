"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import AuthGuard from "@/components/AuthGuard";
import AppShell from "@/components/AppShell";
import { supabase } from "@/lib/supabase";
import type { WeightEntry } from "@/lib/types";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

function today() {
  return new Date().toISOString().slice(0, 10);
}

export default function EvolucaoPage() {
  const [userId, setUserId] = useState("");
  const [weight, setWeight] = useState("");
  const [date, setDate] = useState(today());
  const [entries, setEntries] = useState<WeightEntry[]>([]);
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return;
    setUserId(auth.user.id);

    const { data } = await supabase
      .from("weight_entries")
      .select("*")
      .order("recorded_at", { ascending: true });

    setEntries(data || []);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!userId) return;

    const { error } = await supabase.from("weight_entries").insert({
      user_id: userId,
      weight: Number(weight),
      recorded_at: date,
    });

    if (error) return setMessage(error.message);
    setWeight("");
    setMessage("Peso registrado.");
    load();
  }

  const chartData = entries.map((item) => ({
    data: new Date(item.recorded_at + "T12:00:00").toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
    }),
    peso: Number(item.weight),
  }));

  const first = entries[0]?.weight;
  const current = entries[entries.length - 1]?.weight;
  const change = first && current ? Number((current - first).toFixed(1)) : null;

  const weeklyChange = useMemo(() => {
    if (entries.length < 2) return null;
    const latest = entries[entries.length - 1];
    const latestTime = new Date(latest.recorded_at).getTime();
    const sevenDays = 7 * 24 * 60 * 60 * 1000;

    const older = [...entries]
      .reverse()
      .find((entry) => latestTime - new Date(entry.recorded_at).getTime() >= sevenDays);

    if (!older) return null;
    return Number((Number(latest.weight) - Number(older.weight)).toFixed(1));
  }, [entries]);

  return (
    <AuthGuard>
      <AppShell>
        <div className="page">
          <header className="page-header">
            <div>
              <span className="eyebrow">PROGRESSO</span>
              <h1>Sua evolução</h1>
              <p>Acompanhe a tendência. Um número isolado não conta toda a história.</p>
            </div>
          </header>

          {message && <div className="success-message">{message}</div>}

          <section className="stats-grid compact">
            <div className="stat-card featured">
              <span className="stat-label">Peso atual</span>
              <strong>{current ? `${current} kg` : "—"}</strong>
              <small>último registro</small>
            </div>
            <div className="stat-card">
              <span className="stat-label">Desde o início</span>
              <strong>{change === null ? "—" : `${change > 0 ? "+" : ""}${change} kg`}</strong>
              <small>variação total</small>
            </div>
            <div className="stat-card">
              <span className="stat-label">Comparação semanal</span>
              <strong>{weeklyChange === null ? "—" : `${weeklyChange > 0 ? "+" : ""}${weeklyChange} kg`}</strong>
              <small>aprox. últimos 7 dias</small>
            </div>
          </section>

          <section className="two-column evolution-layout">
            <div className="card chart-card">
              <div className="card-heading">
                <div><span className="eyebrow">GRÁFICO</span><h2>Histórico de peso</h2></div>
              </div>

              {entries.length < 2 ? (
                <div className="empty-state"><p>Registre pelo menos dois pesos para ver o gráfico.</p></div>
              ) : (
                <div className="chart-wrap">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="data" />
                      <YAxis domain={["dataMin - 2", "dataMax + 2"]} />
                      <Tooltip />
                      <Line type="monotone" dataKey="peso" stroke="currentColor" strokeWidth={3} dot={{ r: 4 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            <form className="card form-card" onSubmit={submit}>
              <span className="eyebrow">NOVO REGISTRO</span>
              <h2>Registrar peso</h2>
              <label>
                Peso (kg)
                <input
                  type="number"
                  min="20"
                  max="500"
                  step="0.1"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  placeholder="Ex.: 92.4"
                  required
                />
              </label>
              <label>
                Data
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
              </label>
              <button className="primary-button">Salvar peso</button>
            </form>
          </section>
        </div>
      </AppShell>
    </AuthGuard>
  );
}
