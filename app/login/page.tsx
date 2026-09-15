"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { HeartPulse } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) router.replace("/");
    });
  }, [router]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    if (mode === "signup") {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { name },
        },
      });

      if (error) {
        setMessage(error.message);
      } else {
        setMessage(
          "Conta criada. Se a confirmação de e-mail estiver ativada no Supabase, confira sua caixa de entrada."
        );
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setMessage(error.message);
      } else {
        router.replace("/");
      }
    }

    setLoading(false);
  }

  return (
    <div className="login-page">
      <div className="login-visual">
        <div className="logo-large">
          <HeartPulse size={28} />
          <span>Levia</span>
        </div>
        <h1>Sua evolução, sem complicação.</h1>
        <p>
          Registre seus hábitos, acompanhe o peso e use inteligência artificial
          para entender melhor sua rotina.
        </p>

        <div className="login-feature-grid">
          <div>
            <b>01</b>
            <span>Registre</span>
            <small>alimentação e hábitos</small>
          </div>
          <div>
            <b>02</b>
            <span>Acompanhe</span>
            <small>sua evolução semanal</small>
          </div>
          <div>
            <b>03</b>
            <span>Entenda</span>
            <small>com ajuda da IA</small>
          </div>
        </div>
      </div>

      <div className="login-panel">
        <form className="auth-card" onSubmit={submit}>
          <div className="auth-heading">
            <span className="eyebrow">BEM-VINDO AO LEVIA</span>
            <h2>{mode === "login" ? "Entre na sua conta" : "Crie sua conta"}</h2>
            <p>
              {mode === "login"
                ? "Continue acompanhando seu progresso."
                : "Comece hoje seu histórico de evolução."}
            </p>
          </div>

          {mode === "signup" && (
            <label>
              Seu nome
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Como quer ser chamado?"
                required
              />
            </label>
          )}

          <label>
            E-mail
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="voce@email.com"
              required
            />
          </label>

          <label>
            Senha
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mínimo de 6 caracteres"
              minLength={6}
              required
            />
          </label>

          {message && <div className="form-message">{message}</div>}

          <button className="primary-button" disabled={loading}>
            {loading
              ? "Carregando..."
              : mode === "login"
              ? "Entrar"
              : "Criar conta"}
          </button>

          <button
            type="button"
            className="text-button"
            onClick={() => {
              setMode(mode === "login" ? "signup" : "login");
              setMessage("");
            }}
          >
            {mode === "login"
              ? "Ainda não tem conta? Criar agora"
              : "Já tem conta? Entrar"}
          </button>
        </form>
      </div>
    </div>
  );
}
