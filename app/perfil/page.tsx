"use client";

import {
  FormEvent,
  useEffect,
  useState,
} from "react";

import AuthGuard from "@/components/AuthGuard";
import AppShell from "@/components/AppShell";
import { supabase } from "@/lib/supabase";

export default function PerfilPage() {
  const [userId, setUserId] =
    useState("");

  const [name, setName] =
    useState("");

  const [sex, setSex] =
    useState("");

  const [height, setHeight] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [message, setMessage] =
    useState("");

  const [errorMessage, setErrorMessage] =
    useState("");

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    setLoading(true);
    setErrorMessage("");

    const {
      data: authData,
      error: authError,
    } = await supabase.auth.getUser();

    if (
      authError ||
      !authData.user
    ) {
      setErrorMessage(
        "Não foi possível identificar o usuário."
      );

      setLoading(false);
      return;
    }

    const user =
      authData.user;

    setUserId(user.id);

    const {
      data: profile,
      error: profileError,
    } = await supabase
      .from("profiles")
      .select(
        "name,sex,height_cm"
      )
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) {
      console.error(
        "Erro ao carregar perfil:",
        profileError
      );
    }

    setName(
      profile?.name ||
        user.user_metadata?.name ||
        ""
    );

    setSex(
      profile?.sex || ""
    );

    setHeight(
      profile?.height_cm
        ? String(
            profile.height_cm
          )
        : ""
    );

    setLoading(false);
  }

  async function saveProfile(
    e: FormEvent
  ) {
    e.preventDefault();

    setMessage("");
    setErrorMessage("");

    if (!userId) {
      setErrorMessage(
        "Usuário não identificado."
      );
      return;
    }

    if (
      sex !== "male" &&
      sex !== "female"
    ) {
      setErrorMessage(
        "Selecione o sexo."
      );
      return;
    }

    const heightNumber =
      Number(height);

    if (
      !Number.isFinite(
        heightNumber
      ) ||
      heightNumber < 100 ||
      heightNumber > 250
    ) {
      setErrorMessage(
        "Digite uma altura válida em centímetros."
      );
      return;
    }

    setSaving(true);

    const {
      error,
    } = await supabase
      .from("profiles")
      .upsert(
        {
          id: userId,

          name:
            name.trim() ||
            null,

          sex,

          height_cm:
            Math.round(
              heightNumber
            ),

          updated_at:
            new Date()
              .toISOString(),
        },
        {
          onConflict: "id",
        }
      );

    setSaving(false);

    if (error) {
      console.error(
        "Erro ao salvar perfil:",
        error
      );

      setErrorMessage(
        `Não foi possível salvar: ${error.message}`
      );

      return;
    }

    setMessage(
      "Perfil atualizado com sucesso."
    );
  }

  return (
    <AuthGuard>
      <AppShell>
        <div className="page">
          <header className="page-header">
            <div>
              <span className="eyebrow">
                MEU PERFIL
              </span>

              <h1>
                Seus dados
              </h1>

              <p>
                Essas informações ajudam o Levia
                a personalizar melhor seu
                acompanhamento.
              </p>
            </div>
          </header>

          {loading ? (
            <div className="card">
              Carregando perfil...
            </div>
          ) : (
            <form
              className="card form-card"
              onSubmit={
                saveProfile
              }
              style={{
                maxWidth: "620px",
              }}
            >
              {message && (
                <div className="success-message">
                  {message}
                </div>
              )}

              {errorMessage && (
                <div
                  style={{
                    padding:
                      "12px 14px",
                    borderRadius:
                      "13px",
                    background:
                      "#fbecec",
                    color:
                      "#8b3030",
                    border:
                      "1px solid #efcaca",
                    fontSize:
                      "13px",
                  }}
                >
                  {errorMessage}
                </div>
              )}

              <label>
                Nome

                <input
                  type="text"
                  value={name}
                  onChange={(e) =>
                    setName(
                      e.target
                        .value
                    )
                  }
                  placeholder="Seu nome"
                />
              </label>

              <label>
                Sexo

                <select
                  value={sex}
                  onChange={(e) =>
                    setSex(
                      e.target
                        .value
                    )
                  }
                  required
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
              </label>

              <label>
                Altura (cm)

                <input
                  type="number"
                  inputMode="numeric"
                  min="100"
                  max="250"
                  value={height}
                  onChange={(e) =>
                    setHeight(
                      e.target
                        .value
                    )
                  }
                  placeholder="Ex.: 175"
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
                  : "Salvar perfil"}
              </button>
            </form>
          )}
        </div>
      </AppShell>
    </AuthGuard>
  );
}