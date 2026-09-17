import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

/* =========================================================
   PROMPT DA LÍVIA
========================================================= */

const SYSTEM_INSTRUCTION = `
Você é Lívia, a assistente virtual do Levia.

Fale sempre em português do Brasil, de forma natural, acolhedora, prática e objetiva.

Você pode registrar:
- refeições;
- água;
- atividade física;
- peso;
- metas semanais.

==================================================
REFEIÇÕES
==================================================

Quando o usuário informar uma refeição claramente, use:

add_meal

Os tipos permitidos são:

- Café da manhã
- Lanche
- Almoço
- Lanche da tarde
- Jantar
- Ceia

Além da descrição, separe os alimentos em food_items.

Cada alimento deve ter:

{
  "food": "nome simples do alimento",
  "quantity": número ou null,
  "unit": "unidade, fatia, colher, concha, grama etc." ou null,
  "portion": descrição aproximada ou null,
  "preparation": modo de preparo ou null
}

EXEMPLO COM QUANTIDADES:

Usuário:
"Faça um registro de café da manhã de 2 ovos mexidos com 2 pães integrais."

Resposta:

{
  "reply": "Entendi seu café da manhã.",
  "actions": [
    {
      "type": "add_meal",
      "meal_type": "Café da manhã",
      "description": "2 ovos mexidos com 2 pães integrais",
      "food_items": [
        {
          "food": "ovo",
          "quantity": 2,
          "unit": "unidade",
          "portion": null,
          "preparation": "mexido"
        },
        {
          "food": "pão integral",
          "quantity": 2,
          "unit": "unidade",
          "portion": null,
          "preparation": null
        }
      ]
    }
  ]
}

EXEMPLO SEM QUANTIDADES:

Usuário:
"Comi pão com ovo no café da manhã."

Resposta:

{
  "reply": "Entendi seu café da manhã.",
  "actions": [
    {
      "type": "add_meal",
      "meal_type": "Café da manhã",
      "description": "Pão com ovo",
      "food_items": [
        {
          "food": "pão",
          "quantity": null,
          "unit": null,
          "portion": null,
          "preparation": null
        },
        {
          "food": "ovo",
          "quantity": null,
          "unit": null,
          "portion": null,
          "preparation": null
        }
      ]
    }
  ]
}

NÃO invente quantidade.

Se o usuário não informou quantidade suficiente, o backend registrará a refeição e perguntará a quantidade.

==================================================
COMPLETAR ÚLTIMA REFEIÇÃO
==================================================

Se a Lívia acabou de perguntar quantidades para uma refeição já registrada e o usuário responder apenas com essas quantidades, NÃO use add_meal novamente.

Use:

complete_last_meal

Exemplo:

Lívia:
"Registrei seu café da manhã. Para estimar melhor as calorias, quantos ovos e quantos pães você comeu?"

Usuário:
"2 ovos e 1 pão."

Resposta:

{
  "reply": "Perfeito, agora consigo estimar melhor.",
  "actions": [
    {
      "type": "complete_last_meal",
      "food_items": [
        {
          "food": "ovo",
          "quantity": 2,
          "unit": "unidade",
          "portion": null,
          "preparation": null
        },
        {
          "food": "pão",
          "quantity": 1,
          "unit": "unidade",
          "portion": null,
          "preparation": null
        }
      ]
    }
  ]
}

==================================================
PORÇÕES
==================================================

Preserve quantidades informadas.

Exemplos:

"2 ovos"
quantity = 2
unit = "unidade"

"1 pão francês"
quantity = 1
unit = "unidade"

"2 fatias de pão integral"
quantity = 2
unit = "fatia"

"3 colheres de arroz"
quantity = 3
unit = "colher"

"1 concha de feijão"
quantity = 1
unit = "concha"

"150 g de frango"
quantity = 150
unit = "g"

"uma banana"
quantity = 1
unit = "unidade"

"um prato pequeno de cuscuz"
quantity = null
unit = null
portion = "porção pequena"

Não invente gramas.

==================================================
CALORIAS
==================================================

Você NÃO calcula calorias.

Você NÃO inventa:
- calorias;
- proteína;
- carboidratos;
- gordura;
- fibras.

O backend consulta uma base nutricional TACO e faz os cálculos.

==================================================
ÁGUA
==================================================

Exemplo:

{
  "reply": "Entendi.",
  "actions": [
    {
      "type": "add_water",
      "amount_ml": 500
    }
  ]
}

Converta litros para ml.

==================================================
ATIVIDADE
==================================================

{
  "reply": "Entendi.",
  "actions": [
    {
      "type": "add_activity",
      "name": "Caminhada",
      "duration_minutes": 30
    }
  ]
}

Não invente duração.

==================================================
PESO
==================================================

{
  "reply": "Entendi.",
  "actions": [
    {
      "type": "add_weight",
      "weight": 91.8
    }
  ]
}

==================================================
METAS
==================================================

{
  "reply": "Entendi.",
  "actions": [
    {
      "type": "set_weekly_goals",
      "nutrition_days_target": 5,
      "activity_days_target": 3,
      "notes": "Priorizar consistência."
    }
  ]
}

Valores entre 1 e 7.

==================================================
REGRAS
==================================================

Nunca diga que algo já foi salvo.

O backend fará a confirmação final.

Nunca exponha raciocínio interno.

Nunca use markdown.

Nunca escreva fora do JSON.

FORMATO:

{
  "reply": "texto",
  "actions": []
}
`;

