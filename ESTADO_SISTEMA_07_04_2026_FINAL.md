# ESTADO DO SISTEMA — CI Polímata
> Atualizado em: 07/04/2026 — sessão FINAL (todos os bugs + novas features mapeadas)
> Cole no início de cada novo chat para retomar sem perda de contexto.

---

## Stack & Infra
- **Frontend:** React + Vite
- **Backend:** Supabase (PostgreSQL, Auth, Storage, RLS)
- **Deploy Produção:** Vercel auto-deploy branch `master` → polimata-ci.vercel.app
- **Deploy Teste:** Vercel auto-deploy branch `dev` → polimata-ci-dev.vercel.app ✅ (criado 07/04)
- **Repo:** github.com/julianapolimata/polimata-ci (público)
- **Branches:** `master` (produção) | `dev` (desenvolvimento/teste)
- **Supabase project:** iqtkpyrpwxypwcwrhulx
- **Local:** C:\projetos\polimata-fresh\polimata-ci
- **Admin:** juliana@polimatagrc.com.br
- **Git push produção:** `git push origin master --force`
- **Git push dev:** `git push origin dev`
- **Workflow branches:** desenvolver em `dev` → testar em polimata-ci-dev.vercel.app → merge para `master`
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
- Por Área: 14+ áreas colapsáveis (UUID), **ordenadas alfabeticamente** ✅
- Operação: MRC Completa (badge total)
- Administração: Configurações (admin only) | Importar MRC (admin only)

### 1. Dashboard Maturidade (rota `/`) — TEMA ESCURO
- Gauge + KPIs + Ranking por Área + Mapa de Calor + Tabela Criticidade por Área

### 2. Visão Geral (rota `/visao-geral`)
- 4 cards: Total | Efetivo | Inefetivo | GAP
- Tabela Resumo por Área + linha TOTAL

### 3. Por Área (rota `/area/:areaId`)
- 5 KPIs + Heatmap + Filtros + tabela MRC 23 colunas
- Botão "Ver" → ModalDetalhe
- Botão "Atualizar" → ModalAtualizar ✅
- **Botão "Novo Risco" → ModalNovoRisco** 🔴 PENDENTE (próxima sessão)
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
## ✅ BUGS CORRIGIDOS NESTA SESSÃO (07/04/2026)
## ═══════════════════════════════════════════════

### 1. 404 ao dar Refresh em /area/:id
**Causa:** Vercel sem `rewrites` tratava rotas SPA como arquivos estáticos.
**Solução:** `rewrites` no vercel.json com `/((?!assets/).*)` → `/index.html`

