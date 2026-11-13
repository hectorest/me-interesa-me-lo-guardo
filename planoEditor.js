// Editor de zonas del plano: mover límites, dibujar, dividir, unir, nombre, color y espacio.
import { COLORES, SUELO, puntoEnPoligono, dividirPoligono } from "./plano.js";

const AYUDA = {
  mover: "Toca una zona para elegirla. Arrastra sus <b>puntos</b> para mover los límites, o un <b>punto pequeño</b> de un borde para añadir una esquina. Doble clic en una esquina la borra. Arrastrando la zona elegida la mueves entera.",
  rect: "Arrastra sobre el plano para dibujar una zona rectangular.",
  poligono: "Toca para poner cada esquina. Toca el <b>primer punto</b> (o pulsa Intro) para cerrar la zona. Esc cancela.",
  dividir: "Traza una línea que cruce de lado a lado la zona que quieres partir: toca donde empieza y donde acaba (o arrastra). Quedan dos zonas.",
  unir: "Elige una zona y después toca la zona que quieres unirle. Quedarán como una sola.",
};

const copiar = (x) => JSON.parse(JSON.stringify(x));
const nuevoId = () => "z-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

export class EditorPlano {
  /**
   * opciones: { zonas, svgDe(zonas, edicion), espacios(), crearEspacio(), alGuardar(zonas), alCancelar(), tostada(msg), esc(s), selInicial }
   */
  constructor(op) {
    this.op = op;
    this.zonas = copiar(op.zonas);
    this.sel = op.selInicial ?? null;
    this.herramienta = "mover";
    this.borrador = [];
    this.linea = null;
    this.rect = null;
    this.cursor = null;
    this.arr = null;
    this.hist = [];
    this.fut = [];
    this.cambiado = false;
  }

  montar(lienzo, panel) {
    this.lienzo = lienzo;
    this.panel = panel;
    this.alPulsar = (e) => this.pulsar(e);
    this.alMover = (e) => this.mover(e);
    this.alSoltar = (e) => this.soltar(e);
    this.alDoble = (e) => this.doble(e);
    this.alTecla = (e) => this.tecla(e);
    lienzo.addEventListener("pointerdown", this.alPulsar);
    lienzo.addEventListener("dblclick", this.alDoble);
    window.addEventListener("pointermove", this.alMover);
    window.addEventListener("pointerup", this.alSoltar);
    window.addEventListener("keydown", this.alTecla);
    panel.addEventListener("click", (e) => this.clicPanel(e));
    panel.addEventListener("input", (e) => this.entradaPanel(e));
    panel.addEventListener("change", (e) => this.cambioPanel(e));
    panel.addEventListener("focusin", (e) => { if (e.target.matches("[data-campo=nombre]")) this.nombrePendiente = true; });
    this.pintar();
    this.pintarPanel();
  }
  desmontar() {
    this.lienzo?.removeEventListener("pointerdown", this.alPulsar);
    this.lienzo?.removeEventListener("dblclick", this.alDoble);
    window.removeEventListener("pointermove", this.alMover);
    window.removeEventListener("pointerup", this.alSoltar);
    window.removeEventListener("keydown", this.alTecla);
  }

