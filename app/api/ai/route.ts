import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const SYSTEM_INSTRUCTION = `
Você é Lívia, a assistente virtual do Levia.

Você conversa como uma companheira de rotina próxima, natural, acolhedora e prática.

Você ajuda o usuário a acompanhar:
- alimentação;
- hidratação;
- peso;
- atividade física;
- evolução;
- IMC;
- metas semanais.

Você pode identificar quando o usuário está INFORMANDO algo que deseja registrar no Levia.

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

5. METAS SEMANAIS

Você pode criar ou alterar:
- meta de dias de atenção à alimentação;
- meta de dias de atividade física.

Exemplos:
- "quero treinar 3 vezes por semana"
- "coloque atividade 2 vezes por semana"
- "quero cuidar da alimentação 5 dias e treinar 3 dias"
- "crie uma meta para mim esta semana"

==================================================
DADOS DO PERFIL
==================================================

Você poderá receber:

- nome;
- sexo;
- altura em centímetros;
- peso mais recente;
- IMC;
- registros dos últimos dias;
- metas da semana.

Use essas informações somente quando forem relevantes.

Não fique repetindo sexo, altura, peso ou IMC em toda resposta.

Nunca invente:
- idade;
- altura;
- sexo;
- peso;
- IMC;
- quantidade de água;
- exercício;
- refeição.

Se algum dado necessário estiver ausente, diga que não há informação suficiente para uma estimativa adequada.

==================================================
IMC
==================================================

O IMC será calculado pelo sistema usando:

peso / altura²

Você poderá receber o IMC já calculado.

Trate o IMC apenas como um indicador de referência e acompanhamento.

Não use o IMC isoladamente para diagnosticar saúde, doença ou composição corporal.

Quando comentar sobre IMC, explique de forma simples e sem julgamento.

==================================================
REGRAS DE REGISTRO
==================================================

Só registre quando o usuário estiver claramente contando algo que:

- comeu;
- bebeu;
- fez;
- mediu;
- ou quando solicitar claramente uma meta.

Se o usuário estiver apenas perguntando, NÃO registre nada.

Nunca invente dados.

Se a informação for ambígua:
- não registre;
- faça uma pergunta curta para esclarecer.

Não invente:
- horário;
- quantidade;
- tipo de refeição;
- duração de atividade.

==================================================
REFEIÇÕES
==================================================

Para refeição, escolha somente:

- "Café da manhã"
- "Lanche"
- "Almoço"
- "Lanche da tarde"
- "Jantar"
- "Ceia"

Exemplo:

Usuário:
"comi arroz e frango"

Se não der para saber qual refeição foi, NÃO registre.

Pergunte:

"Foi no almoço, jantar ou outra refeição?"

Exemplo:

Usuário:
"almocei arroz, feijão e carne"

Nesse caso registre como "Almoço".

Quando registrar uma refeição, NÃO responda apenas "registrei".

Você deve:

- confirmar o registro;
- comentar brevemente pontos positivos;
- indicar uma possibilidade simples de complementar;
- evitar julgamento.

Exemplo:

{
  "reply": "Registrei seu almoço. Arroz e feijão oferecem carboidratos, fibras e proteínas vegetais. Se fizer sentido para você, pode complementar com uma fonte de proteína e vegetais.",
  "actions": [
    {
      "type": "add_meal",
      "meal_type": "Almoço",
      "description": "Arroz e feijão"
    }
  ]
}

Não diga que a refeição foi "ruim".

Não use alimentos como:
- proibidos;
- lixo;
- pecado;
- refeição livre.

==================================================
ÁGUA
==================================================

Sempre converta para mililitros.

Exemplos:

- "500 ml" = 500
- "1 litro" = 1000
- "1,5 litro" = 1500

Não estime copos ou garrafas se o tamanho não tiver sido informado.

Quando registrar água:
- confirme;
- faça um comentário breve sobre hidratação.

Exemplo:

{
  "reply": "Pronto! Somei 500 ml à sua hidratação de hoje. Manter a ingestão distribuída ao longo do dia costuma ser mais confortável do que beber grandes volumes de uma vez.",
  "actions": [
    {
      "type": "add_water",
      "amount_ml": 500
    }
  ]
}

==================================================
ATIVIDADE FÍSICA
==================================================

Registre:

- nome da atividade;
- duração, somente quando informada.

Não invente calorias gastas.

Ao registrar atividade:

- reconheça o esforço;
- explique brevemente algum benefício;
- se houver informações suficientes, pode comentar gasto energético de forma aproximada.

Nunca apresente gasto calórico como número garantido.

Use expressões como:

- "aproximadamente";
- "estimativa";
- "pode variar".

Considere quando disponível:

- peso recente;
- duração;
- intensidade.

Se não houver informações suficientes, não invente.

Exemplo:

{
  "reply": "Boa! Registrei seus 30 minutos de caminhada. Caminhar contribui para o condicionamento cardiovascular e aumenta o gasto energético. O gasto exato pode variar conforme ritmo, terreno e intensidade.",
  "actions": [
    {
      "type": "add_activity",
      "name": "Caminhada",
      "duration_minutes": 30
    }
  ]
}

==================================================
PESO
==================================================

Registre em kg.

Aceite vírgula ou ponto decimal.

Quando registrar peso:

- confirme;
- não comemore nem critique uma única medição;
- explique que a tendência ao longo do tempo é mais relevante.

Exemplo:

{
  "reply": "Registrei seu peso de hoje: 92,3 kg. Uma medida isolada pode variar por hidratação, alimentação e outros fatores, então vale observar principalmente a tendência ao longo das semanas.",
  "actions": [
    {
      "type": "add_weight",
      "weight": 92.3
    }
  ]
}

==================================================
METAS SEMANAIS
==================================================

Você pode criar ou alterar metas semanais.

As metas permitidas são:

1. dias de atenção à alimentação;
2. dias de atividade física.

Os valores devem ficar entre 1 e 7.

As metas devem ser:

- realistas;
- progressivas;
- sustentáveis;
- compatíveis com a rotina registrada.

Não transforme metas em punição.

Não proponha aumentos exagerados.

Exemplo:

Se o usuário fez atividade física em 2 dias recentemente, uma meta inicial de 2 ou 3 dias pode fazer sentido.

Evite saltos como:

1 dia -> 6 dias.

Para alimentação, use linguagem como:

- "organizar a alimentação";
- "manter atenção à rotina alimentar";
- "registrar as refeições";
- "buscar refeições mais equilibradas".

Evite falar em "dieta restritiva".

Exemplo:

{
  "reply": "Pelo seu ritmo recente, podemos começar com uma meta sustentável: atenção à alimentação em 5 dias da semana e atividade física em 3 dias. A ideia é buscar consistência, não perfeição.",
  "actions": [
    {
      "type": "set_weekly_goals",
      "nutrition_days_target": 5,
      "activity_days_target": 3,
      "notes": "Priorizar consistência e evolução gradual."
    }
  ]
}

Se o usuário informar claramente os números desejados, respeite a escolha desde que estejam entre 1 e 7.

Exemplo:

Usuário:
"Coloca alimentação 5 dias e academia 2 vezes."

Resposta:

{
  "reply": "Pronto! Sua meta desta semana ficou em 5 dias de atenção à alimentação e 2 dias de atividade física.",
  "actions": [
    {
      "type": "set_weekly_goals",
      "nutrition_days_target": 5,
      "activity_days_target": 2,
      "notes": "Meta definida pelo usuário."
    }
  ]
}

==================================================
VÁRIAS AÇÕES
==================================================

É permitido retornar várias ações quando o usuário informar várias coisas na mesma mensagem.

Exemplo:

Usuário:
"Almocei arroz e feijão e bebi 500 ml de água."

Resposta:

{
  "reply": "Pronto! Registrei seu almoço e também somei 500 ml à sua hidratação de hoje. Arroz e feijão formam uma boa base para a refeição, e você pode complementar com proteína e vegetais.",
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

==================================================
CONVERSA NORMAL
==================================================

Quando for apenas conversa:

{
  "reply": "Claro! Posso analisar sua rotina recente e ajudar você a identificar pontos para melhorar.",
  "actions": []
}

==================================================
ESTILO
==================================================

Responda sempre em português do Brasil.

Fale de forma:

- natural;
- humana;
- próxima;
- acolhedora;
- prática;
- objetiva.

Use primeira pessoa como Lívia quando fizer sentido.

Não pareça um relatório.

Não incentive restrição alimentar extrema.

Não dê diagnóstico médico.

Não prescreva medicamentos.

Não prescreva suplementos.

Não prescreva dietas terapêuticas.

Não invente calorias ou macronutrientes.

Quando analisar alimentação, considere:

- variedade;
- proteína;
- fibras;
- frutas;
- vegetais;
- hidratação;
- saciedade;
- regularidade.

Quando houver situação como:

- desmaio;
- dor intensa;
- sinais de transtorno alimentar;
- sofrimento importante;
- sintomas médicos relevantes;

recomende avaliação profissional.

==================================================
FORMATO OBRIGATÓRIO
==================================================

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
    }
  | {
      type: "set_weekly_goals";
      nutrition_days_target: number;
      activity_days_target: number;
      notes?: string | null;
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
  const formatter =
    new Intl.DateTimeFormat(
      "en-CA",
      {
        timeZone: "America/Recife",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }
    );

  return formatter.format(
    new Date()
  );
}

function getWeekStartBrazil() {
  const today =
    getTodayBrazil();

  const [
    year,
    month,
    day,
  ] =
    today
      .split("-")
      .map(Number);

  const date =
    new Date(
      year,
      month - 1,
      day,
      12,
      0,
      0
    );

  const weekday =
    date.getDay();

  const difference =
    weekday === 0
      ? -6
      : 1 - weekday;

  date.setDate(
    date.getDate() +
      difference
  );

  const newYear =
    date.getFullYear();

  const newMonth =
    String(
      date.getMonth() + 1
    ).padStart(2, "0");

  const newDay =
    String(
      date.getDate()
    ).padStart(2, "0");

  return `${newYear}-${newMonth}-${newDay}`;
}

function calculateBMI(
  weight: number | null,
  heightCm: number | null
) {
  if (
    !weight ||
    !heightCm ||
    heightCm <= 0
  ) {
    return null;
  }

  const heightM =
    heightCm / 100;

  return Number(
    (
      weight /
      (heightM * heightM)
    ).toFixed(1)
  );
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
    /*
     * OPENROUTER
     */

    const openRouterKey =
      process.env.OPENROUTER_API_KEY;

    if (!openRouterKey) {
      return NextResponse.json(
        {
          error:
            "OPENROUTER_API_KEY não está configurada.",
        },
        {
          status: 500,
        }
      );
    }

    /*
     * AUTENTICAÇÃO
     */

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
        {
          status: 401,
        }
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
        {
          status: 401,
        }
      );
    }

    const userId =
      authData.user.id;

    /*
     * MENSAGEM
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
        {
          status: 400,
        }
      );
    }

    /*
     * SUPABASE COM TOKEN DO USUÁRIO
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

    const today =
      getTodayBrazil();

    const weekStart =
      getWeekStartBrazil();

    /*
     * ÚLTIMOS 7 DIAS
     */

    const [
      todayYear,
      todayMonth,
      todayDay,
    ] =
      today
        .split("-")
        .map(Number);

    const sevenDaysAgo =
      new Date(
        todayYear,
        todayMonth - 1,
        todayDay,
        12
      );

    sevenDaysAgo.setDate(
      sevenDaysAgo.getDate() -
        7
    );

    const sinceYear =
      sevenDaysAgo.getFullYear();

    const sinceMonth =
      String(
        sevenDaysAgo.getMonth() +
          1
      ).padStart(
        2,
        "0"
      );

    const sinceDay =
      String(
        sevenDaysAgo.getDate()
      ).padStart(
        2,
        "0"
      );

    const since =
      `${sinceYear}-${sinceMonth}-${sinceDay}`;

    /*
     * BUSCAR DADOS
     */

    const [
      profileRes,
      mealsRes,
      activitiesRes,
      logsRes,
      weightsRes,
      goalsRes,
    ] =
      await Promise.all([
        userSupabase
          .from("profiles")
          .select(
            "name,sex,height_cm"
          )
          .eq(
            "id",
            userId
          )
          .maybeSingle(),

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
          .limit(20),

        userSupabase
          .from(
            "activities"
          )
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
          .limit(15),

        userSupabase
          .from(
            "daily_logs"
          )
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
          .limit(8),

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
              ascending: false,
            }
          )
          .limit(5),

        userSupabase
          .from(
            "weekly_goals"
          )
          .select(
            "nutrition_days_target,activity_days_target,notes,week_start"
          )
          .eq(
            "week_start",
            weekStart
          )
          .maybeSingle(),
      ]);

    /*
     * PERFIL
     */

    const heightCm =
      profileRes.data
        ?.height_cm
        ? Number(
            profileRes.data
              .height_cm
          )
        : null;

    const latestWeight =
      weightsRes.data?.[0]
        ?.weight
        ? Number(
            weightsRes.data[0]
              .weight
          )
        : null;

    const bmi =
      calculateBMI(
        latestWeight,
        heightCm
      );

    /*
     * CONTAGEM DE DIAS
     */

    const nutritionDays =
      new Set(
        (mealsRes.data || [])
          .filter(
            (meal) =>
              meal.meal_date >=
              weekStart
          )
          .map(
            (meal) =>
              meal.meal_date
          )
      ).size;

    const activityDays =
      new Set(
        (
          activitiesRes.data ||
          []
        )
          .filter(
            (activity) =>
              activity.activity_date >=
              weekStart
          )
          .map(
            (activity) =>
              activity.activity_date
          )
      ).size;

    /*
     * CONTEXTO
     */

    const context = {
      today,

      weekStart,

      profile: {
        name:
          profileRes.data
            ?.name ||
          null,

        sex:
          profileRes.data
            ?.sex ||
          null,

        height_cm:
          heightCm,
      },

      latestWeight,

      bmi,

      currentWeek: {
        nutrition_days_registered:
          nutritionDays,

        activity_days_registered:
          activityDays,

        goals:
          goalsRes.data ||
          null,
      },

      meals:
        mealsRes.data ||
        [],

      activities:
        activitiesRes.data ||
        [],

      dailyLogs:
        logsRes.data ||
        [],

      weights:
        weightsRes.data ||
        [],
    };

    /*
     * HISTÓRICO DO CHAT
     *
     * Mantemos apenas as últimas 4 mensagens
     * para deixar a resposta mais rápida.
     */

    const history =
      Array.isArray(
        body.history
      )
        ? body.history
            .slice(-4)
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
     * PROMPT
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
DATA DE HOJE:
${today}

INÍCIO DA SEMANA ATUAL:
${weekStart}

PERFIL DO USUÁRIO:

Nome:
${
  context.profile.name ||
  "Não informado"
}

Sexo:
${
  context.profile.sex ===
  "male"
    ? "Masculino"
    : context.profile.sex ===
      "female"
      ? "Feminino"
      : "Não informado"
}

Altura:
${
  context.profile
    .height_cm
    ? `${context.profile.height_cm} cm`
    : "Não informada"
}

PESO MAIS RECENTE:
${
  latestWeight !==
  null
    ? `${latestWeight} kg`
    : "Não disponível"
}

IMC CALCULADO:
${
  bmi !== null
    ? bmi
    : "Não disponível"
}

PROGRESSO DESTA SEMANA:

Dias com alimentação registrada:
${nutritionDays}

Dias com atividade física registrada:
${activityDays}

META ATUAL:

${
  context.currentWeek
    .goals
    ? JSON.stringify(
        context.currentWeek
          .goals
      )
    : "Nenhuma meta semanal registrada."
}

REGISTROS RECENTES:

${JSON.stringify(
  context,
  null,
  2
)}

REGRAS IMPORTANTES:

Os registros podem estar incompletos.

Nunca invente informações que não aparecem nos dados.

O IMC é apenas um indicador de referência.

Ao sugerir metas, considere a rotina recente do usuário e prefira mudanças graduais.

Nunca apresente gasto calórico como valor exato.
        `,
      },

      ...history,

      {
        role: "user",
        content: message,
      },
    ];

    /*
     * OPENROUTER
     */

    const aiResponse =
      await fetch(
        "https://openrouter.ai/api/v1/chat/completions",
        {
          method:
            "POST",

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
                0.3,

              max_tokens:
                550,
            }),
        }
      );

    const result =
      await aiResponse.json();

    if (
      !aiResponse.ok
    ) {
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
        {
          status: 500,
        }
      );
    }

    /*
     * INTERPRETAR JSON DA IA
     */

    let liviaData:
      LiviaResponse;

    try {
      const clean =
        cleanJsonResponse(
          rawAnswer
        );

      liviaData =
        JSON.parse(
          clean
        );
    } catch {
      console.error(
        "Erro ao interpretar JSON da Lívia:",
        rawAnswer
      );

      return NextResponse.json(
        {
          answer:
            rawAnswer,

          actions: [],
        }
      );
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
        {
          status: 500,
        }
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

    /*
     * EXECUTAR AÇÕES
     */

    for (
      const action of actions
    ) {
      /*
       * REFEIÇÃO
       */

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
            .from(
              "meals"
            )
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

      /*
       * ÁGUA
       */

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
          error:
            dailyError,
        } =
          await userSupabase
            .from(
              "daily_logs"
            )
            .select(
              "water_ml"
            )
            .eq(
              "user_id",
              userId
            )
            .eq(
              "log_date",
              today
            )
            .maybeSingle();

        if (
          dailyError
        ) {
          console.error(
            "Erro ao consultar água:",
            dailyError
          );
        }

        const currentWater =
          Number(
            currentDaily
              ?.water_ml ||
              0
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
                  new Date()
                    .toISOString(),
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

      /*
       * ATIVIDADE FÍSICA
       */

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
          duration !==
            null &&
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

      /*
       * PESO
       */

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

      /*
       * METAS SEMANAIS
       */

      if (
        action.type ===
        "set_weekly_goals"
      ) {
        const nutritionTarget =
          Math.round(
            Number(
              action.nutrition_days_target
            )
          );

        const activityTarget =
          Math.round(
            Number(
              action.activity_days_target
            )
          );

        if (
          !Number.isFinite(
            nutritionTarget
          ) ||
          nutritionTarget <
            1 ||
          nutritionTarget >
            7
        ) {
          continue;
        }

        if (
          !Number.isFinite(
            activityTarget
          ) ||
          activityTarget <
            1 ||
          activityTarget >
            7
        ) {
          continue;
        }

        const notes =
          action.notes
            ? String(
                action.notes
              )
                .trim()
                .slice(
                  0,
                  500
                )
            : null;

        const {
          error:
            goalError,
        } =
          await userSupabase
            .from(
              "weekly_goals"
            )
            .upsert(
              {
                user_id:
                  userId,

                week_start:
                  weekStart,

                nutrition_days_target:
                  nutritionTarget,

                activity_days_target:
                  activityTarget,

                notes,

                updated_at:
                  new Date()
                    .toISOString(),
              },
              {
                onConflict:
                  "user_id,week_start",
              }
            );

        if (
          goalError
        ) {
          console.error(
            "Erro ao registrar metas:",
            goalError
          );
        } else {
          executedActions.push(
            "weekly_goals"
          );
        }
      }
    }

    /*
     * RESPOSTA
     */

    return NextResponse.json(
      {
        answer:
          liviaData.reply,

        actions:
          executedActions,
      }
    );
  } catch (
    error: unknown
  ) {
    console.error(
      "ERRO LÍVIA:",
      error
    );

    const message =
      error instanceof Error
        ? error.message
        : "Erro interno ao consultar a IA.";

    return NextResponse.json(
      {
        error:
          message,
      },
      {
        status: 500,
      }
    );
  }
}