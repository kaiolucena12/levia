# Levia — Starter

Primeira versão funcional do Levia, feita com:

- Next.js
- TypeScript
- Supabase Auth + Postgres + RLS
- Gemini API
- Recharts
- CSS puro

## O que já existe

- Cadastro e login com e-mail/senha
- Dashboard
- Registro de refeições
- Registro de atividade física e passos
- Água, sono e observações
- Registro de peso
- Gráfico de evolução
- Levia IA
- A IA pode consultar os últimos registros do usuário
- RLS: cada usuário só vê os próprios dados
- Layout responsivo para desktop e celular

---

## 1. Instale o Node.js

Use Node.js 20 ou superior.

## 2. Abra a pasta no VS Code

No terminal:

```bash
cd levia-starter
npm install
```

## 3. Crie as tabelas no Supabase

No Supabase:

1. Abra seu projeto.
2. Vá em `SQL Editor`.
3. Abra o arquivo `supabase/schema.sql` deste projeto.
4. Copie todo o conteúdo.
5. Cole no SQL Editor.
6. Clique em `Run`.

## 4. Configure as variáveis

Copie:

```bash
.env.example
```

para:

```bash
.env.local
```

Preencha:

```env
NEXT_PUBLIC_SUPABASE_URL=https://SEU-PROJETO.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxxxx
GEMINI_API_KEY=xxxxxxxx
GEMINI_MODEL=gemini-3.6-flash
```

### Onde pegar no Supabase

No painel do projeto, procure `Connect` / `API` e copie:

- Project URL
- Publishable key

Nunca coloque uma `secret key` ou `service_role` no navegador.

## 5. Crie a chave do Gemini

Crie uma API Key no Google AI Studio / Gemini API.

Coloque somente em `GEMINI_API_KEY` dentro de `.env.local`.

Ela NÃO começa com `NEXT_PUBLIC_`, porque não deve ir para o navegador.

## 6. Rode o site

```bash
npm run dev
```

Abra:

```text
http://localhost:3000
```

## 7. Confirmação de e-mail do Supabase

Se a confirmação de e-mail estiver ativada, o usuário precisará confirmar o cadastro antes de fazer login.

Para desenvolvimento, você pode decidir se mantém ou desativa isso nas configurações de Auth do Supabase.

## Próximas funcionalidades sugeridas

- Metas de peso
- Medidas corporais
- Fotos de evolução
- Humor e fome (1–5)
- Calendário mensal
- Streak de registros
- Relatório semanal automático
- Análise completa do dia pela IA
- Análise semanal pela IA
- Preferências alimentares
- Meta de água
- Meta de passos
- Meta de sono
- Notificações
- PWA instalável no celular
- Login Google
- Exportação PDF
- Comparação de fotos
- Área de conquistas
- Medidas: cintura, abdômen, quadril, braço, coxa

## Aviso importante

O Levia deve funcionar como ferramenta educativa e de acompanhamento de hábitos. A IA não deve substituir nutricionista, médico ou outro profissional de saúde.

Evite armazenar ou enviar à IA dados pessoais desnecessários.


## Imagens oficiais da Lívia

As imagens da personagem agora ficam em `public/livia/` com estes nomes:

- `atividade-fisica.png`
- `alimentacao.png`
- `agua.png`
- `normal.png`
- `oi.png`
- `conversando.png`
- `analisando.png`
- `comemorando.png`

A assistente flutuante usa automaticamente essas variações no componente `components/LiviaAssistant.tsx`.
