'use strict';
// ============================================================================
//  MOTOR — un mini intérprete al estilo Scratch 2
// ============================================================================
// Cada objeto del juego es un Sprite (o un clon de uno) con "guiones": funciones
// generadoras que avanzan un paso por tick y ceden el control con `yield`, igual
// que los bloques de Scratch ceden al final de cada vuelta de un "por siempre".
// Así se conserva la temporización exacta del juego original (30 ticks/s),
// incluidas las rarezas de mensajes y clones.
//
// Coordenadas como Scratch: escenario de 480x360, (0,0) en el centro, y hacia
// arriba. Dirección 90 = derecha, 0 = arriba, en sentido horario.

const ANCHO = 480;
const ALTO = 360;
const ESCALA_PANTALLA = 2; // los dibujos originales están al doble de resolución

class DetenerHilo {}
class DetenerTodo {}

// ---------------------------------------------------------------- utilidades

function azarEntero(a, b) {
  return a + Math.floor(Math.random() * (b - a + 1));
}

// Rango [min, max] en segundos con pasos de 0,1 s (como "azar 50 a 90 / 10" en Scratch).
function azarSegundos([min, max]) {
  return azarEntero(Math.round(min * 10), Math.round(max * 10)) / 10;
}

function esPar(n) {
  return Math.round(n / 2) * 2 === n;
}

function gradosAtan(x) {
  return (Math.atan(x) * 180) / Math.PI;
}

// Pausa de Scratch: siempre cede al menos un tick.
function* esperar(segundos) {
  const m = Motor.actual;
  const fin = m.tick + Math.max(1, Math.ceil(segundos * m.tps - 1e-9));
  do yield;
  while (m.tick < fin);
}

function* esperarHasta(condicion) {
  while (!condicion()) yield;
}

// ---------------------------------------------------------------- disfraces

// Envolvente convexa (cadena monótona) de puntos [x0,y0,x1,y1,...].
function envolventeConvexa(puntos) {
  const p = [];
  for (let i = 0; i < puntos.length; i += 2) p.push([puntos[i], puntos[i + 1]]);
  p.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  if (p.length < 3) return p.flat();
  const cruz = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const inf = [];
  for (const q of p) {
    while (inf.length >= 2 && cruz(inf[inf.length - 2], inf[inf.length - 1], q) <= 0) inf.pop();
    inf.push(q);
  }
  const sup = [];
  for (let i = p.length - 1; i >= 0; i--) {
    const q = p[i];
    while (sup.length >= 2 && cruz(sup[sup.length - 2], sup[sup.length - 1], q) <= 0) sup.pop();
    sup.push(q);
  }
  inf.pop();
  sup.pop();
  return inf.concat(sup).flat();
}

function rgbAHsv(r, g, b) {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  let h = 0;
  if (d > 0) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h /= 6;
    if (h < 0) h += 1;
  }
  return [h, max === 0 ? 0 : d / max, max];
}

function hsvARgb(h, s, v) {
  const i = Math.floor(h * 6);
  const f = h * 6 - i;
  const p = v * (1 - s);
  const q = v * (1 - f * s);
  const t = v * (1 - (1 - f) * s);
  switch (((i % 6) + 6) % 6) {
    case 0: return [v, t, p];
    case 1: return [q, v, p];
    case 2: return [p, v, t];
    case 3: return [p, q, v];
    case 4: return [t, p, v];
    default: return [v, p, q];
  }
}

// Un dibujo con su máscara de colisión. Varios disfraces pueden compartir el mismo.
class Imagen {
  // imagen: canvas con el dibujo; resolucion: píxeles de imagen por píxel de escenario.
  // colorDetectable: [r,g,b] para "¿tocando el color?"; null = imagen sin colisiones (fondos).
  constructor(imagen, resolucion, colorDetectable) {
    this.imagen = imagen;
    this.res = resolucion;
    this.ancho = imagen.width;
    this.alto = imagen.height;
    this._variantes = new Map();
    this._muestras = new Map();
    if (colorDetectable) this._analizar(colorDetectable);
  }