  // ---------- utilidades ----------
  zona(id = this.sel) { return this.zonas.find((z) => z.id === id); }
  svg() { return this.lienzo.querySelector("svg"); }
  uPorPx() {
    const s = this.svg();
    if (!s) return 2;
    const vb = s.viewBox.baseVal;
    return vb.width / Math.max(1, s.getBoundingClientRect().width);
  }
  puntoPlano(e) {
    const g = this.lienzo.querySelector("#contenido-plano");
    const m = g.getScreenCTM().inverse();
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(m);
    return [p.x, p.y];
  }
  // Imán: se pega a esquinas cercanas (de las zonas y de las paredes) y alinea con ellas en horizontal/vertical
  iman([x, y], excluir = null) {
    const tol = 11 * this.uPorPx();
    const cands = [];
    for (const z of this.zonas) z.poligonos.forEach((p, pi) => p.forEach((q, vi) => {
      if (excluir && z.id === excluir.zona && pi === excluir.pi && vi === excluir.vi) return;
      cands.push(q);
    }));
    for (const p of SUELO) cands.push(...p);
    let mejor = null, md = tol;
    for (const q of cands) { const d = Math.hypot(q[0] - x, q[1] - y); if (d < md) { md = d; mejor = q; } }
    if (mejor) return [mejor[0], mejor[1]];
    let ax = x, ay = y, dx = tol * 0.6, dy = tol * 0.6;
    for (const q of cands) {
      if (Math.abs(q[0] - x) < dx) { dx = Math.abs(q[0] - x); ax = q[0]; }
      if (Math.abs(q[1] - y) < dy) { dy = Math.abs(q[1] - y); ay = q[1]; }
    }
    return [Math.round(ax), Math.round(ay)];
  }
  zonaEn(pt) {
    for (let i = this.zonas.length - 1; i >= 0; i--) if (this.zonas[i].poligonos.some((p) => puntoEnPoligono(pt, p))) return this.zonas[i];
    return null;
  }
  guardarHistoria() {
    this.hist.push(JSON.stringify(this.zonas));
    if (this.hist.length > 60) this.hist.shift();
    this.fut = [];
    this.cambiado = true;
  }
  deshacer() {
    if (!this.hist.length) return;
    this.fut.push(JSON.stringify(this.zonas));
    this.zonas = JSON.parse(this.hist.pop());
    if (!this.zona()) this.sel = null;
    this.pintar(); this.pintarPanel();
  }
  rehacer() {
    if (!this.fut.length) return;
    this.hist.push(JSON.stringify(this.zonas));
    this.zonas = JSON.parse(this.fut.pop());
    if (!this.zona()) this.sel = null;
    this.pintar(); this.pintarPanel();
  }
  colorLibre() {
    const usados = new Set(this.zonas.map((z) => z.color));
    return COLORES.find((c) => !usados.has(c)) ?? COLORES[this.zonas.length % COLORES.length];
  }
  nombreLibre(base = "Zona nueva") {
    base = base.replace(/ \(\d+\)$/, "");
    let n = 1, nombre = base;
    while (this.zonas.some((z) => z.nombre === nombre)) nombre = `${base} (${++n})`;
    return nombre;
  }
  crearZona(poligono) {
    this.guardarHistoria();
    const z = { id: nuevoId(), nombre: this.nombreLibre(), color: this.colorLibre(), espacio_id: null, poligonos: [poligono], orden: this.zonas.length + 1 };
    this.zonas.push(z);
    this.sel = z.id;
    this.herramienta = "mover";
    this.pintar(); this.pintarPanel();
    setTimeout(() => { const i = this.panel.querySelector("[data-campo=nombre]"); i?.focus(); i?.select(); }, 30);
  }
  cambiarHerramienta(h) {
    this.herramienta = h;
    this.borrador = []; this.linea = null; this.rect = null;
    this.pintar(); this.pintarPanel();
  }

