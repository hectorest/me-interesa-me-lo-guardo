// Código del marcador «Guardar en Me interesa».
// Se ejecuta dentro de la página de la tienda, en el navegador de quien lo pulsa,
// así que funciona aunque la tienda bloquee la lectura desde el servidor.
// Debe ser autocontenido: se serializa con toString() y se mete en un enlace javascript:.

export function capturar(APP) {
  var limpio = function (s) { return (s == null ? "" : String(s)).replace(/\s+/g, " ").trim() || null; };
  var meta = function (k) {
    var e = document.querySelector('meta[property="' + k + '"],meta[name="' + k + '"],meta[itemprop="' + k + '"]');
    return e ? e.getAttribute("content") : null;
  };
  var pp = function (v) {
    if (v == null) return null;
    if (typeof v === "number") return v > 0 ? Math.round(v * 100) / 100 : null;
    var s = String(v).replace(/[^\d.,]/g, "");
    if (!s) return null;
    var c = s.lastIndexOf(","), p = s.lastIndexOf(".");
    if (c > -1 && p > -1) s = c > p ? s.replace(/\./g, "").replace(",", ".") : s.replace(/,/g, "");
    else if (c > -1) s = (s.length - c - 1 === 3 && s.split(",").length === 2) ? s.replace(",", "") : s.replace(/,(?=.*,)/g, "").replace(",", ".");
    else if (p > -1) { var q = s.split("."); if (q.length > 2 || (q[1] && q[1].length === 3 && q[0] !== "0")) s = s.replace(/\./g, ""); }
    var n = parseFloat(s);
    return isFinite(n) && n > 0 && n < 1e7 ? Math.round(n * 100) / 100 : null;
  };
  var d = { url: location.href, titulo: null, imagen: null, precio: null, precioOriginal: null, tienda: null, marca: null, ean: null, migas: [], categoriaTienda: null, descripcion: null, disponible: null, origen: "marcador" };

  var nodos = [];
  var plano = function (n) {
    if (!n || typeof n !== "object") return;
    if (Array.isArray(n)) { n.forEach(plano); return; }
    nodos.push(n);
    if (n["@graph"]) plano(n["@graph"]);
    if (n.mainEntity) plano(n.mainEntity);
    if (n.hasVariant) plano(n.hasVariant);
  };
  document.querySelectorAll('script[type="application/ld+json"]').forEach(function (s) { try { plano(JSON.parse(s.textContent)); } catch (e) { } });
  var tipo = function (n) { return [].concat(n["@type"] || []).map(function (x) { return String(x).toLowerCase(); }); };
  var ofertas = function (o) { var l = []; var f = function (x) { if (!x) return; if (Array.isArray(x)) x.forEach(f); else { l.push(x); if (x.offers) f(x.offers); } }; f(o); return l; };

  var prod = nodos.find(function (n) { return tipo(n).some(function (t) { return t === "product" || t === "productgroup"; }); });
  if (prod) {
    d.titulo = limpio(prod.name);
    var im = prod.image; while (Array.isArray(im)) im = im[0]; d.imagen = im && (im.url || im.contentUrl || (typeof im === "string" ? im : null));
    d.descripcion = limpio(prod.description);
    d.marca = limpio(typeof prod.brand === "string" ? prod.brand : prod.brand && prod.brand.name);
    ["gtin13", "gtin", "gtin12", "gtin14", "gtin8", "ean"].some(function (k) { var v = prod[k] && String(prod[k]).replace(/\D/g, ""); if (v && v.length >= 8) { d.ean = ("0000000000000" + v).slice(-13); return true; } });
    var lista = ofertas(prod.offers);
    if (!lista.length && prod.hasVariant) lista = ofertas([].concat(prod.hasVariant).map(function (v) { return v.offers; }));
    lista.forEach(function (o) {
      var v = pp(o.price != null ? o.price : o.lowPrice);
      [].concat(o.priceSpecification || []).forEach(function (s) {
        var t = String(s.priceType || "").toLowerCase(), x = pp(s.price);
        if (/strikethrough|listprice/.test(t)) d.precioOriginal = d.precioOriginal || x; else if (v == null) v = x;
      });
      if (v != null && (d.precio == null || v < d.precio)) { d.precio = v; if (o.availability) d.disponible = !/outofstock|soldout|discontinued/i.test(o.availability); }
    });
    d.categoriaTienda = limpio(typeof prod.category === "string" ? prod.category : prod.category && prod.category.name);
  }
  var bc = nodos.find(function (n) { return tipo(n).indexOf("breadcrumblist") > -1; });
  if (bc && bc.itemListElement) {
    d.migas = [].concat(bc.itemListElement).sort(function (a, b) { return (a.position || 0) - (b.position || 0); })
      .map(function (i) { return limpio(i.name || (i.item && i.item.name)); }).filter(Boolean);
  } else {
    var nav = document.querySelector('nav[aria-label*="readcrumb" i],[class*="breadcrumb" i],[id*="breadcrumb" i]');
    if (nav) d.migas = Array.prototype.map.call(nav.querySelectorAll("a"), function (a) { return limpio(a.textContent); }).filter(Boolean);
  }

  if (/amazon\./.test(location.hostname)) {
    var t = document.getElementById("productTitle"); if (t) d.titulo = limpio(t.textContent);
    var caja = document.querySelector("#corePriceDisplay_desktop_feature_div, #corePrice_feature_div, #apex_desktop, #corePrice_desktop, #apex_offerDisplay_desktop");
    var pr = caja && caja.querySelector(".priceToPay .a-offscreen, .a-price:not(.a-text-price) .a-offscreen");
    if (pr) d.precio = pp(pr.textContent) || d.precio;
    var po = caja && caja.querySelector(".basisPrice .a-offscreen, .a-text-price[data-a-strike] .a-offscreen");
    if (po) d.precioOriginal = pp(po.textContent);
    var img = document.getElementById("landingImage") || document.getElementById("imgBlkFront");
    if (img) d.imagen = img.getAttribute("data-old-hires") || img.src;
    var w = document.getElementById("wayfinding-breadcrumbs_feature_div");
    if (w) d.migas = Array.prototype.map.call(w.querySelectorAll("a"), function (a) { return limpio(a.textContent); }).filter(Boolean);
    var by = document.getElementById("bylineInfo"); if (by && !d.marca) d.marca = limpio(by.textContent.replace(/^(Visita la tienda de|Marca:)\s*/i, ""));
    if (document.getElementById("outOfStock")) d.disponible = false;
  }

  d.titulo = d.titulo || limpio(meta("og:title")) || limpio(document.querySelector("h1") && document.querySelector("h1").textContent) || limpio(document.title);
  d.imagen = d.imagen || meta("og:image") || meta("twitter:image");
  d.descripcion = d.descripcion || limpio(meta("og:description") || meta("description"));
  d.precio = d.precio || pp(meta("product:price:amount") || meta("og:price:amount") || meta("price"));
  d.marca = d.marca || limpio(meta("product:brand"));
  d.tienda = limpio(meta("og:site_name"));

  var visible = function (e) { var r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(e).visibility !== "hidden"; };
  var conMoneda = /(\d[\d.,]*\s?(€|eur))|(€\s?\d)/i;
  if (!d.precio) {
    var mejor = null, tam = 0;
    document.querySelectorAll('[itemprop="price"],[class*="price" i],[class*="precio" i],[data-price],[id*="price" i]').forEach(function (e) {
      if (!visible(e)) return;
      var txt = e.textContent || ""; if (txt.length > 40 || !conMoneda.test(txt)) return;
      if (e.closest('s,del,[class*="old" i],[class*="strike" i],[class*="before" i],[class*="tachado" i],[class*="crossed" i]')) return;
      var r = e.getBoundingClientRect(); if (r.top + scrollY > 2000) return;
      var f = parseFloat(getComputedStyle(e).fontSize) || 0;
      if (f > tam) { tam = f; mejor = e; }
    });
    if (mejor) d.precio = pp(mejor.getAttribute("content") || mejor.textContent);
  }
  if (!d.precioOriginal && d.precio) {
    document.querySelectorAll('s,del,[class*="old" i],[class*="strike" i],[class*="before" i],[class*="tachado" i],[class*="crossed" i],[class*="original" i]').forEach(function (e) {
      if (d.precioOriginal || !visible(e)) return;
      var txt = e.textContent || ""; if (txt.length > 40 || !conMoneda.test(txt)) return;
      var v = pp(txt); if (v && v > d.precio && v < d.precio * 5) d.precioOriginal = v;
    });
  }
  if (!d.imagen) {
    var g = null, a = 0;
    document.querySelectorAll("img").forEach(function (i) { var r = i.getBoundingClientRect(); if (r.top + scrollY < 1500 && r.width * r.height > a) { a = r.width * r.height; g = i; } });
    if (g) d.imagen = g.currentSrc || g.src;
  }
  try { d.imagen = d.imagen ? new URL(d.imagen, location.href).href : null; } catch (e) { d.imagen = null; }
  if (d.precioOriginal && d.precio && d.precioOriginal <= d.precio) d.precioOriginal = null;
  if (d.descripcion) d.descripcion = d.descripcion.slice(0, 300);
  if (d.titulo) d.titulo = d.titulo.slice(0, 250);
  d.migas = d.migas.slice(0, 8).filter(function (x) { return !/^(inicio|home|portada)$/i.test(x) && x !== d.titulo; });

  var destino = APP + "#importar=" + encodeURIComponent(JSON.stringify(d));
  var v = window.open(destino, "_blank");
  if (!v) location.href = destino;
}

export function enlaceMarcador(appUrl) {
  return "javascript:" + encodeURIComponent("(" + capturar.toString() + ")(" + JSON.stringify(appUrl) + ");void 0");
}