  _analizar(colorDetectable) {
    const { ancho, alto } = this;
    let datos;
    try {
      datos = imagen2d(this.imagen).getImageData(0, 0, ancho, alto).data;
    } catch (e) {
      // Sin acceso a los píxeles (no debería pasar con assets embebidos): caja completa.
      datos = new Uint8ClampedArray(ancho * alto * 4).fill(255);
    }
    this.alfa = new Uint8Array(ancho * alto);
    let color = null;
    const extremos = [];
    for (let v = 0; v < alto; v++) {
      let min = -1;
      let max = -1;
      for (let u = 0; u < ancho; u++) {
        const i = v * ancho + u;
        if (datos[i * 4 + 3] > 0) {
          this.alfa[i] = 1;
          if (min < 0) min = u;
          max = u;
          // Mismo criterio que "¿tocando el color?" de Scratch 2 (máscara 0xF8F8F0).
          if ((datos[i * 4] & 0xf8) === (colorDetectable[0] & 0xf8) &&
              (datos[i * 4 + 1] & 0xf8) === (colorDetectable[1] & 0xf8) &&
              (datos[i * 4 + 2] & 0xf0) === (colorDetectable[2] & 0xf0)) {
            if (!color) color = new Uint8Array(ancho * alto);
            color[i] = 1;
          }
        }
      }
      if (min >= 0) extremos.push(min, v, max + 1, v, min, v + 1, max + 1, v + 1);
    }
    this.mascaraColor = color;
    this.envolvente = envolventeConvexa(extremos);
  }

  // Puntos opacos de muestra (centros de píxel), uno por bloque de paso x paso.
  muestras(paso) {
    let m = this._muestras.get(paso);
    if (m) return m;
    const lista = [];
    for (let bv = 0; bv < this.alto; bv += paso) {
      for (let bu = 0; bu < this.ancho; bu += paso) {
        buscar: for (let v = bv; v < Math.min(bv + paso, this.alto); v++) {
          for (let u = bu; u < Math.min(bu + paso, this.ancho); u++) {
            if (this.alfa[v * this.ancho + u]) {
              lista.push(u + 0.5, v + 0.5);
              break buscar;
            }
          }
        }
      }
    }
    m = new Float32Array(lista);
    this._muestras.set(paso, m);
    return m;
  }

  // Imagen con el efecto "color" de Scratch aplicado (giro de tono).
  imagenConColor(efecto) {
    const clave = ((efecto % 200) + 200) % 200;
    if (clave === 0) return this.imagen;
    let img = this._variantes.get(clave);
    if (img) return img;
    img = document.createElement('canvas');
    img.width = this.ancho;
    img.height = this.alto;
    const ctx = img.getContext('2d');
    ctx.drawImage(this.imagen, 0, 0);
    const datos = ctx.getImageData(0, 0, this.ancho, this.alto);
    const d = datos.data;
    const giro = clave / 200;
    for (let i = 0; i < d.length; i += 4) {
      if (d[i + 3] === 0) continue;
      let [h, s, v] = rgbAHsv(d[i] / 255, d[i + 1] / 255, d[i + 2] / 255);
      if (v < 0.055) [h, s, v] = [0, 1, 0.055];
      else if (s < 0.09) [h, s] = [0, 0.09];
      h = (h + giro) % 1;
      const [r, g, b] = hsvARgb(h, s, v);
      d[i] = r * 255;
      d[i + 1] = g * 255;
      d[i + 2] = b * 255;
    }
    ctx.putImageData(datos, 0, 0);
    this._variantes.set(clave, img);
    return img;
  }
}

// Disfraz de Scratch: una imagen con nombre y centro de rotación (en píxeles de la imagen).
class Disfraz {
  constructor(nombre, base, centroX, centroY) {
    this.nombre = nombre;
    this.base = base;
    this.cx = centroX;
    this.cy = centroY;
    for (const k of ['imagen', 'res', 'ancho', 'alto', 'alfa', 'mascaraColor', 'envolvente']) this[k] = base[k];
  }

  muestras(paso) { return this.base.muestras(paso); }
  imagenConColor(efecto) { return this.base.imagenConColor(efecto); }
}

