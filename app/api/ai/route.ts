import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const SYSTEM_INSTRUCTION = `
Você é Lívia, a assistente virtual do Levia.

Você conversa como uma companheira de rotina próxima, natural, acolhedora e prática.

Além de conversar, você pode identificar quando o usuário está INFORMANDO algo que deseja registrar no Levia.

Você pode registrar:

1. REFEIÇÃO
Exemplos:
- "almocei arroz, feijão e carne"
- "no café comi dois ovos e pão"
- "jantei frango com salada"
- "comi uma banana no lanche"

2. ÁGUA
Exemplos:
- "bebi 500 ml de água"
- "tomei mais 300 ml"
- "bebi uma garrafa de 500 ml"

3. ATIVIDADE FÍSICA
Exemplos:
- "caminhei 30 minutos"
- "fiz academia por 1 hora"
- "corri 20 minutos"

4. PESO
Exemplos:
- "hoje estou com 92,3 kg"
- "me pesei e deu 91.8"

IMPORTANTE:

- Só registre quando o usuário estiver claramente contando algo que fez, comeu, bebeu ou mediu.
- Se o usuário estiver apenas perguntando, NÃO registre nada.
- Nunca invente dados.
- Se a informação for ambígua, não registre e pergunte.
- Não invente horário, quantidade ou tipo de refeição.

Para refeição, escolha somente:
- "Café da manhã"
- "Lanche"
- "Almoço"
- "Lanche da tarde"
- "Jantar"
- "Ceia"

Exemplo:
Usuário: "comi arroz e frango"

Se não der para saber qual refeição foi, NÃO registre.

Pergunte:
"Foi no almoço, jantar ou outra refeição?"

Usuário:
"almocei arroz, feijão e carne"

Nesse caso registre como Almoço.

REFEIÇÕES:

Quando registrar uma refeição, NÃO responda apenas "registrei".

Você deve:
- confirmar que registrou;
- comentar o que foi positivo;
- dizer o que pode melhorar;
- dar uma sugestão simples.

Exemplo:

Usuário:
"Almocei arroz e feijão."

Resposta esperada:

{
  "reply": "Registrei seu almoço. Arroz e feijão formam uma combinação interessante porque oferecem carboidratos, fibras e proteínas vegetais. Para deixar a refeição mais completa, você pode incluir uma fonte de proteína e algum vegetal ou salada.",
  "actions": [
    {
      "type": "add_meal",
      "meal_type": "Almoço",
      "description": "Arroz e feijão"
    }
  ]
}

Não critique a refeição.
Não diga que foi ruim.
Evite julgamento.

ÁGUA:

- Sempre converta para mililitros.
- "500 ml" = 500
- "1 litro" = 1000
- "1,5 litro" = 1500
- Não estime copos ou garrafas se o usuário não informar o tamanho.

Quando registrar água, além de confirmar, comente brevemente sobre hidratação.

Exemplo:

{
  "reply": "Pronto! Somei 500 ml à sua água de hoje. Boa hidratação ao longo do dia ajuda no funcionamento do organismo e também pode contribuir para uma melhor percepção de fome e saciedade.",
  "actions": [
    {
      "type": "add_water",
      "amount_ml": 500
    }
  ]
}

ATIVIDADE:

- Registre o nome da atividade.
- Registre duração somente se informada.
- Não invente calorias gastas.

Quando registrar atividade física:
- reconheça o esforço;
- explique um benefício;
- quando houver dados suficientes, você pode fornecer uma estimativa aproximada de gasto energético.

IMPORTANTE SOBRE CALORIAS:

Nunca dê um número exato de calorias como se fosse garantido.

Para estimar gasto energético, considere quando possível:
- peso recente do usuário;
- duração;
- intensidade.

Se a intensidade não estiver informada, use uma intensidade provável apenas quando fizer sentido, mas deixe claro que é uma estimativa.

Use sempre palavras como:
- "aproximadamente"
- "estimativa"
- "pode variar"

Exemplo sem dados suficientes:

Usuário:
"Fiz 30 minutos de caminhada."

Resposta:

{
  "reply": "Boa! Registrei seus 30 minutos de caminhada. Caminhar ajuda no condicionamento cardiovascular, circulação e gasto energético. A quantidade de calorias pode variar bastante conforme seu peso, ritmo e terreno.",
  "actions": [
    {
      "type": "add_activity",
      "name": "Caminhada",
      "duration_minutes": 30
    }
  ]
}

Exemplo com peso recente disponível:

{
  "reply": "Boa! Registrei seus 30 minutos de caminhada. Considerando seu peso mais recente e uma caminhada em ritmo moderado, o gasto pode ficar aproximadamente em uma faixa estimada. Esse valor varia conforme ritmo, terreno e intensidade.",
  "actions": [
    {
      "type": "add_activity",
      "name": "Caminhada",
      "duration_minutes": 30
    }
  ]
}

PESO:

- Registre em kg.
- Aceite vírgula ou ponto decimal.

Quando registrar peso:
- confirme;
- não comemore nem critique uma única medição;
- explique que o mais importante é observar tendência ao longo do tempo.

Exemplo:

{
  "reply": "Registrei seu peso de hoje: 92,3 kg. Mais importante do que uma medida isolada é acompanhar a tendência ao longo dos próximos dias e semanas, porque o peso pode variar por hidratação, alimentação e outros fatores.",
  "actions": [
    {
      "type": "add_weight",
      "weight": 92.3
    }
  ]
}

É permitido retornar várias ações quando o usuário informar várias coisas na mesma mensagem.

Exemplo:

Usuário:
"Almocei arroz e feijão e bebi 500 ml de água."

Resposta:

{
  "reply": "Pronto! Registrei seu almoço e também somei 500 ml à sua hidratação de hoje. Arroz e feijão são uma combinação interessante, e você pode completar a refeição com uma fonte de proteína e vegetais.",
  "actions": [
    {
      "type": "add_meal",
      "meal_type": "Almoço",
      "description": "Arroz e feijão"
    },
    {
      "type": "add_water",
      "amount_ml": 500
    }
  ]
}

Quando for apenas conversa:

{
  "reply": "Claro! Posso analisar sua alimentação dos últimos dias.",
  "actions": []
}

Seu estilo:
- responda sempre em português do Brasil;
- fale de forma natural e humana;
- use primeira pessoa como Lívia quando fizer sentido;
- seja acolhedora, prática e objetiva;
- não pareça um relatório;
- não rotule alimentos como proibidos, lixo, bons ou ruins;
- não incentive restrição alimentar extrema;
- não dê diagnóstico médico;
- não prescreva medicamentos;
- não prescreva suplementos;
- não prescreva dietas terapêuticas;
- não invente calorias ou macronutrientes.

Quando analisar alimentação, considere:
- variedade;
- proteína;
- fibras;
- frutas;
- vegetais;
- hidratação;
- saciedade.

Quando houver risco médico, transtorno alimentar, desmaios, dor intensa ou outra situação relevante, recomende avaliação profissional.

FORMATO OBRIGATÓRIO:

Você deve responder SOMENTE com um JSON válido.

Formato:

{
  "reply": "texto que será mostrado ao usuário",
  "actions": []
}

Nunca coloque markdown.
Nunca coloque blocos de código.
Nunca escreva nada fora do JSON.
`;

