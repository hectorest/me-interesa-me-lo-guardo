import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";
import { enlaceMarcador } from "./marcador.js";

// ---------------- Configuración ----------------
const SUPABASE_URL = "https://qwtogbdmzcstecxhigvq.supabase.co";
const SUPABASE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF3dG9nYmRtemNzdGVjeGhpZ3ZxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQ1NDYzNzksImV4cCI6MjExMDEyMjM3OX0.E8r72UF-xoW-IvzQC1ETMPXi3S-RmIJ0Q11vBieOQSY";
const APP_URL = location.origin + location.pathname;
// Sesión: con «Mantener la sesión iniciada» se guarda en localStorage (sobrevive a cerrar
// la app); sin ella, en sessionStorage (se cierra al cerrar la pestaña o la app).
const mantenerSesion = () => { try { return localStorage.getItem("mantener-sesion") !== "no"; } catch { return true; } };
const almacenSesion = {
  getItem: (k) => { try { return localStorage.getItem(k) ?? sessionStorage.getItem(k); } catch { return null; } },
  setItem: (k, v) => {
    try {
      const [usar, otro] = mantenerSesion() ? [localStorage, sessionStorage] : [sessionStorage, localStorage];
      usar.setItem(k, v); otro.removeItem(k);
    } catch { /* sin almacenamiento */ }
  },
  removeItem: (k) => { try { localStorage.removeItem(k); sessionStorage.removeItem(k); } catch { /* */ } },
};
const sb = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { storage: almacenSesion, persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
});

// ---------------- Estado ----------------
const E = {
  usuario: null,
  cats: [],
  prods: [],
  filtro: { cat: "todas", estado: "pendiente", tienda: "", orden: "recientes", q: "", bajadas: false },
  abiertas: new Set(leerLocal("cats-abiertas", [])),
  ultimaCarga: 0,
};

// ---------------- Utilidades ----------------
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const fmt = new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" });
const euros = (n) => (n == null || n === "" ? "—" : fmt.format(Number(n)));
const num = (v) => (v == null || v === "" ? null : Number(v));
const norm = (s) => String(s ?? "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9ñ]+/g, " ").trim();
const raiz = (w) => (w.length > 4 && w.endsWith("es") ? w.slice(0, -2) : w.length > 3 && w.endsWith("s") ? w.slice(0, -1) : w);
const VACIAS = new Set("de del la las el los y o en con para por sin un una unos unas al a mas pack set x cm mm kg gr ml color negro blanco gris azul rojo verde talla nuevo nueva".split(" "));
const fichas = (s) => norm(s).split(" ").filter((w) => w.length > 2 && !VACIAS.has(w)).map(raiz);
const dias = (f) => (f ? (Date.now() - new Date(f).getTime()) / 864e5 : Infinity);
function leerLocal(k, def) { try { return JSON.parse(localStorage.getItem(k)) ?? def; } catch { return def; } }
function guardarLocal(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* sin almacenamiento */ } }

function tostada(msg, ms = 3200) {
  const t = $("#tostada");
  t.textContent = msg;
  t.hidden = false;
  clearTimeout(tostada._t);
  tostada._t = setTimeout(() => (t.hidden = true), ms);
}

function img(src, alt = "") {
  return src
    ? `<img src="${esc(src)}" alt="${esc(alt)}" loading="lazy" referrerpolicy="no-referrer" onerror="this.replaceWith(Object.assign(document.createElement('span'),{className:'sin-foto',textContent:'🛍️'}))">`
    : `<span class="sin-foto">🛍️</span>`;
}

const PARAMS_RASTREO = /^(utm_|ref$|ref_|tag$|gclid|fbclid|srsltid|_encoding|psc$|th$|pd_rd|pf_rd|qid$|sr$|keywords$|crid$|sprefix$|dib|content-id|linkcode|linkid|camp|creative|ascsubtag|mc_|igshid|yclid|msclkid|spm$|scm$|_ga)/i;
function normalizarUrl(u) {
  try {
    const x = new URL(u);
    const host = x.hostname.replace(/^www\d?\./, "").toLowerCase();
    if (/amazon\./.test(host)) {
      const asin = x.pathname.match(/\/(?:dp|gp\/product|gp\/aw\/d)\/([A-Z0-9]{10})/i)?.[1];
      if (asin) return `${host}/dp/${asin.toUpperCase()}`;
    }
    const q = [...x.searchParams.entries()].filter(([k]) => !PARAMS_RASTREO.test(k)).sort();
    return host + x.pathname.replace(/\/+$/, "") + (q.length ? "?" + new URLSearchParams(q) : "");
  } catch { return u; }
}
function tiendaDeUrl(u) {
  try {
    const p = new URL(u).hostname.replace(/^www\d?\./, "").split(".");
    const b = p.length > 2 && /^(co|com|org)$/.test(p[p.length - 2]) ? p[p.length - 3] : p[p.length - 2] || p[0];
    return b.charAt(0).toUpperCase() + b.slice(1);
  } catch { return ""; }
}

// ---------------- Categorías ----------------
const catPorId = (id) => E.cats.find((c) => c.id === id);
const hijosDe = (id) => E.cats.filter((c) => (c.padre_id ?? null) === (id ?? null)).sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
function descendientes(id, acc = new Set()) {
  acc.add(id);
  for (const h of hijosDe(id)) if (!acc.has(h.id)) descendientes(h.id, acc);
  return acc;
}
function ruta(id) {
  const partes = [];
  let c = catPorId(id), guard = 0;
  while (c && guard++ < 20) { partes.unshift(c.nombre); c = catPorId(c.padre_id); }
  return partes.join(" › ");
}
function buscarCat(texto, padreId) {
  const n = norm(texto);
  if (!n) return null;
  const porRuta = E.cats.find((c) => norm(ruta(c.id)) === n);
  if (porRuta) return porRuta;
  const mismos = E.cats.filter((c) => norm(c.nombre) === n || raiz(norm(c.nombre)) === raiz(n));
  return mismos.find((c) => (c.padre_id ?? null) === (padreId ?? null)) ?? mismos[0] ?? null;
}

// Sugerencias de categoría a partir de los datos leídos de la tienda
function sugerirCategorias(d) {
  const migas = (d.migas || []).join(" · ");
  const fuentes = [
    { f: new Set(fichas(migas + " " + (d.categoriaTienda || ""))), peso: 3 },
    { f: new Set(fichas(d.titulo)), peso: 2.5 },
    { f: new Set(fichas(d.descripcion)), peso: 0.5 },
  ];
  const tit = new Set(fichas(d.titulo));
  const puntos = new Map();
  for (const c of E.cats) {
    const fc = fichas(c.nombre);
    if (!fc.length) continue;
    let p = 0;
    for (const { f, peso } of fuentes) if (fc.every((w) => f.has(w))) p += peso;
    // Aprende de los productos que ya estaban en la categoría
    const enCat = E.prods.filter((x) => x.cats.includes(c.id));
    let mejorSim = 0;
    for (const x of enCat) {
      const fx = new Set(fichas(x.nombre));
      const comunes = [...tit].filter((w) => fx.has(w)).length;
      const sim = comunes / Math.max(1, Math.min(tit.size, fx.size));
      if (sim > mejorSim) mejorSim = sim;
    }
    if (mejorSim >= 0.4) p += 2 * mejorSim;
    if (p >= 2) puntos.set(c.id, p);
  }
  // Si coincide un hijo y su padre, nos quedamos con el hijo (más concreto)
  let ids = [...puntos.keys()];
  ids = ids.filter((id) => !ids.some((o) => o !== id && descendientes(id).has(o)));
  ids.sort((a, b) => puntos.get(b) - puntos.get(a));
  ids = ids.slice(0, 2);

  let nueva = null;
  if (!ids.length) {
    const cands = [...(d.migas || [])].filter((m) => m && m.length < 40 && !/^(productos?|todos|tienda|categor[ií]as?|ver todo)$/i.test(m));
    const nombre = cands[cands.length - 1] || d.categoriaTienda?.split(/[>/|›]/).pop()?.trim();
    if (nombre && !buscarCat(nombre)) {
      let padre = null;
      for (let i = cands.length - 2; i >= 0 && !padre; i--) padre = buscarCat(cands[i]);
      nueva = { nuevo: true, nombre: nombre.charAt(0).toUpperCase() + nombre.slice(1), padre_id: padre?.id ?? null };
    } else if (nombre) {
      ids = [buscarCat(nombre).id];
    }
  }
  return { ids, nueva };
}

