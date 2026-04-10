# ESTADO DO SISTEMA — CI Polímata
> Atualizado em: 06/04/2026 (ModalAtualizar UI completa + Vercel issues)
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
- **Domínio próprio:** polimatagrc.com.br (pendente configuração)

---

## Identidade Visual (obrigatório)
- **Cores Navy:** #00112C / #00203E / #1D3B5C
- **Cores Dourado:** #CC915E / #A6512F / #6C2D10
- **Creme:** #F3EEE4
- **Fonte:** Montserrat para TUDO (sem exceções)
- **Cores fases:** F1=#00203E, F2=#1D3B5C, F3=#660033, F4=#660066, F5=#A6512F
- **Regra:** estrutural = marca; semântico = cores universais
- **Logo:** logotipo-2cores.png na pasta public/
- **SEM itálico** em documentos gerados

---

## Telas Implementadas

### Sidebar
- Dashboards: Dashboard Maturidade | Visão Geral
- Por Área: 14 áreas colapsáveis (UUID)
- Operação: MRC Completa
- Administração: Configurações (admin only)

### 1. Dashboard Maturidade (rota `/`) — TEMA ESCURO
- Gauge + KPIs + Ranking por Área

### 2. Visão Geral (rota `/visao-geral`)
- 4 cards: Total | Efetivo | Inefetivo | GAP
- Tabela Resumo por Área

### 3. Por Área (rota `/area/:areaId`)
- 5 KPIs + Filtros + tabela MRC 23 colunas
- Botão "Ver" → ModalDetalhe
- Botão "Atualizar" → ModalAtualizar ✅

---

## Campos Supabase — tabela `mrc`
`id`, `projeto_id`, `area_id`, `rr`, `rc`, `sub`, `ger`, `resp_sub`, `dt_ult`, `dr`, `dc`, `imp`, `prob`, `crit` (INTEGER 1-4), `crit_label`, `cat`, `freq`, `nat`, `car`, `sis`, `chave`, `passos_f1`, `r1`, `incons`, `rec`, `dem_pa`, `resp_pa`, `dt_pa`, `st_pa`, `coment_pa`, `dt_teste`, `dc_novo`, `r_ader`, `melhoria`, `incons_ader`, `coment_ader`, `st_f3`, `r3`, `incons_f3`, `rec_f3`, `area`, `status_workflow`, `criado_em`, `atualizado_em`, `criado_por`, `atualizado_por`

### Campos adicionados (01/04/2026):
- `status_risco` text DEFAULT 'existente'
- `motivo_inativacao` text
- `ativo` boolean DEFAULT true
- `transferido_de` UUID FK
- `ref_anterior` text
- `premissa_porque`, `premissa_quando`, `premissa_onde`, `premissa_quem`, `premissa_como`, `premissa_resultado`

### Constraint status_workflow:
CHECK (status_workflow = ANY (ARRAY['rascunho','em_revisao','aprovado','reprovado','em_analise','teste_pendente']))

---

## ═══════════════════════════════════════════════
## ✅ IMPLEMENTADO: MODAL ATUALIZAR (UI COMPLETA)
## ═══════════════════════════════════════════════

### Componente: src/components/ModalAtualizar.jsx
### Deploy: 06/04/2026 ✅

### Fluxo: 3 Steps Integrados

#### STEP 1: RISCO
**Pergunta 1:** "Houve alteração no STATUS do risco?"
- **Não** → Pergunta 2
- **Sim** → Opções:
  - 🚫 **Evitado** → justificativa obrigatória → inativa → encerra
  - ↗ **Transferido** → área destino + subprocesso dinâmico → cria novo → inativa original → encerra

**Pergunta 2 (se Não):** "Houve alteração no DESCRITIVO do risco?"
- **Não** → Step 2
- **Sim** → edita descrição → Step 2

#### STEP 2: CONTROLE
**Pergunta:** "Houve alteração no DESCRITIVO do controle?"
- **Não** → direto pra Step 3
- **Sim** → abre:
  - Nova descrição
  - **6 CARACTERÍSTICAS** (dropdowns): Categoria, Frequência, Natureza, Característica, Sistema, Controle Chave
  - **6 PREMISSAS** (textareas): Quem (desativado se Automatizado), Quando, Por quê, Como, Onde, Resultado

#### STEP 3: EXECUTAR TESTE
**Resumo** dos dados coletados (read-only)
**2 Opções:**
1. 📊 **Salvar e Baixar Ficha** (Status: em_analise) — TODO: gerar Excel
2. 💾 **Salvar sem Ficha** (Status: teste_pendente)

