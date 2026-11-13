// Lee un enlace de producto y devuelve sus datos. Solo para miembros de la app.
import { extraer } from "../_shared/extraer.ts";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });
}

async function esMiembro(auth: string | null): Promise<boolean> {
  if (!auth) return false;
  const r = await fetch(`${Deno.env.get("SUPABASE_URL")}/rest/v1/rpc/es_miembro`, {
    method: "POST",
    headers: { apikey: Deno.env.get("SUPABASE_ANON_KEY")!, Authorization: auth, "Content-Type": "application/json" },
    body: "{}",
  });
  return r.ok && (await r.json()) === true;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  try {
    if (!(await esMiembro(req.headers.get("Authorization")))) return json({ error: "No autorizado" }, 403);
    const { url } = await req.json();
    if (!url) return json({ error: "Falta el enlace" }, 400);
    return json(await extraer(url));
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 200);
  }
});
