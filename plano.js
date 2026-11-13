// Plano de la vivienda.
// - Arquitectura fija (muros, suelo, puertas, ventanas, mobiliario), redibujada a partir del plano de cotas.
// - Zonas editables (tabla plano_zonas): polígonos de color encima del suelo, con nombre y espacio asociado.
// Coordenadas en «unidades de plano» (≈ 98 unidades = 1 m).

export const ESCALA = 98;

// Contorno exterior de la vivienda (cara exterior de los muros)
export const CONTORNO = [[138, 380], [512, 328], [966, 178], [968, 2196], [138, 2210]];

// Suelo: huecos entre muros. También son las zonas por defecto.
export const ZONAS = [
  { id: "trastero", nombre: "Trastero", puntos: [[160, 398], [262, 384], [262, 512], [160, 512]] },
  { id: "lavadero", nombre: "Lavadero", puntos: [[282, 368], [555, 334], [555, 512], [282, 512]] },
  { id: "pasillo", nombre: "Pasillo", puntos: [[160, 520], [555, 520], [555, 606], [262, 606], [262, 1570], [160, 1570]] },
  { id: "estancia-norte", nombre: "Estancia norte", puntos: [[565, 330], [946, 216], [946, 606], [565, 606]] },
  { id: "habitacion-1", nombre: "Habitación 1", puntos: [[268, 618], [634, 618], [629, 908], [268, 908]] },
  { id: "habitacion-2", nombre: "Habitación 2", puntos: [[268, 918], [628, 918], [623, 1208], [268, 1208]] },
  { id: "bano", nombre: "Baño", puntos: [[268, 1218], [610, 1218], [610, 1360], [268, 1360]] },
  { id: "habitacion-3", nombre: "Habitación 3", puntos: [[653, 628], [946, 628], [946, 903], [645, 903]] },
  { id: "habitacion-4", nombre: "Habitación 4", puntos: [[645, 913], [946, 913], [946, 1352], [632, 1352]] },
  { id: "habitacion-5", nombre: "Habitación 5", puntos: [[757, 1372], [946, 1372], [946, 1775], [757, 1775]] },
  { id: "cocina", nombre: "Cocina", puntos: [[262, 1366], [632, 1366], [632, 1622], [262, 1622]] },
  { id: "comedor", nombre: "Comedor",
    puntos: [[160, 1570], [262, 1570], [262, 1622], [632, 1622], [632, 1366], [738, 1366], [738, 1700], [748, 1700], [748, 1782], [717, 1782], [717, 1890], [160, 1890]] },
  { id: "salon", nombre: "Salón",
    puntos: [[160, 1890], [717, 1890], [717, 1812], [820, 1812], [820, 1796], [938, 1796], [938, 1812], [946, 1812], [946, 2182], [160, 2186]] },
];
export const SUELO = ZONAS.map((z) => z.puntos);

// Puertas: hueco en el muro [x, y, ancho, alto], hoja [bisagra, extremo] y arco [inicio, fin, radio]
export const PUERTAS = [
  { h: [174, 510, 70, 12], hoja: [[174, 512], [174, 590]], arco: [[174, 590], [244, 512], 72] },
  { h: [362, 510, 70, 12], hoja: [[432, 512], [432, 442]], arco: [[432, 442], [362, 512], 72] },
  { h: [553, 527, 14, 72], hoja: [[565, 598], [635, 598]], arco: [[635, 598], [556, 527], 72] },
  { h: [258, 823, 14, 70], hoja: [[262, 893], [338, 893]], arco: [[338, 893], [262, 823], 74] },
  { h: [258, 933, 14, 70], hoja: [[262, 933], [338, 933]], arco: [[338, 933], [262, 1003], 74] },
  { h: [258, 1275, 14, 68], hoja: [[262, 1343], [338, 1343]], arco: [[338, 1343], [262, 1275], 74] },
  { h: [636, 1350, 70, 18], hoja: [[705, 1366], [705, 1440]], arco: [[705, 1440], [636, 1366], 72] },
  { h: [736, 1688, 23, 78], hoja: [[748, 1688], [660, 1688]], arco: [[660, 1688], [748, 1766], 86] },
];

// Ventanas de fachada
export const VENTANAS = [[[278, 2196], [426, 2192]], [[630, 2190], [784, 2188]]];