function imagen2d(canvas) {
  return canvas.getContext('2d', { willReadFrequently: true });
}

// ---------------------------------------------------------------- sprites

class Sprite {
  constructor(motor, def, disfraces) {
    this.motor = motor;
    this.def = def;
    this.nombre = def.nombre;
    this.disfraces = disfraces;
    this.esClon = false;
    this.borrado = false;
    this._ver = 0;
    this.reiniciar();
  }

  reiniciar() {
    const d = this.def;
    this.x = d.x ?? 0;
    this.y = d.y ?? 0;
    this.dir = d.direccion ?? 90;
    this.escala = d.escala ?? 1;
    this.indiceDisfraz = Math.max(0, this.disfraces.findIndex((c) => c.nombre === d.disfrazInicial));
    this.visible = false;
    this.rotacion = d.rotacion ?? 'normal';
    this.efectos = { color: 0, fantasma: 0 };
    this.vars = { ...(d.variables || {}) };
    this.lapizAbajo = false;
    this.colorLapiz = '#000';
    this.grosorLapiz = 1;
    this._cambio();
  }

  get disfraz() {
    return this.disfraces[this.indiceDisfraz];
  }

  get tamano() {
    return this.escala * 100;
  }

  _cambio() {
    this._ver++;
  }

  // ---- transformación y límites

  transformacion() {
    if (this._verT === this._ver) return this._t;
    const d = this.disfraz;
    const ang = this.rotacion === 'normal' ? ((90 - this.dir) * Math.PI) / 180 : 0;
    this._t = { x: this.x, y: this.y, k: this.escala / d.res, cos: Math.cos(ang), sin: Math.sin(ang), cx: d.cx, cy: d.cy };
    this._verT = this._ver;
    return this._t;
  }

  // Caja de los píxeles visibles (ya rotados y escalados) en coordenadas del escenario.
  limites() {
    if (this._verL === this._ver) return this._l;
    const t = this.transformacion();
    const e = this.disfraz.envolvente;
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    for (let i = 0; i < e.length; i += 2) {
      const lx = (e[i] - t.cx) * t.k;
      const ly = -(e[i + 1] - t.cy) * t.k;
      const X = t.x + lx * t.cos - ly * t.sin;
      const Y = t.y + lx * t.sin + ly * t.cos;
      if (X < x0) x0 = X;
      if (X > x1) x1 = X;
      if (Y < y0) y0 = Y;
      if (Y > y1) y1 = Y;
    }
    if (x0 === Infinity) x0 = x1 = this.x, y0 = y1 = this.y;
    this._l = { x0, x1, y0, y1 };
    this._verL = this._ver;
    return this._l;
  }

  contienePunto(X, Y) {
    const t = this.transformacion();
    const d = this.disfraz;
    const dx = X - t.x, dy = Y - t.y;
    const u = Math.floor((dx * t.cos + dy * t.sin) / t.k + t.cx);
    const v = Math.floor(-(-dx * t.sin + dy * t.cos) / t.k + t.cy);
    return u >= 0 && v >= 0 && u < d.ancho && v < d.alto && d.alfa[v * d.ancho + u] === 1;
  }

  // ---- movimiento

  _moverA(x, y) {
    const ox = this.x, oy = this.y;
    this.x = x;
    this.y = y;
    this._cambio();
    this._mantenerEnEscenario();
    if (this.lapizAbajo) this.motor.lapiz.linea(this, ox, oy, this.x, this.y, this.colorLapiz, this.grosorLapiz);
  }

  // Igual que Scratch 2: el sprite no puede salir del todo; quedan al menos 18 px adentro.
  _mantenerEnEscenario() {
    const l = this.limites();
    const borde = Math.trunc(Math.min(18, Math.min(l.x1 - l.x0, l.y1 - l.y0) / 2));
    const ex0 = -ANCHO / 2 + borde, ex1 = ANCHO / 2 - borde;
    const ey0 = -ALTO / 2 + borde, ey1 = ALTO / 2 - borde;
    if (l.x1 > ex0 && l.x0 < ex1 && l.y1 > ey0 && l.y0 < ey1) return;
    let { x, y } = this;
    if (l.x1 < ex0) x = Math.ceil(x + (ex0 - l.x1));
    if (l.x0 > ex1) x = Math.floor(x + (ex1 - l.x0));
    if (l.y0 > ey1) y = Math.floor(y - (l.y0 - ey1));
    if (l.y1 < ey0) y = Math.ceil(y + (ey0 - l.y1));
    this.x = x;
    this.y = y;
    this._cambio();
  }