### 2. Cache/Reload após Deploy
**Causa:** headers Cache-Control ausentes/incorretos.
**Solução:** `no-cache, no-store` para index.html e rotas; `immutable` para /assets/*
Hash explícito nos assets via `vite.config.js`.

### 3. React Error #300 (Tela Preta em /area/:id)
**Causa:** `useMemo` declarados após `if (!area) return` no componente `PorArea`.
**Solução:** Mover ambos os `useMemo` para antes de qualquer `return` condicional,
usando `area?.controles || []` com optional chaining.

### 4. Sidebar não atualizava ao criar área nova
**Causa:** `ClientesConfig` salva área mas `Dashboard` não sabia do evento.
**Solução:** `ClientesConfig.salvarArea()` dispara
`window.dispatchEvent(new CustomEvent('polimata:areas-updated'))`.
`Dashboard` tem `useEffect` com listener que chama `loadDados()` ao receber o evento.
Cleanup correto com `removeEventListener` no return do useEffect.

### 5. Área com peso 0% sendo aceita
**Causa:** `AreaForm` só validava `nome` no botão Salvar.
**Solução — 3 camadas:**
- Campo peso: borda vermelha + mensagem "Peso deve ser maior que 0%" em tempo real
- Botão Salvar: `disabled` se `!(parseFloat(form.peso) > 0)`
- `salvar()` do NovoClienteForm: valida antes de enviar ao Supabase

### 6. Áreas fora de ordem alfabética na sidebar
**Causa:** `loadDados` usava a ordem retornada pelo Supabase (por `ordem`).
**Solução:** `sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))` após calcular `res`.

### 7. Erros na Ficha Excel (sessão anterior)
- `Cannot set properties of undefined (setting 'marked')`: addImage com `ext` em pixels → removido
- Listas suspensas: `sqref` dentro do objeto → API correta: `ws.dataValidations.add('range', {...})`
- Backtick escapado no filename do download

---

## ═══════════════════════════════════════════════
## ✅ IMPLEMENTADO: MODAL ATUALIZAR COMPLETO
## ═══════════════════════════════════════════════

### Arquivo: `src/components/ModalAtualizar.jsx`
### Props: `row`, `onClose`, `onSaved`, `areas`, `projeto`
### Dependência: `import ExcelJS from 'exceljs'`

### Fluxo 3 Steps:
**STEP 1 — RISCO:**
- Q1: Status mudou? → Não → Q2 | Sim → Evitado (justificativa) ou Transferido (área+sub destino)
- Q2: Descritivo mudou? → Não → Step 2 | Sim → nova descrição

**STEP 2 — CONTROLE:**
- Q: Descritivo mudou? → Não → Step 3 | Sim → nova desc + 6 características + 6 premissas

**STEP 3 — EXECUTAR TESTE:**
- Salvar + Baixar Ficha → `em_analise` + Excel
- Salvar sem Ficha → `teste_pendente`

### Validações (IIFEs):
```js
canAdvanceStep1: statusChoice + subitens do path escolhido
canAdvanceStep2: ctrlDescChoice + se sim: desc + 4 chars + premissas (exceto quem se Automatizado)
```

### Funções save:
- `handleEvitar()` → `status_risco='evitado'`, `ativo=false`
- `handleTransferido()` → insert destino + update original `status_risco='transferido'`, `ativo=false`
- `handleSaveFicha()` → update + `em_analise` + `gerarFichaExcel()`
- `handleSaveSemFicha()` → update + `teste_pendente`

---

## ═══════════════════════════════════════════════
## ✅ IMPLEMENTADO: FICHA DE RISCO EXCEL v5
## ═══════════════════════════════════════════════

### Função `gerarFichaExcel()` dentro de `ModalAtualizar.jsx`
### Modelo: `Ficha_de_Risco_C_COM_07.xlsx` replicado integralmente

### 2 abas: `📋 Ficha de Risco` (61 linhas) + `Teste`
### Colunas: A=2.36 | B=34 | C=20 | D=22 | E=20 | F=22 | G=20 | H=10 | I=28

### Listas suspensas:
```js
ws.dataValidations.add('H43:H52', { type:'list', formulae:['"✓,✗"'] })
ws.dataValidations.add('C56:I56', { type:'list', formulae:['"Efetivo,Inefetivo,GAP"'] })
ws.dataValidations.add('C58:I58', { type:'list', formulae:['"Sim,Não"'] })
```
⚠️ API ExcelJS browser: range é o 1º argumento, NÃO dentro do objeto.

### Cores (ARGB):
```
NAVY=FF00203E  GOLD=FFCC915E  CREAM=FFF3EEE4  F8=FFF8F6F2
Hair border=FFF0EDE8  Gold border medium=FFCC915E  Gray border thin=FFD5CFC6
```
### Logo: REMOVIDA (distorção no ExcelJS browser — decisão definitiva)

---

## ═══════════════════════════════════════════════
## 🔴 PRÓXIMA SESSÃO — MODAL NOVO RISCO (F1)
## ═══════════════════════════════════════════════

### Arquivo a criar: `src/components/ModalNovoRisco.jsx`
### Workflow: mockup HTML → aprovação visual → JSX → push dev → teste → push master

### Fluxo completo validado:

**Campos sempre presentes:**
- Subprocesso (dropdown dos cadastrados na área via Supabase)
- Gerência (dropdown dos gerentes cadastrados)
- Resp. Subprocesso (texto ou dropdown)
- Ref. Risco (sugerida: `R.{PREFIXO}.{N+1}`, editável)
- Ref. Controle (sugerida: `C.{PREFIXO}.{N+1}`, editável)
- Descrição do risco
- Resultado F1: Efetivo / Inefetivo / **GAP**

**Se GAP** (sem controle — risco sem controle identificado):
- Impacto + Probabilidade → Criticidade calculada automaticamente (exibida)
- Plano de Ação obrigatório: descrição (`dem_pa`), responsável (`resp_pa`), prazo (`dt_pa`), status (`st_pa`)
- *(sem campos de controle)*

**Se Efetivo ou Inefetivo** (controle existe):
- Descrição do controle (`dc`)
- 6 Características: Categoria, Frequência, Natureza, Característica, Sistema, Controle Chave
- 6 Premissas: Quem (N/A se Automatizado), Quando, Por quê, Como, Onde, Resultado
- Passos do teste (`passos_f1`)
- Inconsistência (`incons`) + Recomendação (`rec`)
- Impacto + Probabilidade → Criticidade calculada automaticamente (exibida)
- Se **Inefetivo** → Plano de Ação obrigatório (mesmos campos acima)

### Lógica criticidade automática:
```
Impacto × Probabilidade → matriz 4×4 → INTEGER 1-4 + label
4=Crítico, 3=Significativo, 2=Moderado, 1=Baixo
Exibir badge colorido em tempo real ao selecionar imp+prob
```

### Lógica refs automáticas:
```js
// Buscar maior número existente na área
const refs = await supabase.from('mrc').select('rr').eq('area_id', areaId)
const numeros = refs.data.map(r => parseInt(r.rr.split('.').pop())).filter(n => !isNaN(n))
const proximo = numeros.length > 0 ? Math.max(...numeros) + 1 : 1
const refRisco = `R.${prefixo}.${String(proximo).padStart(2,'0')}`
const refControle = `C.${prefixo}.${String(proximo).padStart(2,'0')}`
```

### Status workflow ao salvar:
- `status_workflow: 'rascunho'`
- `status_risco: 'existente'`
- `ativo: true`
- `criado_por: perfil.id`
- `criado_em: new Date().toISOString()`

### Onde aparece o botão "Novo Risco":
- Tela Por Área (`/area/:areaId`), ao lado dos filtros
- Visível apenas para `admin_polimata` e `consultor_polimata`

---

## ═══════════════════════════════════════════════
## 🔴 PENDENTE: SELETOR DE PAPEL (ver como cliente)
## ═══════════════════════════════════════════════

Dropdown no topo da tela (visível só para `admin_polimata`) que simula temporariamente
o papel de `gestor_cliente` ou `usuario_cliente` — sem alterar o banco, apenas um
estado React local que substitui `perfil.papel` na renderização.

Útil para: ver exatamente o que o cliente vai enxergar antes de liberar acesso.

---

## ═══════════════════════════════════════════════
## 🔴 PENDENTE: REVISÃO DE CRITICIDADE
## ═══════════════════════════════════════════════

### Regra metodológica validada:
- Criticidade é avaliada APÓS o resultado do teste ser informado
- **GAP**: pode avaliar imediatamente (sem controle, risco exposto)
- **Efetivo/Inefetivo**: só após `r1` preenchido
- A criticidade reflete a eficácia do controle atrelado ao risco

### Dois momentos não implementados:
1. **Regressão** (F2+): controle Inefetivo → criticidade aumenta (maior prob. materialização)
2. **F3**: baseado em evidências acumuladas

---

## Notas Técnicas

- **`crit` é INTEGER** — sempre usar `String()` ao comparar
- **ModalAtualizar** props: `row`, `onClose`, `onSaved`, `areas`, `projeto`
- **Status workflow:** `rascunho`, `em_revisao`, `aprovado`, `reprovado`, `em_analise`, `teste_pendente`
- **ExcelJS** instalado via npm — `import ExcelJS from 'exceljs'`
- **Montserrat** obrigatório em tudo — SEM itálico
- **Navegação Por Área** usa `area.id` (UUID) na rota
- **Workflow:** sempre mockup → aprovação → código → push dev → teste → push master
- **GitHub bloqueado no Claude** → upload direto de arquivos JSX
- **RLS:** `admin_polimata` tem NULL `cliente_id` — políticas devem contemplar isso
- **DELETE policy** na tabela `mrc` necessária para ImportarMRC funcionar
- **ExcelJS no browser:** não usar `ext` em pixels no addImage — suporte limitado
- **CustomEvent `polimata:areas-updated`:** disparado pelo ClientesConfig, ouvido pelo Dashboard

---

## Polímata Brand no Excel
```
Fonte: Montserrat (name: 'Montserrat', size: 10)
NAVY=FF00203E  GOLD=FFCC915E  CREAM=FFF3EEE4
F8=FFF8F6F2  WHITE=FFFFFFFF  GRAY33=FF333333  GRAYBB=FFBBBBBB
Hair=FFF0EDE8  Gold brd medium=FFCC915E  Gray brd thin=FFD5CFC6
```

---

## Ambiente de Teste
- **Branch:** `dev` (criada 07/04/2026)
- **URL dev:** polimata-ci-dev.vercel.app (pendente confirmação deploy)
- **Workflow:** `git checkout dev` → desenvolve → `git push origin dev` → testa
- **Promoção:** `git checkout master` → `git merge dev` → `git push origin master --force`

---

## Pendências (próxima sessão — em ordem de prioridade)

1. **✅ Ambiente dev** — branch criada, aguarda confirmação Vercel
2. **🔴 Modal Novo Risco (F1)** — mockup primeiro, depois JSX
3. **🔴 Seletor de papel** — dropdown admin para simular visão do cliente
4. **🔴 Revisão criticidade** — regressão F2+ e F3 (mais complexo)
5. **🔴 Upload ficha preenchida** — resultado do teste volta pro sistema
6. **🔴 Export Excel/PDF da MRC** completa
7. **🔴 Workflow aprovação** — rascunho → em_revisao → aprovado
8. **🔴 Flow "Novo Projeto"** — configurar sistemas por cliente
9. **🔴 PWA offline** — funcionamento sem internet

---

## Histórico de Sessões

| Sessão | Data | O que foi feito |
|--------|------|----------------|
| 1 | 03/04 | Dashboard + Visão Geral + Por Área |
| 2 | 04/04 | ModalAtualizar mockup + ImportarMRC fix |
| 3 | 06/04 | ModalAtualizar completo + cache busting (revertido) |
| 4 | 07/04 | **6 bugs corrigidos** · Ficha Excel v5 · Branch dev criada · Sidebar alfabética · Validação peso áreas · Novo Risco mapeado completo |