// Productos parecidos (para agrupar ofertas del mismo producto)
function buscarParecidos(d, excluir = null) {
  const res = [];
  const clave = normalizarUrl(d.url || "");
  const tf = new Set(fichas(d.titulo));
  for (const p of E.prods) {
    if (p.id === excluir) continue;
    if (p.ofertas.some((o) => normalizarUrl(o.url) === clave)) { res.push({ p, motivo: "mismo enlace", nivel: 3 }); continue; }
    if (d.ean && p.ean && d.ean === p.ean) { res.push({ p, motivo: "mismo código EAN", nivel: 2 }); continue; }
    if (tf.size < 2) continue;
    const pf = new Set([...fichas(p.nombre), ...p.ofertas.flatMap((o) => fichas(o.titulo))]);
    const comunes = [...tf].filter((w) => pf.has(w)).length;
    const jacc = comunes / new Set([...tf, ...pf]).size;
    const cont = comunes / Math.min(tf.size, fichas(p.nombre).length || tf.size);
    const marcaOk = !d.marca || !p.marca || norm(d.marca) === norm(p.marca);
    if (marcaOk && (jacc >= 0.5 || (cont >= 0.8 && comunes >= 3))) res.push({ p, motivo: "nombre muy parecido", nivel: 1, s: jacc });
  }
  return res.sort((a, b) => b.nivel - a.nivel || (b.s ?? 0) - (a.s ?? 0)).slice(0, 3);
}

// ---------------- Productos: derivados ----------------
function mejorOferta(p) {
  const cs = p.ofertas.filter((o) => o.precio != null);
  const disp = cs.filter((o) => o.disponible !== false);
  return (disp.length ? disp : cs).sort((a, b) => a.precio - b.precio)[0] ?? p.ofertas[0] ?? null;
}
const bajadaReciente = (o) => (o.precio_previo != null && o.precio != null && +o.precio < +o.precio_previo && dias(o.cambio_en) <= 14 ? o.precio_previo - o.precio : 0);
const bajadaTotal = (o) => (o.precio_inicial != null && o.precio != null && +o.precio < +o.precio_inicial ? o.precio_inicial - o.precio : 0);
const bajadaProducto = (p) => Math.max(0, ...p.ofertas.map((o) => Math.max(bajadaReciente(o), bajadaTotal(o))));

// ---------------- Carga de datos ----------------
async function cargar() {
  const [c, p] = await Promise.all([
    sb.from("categorias").select("*"),
    sb.from("productos").select("*, ofertas(*), producto_categorias(categoria_id)").order("creado_en", { ascending: false }),
  ]);
  if (c.error || p.error) { tostada("Error al cargar: " + (c.error || p.error).message); return; }
  E.cats = c.data;
  E.prods = p.data.map((x) => ({
    ...x,
    cats: x.producto_categorias.map((r) => r.categoria_id),
    ofertas: x.ofertas.map((o) => ({ ...o, precio: num(o.precio), precio_original: num(o.precio_original), precio_inicial: num(o.precio_inicial), precio_previo: num(o.precio_previo) })),
  }));
  E.ultimaCarga = Date.now();
  if (E.filtro.cat !== "todas" && E.filtro.cat !== "sin" && !catPorId(E.filtro.cat)) E.filtro.cat = "todas";
  pintar();
}

// ---------------- Pintado ----------------
function filtrados({ ignorarCat = false } = {}) {
  const f = E.filtro;
  const palabras = norm(f.q).split(" ").filter(Boolean);
  const enCat = f.cat === "todas" || ignorarCat ? null : f.cat === "sin" ? "sin" : descendientes(f.cat);
  return E.prods.filter((p) => {
    if (f.estado !== "todos" && p.estado !== f.estado) return false;
    if (f.tienda && !p.ofertas.some((o) => o.tienda === f.tienda)) return false;
    if (enCat === "sin" && p.cats.length) return false;
    if (enCat instanceof Set && !p.cats.some((c) => enCat.has(c))) return false;
    if (f.bajadas && !bajadaProducto(p)) return false;
    if (palabras.length) {
      const pajar = norm([p.nombre, p.marca, p.notas, p.descripcion, ...p.ofertas.map((o) => o.tienda), ...p.cats.map(ruta)].join(" "));
      if (!palabras.every((w) => pajar.includes(w))) return false;
    }
    return true;
  });
}

function pintar() {
  pintarArbol();
  pintarTiendas();
  pintarRejilla();
}

function pintarArbol() {
  const base = filtrados({ ignorarCat: true });
  const cuenta = (id) => { const ds = descendientes(id); return base.filter((p) => p.cats.some((c) => ds.has(c))).length; };
  const nodo = (c) => {
    const hijos = hijosDe(c.id);
    const abierta = E.abiertas.has(c.id) || descendientes(c.id).has(E.filtro.cat);
    return `<div>
      <button class="cat ${E.filtro.cat === c.id ? "activa" : ""}" data-cat="${c.id}">
        <span class="flecha" data-alternar="${hijos.length ? c.id : ""}">${hijos.length ? (abierta ? "▾" : "▸") : ""}</span>
        <span>${esc(c.nombre)}</span><span class="n">${cuenta(c.id)}</span>
      </button>
      ${hijos.length && abierta ? `<div class="cat-hijos">${hijos.map(nodo).join("")}</div>` : ""}
    </div>`;
  };
  const sin = base.filter((p) => !p.cats.length).length;
  $("#arbol-cats").innerHTML = `
    <button class="cat ${E.filtro.cat === "todas" ? "activa" : ""}" data-cat="todas"><span class="flecha"></span><span>Todo</span><span class="n">${base.length}</span></button>
    <div class="separador"></div>
    ${hijosDe(null).map(nodo).join("") || `<p class="pequeno" style="padding:0 8px">Aún no hay categorías. Se crean al añadir productos.</p>`}
    ${sin ? `<div class="separador"></div><button class="cat ${E.filtro.cat === "sin" ? "activa" : ""}" data-cat="sin"><span class="flecha"></span><span>Sin categoría</span><span class="n">${sin}</span></button>` : ""}`;
}

function pintarTiendas() {
  const sel = $("#f-tienda");
  const tiendas = [...new Set(E.prods.flatMap((p) => p.ofertas.map((o) => o.tienda)).filter(Boolean))].sort((a, b) => a.localeCompare(b, "es"));
  const actual = E.filtro.tienda;
  sel.innerHTML = `<option value="">Todas las tiendas</option>` + tiendas.map((t) => `<option ${t === actual ? "selected" : ""}>${esc(t)}</option>`).join("");
}

function pintarRejilla() {
  const f = E.filtro;
  let lista = filtrados();
  const precioDe = (p) => mejorOferta(p)?.precio ?? Infinity;
  const ord = {
    recientes: (a, b) => new Date(b.creado_en) - new Date(a.creado_en),
    "precio-asc": (a, b) => precioDe(a) - precioDe(b),
    "precio-desc": (a, b) => (precioDe(b) === Infinity ? -1 : precioDe(b)) - (precioDe(a) === Infinity ? -1 : precioDe(a)),
    bajada: (a, b) => bajadaProducto(b) - bajadaProducto(a),
    nombre: (a, b) => a.nombre.localeCompare(b.nombre, "es"),
  }[f.orden];
  lista = lista.sort(ord);

  $("#titulo-vista").textContent = f.cat === "todas" ? "Todo" : f.cat === "sin" ? "Sin categoría" : ruta(f.cat);
  $("#rejilla").innerHTML = lista.map(tarjeta).join("");
  const vacio = $("#vacio");
  if (!lista.length) {
    vacio.hidden = false;
    vacio.innerHTML = E.prods.length
      ? `<h3>Nada por aquí</h3><p>No hay productos con estos filtros.</p>`
      : `<h3>Vuestra lista está vacía</h3><p>Pega el enlace de algo que os interese y empezad a guardar ofertas.</p><p><button class="btn primario" data-accion="anadir">+ Añadir la primera</button></p>`;
  } else vacio.hidden = true;
}

function tarjeta(p) {
  const o = mejorOferta(p);
  const baja = Math.max(0, ...p.ofertas.map(bajadaReciente));
  const dto = o?.precio_original && o.precio ? Math.round((1 - o.precio / o.precio_original) * 100) : 0;
  const nTiendas = new Set(p.ofertas.map((x) => x.tienda)).size;
  return `<article class="tarjeta ${p.estado !== "pendiente" ? "apagada" : ""}" data-producto="${p.id}">
    <div class="foto">
      ${img(p.imagen || o?.imagen, p.nombre)}
      ${baja ? `<span class="insignia">↓ ${euros(baja)}</span>` : ""}
      ${p.estado !== "pendiente" ? `<span class="insignia estado">${p.estado === "comprado" ? "Comprado" : "Descartado"}</span>` : ""}
      ${dto >= 5 ? `<span class="insignia dto">-${dto}%</span>` : ""}
    </div>
    <div class="info">
      <div class="nombre">${esc(p.nombre)}</div>
      <div class="tienda">${o ? esc(o.tienda || "") : ""}${nTiendas > 1 ? ` · ${nTiendas} tiendas` : ""}${o?.disponible === false ? " · <b>sin stock</b>" : ""}</div>
      ${p.cats.length ? `<div class="etiquetas">${p.cats.slice(0, 3).map((c) => `<span class="etq">${esc(catPorId(c)?.nombre ?? "")}</span>`).join("")}</div>` : ""}
      <div class="precio-linea">
        <span class="precio">${euros(o?.precio)}</span>
        ${o?.precio_original ? `<span class="precio-orig">${euros(o.precio_original)}</span>` : ""}
      </div>
      ${o ? `<div class="acciones"><a class="btn mini" href="${esc(o.url)}" target="_blank" rel="noopener" data-parar>Ir a la oferta ↗</a></div>` : ""}
    </div>
  </article>`;
}

