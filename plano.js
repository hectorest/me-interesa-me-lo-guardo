// Plano de la vivienda, redibujado a partir del plano de cotas.
// Coordenadas en «unidades de plano» (≈ 98 unidades = 1 m). Cada zona es una estancia clicable
// que se asocia a un espacio de la app (tabla plano_zonas).

export const ESCALA = 98; // unidades por metro (8,51 m ≈ 835 u)

// Contorno exterior de la vivienda (cara exterior de los muros)
export const CONTORNO = [[138, 380], [512, 328], [966, 178], [968, 2196], [138, 2210]];

// Estancias. «nombre» es el nombre por defecto: si existe un espacio con ese nombre se asocia solo.
export const ZONAS = [
  { id: "trastero", nombre: "Trastero", puntos: [[160, 398], [262, 384], [262, 512], [160, 512]], etiqueta: [211, 452], pequena: true },
  { id: "lavadero", nombre: "Lavadero", puntos: [[282, 368], [555, 334], [555, 512], [282, 512]], etiqueta: [418, 440] },
  { id: "pasillo", nombre: "Pasillo", puntos: [[160, 520], [555, 520], [555, 606], [262, 606], [262, 1570], [160, 1570]], etiqueta: [211, 1080], vertical: true, paso: true },
  { id: "estancia-norte", nombre: "Estancia norte", puntos: [[565, 330], [946, 216], [946, 606], [565, 606]], etiqueta: [756, 470] },
  { id: "habitacion-1", nombre: "Habitación 1", puntos: [[268, 618], [634, 618], [629, 908], [268, 908]], etiqueta: [450, 763] },
  { id: "habitacion-2", nombre: "Habitación 2", puntos: [[268, 918], [628, 918], [623, 1208], [268, 1208]], etiqueta: [446, 1063] },
  { id: "bano", nombre: "Baño", puntos: [[268, 1218], [610, 1218], [610, 1360], [268, 1360]], etiqueta: [400, 1318], compacta: true },
  { id: "habitacion-3", nombre: "Habitación 3", puntos: [[653, 628], [946, 628], [946, 903], [645, 903]], etiqueta: [797, 765] },
  { id: "habitacion-4", nombre: "Habitación 4", puntos: [[645, 913], [946, 913], [946, 1352], [632, 1352]], etiqueta: [792, 1132] },
  { id: "habitacion-5", nombre: "Habitación 5", puntos: [[757, 1372], [946, 1372], [946, 1775], [757, 1775]], etiqueta: [852, 1574] },
  { id: "cocina", nombre: "Cocina", puntos: [[262, 1366], [632, 1366], [632, 1622], [262, 1622]], etiqueta: [448, 1470] },
  { id: "comedor", nombre: "Comedor", abierta: true,
    puntos: [[160, 1570], [262, 1570], [262, 1622], [632, 1622], [632, 1366], [738, 1366], [738, 1700], [748, 1700], [748, 1782], [717, 1782], [717, 1890], [160, 1890]],
    etiqueta: [440, 1760] },
  { id: "salon", nombre: "Salón", abierta: true,
    puntos: [[160, 1890], [717, 1890], [717, 1812], [820, 1812], [820, 1796], [938, 1796], [938, 1812], [946, 1812], [946, 2182], [160, 2186]],
    etiqueta: [553, 2040] },
];

// Puertas: hueco en el muro + hoja y arco de apertura
// h: hueco [x, y, ancho, alto]; bisagra, extremo de la hoja y punto final del arco
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

// Ventanas de fachada (huecos del muro inferior)
export const VENTANAS = [[[278, 2196], [426, 2192]], [[630, 2190], [784, 2188]]];

// Mobiliario fijo (cocina y baño)
export const FIJOS = `
  <g class="fijo">
    <!-- Bancada con placa -->
    <rect x="268" y="1370" width="360" height="60" rx="3"/>
    <rect x="380" y="1374" width="54" height="52" rx="4"/>
    <circle cx="396" cy="1388" r="8"/><circle cx="420" cy="1388" r="8"/><circle cx="396" cy="1412" r="8"/><circle cx="420" cy="1412" r="8"/>
    <!-- Isla -->
    <rect x="300" y="1540" width="228" height="62" rx="8"/>
    <!-- Baño: plato de ducha, lavabo e inodoro contra la pared superior -->
    <rect x="512" y="1222" width="96" height="136" rx="3"/>
    <path d="M520 1230 L600 1350 M600 1230 L520 1350"/>
    <rect x="316" y="1220" width="58" height="44" rx="6"/>
    <rect x="429" y="1221" width="32" height="12" rx="3"/>
    <ellipse cx="445" cy="1256" rx="18" ry="24"/>
  </g>`;

