// Lectura de datos de producto a partir de una URL de tienda.
// Fuentes, por orden de fiabilidad: JSON-LD (schema.org Product), microdatos,
// metaetiquetas Open Graph / product:*, y reglas específicas de algunas tiendas.

export interface DatosProducto {
  url: string;
  urlFinal: string;
  tienda: string | null;
  titulo: string | null;
  imagen: string | null;
  descripcion: string | null;
  marca: string | null;
  ean: string | null;
  precio: number | null;
  precioOriginal: number | null;
  moneda: string | null;
  disponible: boolean | null;
  categoriaTienda: string | null;
  migas: string[];
  bloqueado: boolean;
}

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

export function urlPermitida(raw: string): URL {
  let u: URL;
  try {
    u = new URL(raw.trim());
  } catch {
    throw new Error("El enlace no es válido");
  }
  if (!["http:", "https:"].includes(u.protocol)) throw new Error("Solo se admiten enlaces http(s)");
  const h = u.hostname.toLowerCase();
  if (
    h === "localhost" || h.endsWith(".local") || h.endsWith(".internal") ||
    /^(127\.|10\.|192\.168\.|169\.254\.|0\.)/.test(h) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(h) || h.includes(":") || /^\d+$/.test(h)
  ) {
    throw new Error("Dirección no permitida");
  }
  return u;
}

export async function descargar(url: string): Promise<{ html: string; urlFinal: string; status: number }> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 15000);
  try {
    const r = await fetch(url, {
      redirect: "follow",
      signal: ctrl.signal,
      headers: {
        "User-Agent": UA,
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Accept-Language": "es-ES,es;q=0.9,en;q=0.6",
        "Cache-Control": "no-cache",
        "Upgrade-Insecure-Requests": "1",
        "Sec-Fetch-Dest": "document",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-Site": "none",
      },
    });
    const buf = new Uint8Array(await r.arrayBuffer());
    const corte = buf.slice(0, 3_000_000);
    let charset = (r.headers.get("content-type") || "").match(/charset=([\w-]+)/i)?.[1];
    let html = new TextDecoder("utf-8").decode(corte);
    if (!charset) charset = html.slice(0, 3000).match(/<meta[^>]+charset=["']?([\w-]+)/i)?.[1];
    if (charset && !/utf-?8/i.test(charset)) {
      try { html = new TextDecoder(charset).decode(corte); } catch { /* utf-8 */ }
    }
    return { html, urlFinal: r.url || url, status: r.status };
  } finally {
    clearTimeout(t);
  }
}

// ---------- utilidades ----------

const ENTIDADES: Record<string, string> = {
  amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", euro: "€",
  aacute: "á", eacute: "é", iacute: "í", oacute: "ó", uacute: "ú", ntilde: "ñ",
  Aacute: "Á", Eacute: "É", Iacute: "Í", Oacute: "Ó", Uacute: "Ú", Ntilde: "Ñ", uuml: "ü", ordm: "º", ordf: "ª",
};
export function decodificar(s: string): string {
  return s
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(parseInt(d, 10)))
    .replace(/&([a-z]+);/gi, (m, n) => ENTIDADES[n] ?? m);
}
function limpiar(s: unknown): string | null {
  if (s == null) return null;
  const t = decodificar(String(s)).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  return t || null;
}

/** Convierte "1.299,00 €", "1,299.00", "1299", 1299 → número */
export function parsePrecio(v: unknown): number | null {
  if (v == null) return null;
  if (typeof v === "number") return isFinite(v) && v > 0 ? Math.round(v * 100) / 100 : null;
  let s = decodificar(String(v)).replace(/[^\d.,]/g, "");
  if (!s) return null;
  const ultComa = s.lastIndexOf(","), ultPunto = s.lastIndexOf(".");
  if (ultComa > -1 && ultPunto > -1) {
    if (ultComa > ultPunto) s = s.replace(/\./g, "").replace(",", ".");
    else s = s.replace(/,/g, "");
  } else if (ultComa > -1) {
    const dec = s.length - ultComa - 1;
    s = dec === 3 && s.split(",").length === 2 && !/^0/.test(s) ? s.replace(",", "") : s.replace(/,/g, (m, i) => (i === ultComa ? "." : ""));
  } else if (ultPunto > -1) {
    const partes = s.split(".");
    if (partes.length > 2 || (partes[1]?.length === 3 && partes[0] !== "0")) s = s.replace(/\./g, "");
  }
  const n = parseFloat(s);
  return isFinite(n) && n > 0 && n < 10_000_000 ? Math.round(n * 100) / 100 : null;
}

function absoluta(src: string | null, base: string): string | null {
  if (!src) return null;
  try { return new URL(decodificar(src.trim()), base).href; } catch { return null; }
}