// ---------------- Selector de categorías (reutilizable) ----------------
function selectorCats(cont, seleccion, { sugeridas = [], alCambiar = () => {} } = {}) {
  const lista = `dl-${Math.random().toString(36).slice(2)}`;
  const pintarSel = () => {
    const opcionesPadre = E.cats.map((c) => ({ id: c.id, r: ruta(c.id) })).sort((a, b) => a.r.localeCompare(b.r, "es"));
    const nuevasSel = seleccion.filter((s) => s.nuevo);
    cont.innerHTML = `<div class="selector-cats">
      <div class="chips">${seleccion.length ? seleccion.map((s, i) => s.nuevo
        ? `<span class="chip nueva" title="Se creará al guardar">${esc(s.nombre)} <small>${s.padre_id ? "en " + esc(ruta(s.padre_id)) : s.padreNuevo ? "en " + esc(s.padreNuevo) : "(nueva)"}</small><button type="button" data-quitar="${i}" aria-label="Quitar">×</button></span>`
        : `<span class="chip">${esc(ruta(s.id))}<button type="button" data-quitar="${i}" aria-label="Quitar">×</button></span>`).join("") : `<span class="pequeno">Sin categoría</span>`}</div>
      ${sugeridas.filter((s) => !seleccion.some((x) => x.id === s.id)).length ? `<div class="sugerencias">${sugeridas.filter((s) => !seleccion.some((x) => x.id === s.id)).map((s) => `<button type="button" class="sugerencia" data-sug="${s.id}">+ ${esc(ruta(s.id))}</button>`).join("")}</div>` : ""}
      <div class="fila-cat">
        <input type="text" list="${lista}" placeholder="Añadir o crear categoría…" data-entrada>
        <select data-padre title="Dentro de">
          <option value="">(principal)</option>
          ${opcionesPadre.map((o) => `<option value="${o.id}">dentro de ${esc(o.r)}</option>`).join("")}
          ${nuevasSel.map((s, i) => `<option value="nuevo:${seleccion.indexOf(s)}">dentro de ${esc(s.nombre)} (nueva)</option>`).join("")}
        </select>
        <button type="button" class="btn mini" data-anadir>Añadir</button>
      </div>
      <datalist id="${lista}">${opcionesPadre.map((o) => `<option value="${esc(o.r)}">`).join("")}</datalist>
    </div>`;
  };
  const anadir = () => {
    const entrada = $("[data-entrada]", cont);
    const v = entrada.value.trim();
    if (!v) return;
    const padreSel = $("[data-padre]", cont).value;
    let padre_id = null, padreNuevo = null, padreIdx = null;
    if (padreSel.startsWith("nuevo:")) { padreIdx = +padreSel.slice(6); padreNuevo = seleccion[padreIdx]?.nombre; }
    else padre_id = padreSel || null;
    const existente = padreNuevo ? null : buscarCat(v, padre_id);
    if (existente && (!padre_id || existente.padre_id === padre_id || norm(ruta(existente.id)) === norm(v))) {
      if (!seleccion.some((s) => s.id === existente.id)) seleccion.push({ id: existente.id });
    } else if (!seleccion.some((s) => s.nuevo && norm(s.nombre) === norm(v))) {
      seleccion.push({ nuevo: true, nombre: v.charAt(0).toUpperCase() + v.slice(1), padre_id, padreNuevo, padreRef: padreIdx != null ? seleccion[padreIdx] : null });
    }
    pintarSel(); alCambiar();
    $("[data-entrada]", cont).focus();
  };
  cont.onclick = (e) => {
    const q = e.target.closest("[data-quitar]");
    if (q) {
      const quitada = seleccion.splice(+q.dataset.quitar, 1)[0];
      // si se quita una categoría nueva, sus hijas nuevas pasan a ser principales
      seleccion.forEach((s) => { if (s.padreRef === quitada) { s.padreRef = null; s.padreNuevo = null; } });
      pintarSel(); alCambiar(); return;
    }
    const s = e.target.closest("[data-sug]");
    if (s) { seleccion.push({ id: s.dataset.sug }); pintarSel(); alCambiar(); return; }
    if (e.target.closest("[data-anadir]")) anadir();
  };
  cont.onkeydown = (e) => { if (e.key === "Enter" && e.target.matches("[data-entrada]")) { e.preventDefault(); anadir(); } };
  pintarSel();
}

// Crea en BD las categorías nuevas de una selección y devuelve todos los ids
async function resolverCats(seleccion) {
  const ids = [];
  const creadas = new Map();
  const pendientes = [...seleccion];
  let vueltas = 0;
  while (pendientes.length && vueltas++ < 10) {
    for (const s of [...pendientes]) {
      if (!s.nuevo) { ids.push(s.id); pendientes.splice(pendientes.indexOf(s), 1); continue; }
      if (s.padreRef && !creadas.has(s.padreRef)) continue; // esperar a que se cree el padre
      const padre_id = s.padreRef ? creadas.get(s.padreRef) : s.padre_id ?? null;
      const ya = E.cats.find((c) => norm(c.nombre) === norm(s.nombre) && (c.padre_id ?? null) === padre_id);
      let id = ya?.id;
      if (!id) {
        const { data, error } = await sb.from("categorias").insert({ nombre: s.nombre.trim(), padre_id }).select().single();
        if (error) throw error;
        E.cats.push(data);
        id = data.id;
      }
      creadas.set(s, id);
      ids.push(id);
      pendientes.splice(pendientes.indexOf(s), 1);
    }
  }
  return [...new Set(ids)];
}

// ---------------- Añadir ----------------
let B = null; // borrador actual

function abrirAnadir({ url = "", datos = null, destino = null, titulo = "" } = {}) {
  B = { destino, sel: [], sugeridas: [], decision: destino ? "existente:" + destino : "nuevo" };
  $("#anadir-titulo").textContent = destino ? "Añadir otra tienda" : "Añadir oferta";
  $("#in-url").value = url;
  $("#estado-lectura").textContent = "";
  $("#anadir-form").hidden = true;
  $("#anadir-form").innerHTML = "";
  const dlg = $("#dlg-anadir");
  if (!dlg.open) dlg.showModal();
  if (datos) prepararBorrador(datos, { desdeMarcador: true });
  else if (url) leer(titulo);
  else setTimeout(() => $("#in-url").focus(), 50);
}

async function leer(tituloCompartido = "") {
  const url = $("#in-url").value.trim();
  if (!url) return;
  const btn = $("#btn-leer");
  btn.disabled = true;
  $("#estado-lectura").innerHTML = `<span class="girando"></span> Leyendo la página de la tienda… (puede tardar unos segundos)`;
  let d;
  try {
    const { data, error } = await sb.functions.invoke("extraer", { body: { url } });
    if (error) throw error;
    if (data?.error) throw new Error(data.error);
    d = data;
  } catch (e) {
    d = { url, bloqueado: true, error: e.message };
  }
  btn.disabled = false;
  d.url = url;
  if (!d.titulo && tituloCompartido) d.titulo = tituloCompartido;
  prepararBorrador(d);
}

