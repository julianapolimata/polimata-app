-- =====================================================================
-- 2026-06-11 · pe_0005_rls (APLICADA via Supabase MCP)
-- RLS de todas as tabelas pe_*, espelhando o padrão do módulo orc_*:
--   SELECT: admin_polimata | projetos do meu cliente | projetos vinculados (perfis_projetos)
--   INSERT/UPDATE: admin_polimata | consultor_polimata vinculado ao projeto
--   DELETE: admin_polimata
-- Extra: usuários do cliente podem registrar check-ins do próprio projeto.
-- pe_assinaturas / pe_stripe_eventos: escrita SOMENTE via service role.
-- =====================================================================

do $$
declare t text;
begin
  foreach t in array array[
    'pe_unidades','pe_periodos','pe_perspectivas','pe_objetivos','pe_key_results',
    'pe_kpis','pe_iniciativas','pe_checkins','pe_kpi_valores','pe_budget_links',
    'pe_assinaturas','pe_stripe_eventos'
  ] loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end $$;

-- ---------- tabelas de negócio (padrão orc_*) ------------------------
do $$
declare t text;
begin
  foreach t in array array[
    'pe_unidades','pe_periodos','pe_perspectivas','pe_objetivos','pe_key_results',
    'pe_kpis','pe_iniciativas','pe_checkins','pe_kpi_valores','pe_budget_links'
  ] loop
    execute format($f$
      create policy %1$s_select on public.%1$I for select using (
        meu_papel() = 'admin_polimata'
        or projeto_id in (select p.id from projetos p where p.cliente_id = meu_cliente_id())
        or projeto_id in (select pp.projeto_id from perfis_projetos pp where pp.perfil_id = auth.uid())
      )$f$, t);
    execute format($f$
      create policy %1$s_insert on public.%1$I for insert with check (
        meu_papel() = 'admin_polimata'
        or (meu_papel() = 'consultor_polimata'
            and projeto_id in (select pp.projeto_id from perfis_projetos pp where pp.perfil_id = auth.uid()))
      )$f$, t);
    execute format($f$
      create policy %1$s_update on public.%1$I for update using (
        meu_papel() = 'admin_polimata'
        or (meu_papel() = 'consultor_polimata'
            and projeto_id in (select pp.projeto_id from perfis_projetos pp where pp.perfil_id = auth.uid()))
      )$f$, t);
    execute format($f$
      create policy %1$s_delete on public.%1$I for delete using (
        meu_papel() = 'admin_polimata'
      )$f$, t);
  end loop;
end $$;

-- Usuário do cliente (qualquer papel) pode registrar medição no próprio projeto
create policy pe_checkins_insert_cliente on public.pe_checkins
  for insert with check (
    projeto_id in (select p.id from projetos p where p.cliente_id = meu_cliente_id())
  );
create policy pe_kpi_valores_insert_cliente on public.pe_kpi_valores
  for insert with check (
    projeto_id in (select p.id from projetos p where p.cliente_id = meu_cliente_id())
  );

-- ---------- billing: leitura restrita, escrita só service role -------
create policy pe_assinaturas_select on public.pe_assinaturas
  for select using (
    meu_papel() = 'admin_polimata'
    or cliente_id = meu_cliente_id()
  );
-- (sem políticas de insert/update/delete: apenas service role escreve)

create policy pe_stripe_eventos_select on public.pe_stripe_eventos
  for select using (meu_papel() = 'admin_polimata');
-- (sem políticas de escrita: apenas service role)
