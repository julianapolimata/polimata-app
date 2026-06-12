// ═══════════════════════════════════════════════════════════════════════════
// orcamento-ia — Módulo Gestão Orçamentária
// Apoios de IA (Claude) do módulo:
//   acao: 'categorizar'   — sugere categoria gerencial p/ contas do ERP (lote)
//   acao: 'sugerir'       — sugestão híbrida de orçamento p/ categorias (12m, justificativa, confiança)
//   acao: 'insight'       — insight textual sobre desvios ou cenários
// Secrets: ANTHROPIC_API_KEY (já usado pelo mapeamento-pipeline)
// ═══════════════════════════════════════════════════════════════════════════
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const ANTHROPIC_KEY = Deno.env.get("ANTHROPIC_API_KEY") ?? "";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

async function claude(system: string, user: string, maxTokens = 4096): Promise<string> {
  if (!ANTHROPIC_KEY) throw new Error("Secret ANTHROPIC_API_KEY não configurado no Supabase.");
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": ANTHROPIC_KEY,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: maxTokens,
      system,
      messages: [{ role: "user", content: user }],
    }),
  });
  if (!res.ok) throw new Error("Claude API: " + res.status + " " + (await res.text()).slice(0, 300));
  const data = await res.json();
  return (data.content ?? []).map((b: { text?: string }) => b.text ?? "").join("");
}

function extrairJson(texto: string): unknown {
  const ini = texto.indexOf("["), iniObj = texto.indexOf("{");
  const start = (ini === -1) ? iniObj : (iniObj === -1 ? ini : Math.min(ini, iniObj));
  if (start === -1) throw new Error("Resposta da IA sem JSON.");
  const fim = Math.max(texto.lastIndexOf("]"), texto.lastIndexOf("}"));
  return JSON.parse(texto.slice(start, fim + 1));
}

// ── Ações ──────────────────────────────────────────────────────────────────

// contas: [{conta_erp, descricao_erp, total?}] / categorias: [{id, nome, tipo}]
async function categorizar(body: Record<string, unknown>) {
  const contas = body.contas as Array<Record<string, unknown>>;
  const categorias = body.categorias as Array<Record<string, unknown>>;
  if (!contas?.length || !categorias?.length) throw new Error("Informe contas e categorias.");
  const system =
    "Você é um contador-controller brasileiro especialista em categorização gerencial de plano de contas para PMEs. " +
    "Responda APENAS com JSON válido, sem comentários.";
  const user =
    `Categorias gerenciais disponíveis (use exatamente o id):\n${JSON.stringify(categorias)}\n\n` +
    `Contas do ERP para categorizar:\n${JSON.stringify(contas)}\n\n` +
    `Para cada conta, devolva: [{"conta_erp": "...", "categoria_id": "<id ou null se nenhuma servir>", ` +
    `"confianca": <0-100>, "em_escopo": <true se for conta de resultado relevante para orçamento; false para ativo/passivo/transitórias>}]. ` +
    `Confiança alta (>=90) só quando a correspondência for óbvia pelo nome.`;
  const out = await claude(system, user, 8192);
  return { mapeamentos: extrairJson(out) };
}

// series: [{categoria, tipo, serie_ano_anterior: number[12], serie_2_anos: number[12]|null, contexto?}]
// extras: { indices?: [{nome, variacao_12m}], observacoes? }
async function sugerir(body: Record<string, unknown>) {
  const series = body.series as Array<Record<string, unknown>>;
  if (!series?.length) throw new Error("Informe as séries históricas.");
  const ano = body.ano ?? new Date().getFullYear();
  const system =
    "Você é um controller brasileiro experiente em orçamento empresarial de PMEs. " +
    "Analise cada série histórica mensal, identifique padrão (sazonalidade, tendência, estabilidade, ruptura) " +
    "e proponha o orçamento mensal mais provável. Seja conservador com receitas e realista com custos. " +
    "Responda APENAS com JSON válido.";
  const user =
    `Exercício a orçar: ${ano}. Índices de mercado: ${JSON.stringify(body.indices ?? [])}. ` +
    `Observações do controller: ${body.observacoes ?? "nenhuma"}.\n\n` +
    `Séries (valores mensais Jan..Dez do(s) ano(s) anterior(es); null = sem dado):\n${JSON.stringify(series)}\n\n` +
    `Para cada categoria devolva: [{"categoria": "...", "valores": [12 números], ` +
    `"metodo_aplicado": "repeticao|media_movel|tendencia|sazonalidade|indice|hibrido", ` +
    `"justificativa": "1-2 frases em pt-BR explicando o raciocínio", "confianca": <0-100>}].`;
  const out = await claude(system, user, 8192);
  return { sugestoes: extrairJson(out) };
}

// dados: objeto livre com desvios ou cenários; tipo: 'desvios' | 'cenarios'
async function insight(body: Record<string, unknown>) {
  const system =
    "Você é um consultor financeiro brasileiro. Gere um insight executivo curto (máx. 3 frases, pt-BR), " +
    "acionável e específico sobre os dados. Sem markdown, sem rodeios.";
  const user = `Tipo de análise: ${body.tipo}. Dados:\n${JSON.stringify(body.dados).slice(0, 12000)}`;
  const out = await claude(system, user, 600);
  return { insight: out.trim() };
}

// ── HTTP ───────────────────────────────────────────────────────────────────
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ erro: "Use POST." }, 405);
  try {
    // Exige usuário autenticado do projeto (anon key + JWT do chamador)
    const authHeader = req.headers.get("Authorization") ?? "";
    const supa = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: authHeader } } });
    const { data: { user } } = await supa.auth.getUser();
    if (!user) return json({ erro: "Não autenticado." }, 401);

    const body = await req.json();
    const acao = body.acao as string;
    if (acao === "categorizar") return json(await categorizar(body));
    if (acao === "sugerir") return json(await sugerir(body));
    if (acao === "insight") return json(await insight(body));
    return json({ erro: "Ação inválida: " + acao }, 400);
  } catch (e) {
    return json({ erro: (e as Error).message }, 500);
  }
});
