import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL;

const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  throw new Error(
    "Variáveis do Supabase não encontradas."
  );
}

const supabase =
  createClient(
    SUPABASE_URL,
    SUPABASE_KEY
  );

const DATA_URL =
  "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json";

const IMAGE_BASE =
  "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/";

async function main() {
  console.log(
    "Baixando exercícios..."
  );

  const response =
    await fetch(
      DATA_URL
    );

  if (!response.ok) {
    throw new Error(
      `Erro ao baixar base: ${response.status}`
    );
  }

  const exercises =
    await response.json();

  console.log(
    `Encontrados ${exercises.length} exercícios`
  );

  const rows =
    exercises.map(
      (exercise) => ({
        source_id:
          exercise.id,

        name:
          exercise.name,

        name_pt:
          null,

        level:
          exercise.level ||
          null,

        force:
          exercise.force ||
          null,

        mechanic:
          exercise.mechanic ||
          null,

        equipment:
          exercise.equipment ||
          null,

        primary_muscles:
          exercise.primaryMuscles ||
          [],

        secondary_muscles:
          exercise.secondaryMuscles ||
          [],

        instructions:
          exercise.instructions ||
          [],

        image_start:
          exercise.images?.[0]
            ? IMAGE_BASE +
              exercise.images[0]
            : null,

        image_end:
          exercise.images?.[1]
            ? IMAGE_BASE +
              exercise.images[1]
            : null,

        source:
          "Free Exercise DB",
      })
    );

  const BATCH_SIZE =
    100;

  for (
    let i = 0;
    i < rows.length;
    i += BATCH_SIZE
  ) {
    const batch =
      rows.slice(
        i,
        i + BATCH_SIZE
      );

    const {
      error,
    } =
      await supabase
        .from(
          "exercises"
        )
        .upsert(
          batch,
          {
            onConflict:
              "source_id",
          }
        );

    if (error) {
      console.error(
        "Erro no lote:",
        i,
        error
      );

      throw error;
    }

    console.log(
      `Importados ${Math.min(
        i + BATCH_SIZE,
        rows.length
      )} / ${rows.length}`
    );
  }

  console.log(
    "Importação concluída!"
  );
}

main().catch(
  (error) => {
    console.error(
      error
    );

    process.exit(1);
  }
);