### UI/UX ✅ (06/04):
- ✅ Contraste aumentado em todos os botões
- ✅ Subprocessos dinâmicos no Transferido
- ✅ Fonte 13px fontWeight 700 nos labels
- ✅ Caixa "Salvar sem ficha" com contraste
- ✅ Border 2px selecionado vs 1px inativo

---

## ═══════════════════════════════════════════════
## 🔴 CRÍTICO — PENDÊNCIAS PRÓXIMA SESSÃO
## ═══════════════════════════════════════════════

### 1️⃣ **PÁGINA NÃO RECARREGA APÓS DEPLOY** 🔴
**Problema:** Após push no Vercel, browser carrega versão velha (cache/service worker)
**Solução tentada:** Service worker com cache busting (quebrou a app)
**Status:** Revertido — service worker removido (06/04)
**Próximo:** Implementar solução diferente:
- Opção A: Usar `reloadOnUiUpdate()` nativa do Vite
- Opção B: Headers no vercel.json com Cache-Control (sem service worker)
- Opção C: Verificação de versão via API (heartbeat)

### 2️⃣ **VALIDAÇÃO DE CAMPOS OBRIGATÓRIOS** 🔴
**Problema:** Usuário consegue avançar Step sem preencher campos obrigatórios
**Campos obrigatórios identificados:**
- **Step 1:** statusChoice (Não/Sim)
- **Step 1 Sub:** Se Evitado → motivoInativacao; Se Transferido → areaDestino + subDestino
- **Step 1 Desc:** Se descChoice === 'sim' → novaDescRisco (obrigatório)
- **Step 2:** ctrlDescChoice (Não/Sim)
- **Step 2 Characteristics:** Se ctrlDescChoice === 'sim' → editCat, editFreq, editNat, editCar (obrigatórios)
- **Step 2 Premissas:** Se ctrlDescChoice === 'sim' → todos 6 campos (obrigatórios, exceto quem se Automatizado)

**Implementar:** Função `validateStep(stepNum)` que retorna `boolean` e desativa botão "Próximo" se false

### 3️⃣ **EXCEL NÃO ESTÁ BAIXANDO** 🔴
**Problema:** Botão "Salvar e Baixar Ficha" não gera/baixa Excel
**Status:** TODO no código (linha ~770 em ModalAtualizar.jsx)
**Solução:** Implementar ExcelJS:
```javascript
async function handleSaveFicha() {
  // 1. Salvar dados no Supabase (status: em_analise)
  // 2. Gerar Ficha v5 via ExcelJS
  // 3. Download automático
}
```
**Ficha v5 estrutura** (já documentada em METODOLOGIA.md):
- Header: Logo + Polímata + Título
- Bloco 1: Identificação (cliente, projeto, fase, executor, data, revisor)
- Bloco 2: Descrição (risco, controle, área, subprocesso)
- Bloco 3: Atributos (cat, freq, nat, car, sis, chave)
- Bloco 4: 6 Premissas (editáveis)
- Bloco 5: 10 Passos de Teste (com ✓/✗ + Observação)
- Bloco 6: Resultado (4 campos)
- Bloco 7: Evidências (área livre)
- Footer: Polímata + data/hora/email

---

## Notas Técnicas
- `crit` é INTEGER — usar String() ao comparar
- ModalAtualizar recebe props: `row, onClose, onSaved, areas, projeto` (completo)
- Status workflow: rascunho, em_revisao, aprovado, reprovado, em_analise, teste_pendente
- ExcelJS já instalado via npm (pronto)
- Montserrat font obrigatória — SEM itálico
- Workflow: mockup → aprovação → código → teste local → push Vercel

---

## Próxima Sessão — Checklist
- [ ] Arrumar cache/reload após deploy (sem service worker quebrado)
- [ ] Adicionar validação de campos obrigatórios em cada step
- [ ] Implementar geração + download de Ficha Excel v5
- [ ] Testar fluxo completo end-to-end
- [ ] Deploy final no Vercel

---

## Histórico de Sessões
**Sessão 1 (03/04):** Dashboard + Visão Geral + Por Área (telas base)
**Sessão 2 (04/04):** ModalAtualizar começo (mockup) + ImportarMRC fix
**Sessão 3 (06/04):** ModalAtualizar completo (3 steps, UI, contraste) + cache busting tentado (revertido)
