"use client";

import { FormEvent, useState } from "react";
import AuthGuard from "@/components/AuthGuard";
import AppShell from "@/components/AppShell";
import { supabase } from "@/lib/supabase";
import { Send, Sparkles } from "lucide-react";

type Message = {
  role: "user" | "assistant";
  text: string;
};

export default function IAPage() {
  const [text, setText] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      text: "Oi! Sou a Lívia. Você pode me contar o que comeu, perguntar sobre seus hábitos ou pedir uma análise dos seus registros recentes.",
    },
  ]);
  const [loading, setLoading] = useState(false);

  async function send(e: FormEvent) {
    e.preventDefault();
    if (!text.trim() || loading) return;

    const userText = text.trim();
    setText("");
    setMessages((current) => [...current, { role: "user", text: userText }]);
    setLoading(true);

    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;

    if (!token) {
      setMessages((current) => [
        ...current,
        { role: "assistant", text: "Sua sessão expirou. Entre novamente." },
      ]);
      setLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/ai", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          message: userText,
          history: messages.slice(-6),
        }),
      });

      const result = await response.json();

      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          text: result.answer || result.error || "Não consegui responder agora.",
        },
      ]);
    } catch {
      setMessages((current) => [
        ...current,
        { role: "assistant", text: "Ocorreu um erro ao falar com a IA." },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthGuard>
      <AppShell>
        <div className="page ai-page">
          <header className="page-header">
            <div>
              <span className="eyebrow">ASSISTENTE</span>
              <h1>Lívia</h1>
              <p>Converse comigo sobre sua alimentação, rotina, exercícios e evolução.</p>
            </div>
          </header>

          <div className="chat-card">
            <div className="chat-header">
              <div className="ai-symbol small"><Sparkles size={18}/></div>
              <div>
                <b>Lívia</b>
                <span>sua companheira no Levia</span>
              </div>
            </div>

            <div className="chat-messages">
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={message.role === "user" ? "chat-message user" : "chat-message assistant"}
                >
                  <div className="bubble">{message.text}</div>
                </div>
              ))}
              {loading && (
                <div className="chat-message assistant">
                  <div className="bubble typing">Analisando...</div>
                </div>
              )}
            </div>

            <form className="chat-input" onSubmit={send}>
              <textarea
                rows={2}
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Ex.: No café da manhã comi 2 ovos, pão francês e banana. O que acha?"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    e.currentTarget.form?.requestSubmit();
                  }
                }}
              />
              <button className="send-button" disabled={loading} aria-label="Enviar">
                <Send size={19} />
              </button>
            </form>

            <div className="chat-disclaimer">
              As respostas são educativas e não substituem orientação individual de nutricionista ou médico.
            </div>
          </div>
        </div>
      </AppShell>
    </AuthGuard>
  );
}