  // ---------- puntero ----------
  pulsar(e) {
    if (e.button && e.button !== 0) return;
    const pt = this.puntoPlano(e);
    const t = e.target;
    e.preventDefault();
    if (t.closest?.(".asa[data-v]")) {
      this.guardarHistoria();
      this.arr = { tipo: "vertice", pi: +t.dataset.pi, vi: +t.dataset.v };
      return;
    }
    if (t.closest?.(".asa-medio")) {
      this.guardarHistoria();
      const pi = +t.dataset.pi, m = +t.dataset.m, p = this.zona().poligonos[pi];
      const a = p[m], b = p[(m + 1) % p.length];
      p.splice(m + 1, 0, [Math.round((a[0] + b[0]) / 2), Math.round((a[1] + b[1]) / 2)]);
      this.arr = { tipo: "vertice", pi, vi: m + 1 };
      this.pintar();
      return;
    }
    const h = this.herramienta;
    if (h === "mover") {
      const z = this.zonaEn(pt);
      if (!z) { this.sel = null; this.pintar(); this.pintarPanel(); return; }
      if (z.id !== this.sel) { this.sel = z.id; this.pintar(); this.pintarPanel(); }
      this.arr = { tipo: "zona", inicio: pt, orig: copiar(z.poligonos), movido: false };
    } else if (h === "rect") {
      const a = this.iman(pt);
      this.rect = [a, a];
      this.arr = { tipo: "rect" };
    } else if (h === "poligono") {
      const p = this.iman(pt);
      const u = this.uPorPx();
      if (this.borrador.length >= 3 && Math.hypot(p[0] - this.borrador[0][0], p[1] - this.borrador[0][1]) < 14 * u) return this.cerrarPoligono();
      this.borrador.push(p);
      this.pintar();
    } else if (h === "dividir") {
      const p = this.iman(pt);
      if (!this.linea) { this.linea = [p, p]; this.arr = { tipo: "linea", inicio: p }; this.pintar(); }
      else this.terminarCorte(p);
    } else if (h === "unir") {
      const z = this.zonaEn(pt);
      if (!z) return;
      if (!this.sel || this.sel === z.id) { this.sel = z.id; this.pintar(); this.pintarPanel(); this.op.tostada("Ahora toca la zona que quieres unirle"); return; }
      this.unir(this.sel, z.id);
    }
  }
  mover(e) {
    if (!this.lienzo?.isConnected || !this.svg()) return;
    const enLienzo = this.lienzo.contains(e.target) || this.arr;
    if (!enLienzo) return;
    const pt = this.puntoPlano(e);
    const a = this.arr;
    if (a?.tipo === "vertice") {
      const z = this.zona();
      z.poligonos[a.pi][a.vi] = this.iman(pt, { zona: z.id, pi: a.pi, vi: a.vi });
      this.pintar();
      return;
    }
    if (a?.tipo === "zona") {
      const dx = Math.round(pt[0] - a.inicio[0]), dy = Math.round(pt[1] - a.inicio[1]);
      if (!a.movido && Math.hypot(dx, dy) < 6 * this.uPorPx()) return;
      if (!a.movido) { this.guardarHistoria(); a.movido = true; }
      this.zona().poligonos = a.orig.map((p) => p.map(([x, y]) => [x + dx, y + dy]));
      this.pintar();
      return;
    }
    if (a?.tipo === "rect") { this.rect[1] = this.iman(pt); this.pintar(); return; }
    if (["poligono", "dividir", "rect"].includes(this.herramienta)) {
      this.cursor = this.iman(pt);
      if (this.linea) this.linea[1] = this.cursor;
      this.pintar();
    }
  }
  soltar(e) {
    const a = this.arr;
    this.arr = null;
    if (!a) return;
    if (a.tipo === "rect") {
      const [[x1, y1], [x2, y2]] = this.rect;
      this.rect = null;
      if (Math.abs(x2 - x1) > 15 && Math.abs(y2 - y1) > 15) {
        this.crearZona([[Math.min(x1, x2), Math.min(y1, y2)], [Math.max(x1, x2), Math.min(y1, y2)], [Math.max(x1, x2), Math.max(y1, y2)], [Math.min(x1, x2), Math.max(y1, y2)]]);
      } else this.pintar();
    } else if (a.tipo === "linea" && this.linea) {
      const p = this.puntoPlano(e);
      if (Math.hypot(p[0] - a.inicio[0], p[1] - a.inicio[1]) > 25 * this.uPorPx()) this.terminarCorte(this.iman(p));
    } else if (a.tipo === "zona" && !a.movido) {
      // un toque sin mover: solo selección
    } else {
      this.pintarPanel();
    }
  }
  doble(e) {
    const t = e.target.closest?.(".asa[data-v]");
    if (!t) return;
    const p = this.zona()?.poligonos[+t.dataset.pi];
    if (!p || p.length <= 3) return this.op.tostada("Una zona necesita al menos 3 esquinas");
    this.guardarHistoria();
    p.splice(+t.dataset.v, 1);
    this.pintar();
  }
  tecla(e) {
    if (e.target.matches?.("input, textarea, select")) return;
    if (e.key === "Escape") { this.borrador = []; this.linea = null; this.rect = null; this.pintar(); }
    if (e.key === "Enter" && this.herramienta === "poligono") this.cerrarPoligono();
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") { e.preventDefault(); e.shiftKey ? this.rehacer() : this.deshacer(); }
  }
  cerrarPoligono() {
    if (this.borrador.length < 3) return this.op.tostada("Pon al menos 3 esquinas");
    const p = this.borrador;
    this.borrador = [];
    this.cursor = null;
    this.crearZona(p);
  }
  terminarCorte(fin) {
    const [inicio] = this.linea;
    this.linea = null;
    if (Math.hypot(fin[0] - inicio[0], fin[1] - inicio[1]) < 10) { this.pintar(); return; }
    // La zona a partir es la que está bajo el centro de la línea (o la elegida, si la línea la cruza)
    const medio = [(inicio[0] + fin[0]) / 2, (inicio[1] + fin[1]) / 2];
    const elegida = this.zona();
    const z = this.zonaEn(medio) ?? (elegida && elegida.poligonos.some((p) => dividirPoligono(p, inicio, fin).length === 2) ? elegida : null);
    if (!z) { this.op.tostada("Traza la línea por encima de la zona que quieres partir"); this.pintar(); return; }
    const a = [], b = [];
    for (const p of z.poligonos) {
      const partes = dividirPoligono(p, inicio, fin);
      if (partes.length === 2) { a.push(partes[0]); b.push(partes[1]); } else a.push(p);
    }
    if (!b.length) { this.op.tostada("La línea tiene que cruzar la zona de lado a lado"); this.pintar(); return; }
    this.guardarHistoria();
    z.poligonos = a;
    const nueva = { id: nuevoId(), nombre: this.nombreLibre(z.nombre), color: this.colorLibre(), espacio_id: null, poligonos: b, orden: this.zonas.length + 1 };
    this.zonas.splice(this.zonas.indexOf(z) + 1, 0, nueva);
    this.sel = nueva.id;
    this.herramienta = "mover";
    this.op.tostada(`Dividida en «${z.nombre}» y «${nueva.nombre}»`);
    this.pintar(); this.pintarPanel();
  }
  unir(idA, idB) {
    const za = this.zona(idA), zb = this.zona(idB);
    this.guardarHistoria();
    za.poligonos.push(...zb.poligonos);
    if (!za.espacio_id) za.espacio_id = zb.espacio_id;
    this.zonas = this.zonas.filter((z) => z.id !== idB);
    this.sel = za.id;
    this.herramienta = "mover";
    this.op.tostada(`«${zb.nombre}» unida a «${za.nombre}»`);
    this.pintar(); this.pintarPanel();
  }