type LiviaAction =
  | {
      type: "add_meal";
      meal_type: string;
      description: string;
    }
  | {
      type: "add_water";
      amount_ml: number;
    }
  | {
      type: "add_activity";
      name: string;
      duration_minutes?: number | null;
    }
  | {
      type: "add_weight";
      weight: number;
    };

type LiviaResponse = {
  reply: string;
  actions: LiviaAction[];
};

const VALID_MEAL_TYPES = [
  "Café da manhã",
  "Lanche",
  "Almoço",
  "Lanche da tarde",
  "Jantar",
  "Ceia",
];

function getSupabase() {
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL;

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

function getTodayBrazil() {
  const parts =
    new Intl.DateTimeFormat(
      "en-CA",
      {
        timeZone:
          "America/Recife",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }
    ).formatToParts(
      new Date()
    );

  const year =
    parts.find(
      (p) => p.type === "year"
    )?.value;

  const month =
    parts.find(
      (p) => p.type === "month"
    )?.value;

  const day =
    parts.find(
      (p) => p.type === "day"
    )?.value;

  return `${year}-${month}-${day}`;
}

function cleanJsonResponse(
  text: string
) {
  let cleaned =
    text.trim();

  cleaned =
    cleaned.replace(
      /^```json\s*/i,
      ""
    );

  cleaned =
    cleaned.replace(
      /^```\s*/,
      ""
    );

  cleaned =
    cleaned.replace(
      /\s*```$/,
      ""
    );

  const firstBrace =
    cleaned.indexOf("{");

  const lastBrace =
    cleaned.lastIndexOf("}");

  if (
    firstBrace !== -1 &&
    lastBrace !== -1
  ) {
    cleaned =
      cleaned.slice(
        firstBrace,
        lastBrace + 1
      );
  }

  return cleaned;
}

export async function POST(
  request: NextRequest
) {
  try {
    const openRouterKey =
      process.env.OPENROUTER_API_KEY;

    if (!openRouterKey) {
      return NextResponse.json(
        {
          error:
            "OPENROUTER_API_KEY não está configurada.",
        },
        { status: 500 }
      );
    }

    const authHeader =
      request.headers.get(
        "authorization"
      );

    const token =
      authHeader?.replace(
        "Bearer ",
        ""
      );

    if (!token) {
      return NextResponse.json(
        {
          error:
            "Não autenticado.",
        },
        { status: 401 }
      );
    }

    const supabase =
      getSupabase();

    const {
      data: authData,
      error: authError,
    } =
      await supabase.auth.getUser(
        token
      );

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

    const userId =
      authData.user.id;

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

    const today =
      getTodayBrazil();

    const sevenDaysAgo =
      new Date();

    sevenDaysAgo.setDate(
      sevenDaysAgo.getDate() - 7
    );

    const since =
      sevenDaysAgo
        .toISOString()
        .slice(0, 10);

    const [
      mealsRes,
      activitiesRes,
      logsRes,
      weightsRes,
    ] =
      await Promise.all([
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
              ascending:
                false,
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
              ascending:
                false,
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
              ascending:
                false,
            }
          )
          .limit(10),

        userSupabase
          .from(
            "weight_entries"
          )
          .select(
            "weight,recorded_at"
          )
          .order(
            "recorded_at",
            {
              ascending:
                false,
            }
          )
          .limit(10),
      ]);

    const context = {
      today,

      meals:
        mealsRes.data || [],

      activities:
        activitiesRes.data || [],

      dailyLogs:
        logsRes.data || [],

      weights:
        weightsRes.data || [],
    };

    const latestWeight =
      context.weights?.[0]
        ?.weight || null;

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

    const messages = [
      {
        role: "system",
        content:
          SYSTEM_INSTRUCTION,
      },

      {
        role: "system",
        content: `
DATA DE HOJE:
${today}

PESO MAIS RECENTE:
${
  latestWeight
    ? `${latestWeight} kg`
    : "Não disponível"
}

REGISTROS RECENTES DO USUÁRIO:

Os registros podem estar incompletos.

Nunca invente dados.

Se houver peso recente disponível, ele pode ser usado apenas para estimativas aproximadas de gasto energético.

Nunca apresente gasto calórico como valor exato.

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
                0.35,

              max_tokens:
                1000,
            }),
        }
      );

    const result =
      await aiResponse.json();

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

    const rawAnswer =
      result?.choices?.[0]
        ?.message?.content;

    if (!rawAnswer) {
      return NextResponse.json(
        {
          error:
            "A IA respondeu sem conteúdo.",
        },
        { status: 500 }
      );
    }

    let liviaData:
      LiviaResponse;

    try {
      const clean =
        cleanJsonResponse(
          rawAnswer
        );

      liviaData =
        JSON.parse(clean);
    } catch {
      console.error(
        "Erro ao interpretar JSON da Lívia:",
        rawAnswer
      );

      return NextResponse.json({
        answer:
          rawAnswer,
        actions: [],
      });
    }

    if (
      !liviaData ||
      typeof liviaData.reply !==
        "string"
    ) {
      return NextResponse.json(
        {
          error:
            "Resposta da Lívia em formato inválido.",
        },
        { status: 500 }
      );
    }

    const actions =
      Array.isArray(
        liviaData.actions
      )
        ? liviaData.actions
        : [];

    const executedActions:
      string[] = [];

    for (
      const action of actions
    ) {
      if (
        action.type ===
        "add_meal"
      ) {
        const mealType =
          String(
            action.meal_type ||
              ""
          ).trim();

        const description =
          String(
            action.description ||
              ""
          )
            .trim()
            .slice(
              0,
              500
            );

        if (
          !VALID_MEAL_TYPES.includes(
            mealType
          ) ||
          !description
        ) {
          continue;
        }

        const {
          error:
            mealError,
        } =
          await userSupabase
            .from("meals")
            .insert({
              user_id:
                userId,

              meal_type:
                mealType,

              description,

              meal_date:
                today,
            });

        if (
          mealError
        ) {
          console.error(
            "Erro ao registrar refeição:",
            mealError
          );
        } else {
          executedActions.push(
            "meal"
          );
        }
      }

      if (
        action.type ===
        "add_water"
      ) {
        const amount =
          Math.round(
            Number(
              action.amount_ml
            )
          );

        if (
          !Number.isFinite(
            amount
          ) ||
          amount <= 0 ||
          amount > 5000
        ) {
          continue;
        }

        const {
          data:
            currentDaily,
        } =
          await userSupabase
            .from(
              "daily_logs"
            )
            .select(
              "water_ml"
            )
            .eq(
              "log_date",
              today
            )
            .maybeSingle();

        const currentWater =
          Number(
            currentDaily
              ?.water_ml || 0
          );

        const newWater =
          currentWater +
          amount;

        const {
          error:
            waterError,
        } =
          await userSupabase
            .from(
              "daily_logs"
            )
            .upsert(
              {
                user_id:
                  userId,

                log_date:
                  today,

                water_ml:
                  newWater,

                updated_at:
                  new Date().toISOString(),
              },
              {
                onConflict:
                  "user_id,log_date",
              }
            );

        if (
          waterError
        ) {
          console.error(
            "Erro ao registrar água:",
            waterError
          );
        } else {
          executedActions.push(
            "water"
          );
        }
      }

      if (
        action.type ===
        "add_activity"
      ) {
        const activityName =
          String(
            action.name ||
              ""
          )
            .trim()
            .slice(
              0,
              120
            );

        const duration =
          action.duration_minutes ===
            null ||
          action.duration_minutes ===
            undefined
            ? null
            : Math.round(
                Number(
                  action.duration_minutes
                )
              );

        if (
          !activityName
        ) {
          continue;
        }

        if (
          duration !== null &&
          (
            !Number.isFinite(
              duration
            ) ||
            duration <= 0 ||
            duration > 1440
          )
        ) {
          continue;
        }

        const {
          error:
            activityError,
        } =
          await userSupabase
            .from(
              "activities"
            )
            .insert({
              user_id:
                userId,

              name:
                activityName,

              duration_minutes:
                duration,

              activity_date:
                today,
            });

        if (
          activityError
        ) {
          console.error(
            "Erro ao registrar atividade:",
            activityError
          );
        } else {
          executedActions.push(
            "activity"
          );
        }
      }

      if (
        action.type ===
        "add_weight"
      ) {
        const weight =
          Number(
            action.weight
          );

        if (
          !Number.isFinite(
            weight
          ) ||
          weight < 20 ||
          weight > 500
        ) {
          continue;
        }

        const {
          error:
            weightError,
        } =
          await userSupabase
            .from(
              "weight_entries"
            )
            .insert({
              user_id:
                userId,

              weight,

              recorded_at:
                today,
            });

        if (
          weightError
        ) {
          console.error(
            "Erro ao registrar peso:",
            weightError
          );
        } else {
          executedActions.push(
            "weight"
          );
        }
      }
    }

    return NextResponse.json({
      answer:
        liviaData.reply,

      actions:
        executedActions,
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