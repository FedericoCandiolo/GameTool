'use strict';
// Arranque: carga los dibujos, crea el motor, conecta teclado y mouse y corre el bucle.

(async function () {
  const canvas = document.getElementById('pantalla');
  canvas.width = ANCHO * ESCALA_PANTALLA;
  canvas.height = ALTO * ESCALA_PANTALLA;

  // ---- carga de imágenes (embebidas en js/assets-embebidos.js)

  function cargarImagen(uri) {
    return new Promise((ok, error) => {
      const img = new Image();
      img.onload = () => ok(img);
      img.onerror = error;
      img.src = uri;
    });
  }

  // Los SVG se rasterizan al doble para que se vean nítidos como los PNG.
  async function aCanvas(ruta) {
    const uri = window.ASSETS[ruta];
    if (!uri) throw new Error('Falta el archivo assets/' + ruta + ' (¿corriste herramientas/empaquetar-assets.js?)');
    const img = await cargarImagen(uri);
    const factor = ruta.endsWith('.svg') ? 2 : 1;
    const c = document.createElement('canvas');
    c.width = img.naturalWidth * factor;
    c.height = img.naturalHeight * factor;
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
    return { canvas: c, factor };
  }

  const imagenes = new Map();
  async function imagen(ruta, res, analizar) {
    if (!imagenes.has(ruta)) {
      imagenes.set(ruta, aCanvas(ruta).then(({ canvas: c, factor }) => ({
        base: new Imagen(c, res * factor, analizar ? COLOR_RASTRO_RGB : null),
        factor,
      })));
    }
    return imagenes.get(ruta);
  }

  const disfraces = {};
  for (const def of [...SPRITES, ESCENARIO]) {
    disfraces[def.nombre] = await Promise.all(def.disfraces.map(async (dz) => {
      const { base, factor } = await imagen(dz.ruta, dz.res, def !== ESCENARIO);
      return new Disfraz(dz.nombre, base, dz.cx * factor, dz.cy * factor);
    }));
  }

  // ---- motor

  const sonidos = new Sonidos(
    { laser: window.ASSETS['sonidos/laser.wav'], pop: window.ASSETS['sonidos/pop.wav'] },
    CONFIG.juego.volumen
  );
  M = new Motor(canvas, CONFIG, { sprites: SPRITES, escenario: ESCENARIO, disfraces, sonidos, globales: globalesIniciales });

  const ui = new Interfaz(document.getElementById('juego'));
  window.interfaz = ui; // para usarla desde la consola del navegador (F12)

  // ---- entrada

  const norm = (k) => (k ? Motor.normalizarTecla(k) : null);

  window.addEventListener('keydown', (e) => {
    sonidos.desbloquear();
    const k = norm(e.key);
    if ([' ', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) e.preventDefault();
    if (e.repeat) return;
    if (ui.manejarTecla(k)) return; // menús, pausa, sonido
    M.teclas.add(k);
    M.alPresionarTecla(k);
  });
  window.addEventListener('keyup', (e) => M.teclas.delete(norm(e.key)));
  window.addEventListener('blur', () => {
    M.teclas.clear();
    M.mouseAbajo = false;
  });

  canvas.addEventListener('mousedown', (e) => {
    sonidos.desbloquear();
    if (ui.pausado) return;
    const r = canvas.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * ANCHO - ANCHO / 2;
    const y = ALTO / 2 - ((e.clientY - r.top) / r.height) * ALTO;
    M.mouseAbajo = true;
    M.alHacerClic(x, y);
  });
  window.addEventListener('mouseup', () => (M.mouseAbajo = false));
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());

  // ---- bucle: lógica fija a 30 ticks/s, como Scratch

  const msPorTick = 1000 / M.tps;
  let acumulado = 0;
  let anterior = performance.now();

  function bucle(ahora) {
    acumulado += Math.min(250, ahora - anterior);
    anterior = ahora;
    let huboTick = false;
    while (acumulado >= msPorTick) {
      acumulado -= msPorTick;
      if (!ui.pausado) M.paso();
      huboTick = true;
    }
    if (huboTick) {
      M.dibujar();
      ui.actualizar();
    }
    requestAnimationFrame(bucle);
  }

  M.banderaVerde();
  requestAnimationFrame(bucle);
})().catch((e) => {
  document.body.insertAdjacentHTML('beforeend', `<pre class="error">${e.stack || e}</pre>`);
  throw e;
});