// Mobiliario fijo (cocina y baño)
export const FIJOS = `
  <g class="fijo">
    <rect x="268" y="1370" width="360" height="60" rx="3"/>
    <rect x="380" y="1374" width="54" height="52" rx="4"/>
    <circle cx="396" cy="1388" r="8"/><circle cx="420" cy="1388" r="8"/><circle cx="396" cy="1412" r="8"/><circle cx="420" cy="1412" r="8"/>
    <rect x="300" y="1540" width="228" height="62" rx="8"/>
    <rect x="512" y="1222" width="96" height="136" rx="3"/>
    <path d="M520 1230 L600 1350 M600 1230 L520 1350"/>
    <rect x="316" y="1220" width="58" height="44" rx="6"/>
    <rect x="429" y="1221" width="32" height="12" rx="3"/>
    <ellipse cx="445" cy="1256" rx="18" ry="24"/>
  </g>`;

export const COLORES = ["#f6d8c8", "#f7ebc6", "#dcebd8", "#d6eeea", "#d9e7f2", "#e4dcf3", "#efe0f2", "#f3d6dc", "#ece6dc", "#e3e0d8"];

// Colores por defecto de las zonas iniciales
const COLOR_DEFECTO = { trastero: "#e3e0d8", lavadero: "#d9e7f2", pasillo: "#ece6dc", "estancia-norte": "#dcebd8", "habitacion-1": "#efe0f2", "habitacion-2": "#f7ebc6", bano: "#d6eeea", "habitacion-3": "#f3d6dc", "habitacion-4": "#d9e7f2", "habitacion-5": "#dcebd8", cocina: "#f6d8c8", comedor: "#f7ebc6", salon: "#efe0f2" };
export const zonasPorDefecto = () => ZONAS.map((z, i) => ({ id: z.id, nombre: z.nombre, color: COLOR_DEFECTO[z.id], espacio_id: null, poligonos: [z.puntos.map((p) => [...p])], orden: i + 1 }));

// ---------------- Geometría ----------------
export function areaPoligono(p) {
  let s = 0;
  for (let i = 0; i < p.length; i++) { const [x1, y1] = p[i], [x2, y2] = p[(i + 1) % p.length]; s += x1 * y2 - x2 * y1; }
  return Math.abs(s / 2);
}
export const areaM2 = (p) => areaPoligono(p) / (ESCALA * ESCALA);

export function puntoEnPoligono([x, y], p) {
  let dentro = false;
  for (let i = 0, j = p.length - 1; i < p.length; j = i++) {
    const [xi, yi] = p[i], [xj, yj] = p[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) dentro = !dentro;
  }
  return dentro;
}
function distSegmento([px, py], [ax, ay], [bx, by]) {
  const dx = bx - ax, dy = by - ay, l = dx * dx + dy * dy;
  const t = l ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / l)) : 0;
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}
export const bbox = (p) => {
  const xs = p.map((q) => q[0]), ys = p.map((q) => q[1]);
  return { x1: Math.min(...xs), y1: Math.min(...ys), x2: Math.max(...xs), y2: Math.max(...ys) };
};
// Punto interior más alejado de los bordes (para colocar la etiqueta, también en formas en L)
export function centroVisual(p) {
  const b = bbox(p);
  const dist = (q) => (puntoEnPoligono(q, p) ? Math.min(...p.map((a, i) => distSegmento(q, a, p[(i + 1) % p.length]))) : -1);
  let mejor = [(b.x1 + b.x2) / 2, (b.y1 + b.y2) / 2], md = dist(mejor);
  let paso = Math.max(b.x2 - b.x1, b.y2 - b.y1) / 16, cx = mejor[0], cy = mejor[1];
  for (let ronda = 0; ronda < 3; ronda++) {
    const x0 = ronda ? cx - paso * 8 : b.x1, y0 = ronda ? cy - paso * 8 : b.y1;
    const n = ronda ? 16 : 16;
    for (let i = 0; i <= n; i++) for (let j = 0; j <= n; j++) {
      const q = [x0 + i * paso, y0 + j * paso], d = dist(q);
      if (d > md) { md = d; mejor = q; }
    }
    [cx, cy] = mejor; paso /= 4;
  }
  return { punto: mejor.map((v) => Math.round(v)), radio: md };
}
// Recorta un polígono con uno de los dos semiplanos de la recta a→b (Sutherland–Hodgman)
function recortar(p, a, b, lado) {
  const f = ([x, y]) => lado * ((b[0] - a[0]) * (y - a[1]) - (b[1] - a[1]) * (x - a[0]));
  const out = [];
  for (let i = 0; i < p.length; i++) {
    const c = p[i], d = p[(i + 1) % p.length], fc = f(c), fd = f(d);
    if (fc >= 0) out.push(c);
    if ((fc >= 0) !== (fd >= 0)) { const t = fc / (fc - fd); out.push([c[0] + t * (d[0] - c[0]), c[1] + t * (d[1] - c[1])]); }
  }
  return out.map(([x, y]) => [Math.round(x), Math.round(y)]);
}
export function dividirPoligono(p, a, b) {
  return [recortar(p, a, b, 1), recortar(p, a, b, -1)].filter((q) => q.length >= 3 && areaPoligono(q) > 200);
}

