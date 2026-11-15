import { db, exigirLogin, el } from "./config.js";

await exigirLogin();

const $ = (id) => document.getElementById(id);
const moeda = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const fmtDataHora = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" });
const FAIXAS = [["Até 24 anos", 0, 24], ["25 a 34", 25, 34], ["35 a 44", 35, 44], ["45 a 54", 45, 54], ["55 ou mais", 55, 200]];

let modo = "mes";
let ref = new Date();

function periodo() {
  const d = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate());
  if (modo === "dia") return [d, new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1)];
  if (modo === "semana") {
    const ini = new Date(d.getFullYear(), d.getMonth(), d.getDate() - d.getDay());
    return [ini, new Date(ini.getFullYear(), ini.getMonth(), ini.getDate() + 7)];
  }
  return [new Date(d.getFullYear(), d.getMonth(), 1), new Date(d.getFullYear(), d.getMonth() + 1, 1)];
}

function rotulo([ini, fim]) {
  const f = (d, o) => d.toLocaleDateString("pt-BR", o);
  if (modo === "dia") return f(ini, { dateStyle: "full" });
  if (modo === "semana") return `${f(ini, { day: "2-digit", month: "2-digit" })} a ${f(new Date(fim - 86400000), { day: "2-digit", month: "2-digit", year: "numeric" })}`;
  return f(ini, { month: "long", year: "numeric" });
}

function idade(nasc) {
  if (!nasc) return null;
  return Math.floor((Date.now() - new Date(nasc).getTime()) / (365.25 * 86400000));
}

function barras(id, pares) {
  const box = $(id);
  box.replaceChildren();
  if (!pares.length) { box.append(el("p", "Sem dados neste período.", "vazio")); return; }
  const max = Math.max(...pares.map((p) => p[1]));
  for (const [nome, qtd] of pares) {
    const linha = el("div", undefined, "linha");
    const trilho = el("div", undefined, "trilho");
    const p = el("div", undefined, "preench");
    p.style.width = `${(qtd / max) * 100}%`;
    trilho.append(p);
    linha.append(el("span", nome), trilho, el("span", String(qtd), "num"));
    box.append(linha);
  }
}

function contar(itens, chave) {
  const m = new Map();
  for (const i of itens) m.set(chave(i), (m.get(chave(i)) ?? 0) + 1);
  return [...m.entries()].sort((a, b) => b[1] - a[1]);
}

async function carregar() {
  const per = periodo();
  $("rotulo").textContent = rotulo(per);
  const [procs, ags] = await Promise.all([
    db.from("procedimentos").select("nome, regiao, valor"),
    db.from("agendamentos")
      .select("id, procedimento, data_hora, duracao_min, status, clientes(nome, data_nascimento)")
      .in("status", ["confirmado", "concluido"])
      .gte("data_hora", per[0].toISOString()).lt("data_hora", per[1].toISOString())
      .order("data_hora", { ascending: false }),
  ]);
  if (procs.error || ags.error) { $("resumo").replaceChildren(el("p", "Não foi possível carregar o histórico.", "erro")); return; }

  const info = new Map(procs.data.map((p) => [p.nome, p]));
  const agora = new Date();
  const feitos = ags.data.filter((a) => a.status === "concluido" || new Date(a.data_hora) < agora);
  const aConcluir = feitos.filter((a) => a.status === "confirmado");
  const faturados = feitos.filter((a) => a.status === "concluido" && info.get(a.procedimento)?.valor != null);
  const total = faturados.reduce((s, a) => s + Number(info.get(a.procedimento).valor), 0);

  const cartao = (v, r) => { const d = el("div"); d.append(el("strong", v), el("span", r)); return d; };
  $("resumo").replaceChildren(
    cartao(String(feitos.length), "atendimentos realizados"),
    cartao(String(aConcluir.length), "passados, ainda não concluídos"),
    cartao(faturados.length ? moeda.format(total) : "—", faturados.length ? "faturado (concluídos)" : "faturado (valores ainda não cadastrados)")
  );

  barras("b-proc", contar(feitos, (a) => a.procedimento).slice(0, 8));
  barras("b-regiao", contar(feitos, (a) => info.get(a.procedimento)?.regiao ?? "Não classificado"));
  barras("b-idade", contar(feitos, (a) => {
    const i = idade(a.clientes?.data_nascimento);
    return i == null ? "Não informado" : FAIXAS.find(([, mi, ma]) => i >= mi && i <= ma)?.[0] ?? "Não informado";
  }));

  const lista = $("lista");
  lista.replaceChildren();
  if (!feitos.length) lista.append(el("p", "Nenhum atendimento realizado neste período.", "vazio"));
  for (const a of feitos.slice(0, 200)) {
    const item = el("div", undefined, "item");
    const infoEl = el("div");
    infoEl.append(el("strong", `${a.procedimento} · ${a.clientes?.nome ?? ""}`),
                  el("small", `${fmtDataHora.format(new Date(a.data_hora))} · ${a.duracao_min} min · ${a.status === "concluido" ? "concluído" : "a concluir"}`));
    item.append(infoEl);
    if (a.status === "confirmado") {
      const b = el("button", "Concluir");
      b.addEventListener("click", async () => {
        const { error } = await db.from("agendamentos").update({ status: "concluido" }).eq("id", a.id);
        if (!error) carregar();
      });
      item.append(b);
    }
    lista.append(item);
  }
}

function mover(n) {
  ref = new Date(ref);
  if (modo === "dia") ref.setDate(ref.getDate() + n);
  else if (modo === "semana") ref.setDate(ref.getDate() + 7 * n);
  else { ref.setDate(1); ref.setMonth(ref.getMonth() + n); }
  carregar();
}

document.querySelectorAll("[data-modo]").forEach((b) => b.addEventListener("click", () => {
  modo = b.dataset.modo;
  document.querySelectorAll("[data-modo]").forEach((x) => x.setAttribute("aria-pressed", x === b));
  carregar();
}));
$("ant").addEventListener("click", () => mover(-1));
$("prox").addEventListener("click", () => mover(1));
$("hoje").addEventListener("click", () => { ref = new Date(); carregar(); });
$("sair").addEventListener("click", async (e) => { e.preventDefault(); await db.auth.signOut(); location.replace("index.html"); });

carregar();
