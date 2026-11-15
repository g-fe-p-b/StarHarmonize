-- Rode no SQL Editor (depois do schema.sql).
create table procedimentos (
  id uuid primary key default gen_random_uuid(),
  nome text not null unique check (char_length(nome) <= 120),
  duracao_min int not null check (duracao_min between 5 and 480)
);
alter table agendamentos add column duracao_min int not null default 60
  check (duracao_min between 5 and 480);

alter table procedimentos enable row level security;
create policy "so esteticista" on procedimentos for all using (is_esteticista()) with check (is_esteticista());
grant select, insert, update, delete on procedimentos to authenticated;

-- AJUSTE as durações conforme o catálogo (60 é só um valor provisório):
insert into procedimentos (nome, duracao_min) values
  ('Botox', 60), ('Peeling', 60), ('Limpeza Facial', 60);

-- Teste: um agendamento de exemplo para hoje às 14h (troque o nome/telefone se quiser).
-- insert into clientes (nome, telefone) values ('Cliente Teste', '5519999999999');
-- insert into agendamentos (cliente_id, procedimento, data_hora, duracao_min)
-- select id, 'Peeling', date_trunc('day', now()) + interval '14 hours', 60 from clientes where telefone='5519999999999';
