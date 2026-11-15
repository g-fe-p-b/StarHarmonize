-- Rode no SQL Editor (depois do migracao-2 e do procedimentos-catalogo).
alter table procedimentos add column regiao text check (regiao in ('Facial','Corporal','Capilar'));
alter table procedimentos add column valor numeric(10,2) check (valor >= 0);   -- preencha quando tiver os preços
alter table clientes add column data_nascimento date;                          -- para o gráfico por faixa etária

update procedimentos set regiao = 'Corporal' where nome in ('Summer Light','Bumbum Up','Ultrassom Macrofocado Corporal',
  'Aplicação de Enzimas Redutoras','Aplicação de Enzimas para Celulite','Tratamento para Flacidez Corporal','Skinbooster Corporal',
  'Protocolo de Estrias com Enzimas Específicas','Tratamento de Emagrecimento com Enzimas','Protocolo Pele de Vidro Corporal');
update procedimentos set regiao = 'Facial' where nome in ('Botox Full Face','Preenchimento Ácido Hialurônico','Lipo Enzimática de Papada',
  'Bioestimulador Harmonize Gold','Fios de PDO','Ultrassom Microfocado Facial','Tratamento para Flacidez Facial','Skinbooster Facial',
  'Protocolo Pele de Vidro Facial','Limpeza de Pele Star','Peeling Químico','Microagulhamento');
update procedimentos set regiao = 'Capilar' where nome in ('Intradermoterapia Capilar','Microagulhamento Capilar com Ativos','Fios de PDO Capilar');