const pts = (p) => p.map(([x, y]) => `${Math.round(x)},${Math.round(y)}`).join(" ");
const escapar = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

/**
 * Dibuja el plano.
 * - zonas: [{ id, nombre, color, poligonos }]
 * - info(zona) → { titulo, subtitulo, n, asignada, activa }
 * - horizontal: gira el plano 90° (pantallas anchas)
 * - edicion: { sel, uPorPx, herramienta, borrador, linea, rect, cursor } o null
 */
export function svgPlano({ zonas, info, horizontal = false, edicion = null }) {
  const u = edicion?.uPorPx ?? 2;
  const suelo = SUELO.map((p) => `<polygon points="${pts(p)}"/>`).join("") + PUERTAS.map((p) => `<rect x="${p.h[0]}" y="${p.h[1]}" width="${p.h[2]}" height="${p.h[3]}"/>`).join("");
  const datos = zonas.map((z) => ({ z, i: info(z) }));
  const capaZonas = datos.map(({ z, i }) => `<g class="zona ${i.asignada ? "asignada" : "libre"} ${i.activa ? "activa" : ""} ${edicion?.sel === z.id ? "seleccionada" : ""}" data-zona="${escapar(z.id)}" tabindex="0" role="button" aria-label="${escapar(i.titulo)}" style="--color:${escapar(z.color || "#ece6dc")}">
      ${z.poligonos.map((p) => `<polygon points="${pts(p)}"/>`).join("")}
    </g>`).join("");
  const etiquetas = datos.map(({ z, i }) => {
    const mayor = [...z.poligonos].sort((a, b) => areaPoligono(b) - areaPoligono(a))[0];
    if (!mayor) return "";
    const { punto: [x, y], radio } = centroVisual(mayor);
    const b = bbox(mayor);
    const anchoP = horizontal ? b.y2 - b.y1 : b.x2 - b.x1, altoP = horizontal ? b.x2 - b.x1 : b.y2 - b.y1;
    const vertical = altoP > 2.4 * anchoP && anchoP < 170;
    const disponible = (vertical ? altoP : Math.min(anchoP, radio * 3)) * 0.85;
    const pequena = radio < 50;
    const base = pequena ? 20 : 34;
    const titulo = i.titulo + (pequena && i.n ? ` (${i.n}${i.nElegidos ? ` · ✓${i.nElegidos}` : ""})` : "");
    const tam = Math.max(12, Math.min(base, disponible / (String(titulo).length * 0.56)));
    const giro = (horizontal ? 90 : 0) + (vertical ? -90 : 0);
    const conSub = !pequena && i.subtitulo, conBurbuja = !pequena && i.n;
    const yT = y - (conSub || conBurbuja ? tam * 0.3 : -tam * 0.35);
    const sub = conSub ? `<text x="${x}" y="${yT + 24}" class="t-sub">${escapar(i.subtitulo)}</text>` : "";
    // Burbujas: productos guardados y, en verde, los elegidos para comprar
    const burbuja = conBurbuja ? (i.nElegidos
      ? `<g class="burbuja" transform="translate(${x - 36} ${yT + (conSub ? 58 : 34)})"><rect x="-32" y="-15" width="64" height="30" rx="15"/><text y="6">${i.n}</text></g>
         <g class="burbuja elegidos" transform="translate(${x + 36} ${yT + (conSub ? 58 : 34)})"><rect x="-34" y="-15" width="68" height="30" rx="15"/><text y="6">✓ ${i.nElegidos}</text></g>`
      : `<g class="burbuja" transform="translate(${x} ${yT + (conSub ? 58 : 34)})"><rect x="-32" y="-15" width="64" height="30" rx="15"/><text y="6">${i.n}</text></g>`) : "";
    return `<g class="etiqueta ${i.asignada ? "" : "libre"}" ${giro ? `transform="rotate(${giro} ${x} ${y})"` : ""}>
      <text x="${x}" y="${yT}" class="t-nombre" style="font-size:${tam.toFixed(1)}px">${escapar(titulo)}</text>${sub}${burbuja}
    </g>`;
  }).join("");
  const puertas = PUERTAS.map((p) => {
    const [[ax, ay], [bx, by]] = p.hoja;
    const [[sx, sy], [ex, ey], r] = p.arco;
    return `<path class="arco" d="M${sx} ${sy} A${r} ${r} 0 0 ${sentidoArco(p)} ${ex} ${ey}"/><line class="hoja" x1="${ax}" y1="${ay}" x2="${bx}" y2="${by}"/>`;
  }).join("");
  const ventanas = VENTANAS.map(([[x1, y1], [x2, y2]]) => `<line class="ventana" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/>`).join("");

  // Capa de edición: puntos de la zona elegida y dibujo en curso
  let capaEdicion = "";
  if (edicion) {
    const r = 7 * u, rm = 5 * u, sw = 1.5 * u;
    const z = zonas.find((x) => x.id === edicion.sel);
    if (z) capaEdicion += z.poligonos.map((p) => `<polygon class="contorno-sel" points="${pts(p)}" style="stroke-width:${2 * u}px"/>`).join("");
    if (z && edicion.herramienta === "mover") {
      capaEdicion += z.poligonos.map((p, pi) =>
        p.map((q, vi) => {
          const s = p[(vi + 1) % p.length], m = [(q[0] + s[0]) / 2, (q[1] + s[1]) / 2];
          return `<circle class="asa-medio" data-pi="${pi}" data-m="${vi}" cx="${m[0]}" cy="${m[1]}" r="${rm}" style="stroke-width:${sw}px"/>`;
        }).join("") +
        p.map((q, vi) => `<circle class="asa ${edicion.vsel?.pi === pi && edicion.vsel?.vi === vi ? "elegida" : ""}" data-pi="${pi}" data-v="${vi}" cx="${q[0]}" cy="${q[1]}" r="${r}" style="stroke-width:${sw}px"/>`).join("")).join("");
    }
    if (edicion.borrador?.length) {
      const b = edicion.borrador, c = edicion.cursor;
      capaEdicion += `<polyline class="borrador" points="${pts(c ? [...b, c] : b)}" style="stroke-width:${2 * u}px"/>` +
        b.map((q, i) => `<circle class="asa ${i === 0 ? "primero" : ""}" cx="${q[0]}" cy="${q[1]}" r="${(i === 0 ? 9 : 6) * u}" style="stroke-width:${sw}px"/>`).join("");
    }
    if (edicion.rect) {
      const [[x1, y1], [x2, y2]] = edicion.rect;
      capaEdicion += `<rect class="borrador relleno" x="${Math.min(x1, x2)}" y="${Math.min(y1, y2)}" width="${Math.abs(x2 - x1)}" height="${Math.abs(y2 - y1)}" style="stroke-width:${2 * u}px"/>`;
    }
    if (edicion.linea) {
      const [[x1, y1], [x2, y2]] = edicion.linea;
      capaEdicion += `<line class="borrador corte" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" style="stroke-width:${2.5 * u}px"/><circle class="asa" cx="${x1}" cy="${y1}" r="${6 * u}" style="stroke-width:${sw}px"/>`;
    }
    if (edicion.cursor && ["poligono", "dividir", "rect"].includes(edicion.herramienta)) {
      capaEdicion += `<circle class="cursor-punto" cx="${edicion.cursor[0]}" cy="${edicion.cursor[1]}" r="${4 * u}"/>`;
    }
  }

  const contenido = `
    <defs><clipPath id="clip-suelo">${suelo}</clipPath></defs>
    <polygon class="muro" points="${pts(CONTORNO)}"/>
    <g class="suelo">${suelo}</g>
    <g class="zonas" clip-path="url(#clip-suelo)">${capaZonas}</g>
    ${FIJOS}
    <g class="puertas">${puertas}</g>
    ${ventanas}
    <g class="etiquetas">${etiquetas}</g>
    <g class="edicion">${capaEdicion}</g>`;
  return horizontal
    ? `<svg class="plano horizontal ${edicion ? "editando" : ""}" viewBox="160 -986 2070 866" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Plano de la vivienda"><g id="contenido-plano" transform="rotate(-90)">${contenido}</g></svg>`
    : `<svg class="plano ${edicion ? "editando" : ""}" viewBox="120 160 866 2070" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Plano de la vivienda"><g id="contenido-plano">${contenido}</g></svg>`;
}

function sentidoArco(p) {
  const [[ax, ay]] = p.hoja;
  const [[sx, sy], [ex, ey]] = p.arco;
  return (ex - sx) * (ay - sy) - (ey - sy) * (ax - sx) > 0 ? 0 : 1;
}