function prepararBorrador(d, { desdeMarcador = false } = {}) {
  if (d.urlFinal && /^https?:/.test(d.urlFinal) && !/r\.jina\.ai/.test(d.urlFinal)) d.url = d.urlFinal;
  d.tienda = d.tienda || tiendaDeUrl(d.url);
  B.d = d;
  const sinDatos = !d.precio || !d.titulo;
  $("#estado-lectura").innerHTML = desdeMarcador
    ? `<span class="aviso ok" style="display:block">Datos tomados directamente de la página de la tienda. Revísalos y guarda.</span>`
    : d.error && !d.titulo
      ? `<span class="aviso" style="display:block">No se pudo leer la página (${esc(d.error)}). Rellena los datos a mano o usa el botón «Guardar en Me interesa» desde la tienda (ver ⋯).</span>`
      : d.bloqueado || sinDatos
        ? `<span class="aviso" style="display:block">${esc(d.tienda)} no deja leer ${d.titulo ? "el precio" : "sus datos"} desde el servidor. Completa lo que falte a mano, o abre el producto en la tienda y pulsa el botón «Guardar en Me interesa» (ver ⋯ → Botón para guardar).</span>`
        : `<span class="aviso ok" style="display:block">Datos leídos. Revisa y ajusta lo que quieras antes de guardar.</span>`;

  // Producto parecido / mismo enlace
  B.parecidos = B.destino ? [] : buscarParecidos(d);
  const mismoEnlace = B.parecidos.find((x) => x.nivel === 3);
  if (mismoEnlace) B.decision = "actualizar:" + mismoEnlace.p.id;
  else if (B.parecidos.length && B.parecidos[0].nivel === 2) B.decision = "existente:" + B.parecidos[0].p.id;

  // Categorías sugeridas
  const sug = sugerirCategorias(d);
  B.sugeridas = sug.ids.map((id) => ({ id }));
  B.sel = sug.ids.map((id) => ({ id }));
  if (sug.nueva) B.sel.push(sug.nueva);

  pintarFormAnadir();
}

function pintarFormAnadir() {
  const d = B.d;
  const destino = B.destino ? E.prods.find((p) => p.id === B.destino) : null;
  const cont = $("#anadir-form");
  cont.hidden = false;
  const enlaceRepetido = B.parecidos.find((x) => x.nivel === 3);
  cont.innerHTML = `
    ${enlaceRepetido ? `<div class="duplicado"><b>Este enlace ya está guardado</b> en «${esc(enlaceRepetido.p.nombre)}». Al guardar se actualizará su precio con estos datos.
       <div><button type="button" class="btn mini" data-ver="${enlaceRepetido.p.id}">Ver ficha</button></div></div>` : ""}
    ${!enlaceRepetido && B.parecidos.length ? `<div class="duplicado">
       <b>¿Es el mismo producto que alguno que ya tenéis?</b>
       ${B.parecidos.map((x) => `<label><input type="radio" name="decision" value="existente:${x.p.id}" ${B.decision === "existente:" + x.p.id ? "checked" : ""}>
          ${img(x.p.imagen)} <span>Sí, añadir como otra tienda de <b>${esc(x.p.nombre)}</b><br><small class="pequeno">${esc(x.motivo)} · ahora ${euros(mejorOferta(x.p)?.precio)} en ${esc(mejorOferta(x.p)?.tienda ?? "")}</small></span></label>`).join("")}
       <label><input type="radio" name="decision" value="nuevo" ${B.decision === "nuevo" ? "checked" : ""}> <span>No, es otro producto</span></label>
     </div>` : ""}
    ${destino ? `<div class="duplicado">Se añadirá como otra tienda de <b>${esc(destino.nombre)}</b>.</div>` : ""}
    <div class="vista-previa">
      <div class="miniatura" id="prev-img">${img(d.imagen)}</div>
      <div class="campos">
        <label>Nombre<input type="text" id="a-nombre" value="${esc(d.titulo ?? "")}" placeholder="Nombre del producto"></label>
        <label>Imagen (enlace)<input type="url" id="a-imagen" value="${esc(d.imagen ?? "")}" placeholder="https://…"></label>
      </div>
    </div>
    <div class="rejilla-form">
      <label>Precio (€)<input type="number" step="0.01" min="0" id="a-precio" value="${d.precio ?? ""}" inputmode="decimal"></label>
      <label>Precio antes de la oferta (€)<input type="number" step="0.01" min="0" id="a-original" value="${d.precioOriginal ?? ""}" inputmode="decimal" placeholder="opcional"></label>
      <label>Tienda<input type="text" id="a-tienda" value="${esc(d.tienda ?? "")}"></label>
      <label>Marca<input type="text" id="a-marca" value="${esc(d.marca ?? "")}" placeholder="opcional"></label>
      <div class="completo" id="bloque-cats" ${B.decision.startsWith("actualizar") ? "hidden" : ""}>
        <label style="margin-bottom:6px">Categorías ${B.sel.some((s) => s.nuevo) || B.sugeridas.length ? `<span class="pequeno">(sugeridas automáticamente; puedes cambiarlas)</span>` : ""}</label>
        <div id="a-cats"></div>
      </div>
      <label class="completo">Notas<textarea id="a-notas" placeholder="Medidas, color, para qué habitación, código de descuento…"></textarea></label>
    </div>
    <div class="pie-dlg">
      <button type="button" class="btn" data-cerrar>Cancelar</button>
      <button type="button" class="btn primario" id="btn-guardar">${B.decision.startsWith("actualizar") ? "Actualizar precio" : "Guardar"}</button>
    </div>`;
  selectorCats($("#a-cats"), B.sel, { sugeridas: B.sugeridas });
  $("#a-imagen").oninput = (e) => ($("#prev-img").innerHTML = img(e.target.value.trim()));
  $$('input[name="decision"]', cont).forEach((r) => (r.onchange = () => (B.decision = r.value)));
  $("[data-cerrar]", cont).onclick = () => $("#dlg-anadir").close();
  $("[data-ver]", cont)?.addEventListener("click", (e) => { $("#dlg-anadir").close(); abrirDetalle(e.target.dataset.ver); });
  $("#btn-guardar").onclick = guardarBorrador;
  if (!$("#a-nombre").value) $("#a-nombre").focus();
}

async function guardarBorrador() {
  const btn = $("#btn-guardar");
  const nombre = $("#a-nombre").value.trim();
  const precio = num($("#a-precio").value);
  let original = num($("#a-original").value);
  if (original != null && precio != null && original <= precio) original = null;
  const imagen = $("#a-imagen").value.trim() || null;
  const tienda = $("#a-tienda").value.trim() || tiendaDeUrl(B.d.url);
  const marca = $("#a-marca").value.trim() || null;
  const notas = $("#a-notas").value.trim() || null;
  if (!nombre) { tostada("Ponle un nombre al producto"); $("#a-nombre").focus(); return; }
  btn.disabled = true;
  btn.innerHTML = `<span class="girando"></span> Guardando…`;
  try {
    const dec = B.destino ? "existente:" + B.destino : B.decision;
    if (dec.startsWith("actualizar:")) {
      const pid = dec.split(":")[1];
      const p = E.prods.find((x) => x.id === pid);
      const o = p.ofertas.find((x) => normalizarUrl(x.url) === normalizarUrl(B.d.url));
      const { error } = await sb.rpc("registrar_revision", { p_oferta: o.id, p_precio: precio, p_precio_original: original, p_disponible: B.d.disponible ?? null, p_error: null });
      if (error) throw error;
      if (notas) await sb.from("productos").update({ notas: [p.notas, notas].filter(Boolean).join("\n") }).eq("id", pid);
      $("#dlg-anadir").close();
      await cargar();
      tostada("Precio actualizado");
      return;
    }
    const catIds = await resolverCats(B.sel);
    let pid;
    if (dec.startsWith("existente:")) {
      pid = dec.split(":")[1];
      const p = E.prods.find((x) => x.id === pid);
      const cambios = {};
      if (!p.ean && B.d.ean) cambios.ean = B.d.ean;
      if (!p.imagen && imagen) cambios.imagen = imagen;
      if (!p.marca && marca) cambios.marca = marca;
      if (notas) cambios.notas = [p.notas, notas].filter(Boolean).join("\n");
      if (Object.keys(cambios).length) await sb.from("productos").update(cambios).eq("id", pid);
    } else {
      const { data, error } = await sb.from("productos").insert({ nombre, imagen, marca, ean: B.d.ean || null, descripcion: B.d.descripcion || null, notas }).select().single();
      if (error) throw error;
      pid = data.id;
    }
    if (catIds.length) {
      const { error } = await sb.from("producto_categorias").upsert(catIds.map((c) => ({ producto_id: pid, categoria_id: c })), { ignoreDuplicates: true });
      if (error) throw error;
    }
    const { error: eo } = await sb.from("ofertas").insert({
      producto_id: pid, url: B.d.url, tienda, titulo: nombre, imagen,
      precio, precio_original: original, disponible: B.d.disponible ?? null,
      error_revision: precio == null ? "Sin precio" : null,
    });
    if (eo) throw eo;
    $("#dlg-anadir").close();
    await cargar();
    tostada("Guardado ✓");
  } catch (e) {
    tostada("No se pudo guardar: " + e.message, 6000);
    btn.disabled = false;
    btn.textContent = "Guardar";
  }
}

// ---------------- Detalle ----------------
let D = null;

