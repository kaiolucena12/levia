"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

import {
  UserRound,
  Mail,
  Ruler,
  Scale,
  Save,
  CheckCircle2,
  CalendarDays,
  ShieldCheck,
} from "lucide-react";

type ProfileData = {
  sex: string | null;
  height_cm: number | null;
};

export default function PerfilPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [userId, setUserId] = useState("");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("Usuário");
  const [createdAt, setCreatedAt] = useState<string | null>(null);

  const [sex, setSex] = useState("");
  const [height, setHeight] = useState("");

  const [currentWeight, setCurrentWeight] = useState<number | null>(null);
  const [weightRecords, setWeightRecords] = useState(0);

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setLoading(false);
      return;
    }

    setUserId(user.id);
    setEmail(user.email || "");
    setCreatedAt(user.created_at || null);

    const userName =
      user.user_metadata?.full_name ||
      user.user_metadata?.name ||
      user.email?.split("@")[0] ||
      "Usuário";

    setName(userName);

    const { data: profile } = await supabase
      .from("profiles")
      .select("sex,height_cm")
      .eq("id", user.id)
      .maybeSingle<ProfileData>();

    if (profile) {
      setSex(profile.sex || "");
      setHeight(profile.height_cm ? String(profile.height_cm) : "");
    }

    const { data: weights } = await supabase
      .from("weight_entries")
      .select("weight,recorded_at")
      .eq("user_id", user.id)
      .order("recorded_at", { ascending: false });

    if (weights?.length) {
      setCurrentWeight(Number(weights[0].weight));
      setWeightRecords(weights.length);
    }

    setLoading(false);
  }

  async function saveProfile() {
    if (!userId) return;

    setSaving(true);
    setSaved(false);

    const heightNumber = height ? Number(height) : null;

    const { error } = await supabase
      .from("profiles")
      .upsert(
        {
          id: userId,
          sex: sex || null,
          height_cm: heightNumber,
        },
        {
          onConflict: "id",
        }
      );

    setSaving(false);

    if (!error) {
      setSaved(true);

      setTimeout(() => {
        setSaved(false);
      }, 2500);
    } else {
      console.error("Erro ao salvar perfil:", error);
    }
  }

  const initials = useMemo(() => {
    return name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((item) => item[0]?.toUpperCase())
      .join("");
  }, [name]);

  function formatDate(value: string | null) {
    if (!value) return "—";

    return new Intl.DateTimeFormat("pt-BR", {
      month: "long",
      year: "numeric",
    }).format(new Date(value));
  }

  if (loading) {
    return (
      <div className="profile-loading">
        Carregando perfil...
      </div>
    );
  }

  return (
    <div className="profile-page">
      <div className="profile-page-header">
        <div>
          <span className="page-eyebrow">Minha conta</span>
          <h1>Perfil</h1>
          <p>
            Gerencie seus dados e mantenha suas informações atualizadas.
          </p>
        </div>

        <div className="profile-header-icon">
          <UserRound size={26} />
        </div>
      </div>

      <section className="profile-hero-card">
        <div className="profile-avatar">
          {initials || "L"}
        </div>

        <div className="profile-hero-info">
          <span>Conta Levia</span>
          <h2>{name}</h2>

          <div className="profile-email">
            <Mail size={15} />
            {email}
          </div>
        </div>

        <div className="profile-member">
          <CalendarDays size={17} />

          <div>
            <span>Membro desde</span>
            <strong>{formatDate(createdAt)}</strong>
          </div>
        </div>
      </section>

      <div className="profile-stats">
        <div className="profile-stat-card">
          <div className="profile-stat-icon">
            <Scale size={20} />
          </div>

          <div>
            <span>Peso atual</span>

            <strong>
              {currentWeight !== null
                ? `${currentWeight.toFixed(1)} kg`
                : "—"}
            </strong>

            <small>
              {currentWeight !== null
                ? "último peso registrado"
                : "nenhum peso registrado"}
            </small>
          </div>
        </div>

        <div className="profile-stat-card">
          <div className="profile-stat-icon">
            <Ruler size={20} />
          </div>

          <div>
            <span>Altura</span>

            <strong>
              {height ? `${height} cm` : "—"}
            </strong>

            <small>
              informação do perfil
            </small>
          </div>
        </div>

        <div className="profile-stat-card">
          <div className="profile-stat-icon">
            <CheckCircle2 size={20} />
          </div>

          <div>
            <span>Registros de peso</span>

            <strong>{weightRecords}</strong>

            <small>
              registros no histórico
            </small>
          </div>
        </div>
      </div>

      <div className="profile-content-grid">
        <section className="profile-section-card">
          <div className="profile-section-heading">
            <div>
              <h3>Dados pessoais</h3>

              <p>
                Essas informações ajudam a Lívia a entender melhor seu acompanhamento.
              </p>
            </div>
          </div>

          <div className="profile-form-grid">
            <div className="profile-field">
              <label>E-mail</label>

              <div className="profile-input disabled">
                <Mail size={17} />
                <input
                  type="email"
                  value={email}
                  disabled
                />
              </div>

              <small>
                O e-mail da conta não pode ser alterado aqui.
              </small>
            </div>

            <div className="profile-field">
              <label>Sexo</label>

              <select
                value={sex}
                onChange={(event) =>
                  setSex(event.target.value)
                }
              >
                <option value="">
                  Selecione
                </option>

                <option value="female">
                  Feminino
                </option>

                <option value="male">
                  Masculino
                </option>
              </select>
            </div>

            <div className="profile-field">
              <label>Altura</label>

              <div className="profile-input">
                <Ruler size={17} />

                <input
                  type="number"
                  min="100"
                  max="250"
                  value={height}
                  onChange={(event) =>
                    setHeight(event.target.value)
                  }
                  placeholder="Ex.: 170"
                />

                <span>cm</span>
              </div>
            </div>
          </div>

          <div className="profile-save-area">
            {saved && (
              <div className="profile-success">
                <CheckCircle2 size={17} />
                Informações salvas
              </div>
            )}

            <button
              type="button"
              className="profile-save-button"
              onClick={saveProfile}
              disabled={saving}
            >
              <Save size={17} />

              {saving
                ? "Salvando..."
                : "Salvar alterações"}
            </button>
          </div>
        </section>

        <aside className="profile-security-card">
          <div className="profile-security-icon">
            <ShieldCheck size={23} />
          </div>

          <h3>Seus dados</h3>

          <p>
            Suas informações de acompanhamento ficam vinculadas à sua conta.
          </p>

          <div className="profile-security-line">
            <CheckCircle2 size={16} />
            Dados pessoais protegidos
          </div>

          <div className="profile-security-line">
            <CheckCircle2 size={16} />
            Histórico individual
          </div>

          <div className="profile-security-line">
            <CheckCircle2 size={16} />
            Registros associados ao seu usuário
          </div>
        </aside>
      </div>
    </div>
  );
}