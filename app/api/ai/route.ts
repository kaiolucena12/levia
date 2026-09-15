import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const SYSTEM_INSTRUCTION = `
Você é Lívia, a assistente virtual do Levia. Converse como uma companheira de rotina próxima, natural e acolhedora. Você conhece apenas os registros disponíveis do usuário e pode ajudá-lo a refletir sobre alimentação, atividade física, sono, hidratação e evolução de peso.

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
- não prescreva medicamentos, suplementos ou dietas terapêuticas;
- quando houver sinais de possível problema médico, transtorno alimentar, desmaios, dor intensa, uso de medicamentos para emagrecimento ou outra situação de risco, recomende avaliação profissional;
- não invente calorias ou macronutrientes exatos se o usuário não forneceu quantidades suficientes;
- quando analisar uma refeição, use preferencialmente: "pontos positivos", "o que pode melhorar" e "uma sugestão simples";
- quando usar o histórico do usuário, deixe claro que você está observando somente os registros disponíveis.

O objetivo é ajudar o usuário a entender padrões e tomar decisões sustentáveis, não substituir nutricionista ou médico.
`;

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  );
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");

    if (!token) {
      return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
    }

    const supabase = getSupabase();
    const { data: authData, error: authError } = await supabase.auth.getUser(token);

    if (authError || !authData.user) {
      return NextResponse.json({ error: "Sessão inválida." }, { status: 401 });
    }

    const body = await request.json();
    const message = String(body.message || "").trim();

    if (!message) {
      return NextResponse.json({ error: "Mensagem vazia." }, { status: 400 });
    }

    const userId = authData.user.id;
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const since = sevenDaysAgo.toISOString().slice(0, 10);

    // Cliente com o JWT do usuário: as consultas continuam obedecendo às políticas RLS.
    const userSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      {
        global: {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      }
    );

    const [mealsRes, activitiesRes, logsRes, weightsRes] = await Promise.all([
      userSupabase
        .from("meals")
        .select("meal_type,description,meal_date")
        .gte("meal_date", since)
        .order("meal_date", { ascending: false })
        .limit(40),
      userSupabase
        .from("activities")
        .select("name,duration_minutes,steps,activity_date")
        .gte("activity_date", since)
        .order("activity_date", { ascending: false })
        .limit(30),
      userSupabase
        .from("daily_logs")
        .select("log_date,water_ml,sleep_hours,notes")
        .gte("log_date", since)
        .order("log_date", { ascending: false })
        .limit(10),
      userSupabase
        .from("weight_entries")
        .select("weight,recorded_at")
        .order("recorded_at", { ascending: false })
        .limit(10),
    ]);

    const context = {
      meals: mealsRes.data || [],
      activities: activitiesRes.data || [],
      dailyLogs: logsRes.data || [],
      weights: weightsRes.data || [],
    };

    const historyText = Array.isArray(body.history)
      ? body.history
          .slice(-6)
          .map((item: any) => `${item.role === "assistant" ? "Lívia" : "Usuário"}: ${String(item.text || "")}`)
          .join("\n")
      : "";

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    const prompt = `
REGISTROS RECENTES DO USUÁRIO (podem estar incompletos):
${JSON.stringify(context, null, 2)}

CONVERSA RECENTE:
${historyText || "Sem histórico adicional."}

MENSAGEM ATUAL DO USUÁRIO:
${message}

Responda considerando os registros somente quando forem relevantes à pergunta.
`;

    const response = await ai.models.generateContent({
      model: process.env.GEMINI_MODEL || "gemini-3.6-flash",
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        temperature: 0.6,
        maxOutputTokens: 700,
      },
    });

    return NextResponse.json({
      answer: response.text || "Não consegui gerar uma resposta.",
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Erro interno ao consultar a IA." },
      { status: 500 }
    );
  }
}