  irA(x, y) { this._moverA(x, y); }
  irHacia(otro) { this._moverA(otro.x, otro.y); }
  fijarX(x) { this._moverA(x, this.y); }
  fijarY(y) { this._moverA(this.x, y); }
  cambiarX(dx) { this._moverA(this.x + dx, this.y); }
  cambiarY(dy) { this._moverA(this.x, this.y + dy); }

  avanzar(pasos) {
    const rad = ((90 - this.dir) * Math.PI) / 180;
    this._moverA(this.x + pasos * Math.cos(rad), this.y + pasos * Math.sin(rad));
  }

  fijarDireccion(d) {
    if (!Number.isFinite(d)) return;
    d %= 360;
    if (d < 0) d += 360;
    this.dir = d > 180 ? d - 360 : d;
    this._cambio();
  }

  girar(grados) { this.fijarDireccion(this.dir + grados); }

  apuntarHacia(otro) {
    const dx = otro.x - this.x, dy = otro.y - this.y;
    this.fijarDireccion(90 - (Math.atan2(dy, dx) * 180) / Math.PI);
  }

  *deslizar(segundos, x, y) {
    const m = this.motor;
    const x0 = this.x, y0 = this.y;
    const inicio = m.tick;
    const duracion = segundos * m.tps;
    yield;
    for (;;) {
      const f = (m.tick - inicio) / duracion;
      if (f >= 1) return this._moverA(x, y);
      this._moverA(x0 + (x - x0) * f, y0 + (y - y0) * f);
      yield;
    }
  }

  // Igual que "rebotar si toca un borde" de Scratch 2.
  rebotarEnBorde() {
    const l = this.limites();
    const distancias = [
      Math.max(0, l.x0 + ANCHO / 2), // izquierda
      Math.max(0, ALTO / 2 - l.y1),  // arriba
      Math.max(0, ANCHO / 2 - l.x1), // derecha
      Math.max(0, l.y0 + ALTO / 2),  // abajo
    ];
    let borde = 0;
    for (let i = 1; i < 4; i++) if (distancias[i] < distancias[borde]) borde = i;
    if (distancias[borde] > 0) return;
    const rad = ((90 - this.dir) * Math.PI) / 180;
    let dx = Math.cos(rad), dy = -Math.sin(rad);
    if (borde === 0) dx = Math.max(0.2, Math.abs(dx));
    if (borde === 1) dy = Math.max(0.2, Math.abs(dy));
    if (borde === 2) dx = -Math.max(0.2, Math.abs(dx));
    if (borde === 3) dy = -Math.max(0.2, Math.abs(dy));
    this.fijarDireccion((180 * Math.atan2(-dy, dx)) / Math.PI + 90);
    const r = this.limites();
    if (r.x0 < -ANCHO / 2) this._moverA(this.x - (r.x0 + ANCHO / 2), this.y);
    if (r.y1 > ALTO / 2) this._moverA(this.x, this.y - (r.y1 - ALTO / 2));
    if (r.x1 > ANCHO / 2) this._moverA(this.x - (r.x1 - ANCHO / 2), this.y);
    if (r.y0 < -ALTO / 2) this._moverA(this.x, this.y + (-ALTO / 2 - r.y0));
  }

  // ---- apariencia

  mostrar() { this.visible = true; }
  esconder() { this.visible = false; }

  cambiarDisfraz(nombre) {
    const i = this.disfraces.findIndex((c) => c.nombre === nombre);
    if (i >= 0 && i !== this.indiceDisfraz) {
      this.indiceDisfraz = i;
      this._cambio();
    }
  }

