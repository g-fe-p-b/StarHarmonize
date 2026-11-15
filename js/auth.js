import { db } from "./config.js";

const erro = document.getElementById("erro");
let tentativas = 0;

document.getElementById("form").addEventListener("submit", async (e) => {
  e.preventDefault();
  if (tentativas >= 5) { erro.textContent = "Muitas tentativas. Aguarde um minuto."; return; }
  const { error } = await db.auth.signInWithPassword({
    email: document.getElementById("email").value.trim(),
    password: document.getElementById("senha").value,
  });
  if (error) {
    tentativas++;
    erro.textContent = "E-mail ou senha incorretos."; // mensagem genérica de propósito
    if (tentativas >= 5) setTimeout(() => (tentativas = 0), 60000);
    return;
  }
  location.replace("painel.html");
});
