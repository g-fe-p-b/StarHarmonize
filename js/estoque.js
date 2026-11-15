import { db, exigirLogin, el } from "./config.js";

await exigirLogin();

const $ = (id) => document.getElementById(id);
let produtos = [];
let filtro = "todos";
let confirmandoId = null;

async function carregar() {
  const { data, error } = await db.from("produtos").select("*").order("nome");
  if (error) { $("erro").textContent = "Não foi possível carregar o estoque."; return; }
  produtos = data;
  desenhar();
}

function desenhar() {
  desenharResumo();
  const termo = $("busca").value.trim().toLowerCase();
  const lista = $("lista");
  lista.replaceChildren();
  const visiveis = produtos.filter((p) =>
    p.nome.toLowerCase().includes(termo) && (filtro === "todos" || p.quantidade <= p.minimo));
  if (!visiveis.length) lista.append(el("p", produtos.length ? "Nenhum produto encontrado." : "Nenhum produto cadastrado.", "vazio"));
  for (const p of visiveis) lista.append(cartao(p));
}

function desenharResumo() {
  const baixos = produtos.filter((p) => p.quantidade <= p.minimo).length;
  const unidades = produtos.reduce((s, p) => s + p.quantidade, 0);
  const c = (v, r, cls) => { const d = el("div"); d.append(el("strong", v), el("span", r)); if (cls) d.className = cls; return d; };
  $("resumo").replaceChildren(
    c(String(produtos.length), "produtos cadastrados"),
    c(String(unidades), "unidades em estoque"),
    c(String(baixos), "com estoque baixo", baixos ? "alerta" : "")
  );
}

function cartao(p) {
  const baixo = p.quantidade <= p.minimo;
  const item = el("div", undefined, `item produto ${baixo ? "critico" : ""}`);
  const info = el("div");
  const topo = el("strong", p.nome);
  const nivel = el("div", undefined, "nivel");
  const barra = el("div", undefined, "nivel-barra");
  barra.style.width = `${Math.min(100, (p.quantidade / Math.max(p.minimo * 2, 1)) * 100)}%`;
  nivel.append(barra);
  info.append(topo, el("small", baixo ? `Estoque baixo (aviso em ${p.minimo})` : `Aviso em ${p.minimo} un.`, baixo ? "baixo" : ""), nivel);

  const menos = el("button", "−", "sec"); menos.setAttribute("aria-label", `Retirar uma unidade de ${p.nome}`);
  const mais = el("button", "+"); mais.setAttribute("aria-label", `Adicionar uma unidade de ${p.nome}`);
  const qtd = el("input"); qtd.type = "number"; qtd.min = "0"; qtd.max = "100000"; qtd.value = p.quantidade;
  qtd.className = "qtd"; qtd.setAttribute("aria-label", `Quantidade de ${p.nome}`);
  menos.addEventListener("click", () => ajustar(p, p.quantidade - 1));
  mais.addEventListener("click", () => ajustar(p, p.quantidade + 1));
  qtd.addEventListener("change", () => ajustar(p, Number(qtd.value)));

  const excluir = el("button", confirmandoId === p.id ? "Confirmar?" : "Excluir", "sec perigo");
  excluir.addEventListener("click", async () => {
    if (confirmandoId !== p.id) { confirmandoId = p.id; desenhar(); setTimeout(() => { if (confirmandoId === p.id) { confirmandoId = null; desenhar(); } }, 4000); return; }
    const { error } = await db.from("produtos").delete().eq("id", p.id);
    confirmandoId = null;
    if (!error) carregar();
  });

  item.append(info, menos, qtd, mais, excluir);
  return item;
}

async function ajustar(p, nova) {
  const quantidade = Math.min(100000, Math.max(0, Math.floor(nova) || 0));
  const { error } = await db.from("produtos").update({ quantidade, atualizado_em: new Date().toISOString() }).eq("id", p.id);
  if (!error) carregar();
}

$("form").addEventListener("submit", async (e) => {
  e.preventDefault();
  $("erro").textContent = "";
  const { error } = await db.from("produtos").insert({
    nome: $("nome").value.trim(),
    quantidade: Number($("qtd").value),
    medida_base: $("medidaBase").value.trim(),
    minimo: Number($("min").value),
  });
  if (error) { $("erro").textContent = "Não foi possível salvar. Confira os dados."; return; }
  e.target.reset(); $("min").value = 0; carregar();
});

$("busca").addEventListener("input", desenhar);
document.querySelectorAll("[data-filtro]").forEach((b) => b.addEventListener("click", () => {
  filtro = b.dataset.filtro;
  document.querySelectorAll("[data-filtro]").forEach((x) => x.setAttribute("aria-pressed", x === b));
  desenhar();
}));
$("sair").addEventListener("click", async (e) => { e.preventDefault(); await db.auth.signOut(); location.replace("index.html"); });

carregar();