  siguienteDisfraz() {
    this.indiceDisfraz = (this.indiceDisfraz + 1) % this.disfraces.length;
    this._cambio();
  }

  // Scratch 2 limita el tamaño: mínimo 5 px de lado, máximo 1,5 veces el escenario.
  fijarTamano(porcentaje) {
    const d = this.disfraz;
    const w = Math.max(1, Math.trunc(d.ancho / d.res));
    const h = Math.max(1, Math.trunc(d.alto / d.res));
    const min = Math.min(1, Math.max(5 / w, 5 / h));
    const max = Math.min((1.5 * ANCHO) / w, (1.5 * ALTO) / h);
    this.escala = Math.max(min, Math.min(porcentaje / 100, max));
    this._cambio();
  }

  cambiarTamano(delta) { this.fijarTamano(this.tamano + delta); }

  fijarEfecto(efecto, valor) { this.efectos[efecto] = valor; }
  cambiarEfecto(efecto, delta) { this.efectos[efecto] += delta; }

  alFrente() {
    const capas = this.motor.capas;
    capas.splice(capas.indexOf(this), 1);
    capas.push(this);
  }

  // ---- sensores

  tocando(nombre) {
    if (!this.visible) return false;
    for (const otro of this.motor.instancias(nombre)) {
      if (otro !== this && otro.visible && colisionan(this, otro)) return true;
    }
    return false;
  }

  tocandoBorde() {
    const l = this.limites();
    return l.x0 < -ANCHO / 2 || l.x1 > ANCHO / 2 || l.y0 < -ALTO / 2 || l.y1 > ALTO / 2;
  }

  // "¿tocando el color del rastro?": el dibujo del lápiz o píxeles de ese color en otros sprites.
  tocandoColorDetectable() {
    if (!this.visible) return false;
    if (this.motor.lapiz.tocaSprite(this)) return true;
    for (const otro of this.motor.capas) {
      if (otro !== this && otro.visible && otro.disfraz.mascaraColor && colisionan(this, otro, true)) return true;
    }
    return false;
  }

  // ---- lápiz

  bajarLapiz() { this.lapizAbajo = true; }
  subirLapiz() { this.lapizAbajo = false; }
  borrarRastro() { this.motor.lapiz.borrarDe(this); } // sólo lo que dibujó este sprite

  // ---- control

  clonar() {
    return this.motor.crearClon(this);
  }

  borrarClon() {
    if (!this.esClon) return;
    this.motor.eliminarClon(this);
    throw new DetenerHilo();
  }
}

// ¿Se superponen los píxeles visibles de a y b? Se muestrea el disfraz del
// sprite más chico y se busca cada punto en la máscara del otro.
function colisionan(a, b, contraColorDeB = false) {
  const la = a.limites(), lb = b.limites();
  const x0 = Math.max(la.x0, lb.x0), x1 = Math.min(la.x1, lb.x1);
  const y0 = Math.max(la.y0, lb.y0), y1 = Math.min(la.y1, lb.y1);
  if (x0 >= x1 || y0 >= y1) return false;
  let p = a, q = b;
  if (!contraColorDeB && (lb.x1 - lb.x0) * (lb.y1 - lb.y0) < (la.x1 - la.x0) * (la.y1 - la.y0)) {
    p = b;
    q = a;
  }
  const tp = p.transformacion(), tq = q.transformacion();
  const dq = q.disfraz;
  const mascara = contraColorDeB ? dq.mascaraColor : dq.alfa;
  const pts = p.disfraz.muestras(Math.max(1, Math.floor(0.75 / tp.k)));
  for (let i = 0; i < pts.length; i += 2) {
    const lx = (pts[i] - tp.cx) * tp.k;
    const ly = -(pts[i + 1] - tp.cy) * tp.k;
    const X = tp.x + lx * tp.cos - ly * tp.sin;
    const Y = tp.y + lx * tp.sin + ly * tp.cos;
    if (X < x0 || X > x1 || Y < y0 || Y > y1) continue;
    const dx = X - tq.x, dy = Y - tq.y;
    const u = Math.floor((dx * tq.cos + dy * tq.sin) / tq.k + tq.cx);
    const v = Math.floor(-(-dx * tq.sin + dy * tq.cos) / tq.k + tq.cy);
    if (u >= 0 && v >= 0 && u < dq.ancho && v < dq.alto && mascara[v * dq.ancho + u]) return true;
  }
  return false;
}