async function abrirDetalle(id) {
  const p = E.prods.find((x) => x.id === id);
  if (!p) return;
  D = { id, sel: p.cats.map((c) => ({ id: c })) };
  const dlg = $("#dlg-detalle");
  pintarDetalle();
  if (!dlg.open) dlg.showModal();
  const ids = p.ofertas.map((o) => o.id);
  if (ids.length) {
    const { data } = await sb.from("precios").select("*").in("oferta_id", ids).order("fecha");
    if (D?.id === id) { D.historial = data ?? []; pintarGrafica(); }
  }
}

function pintarDetalle() {
  const p = E.prods.find((x) => x.id === D.id);
  if (!p) { $("#dlg-detalle").close(); return; }
  const mejor = mejorOferta(p);
  const ofertas = [...p.ofertas].sort((a, b) => (a.precio ?? Infinity) - (b.precio ?? Infinity));
  const otros = E.prods.filter((x) => x.id !== p.id).sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
  $("#detalle").innerHTML = `
    <div class="detalle-top">
      <div class="foto">${img(p.imagen || mejor?.imagen, p.nombre)}</div>
      <div class="campos">
        <label>Nombre<input type="text" id="d-nombre" value="${esc(p.nombre)}"></label>
        <div class="rejilla-form">
          <label>Estado<select id="d-estado">
            ${["pendiente", "comprado", "descartado"].map((s) => `<option value="${s}" ${p.estado === s ? "selected" : ""}>${s[0].toUpperCase() + s.slice(1)}</option>`).join("")}
          </select></label>
          <label>Marca<input type="text" id="d-marca" value="${esc(p.marca ?? "")}"></label>
        </div>
        <label>Imagen (enlace)<input type="url" id="d-imagen" value="${esc(p.imagen ?? "")}"></label>
        <div><label style="margin-bottom:6px">Categorías</label><div id="d-cats"></div></div>
        <label>Notas<textarea id="d-notas">${esc(p.notas ?? "")}</textarea></label>
        <div class="pie-dlg" style="justify-content:flex-start"><button class="btn primario" id="d-guardar">Guardar cambios</button></div>
      </div>
    </div>

    <div class="seccion-titulo">Ofertas (${ofertas.length})</div>
    <div class="ofertas">
      ${ofertas.map((o) => {
        const br = bajadaReciente(o), bt = bajadaTotal(o);
        return `<div class="oferta ${o === mejor && ofertas.length > 1 ? "mejor" : ""}">
          <div>
            <div class="tienda-n">${esc(o.tienda || tiendaDeUrl(o.url))}${o === mejor && ofertas.length > 1 ? ` <span class="etq" style="background:var(--verde-suave);color:var(--verde)">más barata</span>` : ""}</div>
            <div class="meta">${o.disponible === false ? "Sin stock · " : ""}${bt ? `${euros(bt)} menos que cuando lo guardasteis · ` : ""}${br ? `bajó ${euros(br)} ${dias(o.cambio_en) < 1 ? "hoy" : `hace ${Math.round(dias(o.cambio_en))} d`} · ` : ""}revisado ${o.ultima_revision ? new Date(o.ultima_revision).toLocaleDateString("es-ES", { day: "numeric", month: "short" }) : "nunca"}</div>
            ${o.error_revision ? `<div class="meta error">⚠ ${esc(o.error_revision)}${/bloque|precio/i.test(o.error_revision) ? " — puedes actualizarlo desde la tienda con el botón «Guardar en Me interesa» o a mano" : ""}</div>` : ""}
          </div>
          <div class="derecha">
            <div class="precio">${euros(o.precio)}</div>
            ${o.precio_original ? `<div class="precio-orig">${euros(o.precio_original)}</div>` : ""}
          </div>
          <div class="botones">
            <a class="btn mini primario" href="${esc(o.url)}" target="_blank" rel="noopener">Ir a la oferta ↗</a>
            <button class="btn mini" data-revisar="${o.id}">Revisar precio</button>
            <button class="btn mini" data-manual="${o.id}">Poner precio a mano</button>
            ${ofertas.length > 1 ? `<button class="btn mini" data-separar="${o.id}">Separar</button>` : ""}
            <button class="btn mini peligro" data-quitar-oferta="${o.id}">Quitar</button>
          </div>
        </div>`;
      }).join("") || `<p class="pequeno">Sin ofertas.</p>`}
    </div>
    <div><button class="btn" id="d-otra">+ Añadir otra tienda</button></div>

    <div class="seccion-titulo">Historial de precios</div>
    <div class="grafica" id="grafica"><p class="pequeno">Cargando…</p></div>

    <div class="seccion-titulo">Más acciones</div>
    <div class="fila-cat">
      <select id="d-unir"><option value="">Unir con otro producto (es el mismo)…</option>${otros.map((x) => `<option value="${x.id}">${esc(x.nombre.slice(0, 80))}</option>`).join("")}</select>
      <button class="btn mini" id="d-unir-btn">Unir</button>
      <button class="btn mini peligro" id="d-borrar">Eliminar producto</button>
    </div>`;
  selectorCats($("#d-cats"), D.sel);
  if (D.historial) pintarGrafica();
}

function pintarGrafica() {
  const p = E.prods.find((x) => x.id === D.id);
  const cont = $("#grafica");
  if (!p || !cont) return;
  const colores = ["#d24e24", "#1d7f4a", "#3758c4", "#9a3fb5", "#b58a00", "#0b8a8a"];
  const series = p.ofertas.map((o, i) => {
    const pts = D.historial.filter((h) => h.oferta_id === o.id).map((h) => ({ t: new Date(h.fecha).getTime(), v: +h.precio }));
    if (o.precio != null) pts.push({ t: Date.now(), v: o.precio });
    return { o, pts, color: colores[i % colores.length] };
  }).filter((s) => s.pts.length);
  const todos = series.flatMap((s) => s.pts);
  if (!todos.length) { cont.innerHTML = `<p class="pequeno">Aún no hay precios registrados.</p>`; return; }
  const W = 800, H = 180, m = { l: 62, r: 12, t: 12, b: 24 };
  let t0 = Math.min(...todos.map((x) => x.t)), t1 = Date.now();
  if (t1 - t0 < 864e5) t0 = t1 - 864e5;
  let v0 = Math.min(...todos.map((x) => x.v)), v1 = Math.max(...todos.map((x) => x.v));
  const pad = (v1 - v0) * 0.15 || v1 * 0.1 || 1;
  v0 = Math.max(0, v0 - pad); v1 = v1 + pad;
  const X = (t) => m.l + ((t - t0) / (t1 - t0)) * (W - m.l - m.r);
  const Y = (v) => H - m.b - ((v - v0) / (v1 - v0)) * (H - m.t - m.b);
  const ticks = [v0 + (v1 - v0) * 0.1, (v0 + v1) / 2, v1 - (v1 - v0) * 0.1];
  const f = (t) => new Date(t).toLocaleDateString("es-ES", { day: "numeric", month: "short" });
  const camino = (pts) => pts.map((q, i) => (i ? `H${X(q.t).toFixed(1)}V${Y(q.v).toFixed(1)}` : `M${X(q.t).toFixed(1)},${Y(q.v).toFixed(1)}`)).join("");
  cont.innerHTML = `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img" aria-label="Historial de precios">
    ${ticks.map((v) => `<line x1="${m.l}" x2="${W - m.r}" y1="${Y(v)}" y2="${Y(v)}" stroke="#eee5d8"/><text x="${m.l - 8}" y="${Y(v) + 4}" text-anchor="end" font-size="11" fill="#948a7c">${euros(v)}</text>`).join("")}
    <text x="${m.l}" y="${H - 6}" font-size="11" fill="#948a7c">${f(t0)}</text>
    <text x="${W - m.r}" y="${H - 6}" font-size="11" fill="#948a7c" text-anchor="end">hoy</text>
    ${series.map((s) => `<path d="${camino(s.pts)}" fill="none" stroke="${s.color}" stroke-width="2.5" vector-effect="non-scaling-stroke"/>
      ${s.pts.map((q) => `<circle cx="${X(q.t)}" cy="${Y(q.v)}" r="3" fill="${s.color}"><title>${esc(s.o.tienda)}: ${euros(q.v)} (${f(q.t)})</title></circle>`).join("")}`).join("")}
  </svg>
  ${series.length > 1 ? `<div class="leyenda">${series.map((s) => `<span><i style="background:${s.color}"></i>${esc(s.o.tienda)}</span>`).join("")}</div>` : ""}`;
}

