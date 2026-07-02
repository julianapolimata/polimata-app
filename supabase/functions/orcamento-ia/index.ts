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

// series realizadas mensais (Jan..Dez; 0 = mês ainda não realizado). Projeta os meses futuros.
async function projecao(body: Record<string, unknown>) {
  const saidas = body.serie_saidas as number[];
  const receita = body.serie_receita as number[];
  if (!Array.isArray(saidas) || !Array.isArray(receita)) throw new Error("Informe serie_saidas e serie_receita (12 números).");
  const system =
    "Você é um analista financeiro (FP&A) brasileiro especialista em PMEs de manufatura sob medida. " +
    "A partir do realizado mensal, projete os meses futuros de duas séries (saídas e receita), " +
    "considerando RECORRÊNCIA (custos que se repetem todo mês), TENDÊNCIA e sazonalidade plausível. " +
    "Seja realista e conservador com receita. " +
    "Meses com valor 0 = ainda não realizados (projete-os); meses com valor > 0 = realizados (mantenha EXATAMENTE). " +
    "Responda APENAS com JSON válido em pt-BR, valores em reais (números), sem texto fora do JSON.";
  const user =
    `Série SAÍDAS (Jan..Dez): ${JSON.stringify(saidas)}\n` +
    `Série RECEITA (Jan..Dez): ${JSON.stringify(receita)}\n\n` +
    `Devolva: {"saidas_proj":[12 números],"receita_proj":[12 números],` +
    `"comentario":"1-2 frases pt-BR explicando a lógica (recorrência/tendência) da projeção"}.`;
  const out = await claude(system, user, 1500);
  return extrairJson(out);
}

// dados: findings determinísticos consolidados do ano (recorrentes, pontuais, receita). Devolve narrativas + interpretação.
async function analiseAno(body: Record<string, unknown>) {
  const dados = body.dados;
  const contexto = (body.contexto as string) || "";
  const system =
    "Você é um consultor financeiro experiente que assessora o DONO de uma PME brasileira de móveis planejados de alto padrão. " +
    "O dono NÃO é especialista em finanças. Escreva de forma CLARA, DIRETA e ACESSÍVEL, como se estivesse explicando pessoalmente para ele, na linguagem do dia a dia — em pt-BR. " +
    "Evite jargão técnico-financeiro (por exemplo: 'desvio estrutural', 'lacuna orçamentária', 'previsibilidade', 'concentração de receita', 'materialidade'); se um conceito for necessário, explique em poucas palavras simples. " +
    "Seja profissional e confiável, sem soar acadêmico e sem gírias ou coloquialismos baratos. Traga sempre o 'e daí' prático de cada ponto — o que aquilo significa para o bolso e para as decisões do dono. " +
    "A SINOPSE é a análise de MAIOR VALOR: NÃO repita percentuais nem valores já exibidos nos indicadores — entregue a LEITURA por trás dos dados (o que está realmente acontecendo, a causa provável, o que isso significa na prática e o risco ou a oportunidade), de forma envolvente e fácil de entender. " +
    "Se um CONTEXTO DO NEGÓCIO for fornecido, respeite-o rigorosamente: o que for apresentado como esperado ou estratégico NÃO deve ser tratado como risco ou problema. " +
    "Baseie-se estritamente nos dados fornecidos, seja específico, seja conciso. Sem markdown. Responda APENAS com JSON válido.";
  const user =
    "Dados consolidados dos meses já fechados (orçado x realizado):\n" + JSON.stringify(dados).slice(0, 12000) + "\n\n" +
    (contexto ? "CONTEXTO DO NEGÓCIO (informado pelo consultor — RESPEITE-O):\n" + contexto + "\n\n" : "") +
    "Devolva JSON com esta forma exata: {" +
    "\"sinopse\":\"parágrafo claro e envolvente, de alto valor (3 a 4 frases) que REVELE algo além dos números já exibidos: a tensão central, a causa provável do padrão dominante, a implicação estratégica e o risco ou a oportunidade que a diretoria precisa enxergar, com um gancho para os detalhes. Não repita percentuais/valores dos indicadores\"," +
    "\"narrativa_saidas\":\"2 a 3 frases claras (linguagem do dono) sobre o desempenho das saídas frente ao orçado, destacando os desvios estruturais recorrentes e a projeção de fechamento\"," +
    "\"narrativa_receita\":\"2 a 3 frases claras (linguagem do dono) sobre a receita frente à meta, o momento, a concentração e a qualidade fiscal\"," +
    "\"itens\":[{\"nome\":\"<nome exato da rubrica recorrente informada>\",\"texto\":\"1 frase formal com a causa provável e a recomendação\"}]," +
    "\"acoes\":[{\"titulo\":\"ação objetiva (verbo no início)\",\"detalhe\":\"1 frase\",\"prioridade\":\"alta|média|baixa\"}]" +
    "}. Gere um item para cada rubrica recorrente informada, usando o nome exato. Ordene as ações por impacto no resultado.";
  const out = await claude(system, user, 2000);
  return extrairJson(out);
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
    if (acao === "projecao") return json(await projecao(body));
    if (acao === "analise_ano") return json(await analiseAno(body));
    return json({ erro: "Ação inválida: " + acao }, 400);
  } catch (e) {
    return json({ erro: (e as Error).message }, 500);
  }
});
