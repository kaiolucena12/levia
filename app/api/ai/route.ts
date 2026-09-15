import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const SYSTEM_INSTRUCTION = `
Você é Lívia, a assistente virtual do Levia.

Converse como uma companheira de rotina próxima, natural e acolhedora.

Você conhece apenas os registros disponíveis do usuário e pode ajudá-lo a refletir sobre:
- alimentação;
- atividade física;
- hidratação;
- evolução de peso;
- rotina diária.

Seu estilo:
- responda sempre em português do Brasil;
- fale de forma conversacional e humana, sem parecer um relatório;
- use primeira pessoa como Lívia quando soar natural;
- mantenha continuidade com a conversa anterior;
- quando usar dados registrados, diga coisas como "pelo que você registrou..." sem inventar informações;
- seja acolhedora, prática e objetiva;
- não rotule alimentos como "proibidos", "lixo", "bons" ou "ruins";
- destaque equilíbrio, frequência, variedade, fibras, proteína, vegetais, frutas, hidratação e saciedade quando fizer sentido;
- evite dietas extremas, metas agressivas ou incentivo a restrição excessiva;
- não dê diagnóstico médico;
- não prescreva medicamentos;
- não prescreva suplementos;
- não prescreva dietas terapêuticas;
- quando houver sinais de possível problema médico, transtorno alimentar, desmaios, dor intensa, uso de medicamentos para emagrecimento ou outra situação de risco, recomende avaliação profissional;
- não invente calorias ou macronutrientes exatos se o usuário não forneceu quantidades suficientes;
- quando analisar uma refeição, prefira comentar:
  1. pontos positivos;
  2. o que pode melhorar;
  3. uma sugestão simples;
- não precisa usar essa estrutura em todas as respostas;
- quando usar o histórico do usuário, deixe claro que está observando somente os registros disponíveis.

Seu objetivo é ajudar o usuário a entender padrões e tomar decisões sustentáveis.

Você não substitui nutricionista, médico ou outro profissional de saúde.
`;

function getSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL não configurada."
    );
  }

  if (!supabaseKey) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY não configurada."
    );
  }

  return createClient(
    supabaseUrl,
    supabaseKey
  );
}