async function accionDetalle(e) {
  const p = E.prods.find((x) => x.id === D?.id);
  if (!p) return;
  const t = e.target.closest("button");
  if (!t) return;

  if (t.id === "d-guardar") {
    t.disabled = true;
    try {
      const ids = await resolverCats(D.sel);
      const { error } = await sb.from("productos").update({
        nombre: $("#d-nombre").value.trim() || p.nombre, estado: $("#d-estado").value,
        marca: $("#d-marca").value.trim() || null, imagen: $("#d-imagen").value.trim() || null, notas: $("#d-notas").value.trim() || null,
      }).eq("id", p.id);
      if (error) throw error;
      const quitar = p.cats.filter((c) => !ids.includes(c));
      const poner = ids.filter((c) => !p.cats.includes(c));
      if (quitar.length) await sb.from("producto_categorias").delete().eq("producto_id", p.id).in("categoria_id", quitar);
      if (poner.length) await sb.from("producto_categorias").insert(poner.map((c) => ({ producto_id: p.id, categoria_id: c })));
      await cargar();
      D.sel = E.prods.find((x) => x.id === p.id).cats.map((c) => ({ id: c }));
      pintarDetalle();
      tostada("Cambios guardados ✓");
    } catch (err) { tostada("Error: " + err.message); t.disabled = false; }
    return;
  }
  if (t.id === "d-otra") { $("#dlg-detalle").close(); abrirAnadir({ destino: p.id }); return; }
  if (t.dataset.revisar) {
    const o = p.ofertas.find((x) => x.id === t.dataset.revisar);
    t.disabled = true; t.innerHTML = `<span class="girando"></span> Revisando…`;
    try {
      const { data, error } = await sb.functions.invoke("extraer", { body: { url: o.url } });
      if (error) throw error;
      const ok = data && !data.error && data.precio != null;
      await sb.rpc("registrar_revision", { p_oferta: o.id, p_precio: ok ? data.precio : null, p_precio_original: ok ? data.precioOriginal : null, p_disponible: ok ? data.disponible : null,
        p_error: ok ? null : data?.bloqueado ? "La tienda bloqueó la lectura" : (data?.error || "No se encontró el precio") });
      await cargar(); await abrirDetalle(p.id);
      tostada(ok ? (data.precio === o.precio ? "Mismo precio: " + euros(data.precio) : "Nuevo precio: " + euros(data.precio)) : "No se pudo leer el precio de esta tienda");
    } catch (err) { tostada("Error: " + err.message); t.disabled = false; }
    return;
  }
  if (t.dataset.manual) {
    const o = p.ofertas.find((x) => x.id === t.dataset.manual);
    const v = prompt(`Precio actual en ${o.tienda} (€):`, o.precio ?? "");
    if (v == null) return;
    const precio = num(String(v).replace(",", "."));
    if (!precio) { tostada("Precio no válido"); return; }
    const { error } = await sb.rpc("registrar_revision", { p_oferta: o.id, p_precio: precio, p_precio_original: o.precio_original, p_disponible: true, p_error: null });
    if (error) { tostada("Error: " + error.message); return; }
    await cargar(); await abrirDetalle(p.id);
    tostada("Precio actualizado");
    return;
  }
  if (t.dataset.quitarOferta) {
    if (!confirm("¿Quitar esta oferta?")) return;
    await sb.from("ofertas").delete().eq("id", t.dataset.quitarOferta);
    if (p.ofertas.length === 1 && confirm("El producto se ha quedado sin ofertas. ¿Eliminar también el producto?")) {
      await sb.from("productos").delete().eq("id", p.id);
      $("#dlg-detalle").close();
    }
    await cargar();
    if ($("#dlg-detalle").open) await abrirDetalle(p.id);
    return;
  }
  if (t.dataset.separar) {
    const o = p.ofertas.find((x) => x.id === t.dataset.separar);
    const { data, error } = await sb.from("productos").insert({ nombre: o.titulo || p.nombre, imagen: o.imagen || p.imagen, marca: p.marca }).select().single();
    if (error) { tostada("Error: " + error.message); return; }
    if (p.cats.length) await sb.from("producto_categorias").insert(p.cats.map((c) => ({ producto_id: data.id, categoria_id: c })));
    await sb.from("ofertas").update({ producto_id: data.id }).eq("id", o.id);
    await cargar(); await abrirDetalle(p.id);
    tostada("Oferta separada en su propio producto");
    return;
  }
  if (t.id === "d-unir-btn") {
    const destino = $("#d-unir").value;
    if (!destino) { tostada("Elige con qué producto unirlo"); return; }
    const dest = E.prods.find((x) => x.id === destino);
    if (!confirm(`Se moverán las ofertas de «${p.nombre}» a «${dest.nombre}» y se eliminará esta ficha. ¿Continuar?`)) return;
    await sb.from("ofertas").update({ producto_id: destino }).eq("producto_id", p.id);
    const nuevas = p.cats.filter((c) => !dest.cats.includes(c));
    if (nuevas.length) await sb.from("producto_categorias").insert(nuevas.map((c) => ({ producto_id: destino, categoria_id: c })));
    const cambios = {};
    if (!dest.ean && p.ean) cambios.ean = p.ean;
    if (!dest.imagen && p.imagen) cambios.imagen = p.imagen;
    if (p.notas) cambios.notas = [dest.notas, p.notas].filter(Boolean).join("\n");
    if (Object.keys(cambios).length) await sb.from("productos").update(cambios).eq("id", destino);
    await sb.from("productos").delete().eq("id", p.id);
    await cargar(); await abrirDetalle(destino);
    tostada("Productos unidos ✓");
    return;
  }
  if (t.id === "d-borrar") {
    if (!confirm(`¿Eliminar «${p.nombre}» y todas sus ofertas?`)) return;
    await sb.from("productos").delete().eq("id", p.id);
    $("#dlg-detalle").close();
    await cargar();
    tostada("Producto eliminado");
  }
}

// ---------------- Gestión de categorías ----------------
function abrirGestionCats() {
  pintarGestionCats();
  $("#dlg-cats").showModal();
}
function pintarGestionCats() {
  const orden = [];
  const recorrer = (padre, nivel) => hijosDe(padre).forEach((c) => { orden.push({ c, nivel }); recorrer(c.id, nivel + 1); });
  recorrer(null, 0);
  const cont = $("#gestion-cats");
  cont.innerHTML = `
    <p class="pequeno">Cambia el nombre o mueve una categoría dentro de otra. Los cambios se guardan al salir de cada campo.</p>
    <div class="lista-cats">
      ${orden.map(({ c, nivel }) => {
        const prohibidas = descendientes(c.id);
        return `<div class="fila-gestion" style="padding-left:${nivel * 16}px">
          <input type="text" value="${esc(c.nombre)}" data-renombrar="${c.id}">
          <select data-mover="${c.id}">
            <option value="">(principal)</option>
            ${E.cats.filter((x) => !prohibidas.has(x.id)).map((x) => ({ x, r: ruta(x.id) })).sort((a, b) => a.r.localeCompare(b.r, "es")).map(({ x, r }) => `<option value="${x.id}" ${c.padre_id === x.id ? "selected" : ""}>dentro de ${esc(r)}</option>`).join("")}
          </select>
          <button class="btn mini peligro" data-borrar-cat="${c.id}" aria-label="Eliminar">✕</button>
        </div>`;
      }).join("") || `<p class="pequeno">Aún no hay categorías.</p>`}
    </div>
    <div class="fila-cat">
      <input type="text" id="nueva-cat" placeholder="Nueva categoría">
      <select id="nueva-cat-padre"><option value="">(principal)</option>${E.cats.map((x) => ({ x, r: ruta(x.id) })).sort((a, b) => a.r.localeCompare(b.r, "es")).map(({ x, r }) => `<option value="${x.id}">dentro de ${esc(r)}</option>`).join("")}</select>
      <button class="btn mini primario" id="crear-cat">Crear</button>
    </div>`;
}
async function accionCats(e) {
  const t = e.target;
  if (t.id === "crear-cat") {
    const nombre = $("#nueva-cat").value.trim();
    if (!nombre) return;
    const { error } = await sb.from("categorias").insert({ nombre, padre_id: $("#nueva-cat-padre").value || null });
    if (error) return tostada("Error: " + error.message);
    await cargar(); pintarGestionCats();
  }
  if (t.dataset.borrarCat) {
    const c = catPorId(t.dataset.borrarCat);
    const n = E.prods.filter((p) => p.cats.includes(c.id)).length;
    if (!confirm(`¿Eliminar «${c.nombre}»?${n ? ` ${n} producto(s) dejarán de estar en ella (no se borran).` : ""}${hijosDe(c.id).length ? " Sus subcategorías pasarán a su nivel superior." : ""}`)) return;
    await sb.from("categorias").update({ padre_id: c.padre_id }).eq("padre_id", c.id);
    await sb.from("categorias").delete().eq("id", c.id);
    await cargar(); pintarGestionCats();
  }
}
async function cambioCats(e) {
  const t = e.target;
  if (t.dataset.renombrar) {
    const v = t.value.trim();
    if (!v) return;
    await sb.from("categorias").update({ nombre: v }).eq("id", t.dataset.renombrar);
    await cargar(); pintarGestionCats(); tostada("Renombrada");
  }
  if (t.dataset.mover) {
    await sb.from("categorias").update({ padre_id: t.value || null }).eq("id", t.dataset.mover);
    await cargar(); pintarGestionCats(); tostada("Movida");
  }
}

