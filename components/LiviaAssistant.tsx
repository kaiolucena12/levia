"use client";

import Image from "next/image";

import {
  FormEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { supabase } from "@/lib/supabase";

import {
  Send,
  X,
  Sparkles,
  MessageCircle,
} from "lucide-react";

/* =========================================================
   TIPOS
========================================================= */

type Message = {
  role: "user" | "assistant";
  text: string;
};

type AiResult = {
  answer?: string;
  error?: string;
  actions?: string[];
};

type StoredChat = {
  savedAt: number;
  messages: Message[];
};

/* =========================================================
   CONFIGURAÇÃO DO HISTÓRICO
========================================================= */

/*
 * A conversa permanece salva por 6 horas.
 */
const CHAT_TTL =
  6 * 60 * 60 * 1000;

/*
 * Evita crescimento infinito do localStorage.
 */
const MAX_SAVED_MESSAGES = 30;

/* =========================================================
   MENSAGEM INICIAL
========================================================= */

const initialMessage: Message = {
  role: "assistant",
  text:
    "Oi! Eu sou a Lívia 💚 Posso conversar com você sobre alimentação, exercícios, água e sua evolução. Como foi seu dia?",
};

/* =========================================================
   LIMPEZA DAS RESPOSTAS DA IA
========================================================= */

function sanitizeAssistantText(
  value: unknown
) {
  if (
    typeof value !==
    "string"
  ) {
    return "";
  }

  let text =
    value.trim();

  /*
   * Se vier JSON diretamente,
   * tenta extrair apenas reply.
   */
  if (
    text.startsWith("{")
  ) {
    try {
      const firstBrace =
        text.indexOf("{");

      const lastBrace =
        text.lastIndexOf("}");

      if (
        firstBrace !== -1 &&
        lastBrace !== -1
      ) {
        const parsed =
          JSON.parse(
            text.slice(
              firstBrace,
              lastBrace + 1
            )
          );

        if (
          typeof parsed?.reply ===
          "string"
        ) {
          text =
            parsed.reply.trim();
        }
      }
    } catch {
      /*
       * Nunca mostra JSON técnico quebrado.
       */
      if (
        text.includes(
          '"reply"'
        ) ||
        text.includes(
          '"actions"'
        ) ||
        text.includes(
          '"type"'
        )
      ) {
        return (
          "Tive um problema ao processar essa resposta. " +
          "Pode tentar novamente?"
        );
      }
    }
  }

  if (!text) {
    return "";
  }

  /*
   * Remove blocos markdown.
   */
  text =
    text.replace(
      /```(?:json|javascript|typescript|text)?/gi,
      ""
    );

  text =
    text.replace(
      /```/g,
      ""
    );

  /*
   * Segunda tentativa caso ainda
   * exista JSON válido.
   */
  try {
    if (
      text.startsWith("{") &&
      text.endsWith("}")
    ) {
      const parsed =
        JSON.parse(
          text
        );

      if (
        typeof parsed?.reply ===
        "string"
      ) {
        text =
          parsed.reply.trim();
      }
    }
  } catch {
    // continua normalmente
  }

  /*
   * Detecta textos técnicos que
   * não devem aparecer no chat.
   */
  const technicalPatterns = [
    /reply should be/i,
    /let me draft/i,
    /actions?:\s*add_/i,
    /meal_type/i,
    /duration_minutes/i,
    /amount_ml/i,
    /nutrition_days_target/i,
    /activity_days_target/i,
    /"actions"\s*:/i,
    /system instruction/i,
  ];

  const containsTechnicalText =
    technicalPatterns.some(
      (pattern) =>
        pattern.test(
          text
        )
    );

  if (
    containsTechnicalText
  ) {
    const quotedReplies =
      [
        ...text.matchAll(
          /["“](Registrei|Pronto|Boa|Claro|Entendi|Vamos|Ótimo|Certo|Perfeito)([\s\S]*?)["”]/gi
        ),
      ];

    if (
      quotedReplies.length >
      0
    ) {
      const last =
        quotedReplies[
          quotedReplies.length -
            1
        ];

      const recovered =
        `${last[1]}${last[2]}`
          .trim();

      if (
        recovered
      ) {
        return recovered;
      }
    }

    return (
      "Entendi o que você me contou, mas tive um problema " +
      "ao processar a resposta. Pode me enviar novamente?"
    );
  }

  return text;
}

/* =========================================================
   VALIDAR HISTÓRICO SALVO
========================================================= */

function cleanStoredMessages(
  value: unknown
): Message[] {
  if (
    !Array.isArray(
      value
    )
  ) {
    return [];
  }

  return value
    .filter(
      (
        item: any
      ) =>
        item &&
        (
          item.role ===
            "user" ||
          item.role ===
            "assistant"
        ) &&
        typeof item.text ===
          "string"
    )
    .map(
      (
        item: any
      ) => ({
        role:
          item.role as
            | "user"
            | "assistant",

        text:
          item.role ===
          "assistant"
            ? sanitizeAssistantText(
                item.text
              )
            : String(
                item.text
              ),
      })
    )
    .filter(
      (item) =>
        item.text.trim()
          .length > 0
    )
    .slice(
      -MAX_SAVED_MESSAGES
    );
}

/* =========================================================
   IMAGEM DA LÍVIA
========================================================= */

function getLiviaImage(
  messages: Message[],
  open: boolean,
  loading: boolean
) {
  const lastAssistant =
    [...messages]
      .reverse()
      .find(
        (item) =>
          item.role ===
          "assistant"
      )
      ?.text.toLowerCase() ||
    "";

  const lastUser =
    [...messages]
      .reverse()
      .find(
        (item) =>
          item.role ===
          "user"
      )
      ?.text.toLowerCase() ||
    "";

  const combined =
    `${lastUser} ${lastAssistant}`;

  if (
    !open &&
    messages.length ===
      1
  ) {
    return "/livia/oi.png";
  }

  if (
    loading
  ) {
    return "/livia/analisando.png";
  }

  if (
    combined.match(
      /parab[eé]ns|evolu[cç][aã]o|meta|consegui|comemorar|vit[oó]ria|mandou bem/
    )
  ) {
    return "/livia/comemorando.png";
  }

  if (
    combined.match(
      /[áa]gua|hidrata|garrafinha|beber|bebi/
    )
  ) {
    return "/livia/agua.png";
  }

  if (
    combined.match(
      /caf[eé]|almo[cç]o|jantar|ceia|lanche|refei[cç][aã]o|comi|comida|alimenta|caloria/
    )
  ) {
    return "/livia/alimentacao.png";
  }

  if (
    combined.match(
      /atividade|treino|caminhada|corrida|exerc[ií]cio|academia/
    )
  ) {
    return "/livia/atividade-fisica.png";
  }

  if (
    combined.match(
      /acho|analisa|analisar|como foi|melhorar|d[úu]vida|pensa|avaliar|imc/
    )
  ) {
    return "/livia/analisando.png";
  }

  return open
    ? "/livia/conversando.png"
    : "/livia/normal.png";
}

/* =========================================================
   COMPONENTE
========================================================= */

export default function LiviaAssistant() {
  const [
    open,
    setOpen,
  ] =
    useState(
      false
    );

  const [
    text,
    setText,
  ] =
    useState(
      ""
    );

  const [
    loading,
    setLoading,
  ] =
    useState(
      false
    );

  const [
    messages,
    setMessages,
  ] =
    useState<
      Message[]
    >([
      initialMessage,
    ]);

  /*
   * Indica que já terminamos de
   * procurar o histórico salvo.
   *
   * Isso é fundamental para não
   * sobrescrever o histórico com
   * initialMessage antes de carregar.
   */
  const [
    chatReady,
    setChatReady,
  ] =
    useState(
      false
    );

  /*
   * Chave individual por usuário.
   */
  const [
    storageKey,
    setStorageKey,
  ] =
    useState<
      string | null
    >(
      null
    );

  const endRef =
    useRef<
      HTMLDivElement | null
    >(
      null
    );

  /* =======================================================
     CARREGAR CONVERSA
  ======================================================= */

  useEffect(() => {
    let cancelled =
      false;

    async function loadSavedChat() {
      try {
        const {
          data,
        } =
          await supabase.auth.getUser();

        if (
          cancelled
        ) {
          return;
        }

        /*
         * Caso não exista usuário,
         * permite o funcionamento normal.
         */
        if (
          !data.user
        ) {
          setChatReady(
            true
          );

          return;
        }

        const key =
          `levia-chat-${data.user.id}`;

        setStorageKey(
          key
        );

        const saved =
          localStorage.getItem(
            key
          );

        if (
          !saved
        ) {
          setMessages([
            initialMessage,
          ]);

          setChatReady(
            true
          );

          return;
        }

        try {
          const parsed =
            JSON.parse(
              saved
            ) as StoredChat;

          const savedAt =
            Number(
              parsed?.savedAt ||
                0
            );

          const expired =
            !savedAt ||
            Date.now() -
              savedAt >
              CHAT_TTL;

          /*
           * Conversa passou de 6 horas.
           */
          if (
            expired
          ) {
            localStorage.removeItem(
              key
            );

            setMessages([
              initialMessage,
            ]);

            setChatReady(
              true
            );

            return;
          }

          const cleanMessages =
            cleanStoredMessages(
              parsed?.messages
            );

          if (
            cleanMessages.length >
            0
          ) {
            setMessages(
              cleanMessages
            );
          } else {
            setMessages([
              initialMessage,
            ]);
          }
        } catch {
          localStorage.removeItem(
            key
          );

          setMessages([
            initialMessage,
          ]);
        }

        setChatReady(
          true
        );
      } catch (
        error
      ) {
        console.error(
          "Erro ao recuperar conversa da Lívia:",
          error
        );

        if (
          !cancelled
        ) {
          setChatReady(
            true
          );
        }
      }
    }

    loadSavedChat();

    return () => {
      cancelled =
        true;
    };
  }, []);

  /* =======================================================
     SALVAR CONVERSA
  ======================================================= */

  useEffect(() => {
    /*
     * NÃO salva enquanto ainda
     * estamos carregando o histórico.
     *
     * Isso evita apagar a conversa
     * ao trocar de página.
     */
    if (
      !chatReady ||
      !storageKey
    ) {
      return;
    }

    try {
      const payload:
        StoredChat = {
        savedAt:
          Date.now(),

        messages:
          messages.slice(
            -MAX_SAVED_MESSAGES
          ),
      };

      localStorage.setItem(
        storageKey,
        JSON.stringify(
          payload
        )
      );
    } catch (
      error
    ) {
      console.error(
        "Erro ao salvar conversa da Lívia:",
        error
      );
    }
  }, [
    messages,
    chatReady,
    storageKey,
  ]);

  /* =======================================================
     SCROLL AUTOMÁTICO
  ======================================================= */

  useEffect(() => {
    if (
      !open
    ) {
      return;
    }

    const timer =
      window.setTimeout(
        () => {
          endRef.current
            ?.scrollIntoView({
              behavior:
                "smooth",
              block:
                "end",
            });
        },
        50
      );

    return () => {
      window.clearTimeout(
        timer
      );
    };
  }, [
    messages,
    loading,
    open,
  ]);

  /* =======================================================
     IMAGEM
  ======================================================= */

  const liviaImage =
    useMemo(
      () =>
        getLiviaImage(
          messages,
          open,
          loading
        ),
      [
        messages,
        open,
        loading,
      ]
    );

  /* =======================================================
     ENVIAR MENSAGEM
  ======================================================= */

  async function send(
    e: FormEvent
  ) {
    e.preventDefault();

    const userText =
      text.trim();

    if (
      !userText ||
      loading
    ) {
      return;
    }

    /*
     * Histórico curto enviado à IA.
     *
     * A interface pode guardar 30 mensagens,
     * mas não precisamos mandar tudo ao modelo.
     */
    const history =
      messages.slice(
        -6
      );

    setText(
      ""
    );

    setMessages(
      (
        current
      ) => [
        ...current,
        {
          role:
            "user",
          text:
            userText,
        },
      ]
    );

    setLoading(
      true
    );

    try {
      /* ===============================================
         SESSÃO
      =============================================== */

      const {
        data:
          sessionData,
        error:
          sessionError,
      } =
        await supabase.auth.getSession();

      if (
        sessionError ||
        !sessionData.session
          ?.access_token
      ) {
        setMessages(
          (
            current
          ) => [
            ...current,
            {
              role:
                "assistant",

              text:
                "Sua sessão expirou. Entre novamente para continuarmos.",
            },
          ]
        );

        return;
      }

      const token =
        sessionData.session
          .access_token;

      /* ===============================================
         CONSULTAR IA
      =============================================== */

      const response =
        await fetch(
          "/api/ai",
          {
            method:
              "POST",

            headers: {
              "Content-Type":
                "application/json",

              Authorization:
                `Bearer ${token}`,
            },

            body:
              JSON.stringify({
                message:
                  userText,

                history,
              }),
          }
        );

      let result:
        AiResult = {};

      try {
        result =
          await response.json();
      } catch {
        throw new Error(
          "Resposta inválida do servidor."
        );
      }

      /* ===============================================
         ERRO DA API
      =============================================== */

      if (
        !response.ok
      ) {
        const errorText =
          sanitizeAssistantText(
            result.error
          );

        setMessages(
          (
            current
          ) => [
            ...current,
            {
              role:
                "assistant",

              text:
                errorText ||
                "Tive um problema para processar sua mensagem. Tente novamente.",
            },
          ]
        );

        return;
      }

      /* ===============================================
         RESPOSTA
      =============================================== */

      const answer =
        sanitizeAssistantText(
          result.answer
        );

      setMessages(
        (
          current
        ) => [
          ...current,
          {
            role:
              "assistant",

            text:
              answer ||
              "Não consegui interpretar a resposta agora. Pode tentar novamente?",
          },
        ]
      );

      /* ===============================================
         ATUALIZAR RESTO DO APP
      =============================================== */

      if (
        Array.isArray(
          result.actions
        ) &&
        result.actions.length >
          0
      ) {
        window.dispatchEvent(
          new CustomEvent(
            "levia:data-updated",
            {
              detail: {
                actions:
                  result.actions,
              },
            }
          )
        );
      }
    } catch (
      error
    ) {
      console.error(
        "Erro ao conversar com a Lívia:",
        error
      );

      setMessages(
        (
          current
        ) => [
          ...current,
          {
            role:
              "assistant",

            text:
              "Tive um probleminha para responder. Tente novamente.",
          },
        ]
      );
    } finally {
      setLoading(
        false
      );
    }
  }

  /* =======================================================
     SUGESTÕES
  ======================================================= */

  function useSuggestion(
    suggestion: string
  ) {
    setText(
      suggestion
    );
  }

  /* =======================================================
     TELA
  ======================================================= */

  return (
    <>
      {open && (
        <section
          className="livia-panel"
          aria-label="Chat da Lívia"
        >
          {/* CABEÇALHO */}

          <header className="livia-header">
            <div className="livia-header-profile">
              <div className="livia-header-avatar">
                <Image
                  src="/livia/normal.png"
                  alt="Lívia"
                  fill
                  sizes="56px"
                  style={{
                    objectFit:
                      "contain",
                  }}
                />
              </div>

              <div>
                <div className="livia-name-row">
                  <strong>
                    Lívia
                  </strong>

                  <Sparkles
                    size={
                      13
                    }
                  />
                </div>

                <span>
                  Sua companheira
                  no Levia
                </span>
              </div>
            </div>

            <button
              type="button"
              className="livia-close"
              onClick={() =>
                setOpen(
                  false
                )
              }
              aria-label="Fechar"
            >
              <X
                size={
                  18
                }
              />
            </button>
          </header>

          {/* HERO */}

          <div className="livia-panel-hero">
            <div className="livia-panel-hero-image">
              <Image
                src={
                  liviaImage
                }
                alt="Lívia"
                fill
                sizes="140px"
                style={{
                  objectFit:
                    "contain",

                  objectPosition:
                    "bottom center",
                }}
              />
            </div>

            <div className="livia-panel-hero-text">
              <span className="eyebrow">
                LÍVIA
              </span>

              <h3>
                Vamos conversar?
              </h3>

              <p>
                Me conte como foi
                seu dia e eu te
                ajudo a observar
                sua rotina com
                mais leveza.
              </p>
            </div>
          </div>

          {/* MENSAGENS */}

          <div className="livia-messages">
            {messages.map(
              (
                message,
                index
              ) => (
                <div
                  key={
                    index
                  }
                  className={`livia-message ${message.role}`}
                >
                  {message.role ===
                    "assistant" && (
                    <div className="livia-message-avatar">
                      L
                    </div>
                  )}

                  <div className="livia-bubble">
                    {
                      message.text
                    }
                  </div>
                </div>
              )
            )}

            {loading && (
              <div className="livia-message assistant">
                <div className="livia-message-avatar">
                  L
                </div>

                <div className="livia-bubble livia-typing">
                  <span />
                  <span />
                  <span />
                </div>
              </div>
            )}

            <div
              ref={
                endRef
              }
            />
          </div>

          {/* SUGESTÕES */}

          <div className="livia-suggestions">
            <button
              type="button"
              onClick={() =>
                useSuggestion(
                  "Como foi minha alimentação hoje?"
                )
              }
            >
              Como foi meu dia?
            </button>

            <button
              type="button"
              onClick={() =>
                useSuggestion(
                  "O que posso melhorar na minha rotina?"
                )
              }
            >
              O que melhorar?
            </button>

            <button
              type="button"
              onClick={() =>
                useSuggestion(
                  "Como estou indo nas minhas metas desta semana?"
                )
              }
            >
              Minhas metas
            </button>
          </div>

          {/* INPUT */}

          <form
            className="livia-input-area"
            onSubmit={
              send
            }
          >
            <textarea
              rows={
                2
              }
              value={
                text
              }
              onChange={(
                e
              ) =>
                setText(
                  e.target.value
                )
              }
              placeholder="Converse com a Lívia..."
              disabled={
                loading
              }
              onKeyDown={(
                e
              ) => {
                if (
                  e.key ===
                    "Enter" &&
                  !e.shiftKey
                ) {
                  e.preventDefault();

                  e.currentTarget
                    .form
                    ?.requestSubmit();
                }
              }}
            />

            <button
              type="submit"
              className="livia-send"
              disabled={
                loading ||
                !text.trim()
              }
              aria-label="Enviar"
            >
              <Send
                size={
                  18
                }
              />
            </button>
          </form>

          <footer className="livia-footer">
            Uso educativo.
            Não substitui
            acompanhamento
            profissional.
          </footer>
        </section>
      )}

      {/* LÍVIA FIXA */}

      <div
        className={`livia-dock ${
          open
            ? "open"
            : ""
        }`}
      >
        {!open && (
          <button
            type="button"
            className="livia-dock-bubble"
            onClick={() =>
              setOpen(
                true
              )
            }
          >
            <MessageCircle
              size={
                16
              }
            />

            <div>
              <strong>
                Oi, eu sou a
                Lívia!
              </strong>

              <span>
                Quer conversar?
              </span>
            </div>
          </button>
        )}

        <button
          type="button"
          className="livia-dock-figure"
          onClick={() =>
            setOpen(
              (
                value
              ) =>
                !value
            )
          }
          aria-label="Abrir conversa com a Lívia"
        >
          <div className="livia-dock-image-wrap">
            <Image
              src={
                open
                  ? "/livia/conversando.png"
                  : liviaImage
              }
              alt="Lívia"
              fill
              sizes="170px"
              style={{
                objectFit:
                  "contain",

                objectPosition:
                  "bottom center",
              }}
              priority
            />
          </div>

          <span className="livia-online-dot" />
        </button>
      </div>
    </>
  );
}