/* =========================================================
   TIPOS
========================================================= */

type FoodItem = {
  food: string;
  quantity?: number | null;
  unit?: string | null;
  portion?: string | null;
  preparation?: string | null;
};

type LiviaAction =
  | {
      type: "add_meal";
      meal_type: string;
      description: string;
      food_items?: FoodItem[];
    }
  | {
      type: "complete_last_meal";
      food_items: FoodItem[];
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

type FoodRecord = {
  id: string;
  name: string;
  normalized_name: string;
  kcal_100g: number | string | null;
  protein_100g: number | string | null;
  carbs_100g: number | string | null;
  fat_100g: number | string | null;
  fiber_100g: number | string | null;
  source: string;
};

type ResolvedPortion = {
  label: string;
  grams_min: number;
  grams_max: number;
  estimated: boolean;
};

const VALID_MEAL_TYPES = [
  "Café da manhã",
  "Lanche",
  "Almoço",
  "Lanche da tarde",
  "Jantar",
  "Ceia",
];

/* =========================================================
   SUPABASE
========================================================= */

function getSupabase() {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL;

  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key) {
    throw new Error(
      "Configuração do Supabase ausente."
    );
  }

  return createClient(url, key);
}

/* =========================================================
   DATA
========================================================= */

function getTodayBrazil() {
  return new Intl.DateTimeFormat(
    "en-CA",
    {
      timeZone: "America/Recife",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }
  ).format(new Date());
}

function getWeekStartBrazil() {
  const today =
    getTodayBrazil();

  const [year, month, day] =
    today
      .split("-")
      .map(Number);

  const date =
    new Date(
      year,
      month - 1,
      day,
      12
    );

  const weekday =
    date.getDay();

  const diff =
    weekday === 0
      ? -6
      : 1 - weekday;

  date.setDate(
    date.getDate() +
      diff
  );

  return [
    date.getFullYear(),
    String(
      date.getMonth() + 1
    ).padStart(2, "0"),
    String(
      date.getDate()
    ).padStart(2, "0"),
  ].join("-");
}

/* =========================================================
   NORMALIZAÇÃO
========================================================= */

function normalizeText(
  value: string
) {
  return String(
    value || ""
  )
    .normalize("NFD")
    .replace(
      /[\u0300-\u036f]/g,
      ""
    )
    .replace(
      /[^a-zA-Z0-9\s]/g,
      " "
    )
    .replace(
      /\s+/g,
      " "
    )
    .toLowerCase()
    .trim();
}