// ---------------------------------------------------------------- lápiz

// En el Scratch el lápiz era uno solo para todos los sprites: no había forma de
// borrar el rastro de uno sin borrar el de todos. Acá se sigue dibujando en un
// único canvas (es lo que se muestra y lo que mira tocaSprite), pero además se
// guardan los segmentos de cada dueño, así se puede borrar el rastro de uno
// volviendo a dibujar los de los que siguen vivos.
class Lapiz {
  constructor() {
    this.canvas = document.createElement('canvas');
    this.canvas.width = ANCHO * ESCALA_PANTALLA;
    this.canvas.height = ALTO * ESCALA_PANTALLA;
    this.ctx = this.canvas.getContext('2d');
    this.trazo = new Uint8Array(ANCHO * ALTO); // para detectar colisiones con el dibujo
    this.rastros = new Map(); // dueño -> segmentos que dibujó
    this.vacio = true;
  }

  linea(dueno, x0, y0, x1, y1, color, grosor) {
    let rastro = this.rastros.get(dueno);
    if (!rastro) this.rastros.set(dueno, (rastro = []));
    rastro.push([x0, y0, x1, y1, color, grosor]);
    this._segmento(x0, y0, x1, y1, color, grosor);
  }

  _segmento(x0, y0, x1, y1, color, grosor) {
    const c = this.ctx;
    const E = ESCALA_PANTALLA;
    c.strokeStyle = color;
    c.lineWidth = Math.max(1, grosor * E);
    c.lineCap = 'round';
    c.beginPath();
    c.moveTo((ANCHO / 2 + x0) * E, (ALTO / 2 - y0) * E);
    c.lineTo((ANCHO / 2 + x1) * E, (ALTO / 2 - y1) * E);
    c.stroke();
    const radio = Math.max(0, Math.floor(grosor / 2));
    const pasos = Math.ceil(Math.hypot(x1 - x0, y1 - y0) * 2) + 1;
    for (let i = 0; i <= pasos; i++) {
      const cx = Math.floor(ANCHO / 2 + x0 + ((x1 - x0) * i) / pasos);
      const cy = Math.floor(ALTO / 2 - (y0 + ((y1 - y0) * i) / pasos));
      for (let oy = -radio; oy <= radio; oy++) {
        for (let ox = -radio; ox <= radio; ox++) {
          const px = cx + ox, py = cy + oy;
          if (px >= 0 && py >= 0 && px < ANCHO && py < ALTO) this.trazo[py * ANCHO + px] = 1;
        }
      }
    }
    this.vacio = false;
  }

  borrar() {
    this.rastros.clear();
    this._limpiar();
  }

  // Borra el rastro de un solo dueño. Un canvas no se puede "des-dibujar", así
  // que se limpia todo y se vuelven a dibujar los rastros que quedan vivos.
  borrarDe(dueno) {
    if (!this.rastros.delete(dueno)) return;
    this._limpiar();
    for (const rastro of this.rastros.values()) {
      for (const g of rastro) this._segmento(g[0], g[1], g[2], g[3], g[4], g[5]);
    }
  }

  _limpiar() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.trazo.fill(0);
    this.vacio = true;
  }

  tocaSprite(s) {
    if (this.vacio) return false;
    const t = s.transformacion();
    const pts = s.disfraz.muestras(Math.max(1, Math.floor(0.75 / t.k)));
    for (let i = 0; i < pts.length; i += 2) {
      const lx = (pts[i] - t.cx) * t.k;
      const ly = -(pts[i + 1] - t.cy) * t.k;
      const px = Math.floor(ANCHO / 2 + t.x + lx * t.cos - ly * t.sin);
      const py = Math.floor(ALTO / 2 - (t.y + lx * t.sin + ly * t.cos));
      if (px >= 0 && py >= 0 && px < ANCHO && py < ALTO && this.trazo[py * ANCHO + px]) return true;
    }
    return false;
  }
}

