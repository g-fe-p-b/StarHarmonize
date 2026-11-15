-- Rode no Supabase: SQL Editor. Depois: Authentication > Providers > desative "Allow new users to sign up".
create table esteticistas (user_id uuid primary key references auth.users on delete cascade);

create table clientes (
  id uuid primary key default gen_random_uuid(),
  nome text not null check (char_length(nome) <= 120),
  telefone text not null unique check (telefone ~ '^[0-9]{10,15}$'),
  criado_em timestamptz not null default now()
);

create table agendamentos (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references clientes on delete cascade,
  procedimento text not null check (char_length(procedimento) <= 120),
  data_hora timestamptz not null,
  status text not null default 'aguardando'
    check (status in ('aguardando','confirmado','cancelado','concluido')),
  criado_em timestamptz not null default now()
);

create table produtos (
  id uuid primary key default gen_random_uuid(),
  nome text not null check (char_length(nome) <= 120),
  quantidade int not null default 0 check (quantidade >= 0),
  minimo int not null default 0 check (minimo >= 0),
  atualizado_em timestamptz not null default now()
);

create or replace function is_esteticista() returns boolean
language sql security definer set search_path = public stable as
$$ select exists (select 1 from esteticistas where user_id = auth.uid()) $$;

alter table esteticistas enable row level security;
alter table clientes enable row level security;
alter table agendamentos enable row level security;
alter table produtos enable row level security;

create policy "so esteticista" on clientes for all using (is_esteticista()) with check (is_esteticista());
create policy "so esteticista" on agendamentos for all using (is_esteticista()) with check (is_esteticista());
create policy "so esteticista" on produtos for all using (is_esteticista()) with check (is_esteticista());
create policy "ver a si mesma" on esteticistas for select using (user_id = auth.uid());

-- Depois de criar o usuário dela em Authentication > Users:
-- insert into esteticistas (user_id) values ('UUID-DO-USUARIO');