  // ---------- pintado ----------
  pintar() {
    if (!this.lienzo) return;
    this.lienzo.innerHTML = this.op.svgDe(this.zonas, {
      sel: this.sel, herramienta: this.herramienta, uPorPx: this.uPorPx(),
      borrador: this.borrador, linea: this.linea, rect: this.rect, cursor: this.cursor,
    });
  }
  pintarPanel() {
    const esc = this.op.esc, z = this.zona();
    const herr = [["mover", "🖐", "Seleccionar"], ["rect", "▭", "Rectángulo"], ["poligono", "⬠", "Polígono"], ["dividir", "✂", "Dividir"], ["unir", "⊕", "Unir"]];
    const espacios = this.op.espacios();
    this.panel.innerHTML = `
      <div class="editor-cab"><h2>Editar plano</h2><span class="pequeno">${this.zonas.length} zonas</span></div>
      <div class="editor-barra" role="toolbar">
        ${herr.map(([id, ico, txt]) => `<button type="button" class="btn mini ${this.herramienta === id ? "activa" : ""}" data-herr="${id}" title="${txt}">${ico} ${txt}</button>`).join("")}
        <span class="sep"></span>
        <button type="button" class="btn mini" data-acc="deshacer" ${this.hist.length ? "" : "disabled"} title="Deshacer (Ctrl+Z)">↶</button>
        <button type="button" class="btn mini" data-acc="rehacer" ${this.fut.length ? "" : "disabled"} title="Rehacer">↷</button>
      </div>
      <p class="pequeno ayuda-herr">${AYUDA[this.herramienta]}</p>
      ${z ? `
        <div class="editor-zona">
          <label>Nombre<input type="text" data-campo="nombre" value="${esc(z.nombre)}" maxlength="40"></label>
          <div><span class="etiqueta-campo">Color</span>
            <div class="muestras">${COLORES.map((c) => `<button type="button" class="muestra ${z.color === c ? "on" : ""}" data-color="${c}" style="background:${c}" aria-label="Color ${c}"></button>`).join("")}</div>
          </div>
          <label>Espacio de la app (sus productos)
            <select data-campo="espacio">
              <option value="">— Sin espacio —</option>
              ${espacios.map((e) => `<option value="${e.id}" ${z.espacio_id === e.id ? "selected" : ""}>📍 ${esc(e.nombre)}</option>`).join("")}
              <option value="__nuevo">＋ Nuevo espacio…</option>
            </select>
          </label>
          <div class="fila-botones">
            <button type="button" class="btn mini" data-acc="deseleccionar">Elegir otra zona</button>
            <button type="button" class="btn mini peligro" data-acc="eliminar">🗑 Eliminar zona</button>
          </div>
        </div>` : `
        <div class="lista-zonas">
          ${this.zonas.map((x) => `<button type="button" class="fila-zona" data-elegir="${esc(x.id)}"><i style="background:${esc(x.color)}"></i>${esc(x.nombre)}${x.espacio_id ? ` <small>📍 ${esc(espacios.find((e) => e.id === x.espacio_id)?.nombre ?? "")}</small>` : ""}</button>`).join("")}
        </div>`}
      <div class="editor-pie">
        <button type="button" class="btn mini" data-acc="restaurar" title="Volver a las zonas iniciales">Restaurar original</button>
        <span class="sep"></span>
        <button type="button" class="btn" data-acc="cancelar">Cancelar</button>
        <button type="button" class="btn primario" data-acc="guardar">Guardar cambios</button>
      </div>`;
  }
  async clicPanel(e) {
    const b = e.target.closest("button");
    if (!b) return;
    if (b.dataset.herr) return this.cambiarHerramienta(b.dataset.herr);
    if (b.dataset.elegir) { this.sel = b.dataset.elegir; this.herramienta = "mover"; this.pintar(); this.pintarPanel(); return; }
    if (b.dataset.color) { this.guardarHistoria(); this.zona().color = b.dataset.color; this.pintar(); this.pintarPanel(); return; }
    switch (b.dataset.acc) {
      case "deshacer": return this.deshacer();
      case "rehacer": return this.rehacer();
      case "deseleccionar": this.sel = null; this.pintar(); this.pintarPanel(); return;
      case "eliminar": {
        const z = this.zona();
        if (!confirm(`¿Eliminar la zona «${z.nombre}»? Los productos no se borran.`)) return;
        this.guardarHistoria();
        this.zonas = this.zonas.filter((x) => x.id !== z.id);
        this.sel = null;
        this.pintar(); this.pintarPanel();
        return;
      }
      case "restaurar":
        if (!confirm("¿Volver a las zonas iniciales del plano? Se perderán las formas que hayáis cambiado (podéis cancelar sin guardar).")) return;
        this.guardarHistoria();
        this.zonas = this.op.zonasOriginales();
        this.sel = null;
        this.pintar(); this.pintarPanel();
        return;
      case "cancelar":
        if (this.cambiado && !confirm("¿Salir sin guardar los cambios del plano?")) return;
        this.desmontar();
        return this.op.alCancelar();
      case "guardar":
        b.disabled = true;
        try { await this.op.alGuardar(copiar(this.zonas)); this.desmontar(); }
        finally { b.disabled = false; }
        return;
    }
  }
  entradaPanel(e) {
    if (e.target.dataset.campo === "nombre") {
      if (this.nombrePendiente) { this.guardarHistoria(); this.nombrePendiente = false; }
      this.zona().nombre = e.target.value.trimStart() || "Zona";
      this.cambiado = true;
      this.pintar();
    }
  }
  async cambioPanel(e) {
    if (e.target.dataset.campo !== "espacio") return;
    let v = e.target.value;
    if (v === "__nuevo") {
      const n = await this.op.crearEspacio();
      if (!n) { this.pintarPanel(); return; }
      v = n.id;
    }
    this.guardarHistoria();
    this.zona().espacio_id = v || null;
    this.pintar(); this.pintarPanel();
  }
}
