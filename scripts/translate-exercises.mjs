import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL;

const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY;

const OPENROUTER_API_KEY =
  process.env.OPENROUTER_API_KEY;

const OPENROUTER_MODEL =
  process.env.OPENROUTER_MODEL || "openrouter/free";

if (
  !SUPABASE_URL ||
  !SUPABASE_KEY ||
  !OPENROUTER_API_KEY
) {
  throw new Error(
    "Variáveis de ambiente não encontradas."
  );
}

const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);

async function translateBatch(items) {
  const prompt = `
Traduza os nomes abaixo de exercícios de musculação e atividade física
do inglês para português do Brasil.

Regras:
- Use os nomes normalmente usados em academias brasileiras.
- Não faça explicações.
- Não invente exercícios.
- Preserve a ordem.
- Retorne SOMENTE JSON válido.
- Formato:
[
  {
    "id": "id original",
    "name_pt": "nome em português"
  }
]

Exercícios:

${JSON.stringify(
  items.map((item) => ({
    id: item.id,
    name: item.name,
  }))
)}
`;

  const response = await fetch(
    "https://openrouter.ai/api/v1/chat/completions",
    {
      method: "POST",

      headers: {
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer":
          "https://levia-five.vercel.app",
        "X-Title": "Levia",
      },

      body: JSON.stringify({
        model: OPENROUTER_MODEL,

        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],

        temperature: 0.1,
      }),
    }
  );

  if (!response.ok) {
    const text = await response.text();

    throw new Error(
      `Erro OpenRouter: ${response.status} ${text}`
    );
  }

  const data =
    await response.json();

  let content =
    data.choices?.[0]?.message?.content || "";

  content = content
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();

  return JSON.parse(content);
}

async function main() {
  const {
    data: exercises,
    error,
  } = await supabase
    .from("exercises")
    .select("id,name,name_pt")
    .or("name_pt.is.null,name_pt.eq.")
    .order("name");

  if (error) {
    throw error;
  }

  console.log(
    `${exercises.length} exercícios para traduzir.`
  );

  const BATCH_SIZE = 20;

  for (
    let i = 0;
    i < exercises.length;
    i += BATCH_SIZE
  ) {
    const batch =
      exercises.slice(
        i,
        i + BATCH_SIZE
      );

    console.log(
      `Traduzindo ${i + 1} até ${Math.min(
        i + BATCH_SIZE,
        exercises.length
      )}...`
    );

    try {
      const translated =
        await translateBatch(batch);

      for (const item of translated) {
        if (
          !item.id ||
          !item.name_pt
        ) {
          continue;
        }

        const {
          error: updateError,
        } = await supabase
          .from("exercises")
          .update({
            name_pt:
              item.name_pt.trim(),
          })
          .eq(
            "id",
            item.id
          );

        if (updateError) {
          console.error(
            "Erro atualizando:",
            item,
            updateError
          );
        }
      }
    } catch (err) {
      console.error(
        "Erro no lote:",
        err
      );
    }

    // evita muitas chamadas seguidas
    await new Promise(
      (resolve) =>
        setTimeout(
          resolve,
          1500
        )
    );
  }

  console.log(
    "Tradução concluída!"
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});