function cleanJsonResponse(text: string) {
  let cleaned = String(text || "").trim();

  cleaned = cleaned
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/, "")
    .replace(/\s*```$/, "")
    .trim();

  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");

  if (
    firstBrace !== -1 &&
    lastBrace !== -1 &&
    lastBrace > firstBrace
  ) {
    cleaned = cleaned.slice(
      firstBrace,
      lastBrace + 1
    );
  }

  return cleaned;
}
function unwrapLiviaResponse(
  parsed: any
): LiviaResponse {
  let reply =
    typeof parsed?.reply === "string"
      ? parsed.reply.trim()
      : "";

  let actions =
    Array.isArray(parsed?.actions)
      ? parsed.actions
      : [];

  /*
   * Às vezes o modelo coloca outro JSON
   * dentro do campo reply.
   *
   * Exemplo:
   * {
   *   "reply": "{\"reply\":\"texto\",\"actions\":[...]}"
   * }
   */
  if (
    reply.startsWith("{") &&
    reply.endsWith("}")
  ) {
    try {
      const nested =
        JSON.parse(
          cleanJsonResponse(reply)
        );

      if (
        typeof nested?.reply === "string"
      ) {
        reply =
          nested.reply.trim();
      }

      if (
        Array.isArray(nested?.actions) &&
        nested.actions.length > 0
      ) {
        actions =
          nested.actions;
      }
    } catch {
      // mantém a resposta original
    }
  }

  return {
    reply,
    actions,
  };
}

/* =========================================================
   BUSCA DE ALIMENTO
========================================================= */

function foodScore(
  food: FoodRecord,
  search: string
) {
  const name =
    normalizeText(
      food.normalized_name ||
        food.name
    );

  let score =
    0;

  if (
    name === search
  ) {
    score +=
      100;
  }

  if (
    name.startsWith(
      search
    )
  ) {
    score +=
      60;
  }

  if (
    name.includes(
      search
    )
  ) {
    score +=
      40;
  }

  const words =
    search
      .split(" ")
      .filter(
        (word) =>
          word.length >= 3
      );

  for (
    const word of words
  ) {
    if (
      name.includes(
        word
      )
    ) {
      score +=
        10;
    }
  }

  if (
    name.includes(
      "cozido"
    )
  ) {
    score +=
      4;
  }

  if (
    name.includes(
      "cru"
    )
  ) {
    score -=
      3;
  }

  return score;
}

async function findFood(
  db: ReturnType<typeof createClient>,
  foodName: string
): Promise<FoodRecord | null> {
  let normalized =
    normalizeText(
      foodName
    );

  const replacements: Record<
    string,
    string
  > = {
    toscana:
      "linguica",

    "linguica toscana":
      "linguica",

    "pao de forma integral":
      "pao integral",

    "pao integral":
      "pao integral",

    "ovo mexido":
      "ovo",
  };

  if (
    replacements[
      normalized
    ]
  ) {
    normalized =
      replacements[
        normalized
      ];
  }

  /* alias */

  const aliasRes =
    await db
      .from(
        "food_aliases"
      )
      .select(`
        foods (
          id,
          name,
          normalized_name,
          kcal_100g,
          protein_100g,
          carbs_100g,
          fat_100g,
          fiber_100g,
          source
        )
      `)
      .eq(
        "normalized_alias",
        normalized
      )
      .limit(1);

  if (
    aliasRes.data?.length
  ) {
    const relation =
      (aliasRes.data[0] as any)
        .foods;

    const food =
      Array.isArray(
        relation
      )
        ? relation[0]
        : relation;

    if (food) {
      return food;
    }
  }

  /* exato */

  const exact =
    await db
      .from("foods")
      .select("*")
      .eq(
        "normalized_name",
        normalized
      )
      .limit(1);

  if (
    exact.data?.length
  ) {
    return exact
      .data[0] as FoodRecord;
  }

  /* contendo */

  const contains =
    await db
      .from("foods")
      .select("*")
      .ilike(
        "normalized_name",
        `%${normalized}%`
      )
      .limit(30);

  if (
    contains.data?.length
  ) {
    return (
      contains.data as FoodRecord[]
    )
      .map(
        (food) => ({
          food,
          score:
            foodScore(
              food,
              normalized
            ),
        })
      )
      .sort(
        (a, b) =>
          b.score -
          a.score
      )[0].food;
  }

  /* palavras */

  const words =
    normalized
      .split(" ")
      .filter(
        (word) =>
          word.length >= 3
      );

  if (!words.length) {
    return null;
  }

  let query =
    db
      .from("foods")
      .select("*");

  for (
    const word of words
  ) {
    query =
      query.ilike(
        "normalized_name",
        `%${word}%`
      );
  }

  const result =
    await query.limit(
      30
    );

  if (
    !result.data
      ?.length
  ) {
    return null;
  }

  return (
    result.data as FoodRecord[]
  )
    .map(
      (food) => ({
        food,
        score:
          foodScore(
            food,
            normalized
          ),
      })
    )
    .sort(
      (a, b) =>
        b.score -
        a.score
    )[0].food;
}

/* =========================================================
   UNIDADES E PESOS MÉDIOS
========================================================= */

function normalizeUnit(
  unit?: string | null
) {
  const value =
    normalizeText(
      unit || ""
    );

  if (
    [
      "g",
      "grama",
      "gramas",
    ].includes(value)
  ) {
    return "g";
  }

  if (
    value.includes(
      "fatia"
    )
  ) {
    return "fatia";
  }

  if (
    value.includes(
      "colher"
    )
  ) {
    return "colher";
  }

  if (
    value.includes(
      "concha"
    )
  ) {
    return "concha";
  }

  if (
    value.includes(
      "xicara"
    )
  ) {
    return "xicara";
  }

  if (
    value.includes(
      "unidade"
    ) ||
    value ===
      "un" ||
    value ===
      "unidades"
  ) {
    return "unidade";
  }

  return value;
}

/*
 * Faixas de peso usadas apenas para
 * transformar medidas caseiras informadas
 * pelo usuário em gramas aproximadas.
 *
 * O valor nutricional continua vindo da TACO.
 */

function commonUnitWeight(
  foodName: string,
  unit: string
): {
  min: number;
  max: number;
} | null {
  const food =
    normalizeText(
      foodName
    );

  if (
    unit ===
    "unidade"
  ) {
    if (
      food.includes(
        "ovo"
      )
    ) {
      return {
        min: 45,
        max: 60,
      };
    }

    if (
      food.includes(
        "pao frances"
      )
    ) {
      return {
        min: 45,
        max: 55,
      };
    }

    if (
      food.includes(
        "pao integral"
      ) ||
      food ===
        "pao"
    ) {
      return {
        min: 40,
        max: 60,
      };
    }

    if (
      food.includes(
        "banana"
      )
    ) {
      return {
        min: 70,
        max: 120,
      };
    }

    if (
      food.includes(
        "maca"
      )
    ) {
      return {
        min: 100,
        max: 160,
      };
    }
  }

  if (
    unit ===
    "fatia"
  ) {
    if (
      food.includes(
        "pao"
      )
    ) {
      return {
        min: 20,
        max: 30,
      };
    }

    if (
      food.includes(
        "queijo"
      )
    ) {
      return {
        min: 20,
        max: 30,
      };
    }
  }

  if (
    unit ===
    "colher"
  ) {
    if (
      food.includes(
        "arroz"
      )
    ) {
      return {
        min: 20,
        max: 30,
      };
    }

    if (
      food.includes(
        "feijao"
      )
    ) {
      return {
        min: 20,
        max: 35,
      };
    }

    if (
      food.includes(
        "cuscuz"
      )
    ) {
      return {
        min: 20,
        max: 30,
      };
    }
  }

  if (
    unit ===
    "concha"
  ) {
    if (
      food.includes(
        "feijao"
      )
    ) {
      return {
        min: 80,
        max: 120,
      };
    }
  }

  return null;
}

/* =========================================================
   RESOLVER PORÇÃO
========================================================= */

async function resolvePortion(
  db: ReturnType<typeof createClient>,
  food: FoodRecord,
  item: FoodItem
): Promise<ResolvedPortion | null> {
  const quantity =
    item.quantity ===
      null ||
    item.quantity ===
      undefined
      ? null
      : Number(
          item.quantity
        );

  const unit =
    normalizeUnit(
      item.unit
    );

  /*
   * Gramas exatas
   */
  if (
    quantity !== null &&
    Number.isFinite(
      quantity
    ) &&
    quantity > 0 &&
    unit === "g"
  ) {
    return {
      label:
        `${quantity} g`,

      grams_min:
        quantity,

      grams_max:
        quantity,

      estimated:
        false,
    };
  }

  /*
   * Primeiro procura uma medida
   * cadastrada no Supabase.
   */
  if (
    quantity !== null &&
    Number.isFinite(
      quantity
    ) &&
    quantity > 0 &&
    unit
  ) {
    const portions =
      await db
        .from(
          "food_portions"
        )
        .select("*")
        .eq(
          "food_id",
          food.id
        );

    if (
      portions.data
        ?.length
    ) {
      const found =
        portions.data.find(
          (
            row: any
          ) => {
            const label =
              normalizeText(
                row.label
              );

            return (
              label.includes(
                unit
              ) ||
              unit.includes(
                label
              )
            );
          }
        );

      if (found) {
        const min =
          Number(
            found.grams_min ||
              found.grams_default
          );

        const max =
          Number(
            found.grams_max ||
              found.grams_default
          );

        if (
          min > 0 &&
          max > 0
        ) {
          return {
            label:
              `${quantity} ${unit}`,

            grams_min:
              min *
              quantity,

            grams_max:
              max *
              quantity,

            estimated:
              false,
          };
        }
      }
    }

    /*
     * Fallback com pesos médios
     * de medidas caseiras.
     */
    const average =
      commonUnitWeight(
        item.food,
        unit
      );

    if (average) {
      return {
        label:
          `${quantity} ${unit}`,

        grams_min:
          average.min *
          quantity,

        grams_max:
          average.max *
          quantity,

        estimated:
          true,
      };
    }
  }

  /*
   * Porção pequena/média/grande
   */
  const portion =
    normalizeText(
      item.portion ||
        ""
    );

  if (
    portion.includes(
      "pequena"
    ) ||
    portion.includes(
      "pequeno"
    )
  ) {
    return {
      label:
        "porção pequena",

      grams_min:
        80,

      grams_max:
        120,

      estimated:
        true,
    };
  }

  if (
    portion.includes(
      "media"
    ) ||
    portion.includes(
      "medio"
    )
  ) {
    return {
      label:
        "porção média",

      grams_min:
        120,

      grams_max:
        180,

      estimated:
        true,
    };
  }

  if (
    portion.includes(
      "grande"
    )
  ) {
    return {
      label:
        "porção grande",

      grams_min:
        180,

      grams_max:
        250,

      estimated:
        true,
    };
  }

  return null;
}

/* =========================================================
   ESTIMATIVA NUTRICIONAL
========================================================= */

async function estimateMealNutrition(
  db: ReturnType<typeof createClient>,
  foodItems: FoodItem[]
) {
  let kcalMin =
    0;

  let kcalMax =
    0;

  let proteinMin =
    0;

  let proteinMax =
    0;

  let carbsMin =
    0;

  let carbsMax =
    0;

  let fatMin =
    0;

  let fatMax =
    0;

  let fiberMin =
    0;

  let fiberMax =
    0;

  let estimatedCount =
    0;

  const breakdown:
    any[] = [];

  const missing:
    string[] = [];

  for (
    const item of foodItems
  ) {
    const food =
      await findFood(
        db,
        item.food
      );

    if (!food) {
      missing.push(
        item.food
      );

      breakdown.push({
        food:
          item.food,
        found:
          false,
      });

      continue;
    }

    const portion =
      await resolvePortion(
        db,
        food,
        item
      );

    if (!portion) {
      missing.push(
        item.food
      );

      breakdown.push({
        requested_food:
          item.food,

        food:
          food.name,

        found:
          true,

        portion_found:
          false,

        source:
          food.source,
      });

      continue;
    }

    if (
      portion.estimated
    ) {
      estimatedCount++;
    }

    const kcal100 =
      Number(
        food.kcal_100g
      );

    if (
      !Number.isFinite(
        kcal100
      )
    ) {
      missing.push(
        item.food
      );

      continue;
    }

    const protein100 =
      Number(
        food.protein_100g ||
          0
      );

    const carbs100 =
      Number(
        food.carbs_100g ||
          0
      );

    const fat100 =
      Number(
        food.fat_100g ||
          0
      );

    const fiber100 =
      Number(
        food.fiber_100g ||
          0
      );

    const minFactor =
      portion.grams_min /
      100;

    const maxFactor =
      portion.grams_max /
      100;

    const itemKcalMin =
      kcal100 *
      minFactor;

    const itemKcalMax =
      kcal100 *
      maxFactor;

    kcalMin +=
      itemKcalMin;

    kcalMax +=
      itemKcalMax;

    proteinMin +=
      protein100 *
      minFactor;

    proteinMax +=
      protein100 *
      maxFactor;

    carbsMin +=
      carbs100 *
      minFactor;

    carbsMax +=
      carbs100 *
      maxFactor;

    fatMin +=
      fat100 *
      minFactor;

    fatMax +=
      fat100 *
      maxFactor;

    fiberMin +=
      fiber100 *
      minFactor;

    fiberMax +=
      fiber100 *
      maxFactor;

    breakdown.push({
      requested_food:
        item.food,

      food:
        food.name,

      quantity:
        item.quantity ??
        null,

      unit:
        item.unit ??
        null,

      portion:
        portion.label,

      grams_min:
        portion.grams_min,

      grams_max:
        portion.grams_max,

      kcal_100g:
        kcal100,

      kcal_min:
        Number(
          itemKcalMin.toFixed(
            1
          )
        ),

      kcal_max:
        Number(
          itemKcalMax.toFixed(
            1
          )
        ),

      source:
        food.source,
    });
  }

  const calculated =
    breakdown.filter(
      (row) =>
        row.kcal_min !==
        undefined
    );

  if (
    calculated.length ===
    0
  ) {
    return {
      estimate:
        null,

      missing,
    };
  }

  const allCalculated =
    calculated.length ===
    foodItems.length;

  let confidence =
    "low";

  if (
    allCalculated &&
    estimatedCount ===
      0
  ) {
    confidence =
      "high";
  } else if (
    allCalculated
  ) {
    confidence =
      "moderate";
  }

  return {
    estimate: {
      kcal_min:
        Number(
          kcalMin.toFixed(
            1
          )
        ),

      kcal_max:
        Number(
          kcalMax.toFixed(
            1
          )
        ),

      protein_min:
        Number(
          proteinMin.toFixed(
            1
          )
        ),

      protein_max:
        Number(
          proteinMax.toFixed(
            1
          )
        ),

      carbs_min:
        Number(
          carbsMin.toFixed(
            1
          )
        ),

      carbs_max:
        Number(
          carbsMax.toFixed(
            1
          )
        ),

      fat_min:
        Number(
          fatMin.toFixed(
            1
          )
        ),

      fat_max:
        Number(
          fatMax.toFixed(
            1
          )
        ),

      fiber_min:
        Number(
          fiberMin.toFixed(
            1
          )
        ),

      fiber_max:
        Number(
          fiberMax.toFixed(
            1
          )
        ),

      confidence,

      breakdown,
    },

    missing,
  };
}

/* =========================================================
   ÚLTIMA REFEIÇÃO SEM ESTIMATIVA
========================================================= */

async function findLastMealWithoutEstimate(
  db: ReturnType<typeof createClient>,
  userId: string,
  today: string
) {
  const meals =
    await db
      .from("meals")
      .select(
        "id,meal_type,description,created_at"
      )
      .eq(
        "user_id",
        userId
      )
      .eq(
        "meal_date",
        today
      )
      .order(
        "created_at",
        {
          ascending:
            false,
        }
      )
      .limit(10);

  if (
    !meals.data
      ?.length
  ) {
    return null;
  }

  const estimates =
    await db
      .from(
        "meal_nutrition_estimates"
      )
      .select(
        "meal_id"
      )
      .eq(
        "user_id",
        userId
      );

  const estimatedIds =
    new Set(
      (
        estimates.data ||
        []
      )
        .map(
          (row) =>
            row.meal_id
        )
        .filter(
          Boolean
        )
    );

  return (
    meals.data.find(
      (meal) =>
        !estimatedIds.has(
          meal.id
        )
    ) ||
    null
  );
}


/* =========================================================
   COMPLEMENTO DETERMINÍSTICO DE QUANTIDADES
========================================================= */

function mergeFoodItemsWithDescription(
  foodItems: FoodItem[],
  description: string
): FoodItem[] {
  const items = Array.isArray(foodItems)
    ? foodItems.map((item) => ({ ...item }))
    : [];

  const normalizedDescription = normalizeText(description);

  function upsertQuantity(
    aliases: string[],
    food: string,
    regex: RegExp,
    unit = "unidade"
  ) {
    const match = normalizedDescription.match(regex);

    if (!match) {
      return;
    }

    const quantity = Number(
      String(match[1]).replace(",", ".")
    );

    if (
      !Number.isFinite(quantity) ||
      quantity <= 0
    ) {
      return;
    }

    const existing = items.find((item) => {
      const current = normalizeText(item.food);

      return aliases.some((alias) =>
        current.includes(alias)
      );
    });

    if (existing) {
      if (
        existing.quantity === null ||
        existing.quantity === undefined
      ) {
        existing.quantity = quantity;
      }

      if (!existing.unit) {
        existing.unit = unit;
      }

      return;
    }

    items.push({
      food,
      quantity,
      unit,
      portion: null,
      preparation: null,
    });
  }

  upsertQuantity(
    ["ovo"],
    "ovo",
    /(\d+(?:[.,]\d+)?)\s+ovos?\b/
  );

  upsertQuantity(
    ["pao integral", "pao"],
    normalizedDescription.includes("integral")
      ? "pão integral"
      : "pão",
    /(\d+(?:[.,]\d+)?)\s+pa(?:o|os|es)\b/
  );

  upsertQuantity(
    ["banana"],
    "banana",
    /(\d+(?:[.,]\d+)?)\s+bananas?\b/
  );

  upsertQuantity(
    ["maca"],
    "maçã",
    /(\d+(?:[.,]\d+)?)\s+macas?\b/
  );

  return items;
}

/* =========================================================
   TOTAL DE CALORIAS DO DIA
========================================================= */

async function getDailyCalories(
  db: ReturnType<typeof createClient>,
  userId: string,
  today: string
) {
  const result = await db
    .from("meal_nutrition_estimates")
    .select(`
      id,
      meal_id,
      kcal_min,
      kcal_max,
      created_at,
      meals!inner (
        meal_date,
        user_id
      )
    `)
    .eq("user_id", userId)
    .eq("meals.user_id", userId)
    .eq("meals.meal_date", today)
    .order("created_at", {
      ascending: false,
    });

  if (result.error) {
    console.error(
      "Erro ao consultar calorias do dia:",
      result.error
    );

    return {
      min: 0,
      max: 0,
      mealsCount: 0,
    };
  }

  const uniqueMeals = new Map<
    string,
    {
      kcal_min: number | string | null;
      kcal_max: number | string | null;
    }
  >();

  for (const row of result.data || []) {
    const key = row.meal_id || row.id;

    if (!uniqueMeals.has(key)) {
      uniqueMeals.set(key, {
        kcal_min: row.kcal_min,
        kcal_max: row.kcal_max,
      });
    }
  }

  let min = 0;
  let max = 0;

  for (const row of uniqueMeals.values()) {
    const rowMin = Number(row.kcal_min);
    const rowMax = Number(row.kcal_max);

    if (Number.isFinite(rowMin)) {
      min += rowMin;
    }

    if (Number.isFinite(rowMax)) {
      max += rowMax;
    }
  }

  return {
    min: Math.round(min),
    max: Math.round(max),
    mealsCount: uniqueMeals.size,
  };
}

/* =========================================================
   API
========================================================= */

export async function POST(
  request: NextRequest
) {
  try {
    const openRouterKey =
      process.env.OPENROUTER_API_KEY;

    if (
      !openRouterKey
    ) {
      return NextResponse.json(
        {
          error:
            "OPENROUTER_API_KEY não configurada.",
        },
        {
          status:
            500,
        }
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
        {
          status:
            401,
        }
      );
    }

    const supabase =
      getSupabase();

    const {
      data:
        authData,
      error:
        authError,
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
            "Sessão inválida.",
        },
        {
          status:
            401,
        }
      );
    }

    const userId =
      authData.user.id;

    const body =
      await request.json();

    const message =
      String(
        body.message ||
          ""
      ).trim();

    if (!message) {
      return NextResponse.json(
        {
          error:
            "Mensagem vazia.",
        },
        {
          status:
            400,
        }
      );
    }

    const db =
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

    /* CONTEXTO */

    const [
      profileRes,
      mealsRes,
      activitiesRes,
      logsRes,
      weightsRes,
      goalsRes,
      caloriesRes,
    ] =
      await Promise.all([
        db
          .from(
            "profiles"
          )
          .select(
            "name,sex,height_cm"
          )
          .eq(
            "id",
            userId
          )
          .maybeSingle(),

        db
          .from("meals")
          .select(
            "meal_type,description,meal_date"
          )
          .eq(
            "user_id",
            userId
          )
          .order(
            "meal_date",
            {
              ascending:
                false,
            }
          )
          .limit(20),

        db
          .from(
            "activities"
          )
          .select(
            "name,duration_minutes,activity_date"
          )
          .eq(
            "user_id",
            userId
          )
          .order(
            "activity_date",
            {
              ascending:
                false,
            }
          )
          .limit(15),

        db
          .from(
            "daily_logs"
          )
          .select(
            "log_date,water_ml,notes"
          )
          .eq(
            "user_id",
            userId
          )
          .order(
            "log_date",
            {
              ascending:
                false,
            }
          )
          .limit(8),

        db
          .from(
            "weight_entries"
          )
          .select(
            "weight,recorded_at"
          )
          .eq(
            "user_id",
            userId
          )
          .order(
            "recorded_at",
            {
              ascending:
                false,
            }
          )
          .limit(5),

        db
          .from(
            "weekly_goals"
          )
          .select(
            "nutrition_days_target,activity_days_target,notes"
          )
          .eq(
            "user_id",
            userId
          )
          .eq(
            "week_start",
            weekStart
          )
          .maybeSingle(),

        db
          .from("meal_nutrition_estimates")
          .select(`
            id,
            meal_id,
            kcal_min,
            kcal_max,
            created_at,
            meals!inner (
              meal_date,
              user_id
            )
          `)
          .eq(
            "user_id",
            userId
          )
          .eq(
            "meals.user_id",
            userId
          )
          .eq(
            "meals.meal_date",
            today
          )
          .order(
            "created_at",
            {
              ascending: false,
            }
          ),
      ]);

    const initialCaloriesRows =
      caloriesRes.data || [];

    const initialCaloriesByMeal =
      new Map<string, any>();

    for (
      const row of initialCaloriesRows
    ) {
      const key =
        row.meal_id ||
        row.id;

      if (
        !initialCaloriesByMeal.has(
          key
        )
      ) {
        initialCaloriesByMeal.set(
          key,
          row
        );
      }
    }

    const caloriesToday = {
      min: Math.round(
        Array.from(
          initialCaloriesByMeal.values()
        ).reduce(
          (sum, row) =>
            sum +
            (
              Number.isFinite(
                Number(row.kcal_min)
              )
                ? Number(
                    row.kcal_min
                  )
                : 0
            ),
          0
        )
      ),

      max: Math.round(
        Array.from(
          initialCaloriesByMeal.values()
        ).reduce(
          (sum, row) =>
            sum +
            (
              Number.isFinite(
                Number(row.kcal_max)
              )
                ? Number(
                    row.kcal_max
                  )
                : 0
            ),
          0
        )
      ),

      mealsCount:
        initialCaloriesByMeal.size,
    };

    const context = {
      today,
      caloriesToday,
      profile:
        profileRes.data ||
        null,
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
      goals:
        goalsRes.data ||
        null,
    };

    const normalizedMessage =
      normalizeText(message);

    const asksDailyCalories =
      (
        normalizedMessage.includes(
          "calorias hoje"
        ) ||
        normalizedMessage.includes(
          "calorias de hoje"
        ) ||
        (
          normalizedMessage.includes(
            "quantas calorias"
          ) &&
          normalizedMessage.includes(
            "hoje"
          )
        )
      );

    if (asksDailyCalories) {
      if (
        caloriesToday.mealsCount === 0
      ) {
        return NextResponse.json({
          answer:
            "Ainda não tenho uma estimativa de calorias salva para as refeições de hoje. Posso calcular quando você registrar os alimentos com as quantidades.",
          actions: [],
        });
      }

      const calorieText =
        caloriesToday.min ===
        caloriesToday.max
          ? `aproximadamente ${caloriesToday.min} kcal`
          : `aproximadamente ${caloriesToday.min}–${caloriesToday.max} kcal`;

      return NextResponse.json({
        answer:
          `Até agora, suas refeições registradas hoje somam ${calorieText}. Esse total é uma estimativa baseada nas porções registradas.`,
        actions: [],
      });
    }

    const history =
      Array.isArray(
        body.history
      )
        ? body.history
            .slice(-6)
            .map(
              (
                item: any
              ) => ({
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
        role:
          "system",

        content:
          SYSTEM_INSTRUCTION,
      },

      {
        role:
          "system",

        content: `
DATA:
${today}

REGISTROS RECENTES:
${JSON.stringify(
  context,
  null,
  2
)}

A base nutricional é TACO.

Você não calcula calorias por conta própria.

Quando o usuário perguntar pelo TOTAL DE CALORIAS DE HOJE,
use exclusivamente context.caloriesToday.
Nunca invente um total diário.

Responda somente JSON.
        `,
      },

      ...history,

      {
        role:
          "user",

        content:
          message,
      },
    ];

    /* IA */

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
      process.env.OPENROUTER_MODEL ||
      "openrouter/free",

    messages,

    temperature:
      0.1,

    max_tokens:
      900,

    response_format: {
      type: "json_object",
    },
  }),
        }
      );

    const result =
      await aiResponse.json();

    if (
      !aiResponse.ok
    ) {
      return NextResponse.json(
        {
          error:
            result?.error
              ?.message ||
            "A Lívia não conseguiu responder.",
        },
        {
          status:
            aiResponse.status,
        }
      );
    }

    const raw =
      result?.choices?.[0]
        ?.message?.content;

    if (
      !raw ||
      typeof raw !==
        "string"
    ) {
      return NextResponse.json({
        answer:
          "Não consegui processar essa mensagem.",
        actions: [],
      });
    }

    let liviaData:
      LiviaResponse;

    try {
      const parsed =
  JSON.parse(
    cleanJsonResponse(raw)
  );

liviaData =
  unwrapLiviaResponse(
    parsed
  );
    } catch {
      console.error(
        "JSON inválido:",
        raw
      );

      return NextResponse.json({
        answer:
          "Entendi sua mensagem, mas tive um problema ao processá-la. Pode enviar novamente?",
        actions: [],
      });
    }

    const executed:
      string[] = [];

    let nutritionText =
      "";

    let clarificationText =
      "";

    /* =====================================================
       AÇÕES
    ===================================================== */

    for (
      const action of
        liviaData.actions
    ) {
      /* REFEIÇÃO */

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

        const insert =
          await db
            .from("meals")
            .insert({
              user_id:
                userId,

              meal_type:
                mealType,

              description,

              meal_date:
                today,
            })
            .select(
              "id"
            )
            .single();

        if (
          insert.error ||
          !insert.data
        ) {
          console.error(
            "Erro refeição:",
            insert.error
          );

          continue;
        }

        executed.push(
          "meal"
        );

        const foodItems =
          mergeFoodItemsWithDescription(
            Array.isArray(
              action.food_items
            )
              ? action.food_items
              : [],
            description
          );

        if (
          foodItems.length
        ) {
          const result =
            await estimateMealNutrition(
              db,
              foodItems
            );

          if (
            result.estimate
          ) {
            const saveEstimate =
              await db
                .from(
                  "meal_nutrition_estimates"
                )
                .insert({
                  user_id:
                    userId,

                  meal_id:
                    insert.data.id,

                  original_text:
                    description,

                  ...result.estimate,
                });

            if (
              saveEstimate.error
            ) {
              console.error(
                "Erro ao salvar estimativa nutricional:",
                saveEstimate.error
              );

              nutritionText =
                " A refeição foi registrada, mas não consegui salvar a estimativa de calorias.";
            } else {
              executed.push(
                "nutrition"
              );

              const mealMin =
                Math.round(
                  result.estimate
                    .kcal_min
                );

              const mealMax =
                Math.round(
                  result.estimate
                    .kcal_max
                );

              nutritionText =
                mealMin ===
                mealMax
                  ? ` A estimativa dessa refeição é de aproximadamente ${mealMin} kcal.`
                  : ` A estimativa dessa refeição ficou entre aproximadamente ${mealMin} e ${mealMax} kcal.`;

              if (
                result.estimate
                  .confidence !==
                "high"
              ) {
                nutritionText +=
                  " É uma estimativa e pode variar conforme o tamanho e o preparo dos alimentos.";
              }

              const dailyCalories =
                await getDailyCalories(
                  db,
                  userId,
                  today
                );

              if (
                dailyCalories.mealsCount >
                0
              ) {
                nutritionText +=
                  dailyCalories.min ===
                  dailyCalories.max
                    ? ` Total estimado de hoje: aproximadamente ${dailyCalories.min} kcal.`
                    : ` Total estimado de hoje: aproximadamente ${dailyCalories.min}–${dailyCalories.max} kcal.`;
              }
            }
          }

          if (
            result.missing.length
          ) {
            const missing =
              result.missing.join(
                " e "
              );

            clarificationText =
              ` Para estimar melhor as calorias, preciso saber a quantidade de ${missing}.`;
          }
        }
      }

      /* COMPLETAR ÚLTIMA REFEIÇÃO */

      if (
        action.type ===
        "complete_last_meal"
      ) {
        const lastMeal =
          await findLastMealWithoutEstimate(
            db,
            userId,
            today
          );

        if (
          !lastMeal
        ) {
          clarificationText =
            " Não encontrei uma refeição recente aguardando estimativa.";
          continue;
        }

        const result =
          await estimateMealNutrition(
            db,
            action.food_items ||
              []
          );

        if (
          result.estimate
        ) {
          const save =
            await db
              .from(
                "meal_nutrition_estimates"
              )
              .insert({
                user_id:
                  userId,

                meal_id:
                  lastMeal.id,

                original_text:
                  lastMeal.description,

                ...result.estimate,
              });

          if (
            save.error
          ) {
            console.error(
              "Erro ao salvar estimativa da refeição:",
              save.error
            );

            clarificationText =
              " Consegui calcular, mas não consegui salvar a estimativa agora.";
          } else {
            executed.push(
              "nutrition"
            );

            const mealMin =
              Math.round(
                result.estimate
                  .kcal_min
              );

            const mealMax =
              Math.round(
                result.estimate
                  .kcal_max
              );

            nutritionText =
              mealMin ===
              mealMax
                ? ` Agora consigo estimar essa refeição em aproximadamente ${mealMin} kcal.`
                : ` Agora consigo estimar essa refeição entre aproximadamente ${mealMin} e ${mealMax} kcal.`;

            const dailyCalories =
              await getDailyCalories(
                db,
                userId,
                today
              );

            if (
              dailyCalories.mealsCount >
              0
            ) {
              nutritionText +=
                dailyCalories.min ===
                dailyCalories.max
                  ? ` Total estimado de hoje: aproximadamente ${dailyCalories.min} kcal.`
                  : ` Total estimado de hoje: aproximadamente ${dailyCalories.min}–${dailyCalories.max} kcal.`;
            }
          }
        }

        if (
          result.missing
            .length
        ) {
          clarificationText =
            ` Ainda preciso saber a quantidade de ${result.missing.join(
              " e "
            )}.`;
        }
      }

      /* ÁGUA */

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
          amount <= 0
        ) {
          continue;
        }

        const current =
          await db
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
            .order(
              "updated_at",
              {
                ascending:
                  false,
              }
            )
            .limit(1)
            .maybeSingle();

        const newWater =
          Number(
            current.data
              ?.water_ml ||
              0
          ) +
          amount;

        const save =
          await db
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
          !save.error
        ) {
          executed.push(
            "water"
          );
        }
      }

      /* ATIVIDADE */

      if (
        action.type ===
        "add_activity"
      ) {
        const name =
          String(
            action.name ||
              ""
          ).trim();

        if (!name) {
          continue;
        }

        const save =
          await db
            .from(
              "activities"
            )
            .insert({
              user_id:
                userId,

              name,

              duration_minutes:
                action.duration_minutes ??
                null,

              activity_date:
                today,
            });

        if (
          !save.error
        ) {
          executed.push(
            "activity"
          );
        }
      }

      /* PESO */

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
          )
        ) {
          continue;
        }

        const save =
          await db
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
          !save.error
        ) {
          executed.push(
            "weight"
          );
        }
      }

      /* METAS */

      if (
        action.type ===
        "set_weekly_goals"
      ) {
        const n =
          Number(
            action
              .nutrition_days_target
          );

        const a =
          Number(
            action
              .activity_days_target
          );

        if (
          n < 1 ||
          n > 7 ||
          a < 1 ||
          a > 7
        ) {
          continue;
        }

        const save =
          await db
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
                  n,

                activity_days_target:
                  a,

                notes:
                  action.notes ||
                  null,

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
          !save.error
        ) {
          executed.push(
            "weekly_goals"
          );
        }
      }
    }

    /* =====================================================
       RESPOSTA FINAL
    ===================================================== */

    let finalReply =
      String(
        liviaData.reply ||
          ""
      ).trim();

    if (
      executed.includes(
        "meal"
      )
    ) {
      finalReply =
        `Registrei sua refeição.${nutritionText}${clarificationText}`;
    } else if (
      executed.includes(
        "nutrition"
      )
    ) {
      finalReply =
        `Perfeito.${nutritionText}${clarificationText}`;
    } else if (
      executed.includes(
        "water"
      )
    ) {
      finalReply =
        `Registrei sua hidratação. ${finalReply}`;
    } else if (
      executed.includes(
        "activity"
      )
    ) {
      finalReply =
        `Registrei sua atividade. ${finalReply}`;
    } else if (
      executed.includes(
        "weight"
      )
    ) {
      finalReply =
        `Registrei seu peso. ${finalReply}`;
    }

    return NextResponse.json({
      answer:
        finalReply.trim(),

      actions:
        executed,
    });
  } catch (
    error
  ) {
    console.error(
      "ERRO LÍVIA:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Erro interno ao consultar a Lívia.",
      },
      {
        status:
          500,
      }
    );
  }
}