import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;

  const content = fs.readFileSync(filePath, "utf8");

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();

    if (!line || line.startsWith("#")) continue;

    const i = line.indexOf("=");

    if (i === -1) continue;

    const key = line.slice(0, i).trim();

    let value = line
      .slice(i + 1)
      .trim();

    if (
      (value.startsWith('"') &&
        value.endsWith('"')) ||
      (value.startsWith("'") &&
        value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

loadEnvFile(
  path.resolve(
    process.cwd(),
    ".env.local"
  )
);

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL;

const SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY;

const OPENROUTER_API_KEY =
  process.env.OPENROUTER_API_KEY;

const OPENROUTER_MODEL =
  process.env.OPENROUTER_MODEL ||
  "openrouter/free";

if (!SUPABASE_URL) {
  throw new Error(
    "NEXT_PUBLIC_SUPABASE_URL ausente."
  );
}

if (!SERVICE_ROLE_KEY) {
  throw new Error(
    "SUPABASE_SERVICE_ROLE_KEY ausente."
  );
}

if (!OPENROUTER_API_KEY) {
  throw new Error(
    "OPENROUTER_API_KEY ausente."
  );
}

const supabase = createClient(
  SUPABASE_URL,
  SERVICE_ROLE_KEY,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  }
);

const sleep = (ms) =>
  new Promise((resolve) =>
    setTimeout(resolve, ms)
  );

function cleanJson(text) {
  let value = String(text || "")
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  const first =
    value.indexOf("[");

  const last =
    value.lastIndexOf("]");

  if (
    first !== -1 &&
    last !== -1
  ) {
    value =
      value.slice(
        first,
        last + 1
      );
  }

  return value;
}

async function translateBatch(
  exercises
) {
  const payload =
    exercises.map(
      (exercise) => ({
        id: exercise.id,

        name:
          exercise.name,

        instructions:
          Array.isArray(
            exercise.instructions
          )
            ? exercise.instructions
            : [],
      })
    );

  const prompt = `
Traduza os exercícios abaixo para português do Brasil.

Regras:

- Preserve exatamente o campo "id".
- "name_pt" deve usar o nome comum usado em academias brasileiras.
- Não faça tradução literal quando existir um nome conhecido em português.
- "instructions_pt" deve manter a ordem das instruções originais.
- Use linguagem clara e natural.
- Não invente informações.
- Não altere o sentido técnico.
- Não use markdown.
- Responda SOMENTE com um JSON array válido.

Formato:

[
  {
    "id": "id original",
    "name_pt": "Nome em português",
    "instructions_pt": [
      "Passo 1",
      "Passo 2"
    ]
  }
]

Exercícios:

${JSON.stringify(payload)}
`.trim();

  const response =
    await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",

        headers: {
          Authorization:
            `Bearer ${OPENROUTER_API_KEY}`,

          "Content-Type":
            "application/json",
        },

        body:
          JSON.stringify({
            model:
              OPENROUTER_MODEL,

            temperature: 0.1,

            messages: [
              {
                role: "user",
                content: prompt,
              },
            ],
          }),
      }
    );

  if (!response.ok) {
    const errorText =
      await response.text();

    throw new Error(
      `OpenRouter HTTP ${response.status}: ${errorText}`
    );
  }

  const result =
    await response.json();

  const content =
    result?.choices?.[0]
      ?.message?.content;

  if (!content) {
    throw new Error(
      "Resposta vazia do OpenRouter."
    );
  }

  const parsed =
    JSON.parse(
      cleanJson(content)
    );

  if (
    !Array.isArray(parsed)
  ) {
    throw new Error(
      "Resposta da IA não é um array."
    );
  }

  return parsed;
}

async function main() {
  console.log(
    "Buscando exercícios..."
  );

  const {
    data,
    error,
  } =
    await supabase
      .from("exercises")
      .select(`
        id,
        name,
        instructions,
        name_pt,
        instructions_pt
      `)
      .eq(
        "source",
        "ExerciseGymGifsDB"
      )
      .order(
        "name",
        {
          ascending: true,
        }
      );

  if (error) {
    throw error;
  }

  const pending =
    (data || []).filter(
      (exercise) => {
        const hasName =
          typeof exercise.name_pt ===
            "string" &&
          exercise.name_pt.trim();

        const hasInstructions =
          Array.isArray(
            exercise.instructions_pt
          ) &&
          exercise.instructions_pt
            .length > 0;

        return (
          !hasName ||
          !hasInstructions
        );
      }
    );

  console.log(
    `${pending.length} exercícios pendentes.`
  );

  if (
    pending.length === 0
  ) {
    console.log(
      "Nada para traduzir."
    );

    return;
  }

  const batchSize = 10;

  let translated = 0;

  for (
    let i = 0;
    i < pending.length;
    i += batchSize
  ) {
    const batch =
      pending.slice(
        i,
        i + batchSize
      );

    console.log(
      `Traduzindo ${i + 1}-${
        i + batch.length
      }...`
    );

    let translations;

    for (
      let attempt = 1;
      attempt <= 3;
      attempt++
    ) {
      try {
        translations =
          await translateBatch(
            batch
          );

        break;
      } catch (error) {
        console.warn(
          `Tentativa ${attempt}/3 falhou: ${error.message}`
        );

        if (
          attempt === 3
        ) {
          throw error;
        }

        await sleep(
          2000 * attempt
        );
      }
    }

    const map =
      new Map(
        translations.map(
          (item) => [
            String(item.id),
            item,
          ]
        )
      );

    for (
      const exercise
      of batch
    ) {
      const translatedExercise =
        map.get(
          String(
            exercise.id
          )
        );

      if (
        !translatedExercise
      ) {
        console.warn(
          `Sem tradução para: ${exercise.name}`
        );

        continue;
      }

      const namePt =
        typeof translatedExercise.name_pt ===
          "string"
          ? translatedExercise.name_pt.trim()
          : "";

      const instructionsPt =
        Array.isArray(
          translatedExercise.instructions_pt
        )
          ? translatedExercise.instructions_pt
              .filter(
                (item) =>
                  typeof item ===
                    "string" &&
                  item.trim()
              )
              .map(
                (item) =>
                  item.trim()
              )
          : [];

      const {
        error:
          updateError,
      } =
        await supabase
          .from(
            "exercises"
          )
          .update({
            name_pt:
              namePt ||
              null,

            instructions_pt:
              instructionsPt,
          })
          .eq(
            "id",
            exercise.id
          );

      if (
        updateError
      ) {
        throw updateError;
      }

      translated++;
    }

    console.log(
      `Traduzidos: ${translated}/${pending.length}`
    );

    await sleep(800);
  }

  console.log(
    "Tradução concluída."
  );
}

main().catch(
  (error) => {
    console.error(
      "Falha na tradução:",
      error
    );

    process.exit(1);
  }
);