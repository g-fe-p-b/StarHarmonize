import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.58.0/+esm";

// A chave "anon" é pública por design. A proteção real está nas políticas RLS do schema.sql.
// NUNCA coloque a chave "service_role" aqui.
const SUPABASE_URL = "https://jivtmudjbralcjrrlvnq.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_76aIAmGqkGCsB3wvyE8xLw_cCO7svTx";

export const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export async function exigirLogin() {
  const { data } = await db.auth.getSession();
  if (!data.session) { location.replace("index.html"); throw new Error("sem sessão"); }
  const { data: ok } = await db.from("esteticistas").select("user_id").maybeSingle();
  if (!ok) { await db.auth.signOut(); location.replace("index.html"); throw new Error("sem permissão"); }
}

export function el(tag, texto, classe) {
  const e = document.createElement(tag);
  if (texto !== undefined) e.textContent = texto; // textContent evita XSS
  if (classe) e.className = classe;
  return e;
}
