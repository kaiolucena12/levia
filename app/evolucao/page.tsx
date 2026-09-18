"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
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

function todayBrazil() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Recife",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export default function EvolucaoPage() {
  const [userId, setUserId] = useState("");
  const [weight, setWeight] = useState("");
  const [date, setDate] = useState(todayBrazil());
  const [entries, setEntries] = useState<WeightEntry[]>([]);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setErrorMessage("");

    const { data: auth, error: authError } = await supabase.auth.getUser();

    if (authError) {
      console.error("Erro ao buscar usuário:", authError);
      setErrorMessage("Não foi possível identificar o usuário.");
      return;
    }

    if (!auth.user) {
      setErrorMessage("Usuário não autenticado.");
      return;
    }

    setUserId(auth.user.id);

    const { data, error } = await supabase
      .from("weight_entries")
      .select("*")
      .order("recorded_at", { ascending: true });

    if (error) {
      console.error("Erro ao carregar pesos:", error);
      setErrorMessage(`Erro ao carregar pesos: ${error.message}`);
      return;
    }

    setEntries(data || []);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function submit(e: FormEvent) {
    e.preventDefault();

    setMessage("");
    setErrorMessage("");

    if (!userId) {
      setErrorMessage("Usuário ainda não foi carregado. Tente novamente.");
      return;
    }

    const normalizedWeight = weight.replace(",", ".");
    const numericWeight = Number(normalizedWeight);

    if (!Number.isFinite(numericWeight)) {
      setErrorMessage("Digite um peso válido.");
      return;
    }

    if (numericWeight < 20 || numericWeight > 500) {
      setErrorMessage("Digite um peso entre 20 kg e 500 kg.");
      return;
    }

    if (!date) {
      setErrorMessage("Selecione uma data.");
      return;
    }

    setSaving(true);

    const { data, error } = await supabase
      .from("weight_entries")
      .insert({
        user_id: userId,
        weight: numericWeight,
        recorded_at: date,
      })
      .select()
      .single();

    setSaving(false);

    if (error) {
      console.error("Erro ao salvar peso:", error);

      setErrorMessage(`Não foi possível salvar o peso: ${error.message}`);

      return;
    }

    console.log("Peso salvo:", data);

    setWeight("");
    setMessage("Peso registrado com sucesso.");
    await load();
  }

  const chartData = entries.map((item) => ({
    data: new Date(item.recorded_at + "T12:00:00").toLocaleDateString(
      "pt-BR",
      {
        day: "2-digit",
        month: "2-digit",
      }
    ),
    peso: Number(item.weight),
  }));

  const first = entries[0]?.weight;
  const current = entries[entries.length - 1]?.weight;

  const change =
    first && current
      ? Number((Number(current) - Number(first)).toFixed(1))
      : null;

  const weeklyChange = useMemo(() => {
    if (entries.length < 2) return null;

    const latest = entries[entries.length - 1];
    const latestTime = new Date(latest.recorded_at).getTime();
    const sevenDays = 7 * 24 * 60 * 60 * 1000;

    const older = [...entries]
      .reverse()
      .find(
        (entry) =>
          latestTime - new Date(entry.recorded_at).getTime() >= sevenDays
      );

    if (!older) return null;

    return Number(
      (Number(latest.weight) - Number(older.weight)).toFixed(1)
    );
  }, [entries]);

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <span className="eyebrow">PROGRESSO</span>
          <h1>Sua evolução</h1>
          <p>
            Acompanhe a tendência. Um número isolado não conta toda a
            história.
          </p>
        </div>
      </header>

      {message && (
        <div className="success-message">
          {message}
        </div>
      )}

      {errorMessage && (
        <div
          style={{
            marginBottom: "18px",
            padding: "12px 14px",
            borderRadius: "13px",
            background: "#fbecec",
            border: "1px solid #efcaca",
            color: "#8b3030",
            fontSize: "13px",
          }}
        >
          {errorMessage}
        </div>
      )}

      <section className="stats-grid compact">
        <div className="stat-card featured">
          <span className="stat-label">Peso atual</span>
          <strong>{current ? `${current} kg` : "—"}</strong>
          <small>último registro</small>
        </div>

        <div className="stat-card">
          <span className="stat-label">Desde o início</span>
          <strong>
            {change === null
              ? "—"
              : `${change > 0 ? "+" : ""}${change} kg`}
          </strong>
          <small>variação total</small>
        </div>

        <div className="stat-card">
          <span className="stat-label">Comparação semanal</span>
          <strong>
            {weeklyChange === null
              ? "—"
              : `${weeklyChange > 0 ? "+" : ""}${weeklyChange} kg`}
          </strong>
          <small>aprox. últimos 7 dias</small>
        </div>
      </section>

      <section className="two-column evolution-layout">
        <div className="card chart-card">
          <div className="card-heading">
            <div>
              <span className="eyebrow">GRÁFICO</span>
              <h2>Histórico de peso</h2>
            </div>
          </div>

          {entries.length < 2 ? (
            <div className="empty-state">
              <p>
                Registre pelo menos dois pesos para ver o gráfico.
              </p>
            </div>
          ) : (
            <div className="chart-wrap">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                  />
                  <XAxis dataKey="data" />
                  <YAxis
                    domain={["dataMin - 2", "dataMax + 2"]}
                  />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="peso"
                    stroke="currentColor"
                    strokeWidth={3}
                    dot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <form
          className="card form-card"
          onSubmit={submit}
        >
          <span className="eyebrow">
            NOVO REGISTRO
          </span>

          <h2>Registrar peso</h2>

          <label>
            Peso (kg)
            <input
              type="text"
              inputMode="decimal"
              value={weight}
              onChange={(e) =>
                setWeight(e.target.value)
              }
              placeholder="Ex.: 92,4"
              required
            />
          </label>

          <label>
            Data
            <input
              type="date"
              value={date}
              onChange={(e) =>
                setDate(e.target.value)
              }
              required
            />
          </label>

          <button
            className="primary-button"
            type="submit"
            disabled={saving}
          >
            {saving
              ? "Salvando..."
              : "Salvar peso"}
          </button>
        </form>
      </section>
    </div>
  );
}
