# ESTADO DO SISTEMA — CI Polímata
> Atualizado em: 03/04/2026 (sessão 3 — Por Área redesign v2 + ajustes gerais)
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
- **Fonte:** Montserrat para TUDO (sem exceções)
- **Cores fases:** F1=#00203E, F2=#1D3B5C, F3=#660033, F4=#660066, F5=#A6512F
- **Regra:** estrutural = marca; semântico = cores universais. NUNCA usar roxo.
- **Logo:** logotipo-2cores.png na pasta public/
- **Brandbook:** Apresentacao.pdf (referência oficial)
- **NUNCA usar itálico** em documentos gerados pelo sistema

### Cores régua maturidade (VIVAS):
- N1=#DC2626 (0–10%), N2=#EA580C (11–25%), N3=#EAB308 (26–50%), N4=#16A34A (51–80%), N5=#15803D (81–100%)

### Cores semânticas resultado (definição aprovada 03/04):
- **Efetivo = verde vivo (#22C55E)**
- **Inefetivo = amarelo (#FACC15)**
- **GAP = vermelho (#EF4444)**

### Cores criticidade:
- Crítico=#EF4444, Significativo=#F97316, Moderado=#EAB308, Baixo=#22C55E

### Barras de maturidade:
- Degradê contínuo seguindo a régua: #DC2626 → #EF4444 → #EA580C → #F97316 → #EAB308 → #84CC16 → #22C55E → #15803D
- Função `getBarGradient(pct100)` no Dashboard.jsx

---

## Telas Implementadas

### Sidebar
- Dashboards: Dashboard (renomeado de "Dashboard Maturidade")
- ~~Visão Geral~~ — **REMOVIDA** (sessão 3)
- Por Área: 14 áreas colapsáveis (navega por UUID)
- Operação: MRC Completa (badge total)
- Administração: Configurações (admin only)

### 1. Dashboard (rota `/`) — TEMA ESCURO ✅ REDESIGN v7+
- Fundo navy (#00112C)
- **HEADER:** Cliente + título + subtítulo + **última atualização global** (canto superior direito)
- **6 KPI Cards:**
  - Índice de Maturidade Consolidado · [Cliente] (dourado #CC915E, badge nível)
  - Total de Controles (creme, subtítulo áreas)
  - Efetivos (verde vivo #22C55E, % do total)
  - Inefetivos (amarelo #FACC15)
  - GAP (vermelho #EF4444, número único sem segregar)
  - Planos de Ação (gradiente dourado via div absoluto, sem borderImage — preserva borderRadius)
- **Maturidade por Área (full width):**
  - Ranking do maior ao menor %
  - Barras com degradê contínuo
  - Badge nível com cores vivas
  - **Clique navega para `/area/:areaId`** (não filtra mais o heatmap)
- **Zona inferior lado a lado:**
  - **Esquerda (~40%): Heatmap Impacto × Probabilidade 4×4**
    - Filtrável por área (clique na tabela de criticidade)
  - **Direita (~60%): Tabela Área × Criticidade**
    - Clique filtra o heatmap + botão "Limpar filtro"
    - Linha TOTAL no footer

### 2. Por Área (rota `/area/:areaId`) — ✅ REDESIGN v2 TEMA ESCURO (sessão 3)
- Fundo navy (#00112C) — mesmo tema do Dashboard
- **HEADER:** Botão "← VOLTAR" → `/` (Dashboard) + nome da área + **última atualização da área** (canto superior direito)
- **ZONA SUPERIOR — lado a lado:**
  - **Esquerda: Heatmap 4×4 compacto** (Impacto × Probabilidade, filtrado para a área)
  - **Direita: Grid 3×2 de KPI cards** (Maturidade, Total, Efetivos, Inefetivos, GAP, Planos de Ação)
  - Fontes harmonizadas: label 9px, valor 28px, sub 10px
- **Header fixo:** zona superior + filtros congelados, só tabela MRC rola
- **Filtros:** busca + criticidade + impacto + resultado F1 (tema escuro)
- **Tabela MRC 23 colunas:**
  - Colunas com larguras fixas uniformes (width + minWidth) — consistente entre todas as áreas
  - Headers com alinhamento `textAlign: 'left'` consistente
  - Scroll horizontal visível (`overflowX: 'scroll'`)
  - Badges tema escuro (Efetivo verde, Inefetivo amarelo, GAP vermelho)
- Botão "Ver" → ModalDetalhe
- Botão "Atualizar" (dourado, só admin/consultor) → ModalAtualizar ✅
- Badges "EM ANÁLISE" e "TESTE PENDENTE" ✅

### Outras telas
- Login, MRC Completa, Config Clientes/Usuários, Perfil

---

## Campos Supabase — tabela `mrc`
`id`, `projeto_id`, `area_id`, `rr`, `rc`, `sub`, `ger`, `resp_sub`, `dt_ult`, `dr`, `dc`, `imp`, `prob`, `crit` (INTEGER 1-4), `crit_label`, `cat`, `freq`, `nat`, `car`, `sis`, `chave`, `passos_f1`, `r1`, `incons`, `rec`, `dem_pa`, `resp_pa`, `dt_pa`, `st_pa`, `coment_pa`, `dt_teste`, `dc_novo`, `r_ader`, `melhoria`, `incons_ader`, `coment_ader`, `st_f3`, `r3`, `incons_f3`, `rec_f3`, `area`, `status_workflow`, `criado_em`, `atualizado_em`, `criado_por`, `atualizado_por`

### Campos adicionados (migração 01/04/2026):
- `status_risco` text DEFAULT 'existente'
- `motivo_inativacao` text
- `ativo` boolean DEFAULT true
- `transferido_de` UUID FK
- `ref_anterior` text
- `premissa_porque`, `premissa_quando`, `premissa_onde`, `premissa_quem`, `premissa_como`, `premissa_resultado`

### Constraint status_workflow:
CHECK (status_workflow = ANY (ARRAY['rascunho','em_revisao','aprovado','reprovado','em_analise','teste_pendente']))

### Tabela `mrc_audit_log`:
- id, mrc_id, campo, valor_anterior, valor_novo, usuario_id, criado_em

### Query loadDados:
- Filtra `.neq('ativo', false)`

### Campos usados no Heatmap:
- `imp` (Impacto): Crítico / Alto / Moderado / Baixo → impToIdx()
- `prob` (Probabilidade): Extrema / Alta / Média / Baixa → probToIdx()
- `crit` (Criticidade): INTEGER 1-4 (1=Baixo, 2=Moderado, 3=Significativo, 4=Crítico) → critToIdx()

---

## Engine de Cálculo
- src/lib/calculoMaturidade.js — validado
- State elevado no shell Dashboard

---

## ═══════════════════════════════════════════════
## IMPLEMENTADO: WORKFLOW DE ATUALIZAÇÃO ✅
## ═══════════════════════════════════════════════

### Componente: src/components/ModalAtualizar.jsx
### Dependência: ExcelJS (`npm install exceljs`)
### Props: row, onClose, onSaved, areas, projeto (objeto completo com clientes.nome)

### Fluxo: Step 1 (Risco) → Step 2 (Controle + 6 premissas) → Step 3 (Ficha)
### Evitado/Transferido: encerra no Step 1
### Salvar: erro tratado com alert + retorno boolean
### Status: em_analise (com ficha) / teste_pendente (sem ficha)

---

## ═══════════════════════════════════════════════
## IMPLEMENTADO: FICHA DE RISCO EXCEL v5 ✅ CONFIRMADO EM PRODUÇÃO
## ═══════════════════════════════════════════════

### Versão: v5 — push realizado e confirmado (03/04/2026)
### Gerada via ExcelJS no browser, download direto .xlsx
### Exemplo confirmado: Ficha_de_Risco_C_COM_07.xlsx

### Estrutura real (2 abas):

**Aba 1: "📋 Ficha de Risco" (61 linhas × 9 colunas, paisagem)**

Layout de colunas: A=3, B=34, C-G=20-22, H=10, I=28

**HEADER (rows 1-2):** Logo + "Polímata · Consultoria em GRC" + "FICHA DE RISCO — EXECUÇÃO DO TESTE" — Montserrat bold 10pt creme sobre navy

**SEÇÃO 1 — DADOS DO PROJETO (rows 4-12):** CLIENTE, NATUREZA, FASE, EXECUTOR, DATA, DOWNLOAD POR, REVISOR (editável), DATA REVISÃO (editável)

**SEÇÃO 2 — IDENTIFICAÇÃO (rows 14-22):** ÁREA, SUBPROCESSO, REF.RISCO, REF.CONTROLE, GERÊNCIA, RESP.SUBPROCESSO, DESC.RISCO, DESC.CONTROLE — pré-preenchido #F8F6F2 + borda esquerda medium #CC915E

**SEÇÃO 3 — ATRIBUTOS (rows 24-30):** CATEGORIA, FREQUÊNCIA, NATUREZA, CARACTERÍSTICA, SISTEMA, CONTROLE CHAVE?

**SEÇÃO 4 — PREMISSAS (rows 32-38):** 6 campos editáveis (Quem, Quando, Por Quê, Como, Onde, Resultado)

**SEÇÃO 5 — PASSOS DE TESTE (rows 40-52):** 10 linhas (Atividade + ✓/✗ + Observação)

**SEÇÃO 6 — RESULTADO (rows 55-59):** RESULTADO, INCONSISTÊNCIA, MELHORIA?, DESC.MELHORIA

**FOOTER (row 61):** Polímata + data/hora/email

**Aba 2: "Teste"** — "7. EXECUÇÃO DO TESTE E EVIDÊNCIAS" (área livre para evidências)

### Regras visuais confirmadas:
- Fundo BRANCO, sem linhas de grade
- Títulos seção: dourado (#CC915E) sobre navy (#00203E), bold
- Labels: navy bold sobre branco
- Valores pré-preenchidos: #333333 regular sobre #F8F6F2, borda esquerda medium #CC915E
- Montserrat 10pt, SEM itálico, paisagem, 1 imagem (logo)

---

## Pendências (próximo chat)
1. **Testar deploy sessão 3** — confirmar visual do Dashboard + Por Área em produção
2. **Testar navegação** — clicar em "Maturidade por Área" deve ir para `/area/:id`
3. **Testar ficha Excel v5 no browser** — verificar logo + dados em produção
4. **Configurar domínio** polimatagrc.com.br no Vercel
5. **PWA offline** — funcionamento sem internet + sincronização
6. Upload e leitura de ficha preenchida
7. Export Excel/PDF da MRC
8. Integrar engine na MRC (peso real no modal)
9. Workflow aprovação (rascunho → em_revisao → aprovado)
10. Access control suspensos
11. Flow "Novo Projeto"

---

## Notas Técnicas
- GitHub bloqueado no Claude → upload direto de arquivos
- Workflow com Claude: mockup HTML → aprovação → código JSX
- Excel: ExcelJS (instalado via npm)
- `crit` é INTEGER — sempre usar String() ao comparar
- Navegação Por Área usa area.id (UUID)
- Gerência e Responsável: DROPDOWN cadastrados (não texto livre)
- resp_sub: campo da tabela mrc (dado do controle)
- Premissas na ficha: ferramenta metodológica, NÃO alimentam o sistema
- Passos de teste: ✓/✗ (não aprovado/reprovado)
- Modal Atualizar: fundo branco (contraste com tema escuro)
- Dashboard.jsx passa `projeto` (objeto completo) pro ModalAtualizar
- CUIDADO: ao montar arquivos por partes, verificar duplicação de blocos (causou build fail 03/04)
- Dashboard.jsx: ~755 linhas (sessão 3)
- Funções helper: impToIdx(), probToIdx(), critToIdx(), getBarGradient(), getUltimaAtualizacao()
- Estado `areaFiltro` no HomeDash controla filtro do heatmap (só via tabela criticidade)
- Componentes mantidos: NivelBadge, Spinner, NoProjeto, Shell, PorArea
- Componentes removidos: FasesBoxes, GaugeBar, KpisTable, ReguaN1N5, contribFaseArea/Empresa, **VisaoGeral**
- Card "Planos de Ação": usa div absoluto com gradiente (borderImage anula borderRadius)
- PorArea: heatmap da área via `useMemo` sobre `area.controles`
- PorArea: `ultAtualArea` via `getUltimaAtualizacao(area.controles)`
- Tabela MRC: colunas com larguras fixas (width+minWidth) para uniformidade entre áreas
- Estilos separados: `dashStyles` (Dashboard), `paStyles` (PorArea), `S` (legado MRC)