// ---------------------------------------------------------------- sonido

class Sonidos {
  constructor(assets, volumen) {
    this.assets = assets;
    this.volumen = volumen;
    this.silenciado = false;
    this.buffers = {};
    this.ctx = null;
  }

  // Los navegadores sólo permiten audio después de una tecla o clic.
  desbloquear() {
    if (this.ctx) return;
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    this.ctx = new Ctx();
    this.salida = this.ctx.createGain();
    this.salida.gain.value = this.volumen;
    this.salida.connect(this.ctx.destination);
    for (const [nombre, uri] of Object.entries(this.assets)) {
      const bin = atob(uri.split(',')[1]);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      this.ctx.decodeAudioData(bytes.buffer, (b) => (this.buffers[nombre] = b), () => {});
    }
  }

  reproducir(nombre) {
    const b = this.buffers[nombre];
    if (!b || this.silenciado) return;
    const fuente = this.ctx.createBufferSource();
    fuente.buffer = b;
    fuente.connect(this.salida);
    fuente.start();
  }
}

// ---------------------------------------------------------------- motor

class Motor {
  // sprites: definiciones en orden de capas (de abajo hacia arriba).
  // disfraces: { nombreSprite: [Disfraz...] }. globales: función que crea las variables iniciales.
  constructor(canvas, config, { sprites, escenario, disfraces, sonidos, globales }) {
    Motor.actual = this;
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.config = config;
    this.tps = config.juego.ticksPorSegundo;
    this.sonidos = sonidos;
    this.crearGlobales = globales;
    this.lapiz = new Lapiz();
    this.escenario = new Sprite(this, escenario, disfraces[escenario.nombre]);
    this.originales = new Map();
    for (const def of sprites) this.originales.set(def.nombre, new Sprite(this, def, disfraces[def.nombre]));
    this.teclas = new Set();
    this.mouseAbajo = false;
    this.detenido = false;
    this.reiniciar();
  }

  reiniciar() {
    this.tick = 0;
    this.hilos = [];
    this.hiloActual = null;
    this.capas = [...this.originales.values()];
    this.porNombre = new Map([...this.originales].map(([n, s]) => [n, [s]]));
    this.cantidadClones = 0;
    for (const s of this.capas) s.reiniciar();
    this.escenario.reiniciar();
    this.lapiz.borrar();
    this.G = this.crearGlobales();
    this.detenido = false;
  }

  sprite(nombre) {
    return this.originales.get(nombre);
  }

  instancias(nombre) {
    return this.porNombre.get(nombre) || [];
  }

  // Scratch 2 recorre los sprites de la capa de arriba hacia abajo y al final el escenario.
  _receptores() {
    return [...this.capas].reverse().concat(this.escenario);
  }

  banderaVerde() {
    this.reiniciar();
    for (const s of this._receptores()) for (const g of s.def.alIniciar || []) this.iniciarHilo(s, g);
  }

  // "enviar mensaje": lo reciben todos los sprites, incluidos los clones.
  enviar(mensaje) {
    for (const s of this._receptores()) {
      const guiones = s.def.alRecibir?.[mensaje];
      if (guiones) guiones.forEach((g, i) => this.iniciarHilo(s, g, `msg:${mensaje}:${i}`));
    }
  }

  // Con clave: si ese guion ya estaba corriendo en ese sprite, vuelve a empezar (como en Scratch).
  iniciarHilo(sprite, guion, clave = null) {
    const hilo = { sprite, clave, terminado: false, gen: guion(sprite) };
    if (clave) {
      const i = this.hilos.findIndex((h) => !h.terminado && h.sprite === sprite && h.clave === clave);
      if (i >= 0) {
        this.hilos[i].terminado = true;
        this.hilos[i] = hilo;
        return hilo;
      }
    }
    this.hilos.push(hilo);
    return hilo;
  }

  detenerOtrosGuiones(sprite) {
    for (const h of this.hilos) if (h.sprite === sprite && h !== this.hiloActual) h.terminado = true;
  }

