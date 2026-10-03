-- Ejecutar después de payments-v2-hardening.sql y yape-mp-exclusion-v2.sql.
-- Sustituye manual-payment-guard-v1.sql, tanto si ya se ejecutó como si no.
-- Los registros pendientes históricos no se modifican: conciliarlos desde Administración.
begin;

create or replace function public.guard_manual_payment_balance()
returns trigger
language plpgsql
security definer
set search_path=''
as $$
declare
  v_total integer;
  v_paid integer;
  v_quote_required boolean;
  v_order_status text;
begin
  if new.provider <> 'manual' or new.status <> 'pending' then
    return new;
  end if;

  -- Un pago pendiente heredado puede editarse o rechazarse sin bloquear la conciliación.
  if tg_op = 'UPDATE'
     and old.status = 'pending'
     and new.order_id is not distinct from old.order_id
     and new.provider is not distinct from old.provider
     and new.method is not distinct from old.method
     and new.amount_cents is not distinct from old.amount_cents then
    return new;
  end if;

  -- Comparte el bloqueo por pedido con los triggers de sincronización y de canales.
  select total_cents, deposit_cents, quote_required, status
  into v_total, v_paid, v_quote_required, v_order_status
  from public.orders
  where id = new.order_id
  for update;

  if not found then
    return new; -- La clave foránea comunicará el pedido inexistente.
  end if;

  -- En un cambio de confirmado a pendiente, deposit_cents todavía incluye
  -- este mismo pago. El trigger AFTER lo recalculará al finalizar el UPDATE.
  if tg_op = 'UPDATE' then
    if old.status = 'confirmed'
       and old.order_id is not distinct from new.order_id then
      v_paid := v_paid - old.amount_cents;
    end if;
  end if;

  if v_order_status = 'Cancelado' or v_quote_required then
    raise exception 'Confirma el precio de un pedido activo antes de registrar pagos'
      using errcode='22023';
  end if;
  if v_total <= v_paid then
    raise exception 'El pedido ya no tiene saldo pendiente'
      using errcode='22023';
  end if;
  if new.amount_cents > v_total - v_paid then
    raise exception 'El pago supera el saldo pendiente'
      using errcode='22023';
  end if;

  if new.method = 'yape' and exists (
    select 1 from public.payments p
    where p.order_id = new.order_id
      and p.id <> new.id
      and p.provider = 'manual'
      and p.method = 'yape'
      and p.status = 'pending'
  ) then
    raise exception 'Ya hay un Yape pendiente de verificación para este pedido'
      using errcode='22023';
  end if;

  return new;
end;
$$;

revoke all on function public.guard_manual_payment_balance() from public;

drop trigger if exists guard_manual_payment_balance_trigger on public.payments;
create trigger guard_manual_payment_balance_trigger
before insert or update of status, amount_cents, provider, method, order_id
on public.payments
for each row execute function public.guard_manual_payment_balance();

-- Marca verificable por la interfaz: un archivo en GitHub no demuestra que se ejecutó en Supabase.
create table if not exists public.payment_schema_versions (
  version text primary key,
  applied_at timestamptz not null default now()
);
alter table public.payment_schema_versions enable row level security;
revoke all on public.payment_schema_versions from anon, authenticated;
grant select on public.payment_schema_versions to authenticated;
drop policy if exists "Admin payment schema versions read" on public.payment_schema_versions;
create policy "Admin payment schema versions read"
on public.payment_schema_versions for select to authenticated
using ((select public.is_admin()));

insert into public.payment_schema_versions(version)
values ('manual-payment-guard-v2')
on conflict (version) do nothing;

commit;