// ---------------- Ajustes ----------------
function abrirAjustes() {
  $("#ajustes").innerHTML = `
    <div>
      <div class="seccion-titulo">Botón para guardar desde cualquier tienda</div>
      <p>Algunas tiendas (Amazon, PcComponentes, MediaMarkt, Decathlon…) no dejan leer sus páginas desde un servidor. Con este botón los datos se toman <b>directamente de la página que estás viendo</b>, así que funciona siempre.</p>
      <p><b>En el ordenador:</b> arrastra este botón a la barra de marcadores del navegador:</p>
      <p><a class="marcador" href="${esc(enlaceMarcador(APP_URL))}" onclick="event.preventDefault();alert('Arrástralo a tu barra de marcadores; no hace falta pulsarlo aquí.')">⭐ Guardar en Me interesa</a></p>
      <p class="pequeno">Después, en la página de un producto, pulsa el marcador y se abrirá la app con los datos rellenos. Si el producto ya estaba guardado, se actualiza su precio.</p>
      <div class="seccion-titulo">Guardar desde el móvil con «Compartir»</div>
      <p><b>Android:</b> abre esta web en Chrome → menú ⋮ → «Instalar aplicación» (o «Añadir a pantalla de inicio»). Desde entonces, al pulsar «Compartir» en cualquier tienda o app aparecerá <b>Me interesa</b>.</p>
      <p><b>iPhone:</b> iOS no deja que las webs aparezcan en «Compartir», así que se usa un Atajo:</p>
      <ol class="pequeno">
        <li>Abre la app <b>Atajos</b> → <b>+</b> y ponle de nombre «Me interesa».</li>
        <li>Toca la ⓘ (o el nombre) → activa <b>Mostrar en hoja de compartir</b>. En los tipos de entrada deja <b>URL</b>, <b>Texto</b> y <b>Páginas web de Safari</b>.</li>
        <li>Añade la acción <b>Codificar URL</b> y elige como entrada <b>Entrada del atajo</b>.</li>
        <li>Añade la acción <b>Texto</b> y escribe <code>${esc(APP_URL)}?url=</code> seguido de la variable <b>Texto codificado</b>.</li>
        <li>Añade la acción <b>Abrir URL</b> (con el Texto anterior). Listo.</li>
      </ol>
      <p class="pequeno">Ahora, en cualquier tienda o app, pulsa Compartir → «Me interesa». Se abre la app con el producto leído para revisarlo y guardarlo. La primera vez quizá tengas que iniciar sesión en Safari.</p>
      <p class="pequeno">Si la tienda bloquea la lectura, completa el precio a mano.</p>
      <details><summary class="pequeno">¿Prefieres el marcador también en el móvil?</summary>
        <p class="pequeno">Copia el código, crea un marcador cualquiera, edítalo y pega el código como dirección. Para usarlo en Chrome Android, escribe su nombre en la barra de direcciones y pulsa el resultado.</p>
        <button class="btn mini" id="copiar-marcador">Copiar código del marcador</button>
      </details>
    </div>
    <div>
      <div class="seccion-titulo">Cuenta</div>
      <p class="pequeno">Has entrado como ${esc(E.usuario?.email ?? "")}.</p>
      <details style="margin-bottom:12px"><summary>Cambiar contraseña</summary>
        <form id="form-cambiar-clave" style="display:grid;gap:10px;margin-top:10px">
          <label>Contraseña actual<input type="password" name="actual" required autocomplete="current-password"></label>
          <label>Nueva contraseña<input type="password" name="nueva" required minlength="6" autocomplete="new-password"></label>
          <label>Repite la nueva contraseña<input type="password" name="repite" required minlength="6" autocomplete="new-password"></label>
          <button class="btn primario" type="submit">Cambiar contraseña</button>
          <p class="aviso" id="msg-cambiar-clave" hidden></p>
        </form>
      </details>
      <button class="btn" id="salir">Cerrar sesión</button>
    </div>`;
  $("#form-cambiar-clave").onsubmit = async (e) => {
    e.preventDefault();
    const f = e.target, m = $("#msg-cambiar-clave"), btn = $("button[type=submit]", f);
    const aviso = (txt, ok = false) => { m.hidden = false; m.className = "aviso" + (ok ? " ok" : ""); m.textContent = txt; };
    if (f.nueva.value !== f.repite.value) return aviso("Las dos contraseñas nuevas no coinciden.");
    if (f.nueva.value === f.actual.value) return aviso("La nueva contraseña es igual que la actual.");
    btn.disabled = true;
    try {
      // Comprobamos la contraseña actual antes de cambiarla
      const { error: e1 } = await sb.auth.signInWithPassword({ email: E.usuario.email, password: f.actual.value });
      if (e1) return aviso("La contraseña actual no es correcta. Si no la recuerdas, usa «¿Olvidaste la contraseña?» en la pantalla de acceso.");
      const { error: e2 } = await sb.auth.updateUser({ password: f.nueva.value });
      if (e2) return aviso("No se pudo cambiar: " + e2.message);
      f.reset();
      aviso("Contraseña cambiada ✓", true);
    } finally { btn.disabled = false; }
  };
  $("#salir").onclick = async () => { await sb.auth.signOut(); location.reload(); };
  $("#copiar-marcador").onclick = async () => {
    try { await navigator.clipboard.writeText(enlaceMarcador(APP_URL)); tostada("Código copiado"); }
    catch { tostada("No se pudo copiar"); }
  };
  $("#dlg-ajustes").showModal();
}

