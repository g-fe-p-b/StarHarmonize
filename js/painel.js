import { db, exigirLogin, el } from "./config.js";

await exigirLogin();

// ---- Configuração da agenda ----
const HORA_INI = 8;      // início do expediente
const HORA_FIM = 20;     // fim do expediente
const PX_HORA = 56;      // altura de 1 hora na grade
const FOLGA_MIN = 30;    // intervalo livre obrigatório após cada procedimento

const $ = (id) => document.getElementById(id);
const fmtHora = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" });
const fmtMes = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" });
const fmtCab = new Intl.DateTimeFormat("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit" });
const hhmm = (d) => d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
const mesmoDia = (a, b) => a.toDateString() === b.toDateString();
const inicioDoDia = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const minutosDoDia = (d) => d.getHours() * 60 + d.getMinutes();
const hm = (min) => `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;

let mesAtual = new Date(); mesAtual.setDate(1);
let diaSel = new Date();
let visao = "semana";
let agendamentos = [];

async function carregar() {
  const { data, error } = await db
    .from("agendamentos")
    .select("id, procedimento, data_hora, duracao_min, status, clientes(nome, telefone)")
    .neq("status", "cancelado")
    .order("data_hora");
  if (error) { console.error(error.message); return; }
  agendamentos = data.map((a) => ({ ...a, data: new Date(a.data_hora) }));
  desenhar();
}

function desenhar() { desenharPendentes(); desenharCalendario(); desenharResumo(); desenharGrade(); }

// ---- Pendentes ----
function desenharPendentes() {
  const box = $("pendentes");
  box.replaceChildren();
  const lista = agendamentos.filter((a) => a.status === "aguardando");
  if (!lista.length) box.append(el("p", "Nenhum agendamento aguardando.", "vazio"));
  for (const a of lista) {
    const item = el("div", undefined, `item arrastavel ${a.id === selId ? "sel" : ""}`);
    item.draggable = true;
    item.addEventListener("dragstart", (e) => iniciarArraste(e, a));
    item.addEventListener("dragend", fimArraste);
    item.addEventListener("click", () => selecionar(a));
    const info = el("div");
    info.append(el("strong", `${a.clientes.nome} · ${a.clientes.telefone}`),
                el("small", `${fmtHora.format(a.data)} · ${a.procedimento} (${a.duracao_min} min)`));
    const ok = el("button", "Confirmar");
    ok.addEventListener("click", (e) => { e.stopPropagation(); colocar(a, a.data, minutosDoDia(a.data)); });
    const no = el("button", "Recusar", "sec");
    no.addEventListener("click", (e) => { e.stopPropagation(); mudarStatus(a.id, "cancelado"); });
    item.append(info, ok, no);
    box.append(item);
  }
}

async function mudarStatus(id, status) {
  const { error } = await db.from("agendamentos").update({ status }).eq("id", id);
  if (!error) carregar();
}

// ---- Calendário mensal (dias passados em cinza) ----
function desenharCalendario() {
  $("mes").textContent = fmtMes.format(mesAtual);
  const cal = $("cal");
  cal.replaceChildren();
  const hoje = inicioDoDia(new Date());
  const inicio = new Date(mesAtual); inicio.setDate(1 - inicio.getDay());
  for (let i = 0; i < 42; i++) {
    const d = new Date(inicio); d.setDate(inicio.getDate() + i);
    const b = el("button", String(d.getDate()));
    if (d.getMonth() !== mesAtual.getMonth()) b.classList.add("fora");
    if (d < hoje) b.classList.add("passou");
    if (agendamentos.some((a) => mesmoDia(a.data, d))) b.classList.add("tem");
    if (mesmoDia(d, diaSel)) b.classList.add("sel");
    b.addEventListener("click", () => { diaSel = d; desenhar(); });
    cal.append(b);
  }
}

// ---- Horários ocupados (procedimento + 30 min de intervalo) ----
function intervalosDoDia(dia) {
  return agendamentos
    .filter((a) => mesmoDia(a.data, dia))
    .map((a) => ({ ini: minutosDoDia(a.data), fim: minutosDoDia(a.data) + a.duracao_min + FOLGA_MIN }))
    .sort((x, y) => x.ini - y.ini);
}

function proximoLivre(dia) {
  const agora = new Date();
  const hoje = mesmoDia(dia, agora);
  if (inicioDoDia(dia) < inicioDoDia(agora)) return null;
  let t = Math.max(HORA_INI * 60, hoje ? Math.ceil(minutosDoDia(agora) / 15) * 15 : 0);
  const iv = intervalosDoDia(dia);
  let mexeu = true;
  while (mexeu) {
    mexeu = false;
    for (const i of iv) if (t >= i.ini && t < i.fim) { t = i.fim; mexeu = true; }
  }
  return t < HORA_FIM * 60 ? hm(t) : null;
}

function desenharResumo() {
  const doDia = agendamentos.filter((a) => mesmoDia(a.data, diaSel));
  const minutos = doDia.reduce((s, a) => s + a.duracao_min, 0);
  const livre = proximoLivre(diaSel);
  const cartao = (valor, rotulo) => { const d = el("div"); d.append(el("strong", valor), el("span", rotulo)); return d; };
  $("resumo").replaceChildren(
    cartao(String(doDia.length), `atendimento(s) em ${fmtCab.format(diaSel)}`),
    cartao(`${Math.floor(minutos / 60)}h${String(minutos % 60).padStart(2, "0")}`, "em procedimentos"),
    cartao(livre ?? "—", "próximo horário livre")
  );
}

// ---- Grade Dia / Semana ----
function diasVisiveis() {
  if (visao === "dia") return [diaSel];
  const ini = inicioDoDia(diaSel); ini.setDate(ini.getDate() - ini.getDay());
  return Array.from({ length: 7 }, (_, i) => { const d = new Date(ini); d.setDate(ini.getDate() + i); return d; });
}

function classeDia(d) {
  const hoje = inicioDoDia(new Date());
  return inicioDoDia(d) < hoje ? "passado" : mesmoDia(d, hoje) ? "hoje" : "";
}

function posicionar(elemento, iniMin, durMin, altura) {
  const topo = Math.max(0, (iniMin - HORA_INI * 60) / 60 * PX_HORA);
  const fim = Math.min(altura, (iniMin + durMin - HORA_INI * 60) / 60 * PX_HORA);
  if (fim <= topo) return false;
  elemento.style.top = `${topo}px`;
  elemento.style.height = `${fim - topo}px`;
  return true;
}

function desenharGrade() {
  const grade = $("grade");
  grade.replaceChildren();
  const dias = diasVisiveis();
  const altura = (HORA_FIM - HORA_INI) * PX_HORA;
  grade.style.setProperty("--cols", dias.length);

  const cab = el("div", undefined, "g-cab");
  cab.append(el("span"));
  for (const d of dias) cab.append(el("span", fmtCab.format(d), classeDia(d)));

  const corpo = el("div", undefined, "g-corpo");
  const horas = el("div", undefined, "g-horas");
  horas.style.height = `${altura}px`;
  for (let h = HORA_INI; h < HORA_FIM; h++) {
    const s = el("span", `${String(h).padStart(2, "0")}:00`);
    s.style.top = `${(h - HORA_INI) * PX_HORA}px`;
    horas.append(s);
  }
  corpo.append(horas);

  for (const d of dias) {
    const col = el("div", undefined, `g-col ${classeDia(d)}`);
    col.style.height = `${altura}px`;
    col.style.backgroundSize = `100% ${PX_HORA}px`;
    ligarColuna(col, d);
    for (const a of agendamentos.filter((x) => mesmoDia(x.data, d))) {
      const ini = minutosDoDia(a.data);
      const folga = el("div", undefined, "folga");
      if (posicionar(folga, ini + a.duracao_min, FOLGA_MIN, altura)) col.append(folga);
      const bloco = el("div", undefined, `bloco ${a.status === "aguardando" ? "aguardando" : ""}`);
      bloco.append(el("b", a.procedimento),
                   el("span", `${hhmm(a.data)}–${hm(ini + a.duracao_min)} · ${a.clientes.nome}`));
      bloco.title = `${a.procedimento} · ${a.duracao_min} min · ${a.clientes.nome}`;
      bloco.draggable = true;
      bloco.addEventListener("dragstart", (e) => iniciarArraste(e, a));
      bloco.addEventListener("dragend", fimArraste);
      if (posicionar(bloco, ini, a.duracao_min, altura)) col.append(bloco);
    }
    if (mesmoDia(d, new Date())) {
      const linha = el("div", undefined, "agora");
      const m = minutosDoDia(new Date());
      if (m >= HORA_INI * 60 && m < HORA_FIM * 60) { linha.style.top = `${(m - HORA_INI * 60) / 60 * PX_HORA}px`; col.append(linha); }
    }
    corpo.append(col);
  }
  grade.append(cab, corpo);
}

// ---- Arrastar ou clicar para confirmar / remarcar ----
let arrastando = null;
let selId = null;
let previa = null;
let timerAviso;

function aviso(txt) {
  $("aviso").textContent = txt;
  clearTimeout(timerAviso);
  timerAviso = setTimeout(() => ($("aviso").textContent = ""), 6000);
}

function selecionar(a) {
  selId = selId === a.id ? null : a.id;
  $("grade").classList.toggle("posicionando", !!selId);
  aviso(selId ? "Agora clique no horário desejado na agenda." : "");
  desenharPendentes();
}

function iniciarArraste(e, a) {
  arrastando = a;
  e.dataTransfer.effectAllowed = "move";
  e.dataTransfer.setData("text/plain", a.id);
}
function limparPrevia() { previa?.remove(); previa = null; }
function fimArraste() { arrastando = null; limparPrevia(); }

function minutoNaColuna(col, e) {
  const y = e.clientY - col.getBoundingClientRect().top;
  return HORA_INI * 60 + Math.round((y / PX_HORA) * 4) * 15; // encaixa de 15 em 15 min
}

function conflito(a, ini, dia) {
  const fim = ini + a.duracao_min + FOLGA_MIN;
  return agendamentos.some((o) =>
    o.id !== a.id && o.status !== "aguardando" && mesmoDia(o.data, dia) &&
    ini < minutosDoDia(o.data) + o.duracao_min + FOLGA_MIN && minutosDoDia(o.data) < fim);
}

function ligarColuna(col, d) {
  const altura = (HORA_FIM - HORA_INI) * PX_HORA;
  col.addEventListener("dragover", (e) => {
    if (!arrastando) return;
    e.preventDefault();
    const ini = minutoNaColuna(col, e);
    limparPrevia();
    previa = el("div", `${hm(ini)}–${hm(ini + arrastando.duracao_min)}`, "previa");
    previa.classList.toggle("invalido", conflito(arrastando, ini, d));
    if (posicionar(previa, ini, arrastando.duracao_min, altura)) col.append(previa);
  });
  col.addEventListener("dragleave", (e) => { if (!col.contains(e.relatedTarget)) limparPrevia(); });
  col.addEventListener("drop", (e) => {
    e.preventDefault();
    const a = arrastando, ini = minutoNaColuna(col, e);
    fimArraste();
    if (a) colocar(a, d, ini);
  });
  col.addEventListener("click", (e) => {
    if (e.target.closest(".bloco")) return;
    const a = agendamentos.find((x) => x.id === selId);
    if (a) colocar(a, d, minutoNaColuna(col, e));
  });
}

async function colocar(a, dia, ini) {
  if (ini < HORA_INI * 60 || ini + a.duracao_min > HORA_FIM * 60) return aviso("Esse horário está fora do expediente.");
  const nova = new Date(dia.getFullYear(), dia.getMonth(), dia.getDate(), 0, ini);
  if (nova < new Date()) return aviso("Esse horário já passou.");
  if (conflito(a, ini, dia)) return aviso("Conflito com outro atendimento. Lembre do intervalo de 30 min entre eles.");
  const { error } = await db.from("agendamentos").update({ data_hora: nova.toISOString(), status: "confirmado" }).eq("id", a.id);
  if (error) return aviso("Não foi possível salvar. Tente novamente.");
  selId = null;
  $("grade").classList.remove("posicionando");
  diaSel = nova; mesAtual = new Date(nova.getFullYear(), nova.getMonth(), 1);
  aviso(`Confirmado: ${a.procedimento} às ${hm(ini)}.`);
  carregar();
}

// ---- Controles ----
function mover(dias) { diaSel = new Date(diaSel); diaSel.setDate(diaSel.getDate() + dias); mesAtual = new Date(diaSel.getFullYear(), diaSel.getMonth(), 1); desenhar(); }
function trocarVisao(v) { visao = v; $("v-dia").setAttribute("aria-pressed", v === "dia"); $("v-semana").setAttribute("aria-pressed", v === "semana"); desenharGrade(); }

$("v-dia").addEventListener("click", () => trocarVisao("dia"));
$("v-semana").addEventListener("click", () => trocarVisao("semana"));
$("g-ant").addEventListener("click", () => mover(visao === "dia" ? -1 : -7));
$("g-prox").addEventListener("click", () => mover(visao === "dia" ? 1 : 7));
$("g-hoje").addEventListener("click", () => { diaSel = new Date(); mesAtual = new Date(); mesAtual.setDate(1); desenhar(); });
$("ant").addEventListener("click", () => { mesAtual.setMonth(mesAtual.getMonth() - 1); desenharCalendario(); });
$("prox").addEventListener("click", () => { mesAtual.setMonth(mesAtual.getMonth() + 1); desenharCalendario(); });
$("sair").addEventListener("click", async (e) => { e.preventDefault(); await db.auth.signOut(); location.replace("index.html"); });

carregar();
setInterval(desenhar, 60000); // atualiza a linha de "agora"
