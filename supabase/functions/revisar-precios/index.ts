// Revisión automática de precios. La llama pg_cron cada hora con un secreto;
// el secreto lo validan las funciones SQL cron_* en la base de datos.
import { extraer } from "../_shared/extraer.ts";

const URL_SB = Deno.env.get("SUPABASE_URL")!;
const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;

async function rpc(nombre: string, args: Record<string, unknown>) {
  const r = await fetch(`${URL_SB}/rest/v1/rpc/${nombre}`, {
    method: "POST",
    headers: { apikey: ANON, Authorization: `Bearer ${ANON}`, "Content-Type": "application/json" },
    body: JSON.stringify(args),
  });
  if (!r.ok) throw new Error(`${nombre}: ${r.status} ${await r.text()}`);
  const t = await r.text();
  return t ? JSON.parse(t) : null;
}

Deno.serve(async (req) => {
  let secreto = "", probar = "";
  try { const b = await req.json(); secreto = b.secreto ?? ""; probar = b.probar ?? ""; } catch { /* sin cuerpo */ }
  if (!secreto) return new Response("No autorizado", { status: 403 });

  let pendientes: { id: string; url: string }[];
  try {
    pendientes = await rpc("cron_ofertas_pendientes", { p_secreto: secreto, p_limite: probar ? 0 : 30 });
  } catch {
    return new Response("No autorizado", { status: 403 });
  }

  // Modo diagnóstico: devuelve lo que se extrae de una URL sin guardar nada
  if (probar) {
    try {
      return new Response(JSON.stringify(await extraer(probar)), { headers: { "Content-Type": "application/json" } });
    } catch (e) {
      return new Response(JSON.stringify({ error: String(e) }), { headers: { "Content-Type": "application/json" } });
    }
  }

  const resultados: unknown[] = [];
  const cola = [...pendientes];
  async function trabajador() {
    while (cola.length) {
      const o = cola.shift()!;
      try {
        const d = await extraer(o.url);
        await rpc("cron_registrar", {
          p_secreto: secreto, p_oferta: o.id, p_precio: d.precio, p_precio_original: d.precioOriginal,
          p_disponible: d.disponible, p_error: d.precio == null ? (d.bloqueado ? "La tienda bloqueó la lectura" : "No se encontró el precio") : null,
        });
        resultados.push({ id: o.id, precio: d.precio });
      } catch (e) {
        await rpc("cron_registrar", {
          p_secreto: secreto, p_oferta: o.id, p_precio: null, p_precio_original: null, p_disponible: null,
          p_error: e instanceof Error ? e.message.slice(0, 200) : "Error",
        }).catch(() => {});
        resultados.push({ id: o.id, error: String(e) });
      }
    }
  }
  await Promise.all([trabajador(), trabajador(), trabajador(), trabajador()]);
  return new Response(JSON.stringify({ revisadas: resultados.length, resultados }), {
    headers: { "Content-Type": "application/json" },
  });
});