export function areaM2(puntos) {
  let s = 0;
  for (let i = 0; i < puntos.length; i++) {
    const [x1, y1] = puntos[i], [x2, y2] = puntos[(i + 1) % puntos.length];
    s += x1 * y2 - x2 * y1;
  }
  return Math.abs(s / 2) / (ESCALA * ESCALA);
}

const pts = (p) => p.map(([x, y]) => `${x},${y}`).join(" ");

/**
 * Dibuja el plano.
 * info(zona) → { titulo, subtitulo, asignada, n, activa } para la etiqueta de cada estancia
 */
export function svgPlano(info, { horizontal = false } = {}) {
  const zonas = ZONAS.map((z) => {
    const i = info(z);
    const [x, y] = z.etiqueta;
    // En horizontal todo el plano gira -90°, así que los textos giran +90° para quedar rectos
    // (y el del pasillo, que en vertical va girado, queda recto sin girar)
    const giro = horizontal ? 90 : (z.vertical ? -90 : 0);
    const rot = giro ? ` transform="rotate(${giro} ${x} ${y})"` : "";
    // Letra más pequeña si el nombre no cabe en la estancia
    const xs = z.puntos.map((p) => p[0]), ys = z.puntos.map((p) => p[1]);
    const usarAlto = horizontal || z.vertical; // el texto corre a lo largo del eje y del plano
    const ancho = (usarAlto ? Math.max(...ys) - Math.min(...ys) : Math.max(...xs) - Math.min(...xs)) * (z.compacta ? 0.55 : 0.9);
    const base = z.pequena ? 20 : z.paso ? 26 : 34;
    const tam = Math.max(14, Math.min(base, ancho / (String(i.titulo).length * 0.56)));
    if (z.compacta && i.n) i.subtitulo += ` · ${i.n}`;
    return `<g class="zona ${i.asignada ? "asignada" : "libre"} ${z.paso ? "paso" : ""} ${i.n ? "con-cosas" : ""} ${i.activa ? "activa" : ""}" data-zona="${z.id}" tabindex="0" role="button" aria-label="${i.titulo}">
      <polygon points="${pts(z.puntos)}"/>
      <g class="etiqueta"${rot}>
        <text x="${x}" y="${y - (z.pequena ? 0 : 8)}" class="t-nombre ${z.pequena ? "peq" : ""}" style="font-size:${tam.toFixed(1)}px">${i.titulo}</text>
        ${z.pequena ? "" : `<text x="${x}" y="${y + 22}" class="t-sub">${i.subtitulo}</text>`}
        ${i.n && !z.pequena && !z.compacta ? `<g class="burbuja" transform="translate(${x} ${y + 52})"><rect x="-34" y="-15" width="68" height="30" rx="15"/><text y="6">${i.n}</text></g>` : ""}
      </g>
    </g>`;
  }).join("");
  const separaciones = `
    <path class="separacion" d="M262 1622 H632 V1366"/>
    <path class="separacion" d="M160 1570 H262 V1366"/>
    <path class="separacion" d="M160 1890 H717"/>`;
  const puertas = PUERTAS.map((p) => {
    const [hx, hy, hw, hh] = p.h;
    const [[ax, ay], [bx, by]] = p.hoja;
    const [[sx, sy], [ex, ey], r] = p.arco;
    return `<rect class="hueco" x="${hx}" y="${hy}" width="${hw}" height="${hh}"/>
      <path class="arco" d="M${sx} ${sy} A${r} ${r} 0 0 ${sweep(p)} ${ex} ${ey}"/>
      <line class="hoja" x1="${ax}" y1="${ay}" x2="${bx}" y2="${by}"/>`;
  }).join("");
  const ventanas = VENTANAS.map(([[x1, y1], [x2, y2]]) => `<line class="ventana" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/>`).join("");
  const contenido = `<polygon class="muro" points="${pts(CONTORNO)}"/>
    ${zonas}
    ${separaciones}
    ${FIJOS}
    <g class="puertas">${puertas}</g>
    ${ventanas}`;
  return horizontal
    ? `<svg class="plano horizontal" viewBox="160 -986 2070 866" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Plano de la vivienda"><g transform="rotate(-90)">${contenido}</g></svg>`
    : `<svg class="plano" viewBox="120 160 866 2070" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Plano de la vivienda">${contenido}</svg>`;
}

// Sentido del arco: según la posición del centro (bisagra) respecto a la cuerda
function sweep(p) {
  const [[ax, ay]] = p.hoja;
  const [[sx, sy], [ex, ey]] = p.arco;
  const cruz = (ex - sx) * (ay - sy) - (ey - sy) * (ax - sx);
  return cruz > 0 ? 0 : 1;
}