export async function POST(
  request: NextRequest
) {
  try {
    /*
     * 1. CONFERE OPENROUTER
     */

    const openRouterKey =
      process.env.OPENROUTER_API_KEY;

    if (!openRouterKey) {
      return NextResponse.json(
        {
          error:
            "OPENROUTER_API_KEY não está configurada na Vercel.",
        },
        { status: 500 }
      );
    }

    /*
     * 2. AUTENTICA USUÁRIO
     */

    const authHeader =
      request.headers.get("authorization");

    const token =
      authHeader?.replace("Bearer ", "");

    if (!token) {
      return NextResponse.json(
        {
          error:
            "Não autenticado.",
        },
        { status: 401 }
      );
    }

    const supabase = getSupabase();

    const {
      data: authData,
      error: authError,
    } = await supabase.auth.getUser(token);

    if (
      authError ||
      !authData.user
    ) {
      return NextResponse.json(
        {
          error:
            "Sessão inválida. Entre novamente.",
        },
        { status: 401 }
      );
    }

    /*
     * 3. RECEBE MENSAGEM
     */

    const body =
      await request.json();

    const message =
      String(
        body.message || ""
      ).trim();

    if (!message) {
      return NextResponse.json(
        {
          error:
            "Mensagem vazia.",
        },
        { status: 400 }
      );
    }

    /*
     * 4. CLIENTE SUPABASE
     * COM JWT DO USUÁRIO
     */

    const userSupabase =
      createClient(
        process.env
          .NEXT_PUBLIC_SUPABASE_URL!,
        process.env
          .NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
        {
          global: {
            headers: {
              Authorization:
                `Bearer ${token}`,
            },
          },
        }
      );

    /*
     * 5. DATA DE 7 DIAS ATRÁS
     */

    const sevenDaysAgo =
      new Date();

    sevenDaysAgo.setDate(
      sevenDaysAgo.getDate() - 7
    );

    const since =
      sevenDaysAgo
        .toISOString()
        .slice(0, 10);

    /*
     * 6. BUSCA DADOS DO USUÁRIO
     */

    const [
      mealsRes,
      activitiesRes,
      logsRes,
      weightsRes,
    ] = await Promise.all([
      userSupabase
        .from("meals")
        .select(
          "meal_type,description,meal_date"
        )
        .gte(
          "meal_date",
          since
        )
        .order(
          "meal_date",
          {
            ascending: false,
          }
        )
        .limit(40),

      userSupabase
        .from("activities")
        .select(
          "name,duration_minutes,activity_date"
        )
        .gte(
          "activity_date",
          since
        )
        .order(
          "activity_date",
          {
            ascending: false,
          }
        )
        .limit(30),

      userSupabase
        .from("daily_logs")
        .select(
          "log_date,water_ml,notes"
        )
        .gte(
          "log_date",
          since
        )
        .order(
          "log_date",
          {
            ascending: false,
          }
        )
        .limit(10),

      userSupabase
        .from("weight_entries")
        .select(
          "weight,recorded_at"
        )
        .order(
          "recorded_at",
          {
            ascending: false,
          }
        )
        .limit(10),
    ]);

    /*
     * 7. MONTA CONTEXTO
     */

    const context = {
      meals:
        mealsRes.data || [],

      activities:
        activitiesRes.data || [],

      dailyLogs:
        logsRes.data || [],

      weights:
        weightsRes.data || [],
    };

    /*
     * 8. HISTÓRICO DO CHAT
     */

    const history =
      Array.isArray(
        body.history
      )
        ? body.history
            .slice(-8)
            .map(
              (item: any) => ({
                role:
                  item.role ===
                  "assistant"
                    ? "assistant"
                    : "user",

                content:
                  String(
                    item.text ||
                      ""
                  ),
              })
            )
        : [];

    /*
     * 9. MONTA MENSAGENS
     */

    const messages = [
      {
        role: "system",
        content:
          SYSTEM_INSTRUCTION,
      },

      {
        role: "system",
        content: `
REGISTROS RECENTES DO USUÁRIO:

Os dados abaixo podem estar incompletos.

Use somente quando forem relevantes.

Nunca invente informações.

${JSON.stringify(
  context,
  null,
  2
)}
        `,
      },

      ...history,

      {
        role: "user",
        content: message,
      },
    ];

    /*
     * 10. CHAMA OPENROUTER
     */

    const aiResponse =
      await fetch(
        "https://openrouter.ai/api/v1/chat/completions",
        {
          method: "POST",

          headers: {
            Authorization:
              `Bearer ${openRouterKey}`,

            "Content-Type":
              "application/json",

            "HTTP-Referer":
              "https://levia-five.vercel.app",

            "X-Title":
              "Levia",
          },

          body:
            JSON.stringify({
              model:
                process.env
                  .OPENROUTER_MODEL ||
                "openrouter/free",

              messages,

              temperature:
                0.65,

              max_tokens:
                700,
            }),
        }
      );

    /*
     * 11. LÊ RESPOSTA
     */

    const result =
      await aiResponse.json();

    /*
     * 12. ERRO OPENROUTER
     */

    if (!aiResponse.ok) {
      console.error(
        "Erro OpenRouter:",
        result
      );

      const detail =
        result?.error
          ?.message ||
        result?.message ||
        "Erro desconhecido.";

      return NextResponse.json(
        {
          error:
            `A Lívia não conseguiu responder: ${detail}`,
        },
        {
          status:
            aiResponse.status,
        }
      );
    }

    /*
     * 13. PEGA TEXTO DA IA
     */

    const answer =
      result?.choices?.[0]
        ?.message
        ?.content;

    if (!answer) {
      console.error(
        "Resposta sem conteúdo:",
        result
      );

      return NextResponse.json(
        {
          error:
            "A IA respondeu sem conteúdo. Tente novamente.",
        },
        { status: 500 }
      );
    }

    /*
     * 14. DEVOLVE PARA A LÍVIA
     */

    return NextResponse.json({
      answer,
    });
  } catch (
    error: any
  ) {
    console.error(
      "ERRO LÍVIA:",
      error
    );

    return NextResponse.json(
      {
        error:
          error?.message ||
          "Erro interno ao consultar a IA.",
      },
      { status: 500 }
    );
  }
}