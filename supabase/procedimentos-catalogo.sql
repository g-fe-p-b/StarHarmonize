-- Rode no SQL Editor DEPOIS do migracao-2.sql.
-- Duração em minutos. Quando o catálogo traz faixa (ex.: 60-90 min), usei o MAIOR valor,
-- para a agenda nunca ficar apertada. Procedimentos "por área" estão com 1 área.
delete from procedimentos where nome in ('Botox', 'Peeling', 'Limpeza Facial');

insert into procedimentos (nome, duracao_min) values
  -- Corporal / Verão
  ('Summer Light', 70),
  ('Bumbum Up', 90),
  -- Harmonização Facial
  ('Botox Full Face', 30),
  ('Preenchimento Ácido Hialurônico', 60),
  ('Lipo Enzimática de Papada', 20),
  ('Bioestimulador Harmonize Gold', 45),
  ('Fios de PDO', 50),
  -- Tratamentos Faciais
  ('Ultrassom Microfocado Facial', 90),
  ('Tratamento para Flacidez Facial', 60),
  ('Skinbooster Facial', 40),
  ('Protocolo Pele de Vidro Facial', 60),
  ('Limpeza de Pele Star', 70),
  ('Peeling Químico', 30),
  ('Microagulhamento', 60),
  -- Tratamento Corporal
  ('Ultrassom Macrofocado Corporal', 90),
  ('Aplicação de Enzimas Redutoras', 30),
  ('Aplicação de Enzimas para Celulite', 40),
  ('Tratamento para Flacidez Corporal', 90),
  ('Skinbooster Corporal', 45),
  ('Protocolo de Estrias com Enzimas Específicas', 40),
  ('Tratamento de Emagrecimento com Enzimas', 30),
  ('Protocolo Pele de Vidro Corporal', 60),
  -- Tratamento Capilar
  ('Intradermoterapia Capilar', 30),
  ('Microagulhamento Capilar com Ativos', 60),
  ('Fios de PDO Capilar', 75)
on conflict (nome) do update set duracao_min = excluded.duracao_min;