  detenerTodo() {
    throw new DetenerTodo();
  }

  crearClon(original) {
    if (this.cantidadClones >= this.config.juego.limiteDeClones) return null;
    const c = Object.create(Sprite.prototype);
    Object.assign(c, original, {
      esClon: true,
      borrado: false,
      efectos: { ...original.efectos },
      vars: { ...original.vars },
      _verT: -1,
      _verL: -1,
    });
    this.capas.splice(this.capas.indexOf(original), 0, c); // justo debajo del original
    this.porNombre.get(c.nombre).push(c);
    this.cantidadClones++;
    for (const g of c.def.alClonar || []) this.iniciarHilo(c, g);
    return c;
  }

  clonarA(nombre) {
    return this.crearClon(this.sprite(nombre));
  }

  eliminarClon(c) {
    if (c.borrado) return;
    c.borrado = true;
    this.capas.splice(this.capas.indexOf(c), 1);
    const lista = this.porNombre.get(c.nombre);
    lista.splice(lista.indexOf(c), 1);
    this.cantidadClones--;
    for (const h of this.hilos) if (h.sprite === c) h.terminado = true;
  }

  // ---- entrada

  static normalizarTecla(k) {
    return k.length === 1 ? k.toLowerCase() : k;
  }

  teclaPresionada(tecla) {
    return !!tecla && this.teclas.has(Motor.normalizarTecla(tecla));
  }

  algunaTecla() {
    return this.teclas.size > 0;
  }

  alPresionarTecla(tecla) {
    for (const s of this._receptores()) {
      const g = s.def.alPresionarTecla?.[tecla];
      if (g) this.iniciarHilo(s, g, `tecla:${tecla}`);
    }
  }

  alHacerClic(x, y) {
    for (let i = this.capas.length - 1; i >= 0; i--) {
      const s = this.capas[i];
      if (s.visible && s.contienePunto(x, y)) {
        if (s.def.alHacerClic) this.iniciarHilo(s, s.def.alHacerClic, 'clic');
        return;
      }
    }
  }

  // ---- ciclo

  paso() {
    if (this.detenido) return;
    this.tick++;
    for (let i = 0; i < this.hilos.length; i++) {
      const h = this.hilos[i];
      if (h.terminado) continue;
      this.hiloActual = h;
      try {
        if (h.gen.next().done) h.terminado = true;
      } catch (e) {
        if (e instanceof DetenerHilo) h.terminado = true;
        else if (e instanceof DetenerTodo) return this._detenerTodo();
        else throw e;
      }
    }
    this.hiloActual = null;
    this.hilos = this.hilos.filter((h) => !h.terminado);
  }

  // "detener todos": termina los guiones y borra los clones, como Scratch 2.
  _detenerTodo() {
    for (const h of this.hilos) h.terminado = true;
    this.hilos = [];
    this.hiloActual = null;
    for (const s of [...this.capas]) {
      if (s.esClon) this.eliminarClon(s);
      else s.efectos = { color: 0, fantasma: 0 };
    }
    this.detenido = true;
  }

  dibujar() {
    const ctx = this.ctx;
    const E = ESCALA_PANTALLA;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.globalAlpha = 1;
    const fondo = this.escenario.disfraz;
    ctx.drawImage(fondo.imagen, 0, 0, ANCHO * E, ALTO * E);
    ctx.drawImage(this.lapiz.canvas, 0, 0);
    for (const s of this.capas) {
      if (!s.visible) continue;
      const alfa = 1 - Math.min(100, Math.max(0, s.efectos.fantasma)) / 100;
      if (alfa <= 0) continue;
      const d = s.disfraz;
      ctx.save();
      ctx.globalAlpha = alfa;
      ctx.translate((ANCHO / 2 + s.x) * E, (ALTO / 2 - s.y) * E);
      if (s.rotacion === 'normal') ctx.rotate(((s.dir - 90) * Math.PI) / 180);
      const k = (s.escala / d.res) * E;
      ctx.scale(k, k);
      ctx.drawImage(d.imagenConColor(s.efectos.color), -d.cx, -d.cy);
      ctx.restore();
    }
  }
}