function atributos(etiqueta: string): Record<string, string> {
  const a: Record<string, string> = {};
  for (const m of etiqueta.matchAll(/([\w:-]+)\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/g)) {
    a[m[1].toLowerCase()] = m[3] ?? m[4] ?? m[5] ?? "";
  }
  return a;
}

function metas(html: string): Map<string, string> {
  const map = new Map<string, string>();
  for (const m of html.matchAll(/<meta\b[^>]*>/gi)) {
    const a = atributos(m[0]);
    const k = (a.property || a.name || a.itemprop || "").toLowerCase();
    if (k && a.content != null && !map.has(k)) map.set(k, a.content);
  }
  return map;
}

// ---------- JSON-LD ----------

function tiposDe(o: any): string[] {
  const t = o?.["@type"];
  return (Array.isArray(t) ? t : [t]).filter(Boolean).map((x: string) => String(x).toLowerCase());
}

function aplanar(nodo: any, out: any[] = []): any[] {
  if (!nodo || typeof nodo !== "object") return out;
  if (Array.isArray(nodo)) { nodo.forEach((n) => aplanar(n, out)); return out; }
  out.push(nodo);
  if (nodo["@graph"]) aplanar(nodo["@graph"], out);
  if (nodo.mainEntity) aplanar(nodo.mainEntity, out);
  if (nodo.hasVariant) aplanar(nodo.hasVariant, out);
  return out;
}

