import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;

  const content = fs.readFileSync(filePath, "utf8");

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();

    if (!line || line.startsWith("#")) continue;

    const separatorIndex = line.indexOf("=");

    if (separatorIndex === -1) continue;

    const key = line.slice(0, separatorIndex).trim();

    let value = line
      .slice(separatorIndex + 1)
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

if (!SUPABASE_URL) {
  throw new Error(
    "NEXT_PUBLIC_SUPABASE_URL não encontrada no .env.local"
  );
}

if (!SERVICE_ROLE_KEY) {
  throw new Error(
    "SUPABASE_SERVICE_ROLE_KEY não encontrada no .env.local"
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

const BASE =
  "https://cdn.jsdelivr.net/gh/JahelCuadrado/ExerciseGymGifsDB@v1.1.0";

const DATA_URL =
  `${BASE}/api/en/exercises.json`;

function normalizeArray(value) {
  if (Array.isArray(value)) {
    return value;
  }

  if (
    value &&
    typeof value === "object" &&
    Array.isArray(value.exercises)
  ) {
    return value.exercises;
  }

  return [];
}

function cleanString(value) {
  if (typeof value !== "string") {
    return null;
  }

  const cleaned = value.trim();

  return cleaned || null;
}

function cleanStringArray(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter(
      (item) =>
        typeof item === "string"
    )
    .map((item) => item.trim())
    .filter(Boolean);
}

function buildRow(exercise) {
  const externalId =
    cleanString(exercise.id) ||
    [
      exercise.muscle,
      exercise.slug,
    ]
      .filter(Boolean)
      .join("/");

  const gifUrl =
    cleanString(exercise.gifUrl) ||
    (
      cleanString(exercise.file)
        ? `${BASE}/${exercise.file}`
        : null
    );

  return {
    external_id: externalId,

    source:
      "ExerciseGymGifsDB",

    name:
      cleanString(exercise.name) ||
      externalId,

    name_pt: null,

    equipment:
      cleanString(
        exercise.equipment
      ),

    primary_muscles:
      exercise.muscle
        ? [
            String(
              exercise.muscle
            ),
          ]
        : [],

    secondary_muscles:
      cleanStringArray(
        exercise.secondaryMuscles
      ),

    instructions:
      cleanStringArray(
        exercise.instructions
      ),

    gif_url: gifUrl,
  };
}

async function main() {
  console.log(
    "Baixando base de exercícios com GIF..."
  );

  const response =
    await fetch(DATA_URL);

  if (!response.ok) {
    throw new Error(
      `Falha ao baixar exercícios: HTTP ${response.status}`
    );
  }

  const payload =
    await response.json();

  const exercises =
    normalizeArray(payload);

  if (!exercises.length) {
    throw new Error(
      "A API respondeu, mas nenhum exercício foi encontrado."
    );
  }

  console.log(
    `${exercises.length} exercícios encontrados.`
  );

  const rows = exercises
    .map(buildRow)
    .filter(
      (row) =>
        row.external_id &&
        row.name &&
        row.gif_url
    );

  console.log(
    `${rows.length} exercícios válidos para importação.`
  );

  const chunkSize = 100;

  let imported = 0;

  for (
    let i = 0;
    i < rows.length;
    i += chunkSize
  ) {
    const chunk =
      rows.slice(
        i,
        i + chunkSize
      );

    const { error } =
      await supabase
        .from("exercises")
        .upsert(
          chunk,
          {
            onConflict:
              "source,external_id",

            ignoreDuplicates:
              false,
          }
        );

    if (error) {
      console.error(
        `Erro no lote ${i + 1}-${
          i + chunk.length
        }:`,
        error
      );

      throw error;
    }

    imported +=
      chunk.length;

    console.log(
      `Importados: ${imported}/${rows.length}`
    );
  }

  const {
    count,
    error: countError,
  } =
    await supabase
      .from("exercises")
      .select(
        "*",
        {
          count: "exact",
          head: true,
        }
      )
      .eq(
        "source",
        "ExerciseGymGifsDB"
      );

  if (countError) {
    console.warn(
      "Não foi possível contar os exercícios:",
      countError.message
    );
  } else {
    console.log(
      `Total no Supabase: ${count}`
    );
  }

  console.log(
    "Importação concluída."
  );
}

main().catch(
  (error) => {
    console.error(
      "Falha na importação:",
      error
    );

    process.exit(1);
  }
);