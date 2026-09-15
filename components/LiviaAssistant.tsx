"use client";

import Image from "next/image";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Send, X, Sparkles, MessageCircle } from "lucide-react";

type Message = { role: "user" | "assistant"; text: string };

const initialMessage: Message = {
  role: "assistant",
  text: "Oi! Eu sou a Lívia 💚 Posso conversar com você sobre alimentação, exercícios, água, sono e sua evolução. Como foi seu dia?",
};

function getLiviaImage(messages: Message[], open: boolean, loading: boolean) {
  const lastAssistant = [...messages].reverse().find((item) => item.role === "assistant")?.text.toLowerCase() || "";
  const lastUser = [...messages].reverse().find((item) => item.role === "user")?.text.toLowerCase() || "";
  const combined = `${lastUser} ${lastAssistant}`;

  if (!open && messages.length === 1) return "/livia/oi.png";
  if (loading) return "/livia/analisando.png";
  if (combined.match(/parab[eé]ns|evolu[cç][aã]o|meta|consegui|comemorar|vit[oó]ria|mandou bem/)) return "/livia/comemorando.png";
  if (combined.match(/agua|hidrata|garrafinha|beber/)) return "/livia/agua.png";
  if (combined.match(/caf[eé]|almo[cç]o|jantar|refei[cç][aã]o|comi|comida|alimenta/)) return "/livia/alimentacao.png";
  if (combined.match(/passos|atividade|treino|caminhada|corrida|exerc[ií]cio/)) return "/livia/atividade-fisica.png";
  if (combined.match(/acho|analisa|analisar|como foi|melhorar|d[úu]vida|pensa|avaliar/)) return "/livia/analisando.png";
  return open ? "/livia/conversando.png" : "/livia/normal.png";
}

export default function LiviaAssistant() {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([initialMessage]);
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem("levia-livia-chat");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length) setMessages(parsed);
      } catch {}
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("levia-livia-chat", JSON.stringify(messages.slice(-20)));
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

  const liviaImage = useMemo(() => getLiviaImage(messages, open, loading), [messages, open, loading]);

  async function send(e: FormEvent) {
    e.preventDefault();
    if (!text.trim() || loading) return;

    const userText = text.trim();
    const history = messages.slice(-8);
    setText("");
    setMessages((m) => [...m, { role: "user", text: userText }]);
    setLoading(true);

    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;

    if (!token) {
      setMessages((m) => [...m, { role: "assistant", text: "Sua sessão expirou. Entre novamente para continuarmos." }]);
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
        body: JSON.stringify({ message: userText, history }),
      });

      const result = await response.json();
      setMessages((m) => [
        ...m,
        { role: "assistant", text: result.answer || result.error || "Não consegui responder agora." },
      ]);
    } catch {
      setMessages((m) => [...m, { role: "assistant", text: "Tive um probleminha para responder. Tente novamente." }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {open && (
        <section className="livia-panel" aria-label="Chat da Lívia">
          <header className="livia-header">
            <div className="livia-header-profile">
              <div className="livia-header-avatar">
                <Image src="/livia/normal.png" alt="Lívia" fill sizes="56px" />
              </div>
              <div>
                <div className="livia-name-row"><strong>Lívia</strong><Sparkles size={13} /></div>
                <span>Sua companheira no Levia</span>
              </div>
            </div>
            <button className="livia-close" onClick={() => setOpen(false)} aria-label="Fechar"><X size={18} /></button>
          </header>

          <div className="livia-panel-hero">
            <div className="livia-panel-hero-image">
              <Image src={liviaImage} alt="Lívia" fill sizes="140px" style={{ objectFit: "contain", objectPosition: "bottom center" }} />
            </div>
            <div className="livia-panel-hero-text">
              <span className="eyebrow">LÍVIA</span>
              <h3>Vamos conversar?</h3>
              <p>Me conte como foi seu dia e eu te ajudo a observar sua rotina com mais leveza.</p>
            </div>
          </div>

          <div className="livia-messages">
            {messages.map((m, i) => (
              <div key={i} className={`livia-message ${m.role}`}>
                {m.role === "assistant" && <div className="livia-message-avatar">L</div>}
                <div className="livia-bubble">{m.text}</div>
              </div>
            ))}
            {loading && (
              <div className="livia-message assistant">
                <div className="livia-message-avatar">L</div>
                <div className="livia-bubble livia-typing"><span/><span/><span/></div>
              </div>
            )}
            <div ref={endRef} />
          </div>

          <div className="livia-suggestions">
            <button type="button" onClick={() => setText("Como foi minha alimentação hoje?")}>Como foi meu dia?</button>
            <button type="button" onClick={() => setText("O que posso melhorar na minha rotina?")}>O que melhorar?</button>
            <button type="button" onClick={() => setText("Analise o que eu comi no café da manhã")}>Analisar refeição</button>
          </div>

          <form className="livia-input-area" onSubmit={send}>
            <textarea
              rows={2}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Converse com a Lívia..."
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  e.currentTarget.form?.requestSubmit();
                }
              }}
            />
            <button className="livia-send" disabled={loading} aria-label="Enviar"><Send size={18}/></button>
          </form>

          <footer className="livia-footer">Uso educativo. Não substitui acompanhamento profissional.</footer>
        </section>
      )}

      <div className={`livia-dock ${open ? "open" : ""}`}>
        {!open && (
          <button className="livia-dock-bubble" onClick={() => setOpen(true)}>
            <MessageCircle size={16} />
            <div>
              <strong>Oi, eu sou a Lívia!</strong>
              <span>Quer conversar?</span>
            </div>
          </button>
        )}

        <button className="livia-dock-figure" onClick={() => setOpen((v) => !v)} aria-label="Abrir conversa com a Lívia">
          <div className="livia-dock-image-wrap">
            <Image src={open ? "/livia/conversando.png" : liviaImage} alt="Lívia" fill sizes="170px" style={{ objectFit: "contain", objectPosition: "bottom center" }} priority />
          </div>
          <span className="livia-online-dot" />
        </button>
      </div>
    </>
  );
}