function jsonLd(html: string): any[] {
  const nodos: any[] = [];
  for (const m of html.matchAll(/<script\b[^>]*type\s*=\s*["']?application\/ld\+json["']?[^>]*>([\s\S]*?)<\/script>/gi)) {
    let txt = m[1].trim().replace(/^<!\[CDATA\[|\]\]>$/g, "");
    try {
      aplanar(JSON.parse(txt), nodos);
    } catch {
      try { aplanar(JSON.parse(txt.replace(/[\u0000-\u001f]+/g, " ")), nodos); } catch { /* ignorar */ }
    }
  }
  return nodos;
}

function imagenDe(img: any): string | null {
  if (!img) return null;
  if (typeof img === "string") return img;
  if (Array.isArray(img)) return imagenDe(img[0]);
  return img.url || img.contentUrl || img["@id"] || null;
}

function ofertaDe(offers: any): { precio: number | null; original: number | null; moneda: string | null; disp: boolean | null } {
  const lista = aplanar(offers).filter((o) => o && (o.price != null || o.lowPrice != null || o.priceSpecification));
  let precio: number | null = null, original: number | null = null, moneda: string | null = null, disp: boolean | null = null;
  for (const o of lista) {
    let p = parsePrecio(o.price ?? o.lowPrice);
    const specs = aplanar(o.priceSpecification);
    for (const s of specs) {
      const tipo = String(s.priceType || "").toLowerCase();
      const v = parsePrecio(s.price);
      if (/strikethrough|listprice|msrp/.test(tipo)) { if (v) original = original ?? v; }
      else if (p == null && v) p = v;
      moneda = moneda || s.priceCurrency || null;
    }
    if (p != null && (precio == null || p < precio)) {
      precio = p;
      moneda = o.priceCurrency || moneda;
      if (o.availability) disp = !/outofstock|soldout|discontinued/i.test(String(o.availability));
    }
    if (o.highPrice && !original) {
      const h = parsePrecio(o.highPrice);
      if (h && precio && h > precio && tiposDe(o).includes("aggregateoffer") === false) original = h;
    }
  }
  return { precio, original, moneda, disp };
}

function eanDe(p: any): string | null {
  for (const k of ["gtin13", "gtin", "gtin12", "gtin14", "gtin8", "ean", "isbn"]) {
    const v = p?.[k];
    if (v) {
      const d = String(v).replace(/\D/g, "");
      if (d.length >= 8 && d.length <= 14) return d.padStart(13, "0").slice(-13);
    }
  }
  return null;
}

// ---------- reglas específicas ----------

function reglasTienda(host: string, html: string, d: DatosProducto) {
  if (/amazon\./.test(host)) {
    const t = html.match(/id=["']productTitle["'][^>]*>([\s\S]*?)<\/span>/i)?.[1];
    if (t) d.titulo = limpiar(t);
    const bloquePrecio =
      html.match(/id=["'](?:corePriceDisplay_desktop_feature_div|corePrice_feature_div|apex_desktop)["'][\s\S]{0,6000}/i)?.[0] ?? "";
    const p = bloquePrecio.match(/class=["']a-offscreen["'][^>]*>([^<]+)</i)?.[1] ??
      html.match(/class=["']a-price-whole["'][^>]*>([\d.,]+)/i)?.[1];
    if (p) d.precio = parsePrecio(p) ?? d.precio;
    const orig = bloquePrecio.match(/a-text-price[^>]*data-a-strike[^>]*>[\s\S]{0,200}?a-offscreen["'][^>]*>([^<]+)/i)?.[1] ??
      bloquePrecio.match(/basisPrice[\s\S]{0,400}?a-offscreen["'][^>]*>([^<]+)/i)?.[1];
    if (orig) d.precioOriginal = parsePrecio(orig);
    const img = html.match(/data-old-hires=["']([^"']+)["']/i)?.[1] ?? html.match(/"hiRes":"([^"]+)"/)?.[1] ??
      html.match(/id=["']landingImage["'][^>]*src=["']([^"']+)["']/i)?.[1];
    if (img) d.imagen = img;
    const migas = [...(html.match(/id=["']wayfinding-breadcrumbs_feature_div["'][\s\S]*?<\/ul>/i)?.[0] ?? "")
      .matchAll(/<a[^>]*>([\s\S]*?)<\/a>/gi)].map((m) => limpiar(m[1])!).filter(Boolean);
    if (migas.length) d.migas = migas;
    const marca = html.match(/id=["']bylineInfo["'][^>]*>([\s\S]*?)<\/a>/i)?.[1];
    if (marca && !d.marca) d.marca = limpiar(marca)?.replace(/^(Visita la tienda de|Marca:)\s*/i, "") ?? null;
    if (/id=["']outOfStock["']/i.test(html)) d.disponible = false;
    else if (d.precio) d.disponible = true;
    if (/captcha|Introduce los caracteres que ves/i.test(html) && !d.titulo) d.bloqueado = true;
  }
}

// ---------- principal ----------

export function analizar(html: string, url: string, urlFinal: string): DatosProducto {
  const host = new URL(urlFinal).hostname.replace(/^www\d?\./, "");
  const m = metas(html);
  const d: DatosProducto = {
    url, urlFinal, tienda: null, titulo: null, imagen: null, descripcion: null, marca: null, ean: null,
    precio: null, precioOriginal: null, moneda: null, disponible: null, categoriaTienda: null, migas: [], bloqueado: false,
  };

  const nodos = jsonLd(html);
  const producto = nodos.find((n) => tiposDe(n).some((t) => t === "product" || t === "productgroup" || t === "individualproduct"));
  if (producto) {
    d.titulo = limpiar(producto.name);
    d.imagen = imagenDe(producto.image);
    d.descripcion = limpiar(producto.description);
    d.marca = limpiar(typeof producto.brand === "string" ? producto.brand : producto.brand?.name ?? (Array.isArray(producto.brand) ? producto.brand[0]?.name : null));
    d.ean = eanDe(producto);
    let of = ofertaDe(producto.offers);
    if (of.precio == null && producto.hasVariant) {
      for (const v of aplanar(producto.hasVariant)) { of = ofertaDe(v.offers); if (of.precio != null) break; }
    }
    d.precio = of.precio; d.precioOriginal = of.original; d.moneda = of.moneda; d.disponible = of.disp;
    const cat = producto.category;
    d.categoriaTienda = limpiar(typeof cat === "string" ? cat : cat?.name ?? null);
  }
  if (d.precio == null) {
    // Oferta suelta en JSON-LD
    const sueltas = nodos.filter((n) => tiposDe(n).some((t) => t === "offer" || t === "aggregateoffer"));
    if (sueltas.length) {
      const of = ofertaDe(sueltas);
      d.precio = of.precio; d.moneda = d.moneda ?? of.moneda; d.disponible = d.disponible ?? of.disp;
    }
  }
  const migas = nodos.find((n) => tiposDe(n).includes("breadcrumblist"));
  if (migas?.itemListElement) {
    const items = aplanar(migas.itemListElement)
      .filter((i) => i.position != null || i.name || i.item)
      .sort((a, b) => (Number(a.position) || 0) - (Number(b.position) || 0))
      .map((i) => limpiar(i.name ?? i.item?.name))
      .filter((x): x is string => !!x);
    d.migas = items;
  }

  // Microdatos
  if (d.precio == null) {
    const pm = html.match(/itemprop=["']price["'][^>]*content=["']([^"']+)["']/i)?.[1] ??
      html.match(/content=["']([^"']+)["'][^>]*itemprop=["']price["']/i)?.[1] ??
      html.match(/itemprop=["']price["'][^>]*>([^<]+)</i)?.[1];
    d.precio = parsePrecio(pm);
  }
  if (!d.ean) {
    const g = html.match(/itemprop=["']gtin1[34]?["'][^>]*content=["'](\d{8,14})["']/i)?.[1];
    if (g) d.ean = g.padStart(13, "0").slice(-13);
  }

  // Metaetiquetas
  d.titulo = d.titulo ?? limpiar(m.get("og:title") ?? m.get("twitter:title") ?? html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]);
  d.imagen = d.imagen ?? m.get("og:image:secure_url") ?? m.get("og:image") ?? m.get("twitter:image") ?? m.get("twitter:image:src") ?? null;
  d.descripcion = d.descripcion ?? limpiar(m.get("og:description") ?? m.get("description"));
  d.precio = d.precio ?? parsePrecio(m.get("product:price:amount") ?? m.get("og:price:amount") ?? m.get("product:sale_price:amount") ?? m.get("twitter:data1"));
  d.precioOriginal = d.precioOriginal ?? parsePrecio(m.get("product:original_price:amount"));
  d.moneda = d.moneda ?? m.get("product:price:currency") ?? m.get("og:price:currency") ?? null;
  d.marca = d.marca ?? limpiar(m.get("product:brand") ?? m.get("og:brand"));
  if (d.disponible == null && m.get("product:availability")) d.disponible = !/out|agotado|oos/i.test(m.get("product:availability")!);
  d.tienda = limpiar(m.get("og:site_name")) ?? null;

  reglasTienda(host, html, d);

  // Retoques finales
  if (!d.tienda) {
    const partes = host.split(".");
    const base = partes.length > 2 && /^(co|com|org)$/.test(partes[partes.length - 2]) ? partes[partes.length - 3] : partes[partes.length - 2] ?? host;
    d.tienda = base.charAt(0).toUpperCase() + base.slice(1);
  }
  if (d.titulo && d.tienda) {
    d.titulo = d.titulo.replace(new RegExp(`\\s*[|\\-–—:]\\s*${d.tienda.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}.*$`, "i"), "").trim() || d.titulo;
  }
  if (d.titulo && d.titulo.length > 250) d.titulo = d.titulo.slice(0, 250) + "…";
  if (d.descripcion && d.descripcion.length > 600) d.descripcion = d.descripcion.slice(0, 600) + "…";
  d.imagen = absoluta(d.imagen, urlFinal);
  if (d.precioOriginal != null && (d.precio == null || d.precioOriginal <= d.precio)) d.precioOriginal = null;
  if (d.migas.length && d.titulo && d.migas[d.migas.length - 1].toLowerCase() === d.titulo.toLowerCase()) d.migas.pop();
  d.migas = d.migas.filter((x) => !/^(inicio|home|portada|página de inicio|amazon\.es)$/i.test(x));
  if (!d.titulo && !d.precio && /captcha|access denied|robot|cloudflare/i.test(html.slice(0, 20000))) d.bloqueado = true;
  // Páginas de comprobación anti-bots o de error: no son el producto
  if (!d.precio && d.titulo && /just a moment|un momento|attention required|access denied|acceso denegado|robot check|captcha|are you a human|pardon our interruption|^error|\b40[34]\b|no encontrad|not found|documento no encontrado/i.test(d.titulo)) {
    d.bloqueado = true;
    d.titulo = null; d.imagen = null; d.descripcion = null;
  }
  if (!d.precio && d.titulo && d.tienda && d.titulo.toLowerCase() === d.tienda.toLowerCase()) {
    d.bloqueado = true;
    d.titulo = null;
  }
  return d;
}

// Segundo intento a través de un lector externo que renderiza la página
// (útil con tiendas que bloquean peticiones desde servidores).
async function descargarConLector(url: string): Promise<{ html: string; status: number }> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 25000);
  try {
    const r = await fetch("https://r.jina.ai/" + url, {
      signal: ctrl.signal,
      headers: { "X-Return-Format": "html", "Accept": "text/html", "X-Locale": "es-ES" },
    });
    return { html: await r.text(), status: r.status };
  } finally {
    clearTimeout(t);
  }
}

function puntuacion(d: DatosProducto): number {
  return (d.precio ? 4 : 0) + (d.titulo ? 2 : 0) + (d.imagen ? 1 : 0) + (d.bloqueado ? -5 : 0);
}

export async function extraer(url: string): Promise<DatosProducto> {
  const u = urlPermitida(url);
  let d: DatosProducto | null = null;
  try {
    const { html, urlFinal, status } = await descargar(u.href);
    d = analizar(html, u.href, urlFinal);
    if (status >= 400) d.bloqueado = true;
  } catch { /* probamos con el lector */ }
  if (!d || d.bloqueado || d.precio == null) {
    try {
      const { html, status } = await descargarConLector(u.href);
      if (status < 400) {
        const d2 = analizar(html, u.href, d?.urlFinal ?? u.href);
        if (!d || puntuacion(d2) > puntuacion(d)) d = d2;
      }
    } catch { /* nos quedamos con lo que haya */ }
  }
  if (!d) throw new Error("No se pudo abrir la página");
  return d;
}