// ---------------- Entrada externa (compartir / marcador) ----------------
function leerEntrada() {
  let entrada = null;
  const h = location.hash.match(/^#importar=(.+)$/);
  if (h) { try { entrada = { datos: JSON.parse(decodeURIComponent(h[1])) }; } catch { /* ignorar */ } }
  const q = new URLSearchParams(location.search);
  // Lo que llega al compartir desde el móvil (Android o Atajo de iPhone) puede ser
  // solo el enlace o un texto con el enlace dentro: «Mira esto en Amazon https://amzn.eu/…»
  const bruto = [q.get("url"), q.get("text"), q.get("title")].filter(Boolean).join(" ");
  const compartida = bruto.match(/https?:\/\/[^\s"'<>]+/)?.[0]?.replace(/[.,;:!?)\]]+$/, "");
  if (compartida) {
    const resto = bruto.replace(compartida, "").replace(/https?:\/\/\S+/g, "").replace(/\s+/g, " ").trim();
    const titulo = q.get("title") && !/^https?:/.test(q.get("title")) ? q.get("title") : resto;
    entrada = { url: compartida, titulo: titulo.length > 3 && titulo.length < 250 ? titulo : "" };
  }
  if (h || compartida) history.replaceState(null, "", location.pathname);
  if (entrada) { try { sessionStorage.setItem("entrada", JSON.stringify(entrada)); } catch { /* */ } }
  else { try { entrada = JSON.parse(sessionStorage.getItem("entrada")); } catch { /* */ } }
  return entrada;
}
function procesarEntrada(entrada) {
  try { sessionStorage.removeItem("entrada"); } catch { /* */ }
  if (!entrada) return;
  if (entrada.datos) abrirAnadir({ url: entrada.datos.url, datos: entrada.datos });
  else if (entrada.url) abrirAnadir({ url: entrada.url, titulo: entrada.titulo });
}

// ---------------- Acceso ----------------
let modoRegistro = false;
function mostrarAcceso(msg = "", ok = false) {
  $("#app").hidden = true;
  $("#pantalla-acceso").hidden = false;
  const m = $("#msg-acceso");
  m.hidden = !msg; m.textContent = msg; m.className = "aviso" + (ok ? " ok" : "");
}

async function iniciar() {
  const entrada = leerEntrada();
  const viaRecuperacion = /type=recovery/.test(location.hash + location.search);
  const { data: { session } } = await sb.auth.getSession();
  if (recuperando || (viaRecuperacion && session)) return pedirNuevaClave();
  if (!session) return mostrarAcceso();
  E.usuario = session.user;
  const { data: miembro, error: errMiembro } = await sb.rpc("es_miembro");
  // Solo se cierra la sesión si la base de datos dice claramente que no es miembro
  // (un fallo de red no debe echar a nadie)
  if (!errMiembro && miembro === false) {
    await sb.auth.signOut();
    return mostrarAcceso("Esta cuenta no tiene acceso: la app está limitada a dos personas.");
  }
  $("#pantalla-acceso").hidden = true;
  $("#app").hidden = false;
  await cargar();
  procesarEntrada(entrada);
}

$("#alternar-registro").onclick = (e) => {
  e.preventDefault();
  modoRegistro = !modoRegistro;
  $("#btn-acceso").textContent = modoRegistro ? "Crear cuenta" : "Entrar";
  e.target.textContent = modoRegistro ? "Ya tengo cuenta" : "Crear cuenta";
  e.target.previousSibling.textContent = modoRegistro ? "¿Ya tienes cuenta? " : "¿Primera vez? ";
};

// ---- Recuperar contraseña ----
let recuperando = false;
$("#olvide").onclick = async (e) => {
  e.preventDefault();
  const email = $("#form-acceso").email.value.trim();
  if (!email) { mostrarAcceso("Escribe primero tu correo y vuelve a pulsar «¿Olvidaste la contraseña?»."); $("#form-acceso").email.focus(); return; }
  const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: APP_URL });
  if (error) mostrarAcceso("No se pudo enviar el correo: " + error.message);
  else mostrarAcceso("Te hemos enviado un correo con un enlace para cambiar la contraseña. Ábrelo en este mismo dispositivo.", true);
};
function pedirNuevaClave() {
  recuperando = true;
  $("#app").hidden = true;
  $("#pantalla-acceso").hidden = false;
  $("#form-acceso").hidden = true;
  $("#form-nueva-clave").hidden = false;
  $("#form-nueva-clave").password.focus();
}
sb.auth.onAuthStateChange((evento) => { if (evento === "PASSWORD_RECOVERY") pedirNuevaClave(); });
$("#form-nueva-clave").onsubmit = async (e) => {
  e.preventDefault();
  const m = $("#msg-clave");
  const { error } = await sb.auth.updateUser({ password: e.target.password.value });
  m.hidden = false;
  if (error) { m.className = "aviso"; m.textContent = "Error: " + error.message; return; }
  m.className = "aviso ok"; m.textContent = "Contraseña cambiada ✓";
  recuperando = false;
  setTimeout(() => { $("#form-nueva-clave").hidden = true; $("#form-acceso").hidden = false; iniciar(); }, 900);
};
$("#form-acceso").onsubmit = async (e) => {
  e.preventDefault();
  const f = new FormData(e.target);
  const email = f.get("email"), password = f.get("password");
  try { localStorage.setItem("mantener-sesion", f.get("mantener") ? "si" : "no"); } catch { /* */ }
  const btn = $("#btn-acceso");
  btn.disabled = true;
  try {
    if (modoRegistro) {
      const { data, error } = await sb.auth.signUp({ email, password, options: { emailRedirectTo: APP_URL } });
      if (error) throw error;
      if (!data.session) { mostrarAcceso("Te hemos enviado un correo para confirmar la cuenta. Ábrelo y vuelve aquí para entrar.", true); return; }
    } else {
      const { error } = await sb.auth.signInWithPassword({ email, password });
      if (error) throw error;
    }
    await iniciar();
  } catch (err) {
    const m = /invalid login/i.test(err.message) ? "Correo o contraseña incorrectos." : /not confirmed/i.test(err.message) ? "Confirma primero tu correo (revisa tu bandeja de entrada)." : err.message;
    mostrarAcceso(m);
  } finally { btn.disabled = false; }
};

// ---------------- Eventos ----------------
$("#btn-anadir").onclick = () => abrirAnadir();
$("#btn-ajustes").onclick = abrirAjustes;
$("#btn-gestionar-cats").onclick = abrirGestionCats;
$("#form-url").onsubmit = (e) => { e.preventDefault(); leer(); };
$("#in-url").addEventListener("paste", () => setTimeout(() => { if (/^https?:\/\//.test($("#in-url").value.trim())) leer(); }, 0));
$("#detalle").addEventListener("click", accionDetalle);
$("#gestion-cats").addEventListener("click", accionCats);
$("#gestion-cats").addEventListener("change", cambioCats);

let tBuscar;
$("#buscar").oninput = (e) => { clearTimeout(tBuscar); tBuscar = setTimeout(() => { E.filtro.q = e.target.value; pintar(); }, 150); };
$("#f-estado").onchange = (e) => { E.filtro.estado = e.target.value; pintar(); };
$("#f-tienda").onchange = (e) => { E.filtro.tienda = e.target.value; pintar(); };
$("#f-orden").onchange = (e) => { E.filtro.orden = e.target.value; pintarRejilla(); };
$("#f-bajadas").onchange = (e) => { E.filtro.bajadas = e.target.checked; pintar(); };

$("#arbol-cats").addEventListener("click", (e) => {
  const fl = e.target.closest("[data-alternar]");
  if (fl && fl.dataset.alternar) {
    const id = fl.dataset.alternar;
    E.abiertas.has(id) ? E.abiertas.delete(id) : E.abiertas.add(id);
    guardarLocal("cats-abiertas", [...E.abiertas]);
    pintarArbol();
    return;
  }
  const b = e.target.closest("[data-cat]");
  if (!b) return;
  E.filtro.cat = b.dataset.cat;
  if (b.dataset.cat !== "todas" && b.dataset.cat !== "sin") E.abiertas.add(b.dataset.cat);
  pintar();
  cerrarMenu();
  window.scrollTo({ top: 0, behavior: "smooth" });
});

document.addEventListener("click", (e) => {
  if (e.target.closest("[data-parar]")) return;
  if (e.target.closest("[data-accion=anadir]")) { abrirAnadir(); return; }
  const t = e.target.closest(".tarjeta");
  if (t) abrirDetalle(t.dataset.producto);
});

// Cerrar diálogos al pulsar fuera
$$("dialog").forEach((d) => d.addEventListener("click", (e) => { if (e.target === d) d.close(); }));

// Menú lateral en móvil
const cerrarMenu = () => { $("#lateral").classList.remove("abierta"); $("#velo").hidden = true; };
$("#btn-menu").onclick = () => { $("#lateral").classList.add("abierta"); $("#velo").hidden = false; };
$("#velo").onclick = cerrarMenu;

// Refrescar al volver a la pestaña (por si la otra persona ha añadido algo)
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible" && E.usuario && Date.now() - E.ultimaCarga > 30000 && !$("dialog[open]")) cargar();
});
window.addEventListener("hashchange", () => { if (E.usuario && location.hash.startsWith("#importar=")) procesarEntrada(leerEntrada()); });

// ---------------- Sin zoom ----------------
// iOS ignora user-scalable=no en el viewport: bloqueamos el gesto de pellizco y el doble toque
["gesturestart", "gesturechange", "gestureend"].forEach((ev) => document.addEventListener(ev, (e) => e.preventDefault(), { passive: false }));
document.addEventListener("touchmove", (e) => { if (e.touches.length > 1) e.preventDefault(); }, { passive: false });
// El doble toque lo evita touch-action: manipulation (CSS)

// ---------------- Siempre la última versión ----------------
// El service worker pide los archivos a la red sin caché; además se comprueba
// version.json al volver a la app y cada pocos minutos, y si hay versión nueva se recarga.
let versionActual = null, recargaPendiente = false;
async function comprobarVersion() {
  try {
    const r = await fetch("version.json?t=" + Date.now(), { cache: "no-store" });
    if (!r.ok) return;
    const { version } = await r.json();
    if (versionActual == null) { versionActual = version; return; }
    if (version !== versionActual) recargaPendiente = true;
  } catch { /* sin conexión */ }
  if (recargaPendiente) recargarSiSePuede();
}
function recargarSiSePuede() {
  if ($("dialog[open]") || $("#form-nueva-clave:not([hidden])")) {
    tostada("Hay una versión nueva de la app: se actualizará al cerrar esta ventana.", 4000);
    return;
  }
  location.reload();
}
$$("dialog").forEach((d) => d.addEventListener("close", () => { if (recargaPendiente) setTimeout(recargarSiSePuede, 300); }));
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") {
    comprobarVersion();
    navigator.serviceWorker?.getRegistration().then((r) => r?.update()).catch(() => {});
  }
});
window.addEventListener("focus", comprobarVersion);
setInterval(comprobarVersion, 5 * 60 * 1000);
comprobarVersion();

if ("serviceWorker" in navigator) {
  const habiaControlador = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.register("sw.js", { updateViaCache: "none" }).then((r) => r.update()).catch(() => {});
  // Cuando se instala un service worker nuevo, recargamos para usarlo
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (habiaControlador) { recargaPendiente = true; recargarSiSePuede(); }
  });
}

iniciar();
