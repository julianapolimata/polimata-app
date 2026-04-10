# ESTADO DO SISTEMA — CI Polímata
> Atualizado em: 07/04/2026 — sessão completa de debug (cache, React #300, ModalAtualizar, Ficha Excel v5)
> Cole no início de cada novo chat para retomar sem perda de contexto.

---

## Stack & Infra
- **Frontend:** React + Vite
- **Backend:** Supabase (PostgreSQL, Auth, Storage, RLS)
- **Deploy:** Vercel (auto-deploy do master) → polimata-ci.vercel.app
- **Repo:** github.com/julianapolimata/polimata-ci (público, branch master)
- **Supabase project:** iqtkpyrpwxypwcwrhulx
- **Local:** C:\projetos\polimata-fresh\polimata-ci
- **Admin:** juliana@polimatagrc.com.br
- **Git push:** sempre usar `--force`
- **Domínio próprio:** polimatagrc.com.br (pendente configuração no Vercel)

---

## Identidade Visual (obrigatório)
- **Cores Navy:** #00112C / #00203E / #1D3B5C
- **Cores Dourado:** #CC915E / #A6512F / #6C2D10
- **Creme:** #F3EEE4
- **Fonte:** Montserrat para TUDO (sem exceções — inclusive no Excel)
- **Cores fases:** F1=#00203E, F2=#1D3B5C, F3=#660033, F4=#660066, F5=#A6512F
- **Regra:** estrutural = marca; semântico = cores universais. NUNCA usar roxo.
- **Logo completa:** logotipo-2cores.png (na pasta public/)
- **Logo na Ficha Excel:** REMOVIDA — ExcelJS browser não suporta imagem sem distorção
- **SEM itálico** em documentos gerados pelo sistema

---

## Telas Implementadas

### Sidebar
- Dashboards: Dashboard Maturidade | Visão Geral
- Por Área: 14 áreas colapsáveis (navega por UUID)
- Operação: MRC Completa (badge total)
- Administração: Configurações (admin only) | Importar MRC (admin only)

### 1. Dashboard Maturidade (rota `/`) — TEMA ESCURO
- Fundo navy com cards escuros
- Gauge + KPIs + Ranking por Área + Mapa de Calor + Tabela Criticidade por Área

### 2. Visão Geral (rota `/visao-geral`)
- 4 cards: Total | Efetivo | Inefetivo | GAP
- Tabela Resumo por Área + linha TOTAL

### 3. Por Área (rota `/area/:areaId`)
- 5 KPIs + Heatmap Impacto×Probabilidade + Filtros + tabela MRC 23 colunas
- Botão "Ver" → ModalDetalhe
- Botão "Atualizar" (dourado, só admin/consultor) → ModalAtualizar ✅
- Badges "EM ANÁLISE" e "TESTE PENDENTE" ✅

### Outras telas
- Login, RedefinirSenha, MRC Completa, Config Clientes/Usuários, Importar MRC, Perfil

---

## Campos Supabase — tabela `mrc`
`id`, `projeto_id`, `area_id`, `rr`, `rc`, `sub`, `ger`, `resp_sub`, `dt_ult`, `dr`, `dc`,
`imp`, `prob`, `crit` (INTEGER 1-4), `crit_label`, `cat`, `freq`, `nat`, `car`, `sis`, `chave`,
`passos_f1`, `r1`, `incons`, `rec`, `dem_pa`, `resp_pa`, `dt_pa`, `st_pa`, `coment_pa`,
`dt_teste`, `dc_novo`, `r_ader`, `melhoria`, `incons_ader`, `coment_ader`, `st_f3`, `r3`,
`incons_f3`, `rec_f3`, `area`, `status_workflow`, `criado_em`, `atualizado_em`,
`criado_por`, `atualizado_por`

### Campos adicionados (migração 01/04/2026):
- `status_risco` text DEFAULT 'existente'
- `motivo_inativacao` text
- `ativo` boolean DEFAULT true
- `transferido_de` UUID FK
- `ref_anterior` text
- `premissa_porque`, `premissa_quando`, `premissa_onde`, `premissa_quem`, `premissa_como`, `premissa_resultado`

### Constraint status_workflow:
```
CHECK (status_workflow = ANY (ARRAY['rascunho','em_revisao','aprovado','reprovado','em_analise','teste_pendente']))
```

### Tabela `mrc_audit_log`:
`id`, `mrc_id`, `campo`, `valor_anterior`, `valor_novo`, `usuario_id`, `criado_em`

### Query loadDados:
- Filtra `.neq('ativo', false)`

---

## ═══════════════════════════════════════════════
## ✅ BUG CORRIGIDO: 404 ao dar Refresh em /area/:id
## ═══════════════════════════════════════════════

### Problema:
Ao recarregar (F5/refresh) qualquer rota interna como `/area/uuid`, o Vercel retornava
`404: NOT_FOUND` — tratava a URL como arquivo estático em vez de redirecionar para o index.html da SPA.

### Causa:
O `vercel.json` não tinha `rewrites`, então o Vercel não sabia que todas as rotas devem
ser servidas pelo `index.html` (comportamento necessário em qualquer SPA com React Router).

### Solução — `vercel.json` final:
```json
{
  "buildCommand": "npm run build",
  "devCommand": "npm run dev",
  "installCommand": "npm install",
  "framework": "vite",
  "rewrites": [
    { "source": "/((?!assets/).*)", "destination": "/index.html" }
  ],
  "headers": [
    {
      "source": "/index.html",
      "headers": [{ "key": "Cache-Control", "value": "no-cache, no-store, must-revalidate" }]
    },
    {
      "source": "/assets/:path*",
      "headers": [{ "key": "Cache-Control", "value": "public, max-age=31536000, immutable" }]
    },
    {
      "source": "/:path*",
      "headers": [{ "key": "Cache-Control", "value": "no-cache, no-store, must-revalidate" }]
    }
  ]
}
```

### Por que o rewrite não interfere com o Supabase:
As chamadas ao Supabase são feitas pelo browser diretamente para
`iqtkpyrpwxypwcwrhulx.supabase.co` (domínio externo) — o Vercel nunca vê essas
requisições. O rewrite só afeta rotas servidas pelo próprio Vercel.

### Status: ✅ Resolvido

---

## ═══════════════════════════════════════════════
## ✅ BUG CORRIGIDO: Cache/Reload após Deploy
## ═══════════════════════════════════════════════

### Problema:
Após push no Vercel, browser carregava versão antiga. Service worker tentado
anteriormente havia quebrado a app (foi revertido na sessão anterior).

### Solução:
- `vercel.json`: headers `no-cache, no-store` para index.html e rotas SPA;
  `immutable` para `/assets/*` (seguro pois Vite gera hash nos nomes)
- `vite.config.js`: hash explícito nos assets de build

### `vite.config.js` final:
```js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        entryFileNames: 'assets/[name].[hash].js',
        chunkFileNames: 'assets/[name].[hash].js',
        assetFileNames: 'assets/[name].[hash].[ext]',
      }
    }
  }
})
```

### Status: ✅ Resolvido — após deploy, abrir aba nova já carrega versão atual

---

## ═══════════════════════════════════════════════
## ✅ BUG CORRIGIDO: React Error #300 (Tela Preta)
## ═══════════════════════════════════════════════

### Problema:
Ao acessar `/area/:areaId` diretamente via URL, tela ficava preta com
React Minified Error #300 no console.

### Causa raiz:
No componente `PorArea` (dentro de `Dashboard.jsx`), dois `useMemo` estavam
declarados **após** um `if (!area) return ...` condicional — viola a regra
dos React Hooks (nunca chamar hooks condicionalmente). Quando `areasCalc`
ainda estava vazio (janela entre mount e fim do `loadDados`), `area` era
`undefined`, a ordem dos hooks mudava e o React quebrava.

### Correção em `Dashboard.jsx`:
```jsx
// ✅ CORRETO — hooks ANTES de qualquer return condicional
const ultAtualArea = useMemo(
  () => getUltimaAtualizacao(area?.controles || []), [area]
)
const areaHeatmap = useMemo(() => {
  const grid = Array.from({ length: 4 }, () => Array(4).fill(0))
  ;(area?.controles || []).forEach(c => {
    const ri = impToIdx(c.imp), ci = probToIdx(c.prob)
    if (ri >= 0 && ci >= 0) grid[ri][ci]++
  })
  return grid
}, [area])

if (loading) return <Spinner />
if (!projeto) return <NoProjeto />
if (!area) return <div>Área não encontrada...</div>
// restante do componente...
```

### Status: ✅ Resolvido

---

## ═══════════════════════════════════════════════
## ✅ IMPLEMENTADO: MODAL ATUALIZAR COMPLETO
## ═══════════════════════════════════════════════

### Arquivo: `src/components/ModalAtualizar.jsx`
### Props: `row`, `onClose`, `onSaved`, `areas`, `projeto` (objeto completo com `clientes.nome`)
### Dependência: `ExcelJS` (instalado via npm, import no topo do arquivo)

---

### Fluxo 3 Steps:

**STEP 1 — RISCO:**
- Pergunta 1: "Houve alteração no STATUS do risco?"
  - **Não** → exibe Pergunta 2
  - **Sim** → escolha do novo status:
    - 🚫 **Evitado** → textarea justificativa obrigatória → `handleEvitar()` → encerra
    - ↗ **Transferido** → dropdown área destino (prop `areas`) + dropdown subprocesso
      dinâmico (busca Supabase em `mrc` da área destino) → `handleTransferido()` → encerra
- Pergunta 2 (só se statusChoice = 'nao'): "Houve alteração no DESCRITIVO do risco?"
  - **Não** → avança para Step 2
  - **Sim** → textarea nova descrição (obrigatória) → avança para Step 2

**STEP 2 — CONTROLE:**
- Pergunta: "Houve alteração no DESCRITIVO do controle?"
  - **Não** → avança para Step 3
  - **Sim** → exibe:
    - Textarea nova descrição do controle (obrigatória)
    - 6 Características (dropdowns obrigatórios):
      - Categoria, Frequência, Natureza, Característica, Sistema, Controle Chave
    - 6 Premissas (textareas obrigatórias):
      - Quem (desativado + N/A se Automatizado), Quando, Por quê, Como, Onde, Resultado

**STEP 3 — EXECUTAR TESTE:**
- Resumo read-only dos dados coletados (desc risco, desc controle, cat, freq, nat, car)
- **Opção A:** "Salvar e Baixar Ficha" → `status_workflow: 'em_analise'` + gera Excel v5
- **Opção B:** "Salvar sem Ficha" → `status_workflow: 'teste_pendente'`

---

### ✅ Validação de Campos Obrigatórios:

Botão "Próximo" desabilitado (`opacity: 0.5`, `disabled`) enquanto validação falhar.
Implementado como IIFEs calculadas no render:

```js
const canAdvanceStep1 = (() => {
  if (statusChoice === null) return false
  if (statusChoice === 'sim') {
    if (!newStatus) return false
    if (newStatus === 'evitado' && !motivoInativacao.trim()) return false
    if (newStatus === 'transferido' && (!areaDestino || !subDestino)) return false
  }
  if (statusChoice === 'nao') {
    if (descChoice === null) return false
    if (descChoice === 'sim' && !novaDescRisco.trim()) return false
  }
  return true
})()

const canAdvanceStep2 = (() => {
  if (ctrlDescChoice === null) return false
  if (ctrlDescChoice === 'sim') {
    if (!novaDescControle.trim()) return false
    if (!editCat || !editFreq || !editNat || !editCar || !editSis || !editChave) return false
    if (!isAutomatic && !quem.trim()) return false
    if (!quando.trim() || !pq.trim() || !como.trim() || !onde.trim() || !resultado.trim()) return false
  }
  return true
})()
```

---

### Funções de save:
- **`handleEvitar()`** — update: `status_risco='evitado'`, `motivo_inativacao`, `ativo=false`
- **`handleTransferido()`** — insert novo registro na área destino (nova ref gerada) +
  update original: `status_risco='transferido'`, `ativo=false`
- **`handleSaveFicha()`** — update todos os campos + premissas +
  `status_workflow='em_analise'` + chama `gerarFichaExcel()`
- **`handleSaveSemFicha()`** — update todos os campos + premissas +
  `status_workflow='teste_pendente'`

---

## ═══════════════════════════════════════════════
## ✅ IMPLEMENTADO: FICHA DE RISCO EXCEL v5
## ═══════════════════════════════════════════════

### Geração via ExcelJS no browser — download automático `.xlsx`
### Modelo de referência: `Ficha_de_Risco_C_COM_07.xlsx` (replicado integralmente)
### Função: `gerarFichaExcel()` dentro do `ModalAtualizar.jsx`

---

### Nome do arquivo gerado:
```
Ficha_de_Risco_{row.rc}_{YYYY-MM-DD}.xlsx
```

---

### Estrutura — 2 abas:

**Aba 1: `📋 Ficha de Risco`** — documento principal (61 linhas)
**Aba 2: `Teste`** — auxiliar com seção "7. EXECUÇÃO DO TESTE E EVIDÊNCIAS"

---

### Configuração de colunas:

| Col | Largura Excel | Uso |
|-----|--------------|-----|
| A | 2.36 | Margem |
| B | 34 | Labels |
| C | 20 | Valor (parte 1) |
| D | 22 | Valor (parte 2) |
| E | 20 | Valor (parte 3) |
| F | 22 | Valor (parte 4) |
| G | 20 | Valor (parte 5) |
| H | 10 | ✓/✗ |
| I | 28 | Observação |

**Aba Teste:** Col A=2.36, Col B=13

**Merge padrão dos valores:** C:I (colunas 3 a 9)

---

### Mapa de linhas:

| Linhas | Bloco | Conteúdo |
|--------|-------|----------|
| 1 | Header | "Polímata · Consultoria em GRC" (navy bg, cream text) |
| 2 | Header | "FICHA DE RISCO — EXECUÇÃO DO TESTE" (navy bg, gold text) |
| 3 | Espaço | height=5 |
| 4 | Seção | 1. DADOS DO PROJETO |
| 5 | Dado | CLIENTE ← `projeto.clientes.nome` |
| 6 | Dado | NATUREZA DO PROJETO ← `projeto.nome` |
| 7 | Dado | FASE EM CURSO ← "F2-E1 — Plano de Ação" (fixo) |
| 8 | Dado | EXECUTOR ← `perfil.nome` |
| 9 | Dado | DATA E HORÁRIO ← `new Date()` formatado |
| 10 | Dado | DOWNLOAD POR ← `perfil.email` |
| 11 | Editável | REVISOR (branco, preencher) |
| 12 | Editável | DATA DA REVISÃO (branco, preencher) |
| 13 | Espaço | height=5 |
| 14 | Seção | 2. IDENTIFICAÇÃO DO RISCO E CONTROLE |
| 15 | Dado | ÁREA / PROCESSO ← `row.area` |
| 16 | Dado | SUBPROCESSO ← `row.sub` |
| 17 | Dado | REF. RISCO ← `row.rr` |
| 18 | Dado | REF. CONTROLE ← `row.rc` |
| 19 | Dado | GERÊNCIA ← `row.ger` |
| 20 | Dado | RESP. SUBPROCESSO ← `row.resp_sub` |
| 21 | Dado | DESCRIÇÃO DO RISCO ← `novaDescRisco \|\| row.dr` |
| 22 | Dado | DESCRIÇÃO DO CONTROLE ← `novaDescControle \|\| row.dc` |
| 23 | Espaço | height=5 |
| 24 | Seção | 3. ATRIBUTOS DO CONTROLE |
| 25 | Dado | CATEGORIA ← `editCat \|\| row.cat` |
| 26 | Dado | FREQUÊNCIA ← `editFreq \|\| row.freq` |
| 27 | Dado | NATUREZA ← `editNat \|\| row.nat` |
| 28 | Dado | CARACTERÍSTICA ← `editCar \|\| row.car` |
| 29 | Dado | SISTEMA ← `editSis \|\| row.sis` |
| 30 | Dado | CONTROLE CHAVE? ← `editChave \|\| row.chave` |
| 31 | Espaço | height=5 |
| 32 | Seção | 4. AS 6 PREMISSAS DO CONTROLE — VALIDAÇÃO METODOLÓGICA |
| 33 | Editável | 1. QUEM FAZ ← premissa_quem (N/A se Automatizado) |
| 34 | Editável | 2. QUANDO FAZ ← premissa_quando |
| 35 | Editável | 3. POR QUÊ FAZ ← premissa_porque |
| 36 | Editável | 4. COMO FAZ ← premissa_como |
| 37 | Editável | 5. ONDE FAZ ← premissa_onde |
| 38 | Editável | 6. QUAL O RESULTADO ← premissa_resultado |
| 39 | Espaço | height=5 |
| 40 | Seção | 5. PASSOS DE TESTE |
| 41 | Header | Atividade/Passo (B:G) \| ✓/✗ (H) \| Observação (I) |
| 42 | Legenda | ✓ = sucesso · ✗ = não realizado (gold text, F8 bg) |
| 43-52 | Editável | Passo 1 a Passo 10 (texto cinza #BBBBBB, branco bg) |
| 53-54 | Espaço | height=5 |
| 55 | Seção | 6. RESULTADO |
| 56 | Editável | RESULTADO (lista suspensa) |
| 57 | Editável | INCONSISTÊNCIA IDENTIFICADA |
| 58 | Editável | MELHORIA IDENTIFICADA? (lista suspensa) |
| 59 | Editável | DESCRIÇÃO DA MELHORIA |
| 60 | Nota | ↑ Preencher apenas quando "Melhoria Identificada?" = Sim |
| 61 | Footer | Polímata GRC (esq) · data/hora/email (dir) |

---

### Listas suspensas (Data Validations):

```js
// API correta ExcelJS browser — range como 1º argumento
ws.dataValidations.add('H43:H52', {
  type: 'list', allowBlank: true, formulae: ['"✓,✗"'], showDropDown: false
})
ws.dataValidations.add('C56:I56', {
  type: 'list', allowBlank: true, formulae: ['"Efetivo,Inefetivo,GAP"'], showDropDown: false
})
ws.dataValidations.add('C58:I58', {
  type: 'list', allowBlank: true, formulae: ['"Sim,Não"'], showDropDown: false
})
```

⚠️ **IMPORTANTE:** `dataValidations.add(sqref, options)` — range é o 1º argumento,
NÃO dentro do objeto. Colocar `sqref:` dentro do objeto causa erro silencioso.

---

### Regras visuais (cores em formato ExcelJS ARGB):

| Elemento | Fill | Font | Borda esquerda |
|----------|------|------|----------------|
| Seções (títulos) | `FF00203E` navy | `FFCC915E` gold bold | hair `FFF0EDE8` |
| Header linhas 1-2 | `FF00203E` navy | L1: `FFF3EEE4` cream / L2: `FFCC915E` gold | hair |
| Labels col B | `FFFFFFFF` branco | `FF00203E` navy bold | hair `FFF0EDE8` |
| Pré-preenchido | `FFF8F6F2` creme | `FF333333` cinza | `medium FFCC915E` gold |
| Editável | `FFFFFFFF` branco | `FF333333` cinza | `thin FFD5CFC6` cinza |
| Passos (texto) | `FFFFFFFF` branco | `FFBBBBBB` cinza claro | hair |
| Footer | `FFF3EEE4` creme | `FF00203E` navy 7pt | hair |

- **Fonte:** Montserrat 10pt em tudo (`name: 'Montserrat'`)
- **Sem linhas de grade:** `views: [{ showGridLines: false }]`
- **Orientação:** paisagem, fit to page
- **Logo:** REMOVIDA — ExcelJS browser distorce imagens (decisão 07/04/2026)

---

### Erros encontrados e corrigidos durante implementação:

| Erro | Causa | Correção |
|------|-------|----------|
| `Cannot set properties of undefined (setting 'marked')` | `ws.addImage` com `ext` em pixels (formato inválido no browser) | Removido completamente |
| Listas suspensas não funcionavam | `sqref` dentro do objeto em vez de como 1º argumento | `ws.dataValidations.add('H43:H52', {...})` |
| Build fail: `Syntax error "` `` ` `` `"` | Backtick escapado (`\``) gerado pelo Python ao criar o arquivo | Substituição direta da string |

---

## Notas Técnicas

- **`crit` é INTEGER** — sempre usar `String()` ao comparar
- **ModalAtualizar** recebe props: `row`, `onClose`, `onSaved`, `areas`, `projeto`
- **Status workflow:** `rascunho`, `em_revisao`, `aprovado`, `reprovado`, `em_analise`, `teste_pendente`
- **ExcelJS** instalado via npm — import: `import ExcelJS from 'exceljs'`
- **Montserrat** obrigatório em tudo — SEM itálico
- **Navegação Por Área** usa `area.id` (UUID) na rota
- **Workflow Claude:** mockup → aprovação → código → push Vercel
- **GitHub bloqueado no Claude** → upload direto de arquivos JSX
- **Após deploy Vercel:** abrir aba nova (cache resolvido com headers)
- **Refresh em rotas SPA:** resolvido com `rewrites` no vercel.json
- **RLS:** `admin_polimata` tem NULL `cliente_id` — políticas devem contemplar isso
- **DELETE policy** na tabela `mrc` necessária para ImportarMRC funcionar
- **ExcelJS no browser:** não usar `ext` em pixels no addImage; usar `br` (TwoCellAnchor)
  ou remover — suporte a imagens é limitado e distorce

---

## Polímata Brand no Excel (referência rápida)
```
Fonte:    Montserrat (name: 'Montserrat', size: 10)
NAVY:     FF00203E   GOLD:   FFCC915E   CREAM:  FFF3EEE4
F8:       FFF8F6F2   WHITE:  FFFFFFFF   GRAY33: FF333333
GRAYBB:   FFBBBBBB
HAIR brd: FFF0EDE8   GOLD brd medium: FFCC915E   GRAY brd thin: FFD5CFC6
```

---

## Pendências (próxima sessão)

1. **Testar Ficha Excel v5** end-to-end — listas suspensas, dados preenchidos, download
2. **Configurar domínio** polimatagrc.com.br no Vercel
3. **Tema escuro** — avaliar extensão para telas além do Dashboard
4. **PWA offline** — funcionamento sem internet + sincronização
5. Upload e leitura de ficha preenchida (resultado do teste volta pro sistema)
6. Export Excel/PDF da MRC completa
7. Integrar engine de cálculo na MRC (peso real no modal)
8. Workflow aprovação (rascunho → em_revisao → aprovado)
9. Flow "Novo Projeto" — ao criar, configurar sistemas/ferramentas por cliente
   (alimenta dropdown "Sistema" na Ficha por cliente)
10. Revisão de criticidade F3 e regressão (lógica não implementada)
11. Access control suspensos

---

## Histórico de Sessões

| Sessão | Data | O que foi feito |
|--------|------|----------------|
| 1 | 03/04 | Dashboard + Visão Geral + Por Área (telas base) |
| 2 | 04/04 | ModalAtualizar mockup + ImportarMRC fix |
| 3 | 06/04 | ModalAtualizar completo (3 steps, UI, contraste) + cache busting tentado (revertido) |
| 4 | 07/04 | **Debug completo:** ✅ Cache via vercel.json + vite.config.js · ✅ React #300 (useMemo fora de ordem no PorArea) · ✅ Validação campos obrigatórios todos os steps · ✅ Ficha Excel v5 (ExcelJS, fiel ao modelo) · ✅ Logo removida (distorção) · ✅ Listas suspensas ✓/✗, Efetivo/Inefetivo/GAP, Sim/Não · ✅ Coluna A=2.36 ambas abas · ✅ 404 no refresh de /area/:id resolvido com rewrite SPA |
