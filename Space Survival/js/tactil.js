'use strict';
// ============================================================================
//  TÁCTIL — controles en pantalla para teléfonos y tablets
// ============================================================================
// No toca la lógica del juego. Lo único que hace es escribir las MISMAS teclas
// que escribiría un teclado (M.teclas, M.alPresionarTecla) y el mismo
// M.mouseAbajo que escribiría el mouse, así los guiones de sprites.js no se
// enteran de si del otro lado hay un dedo o un teclado.
//
//  Acelerador: tres estados que QUEDAN fijos (no hay que mantenerlos
//  apretados), porque en un teléfono los pulgares ya están ocupados girando y
//  disparando. Son exactamente los tres que da el teclado:
//     FRENO  = como tener S apretada → la nave no avanza, pero sigue girando
//     NORMAL = como no tener nada    → avanza a velocidad de crucero
//     TURBO  = como tener W apretada → avanza rápido y gira más rápido
//
//  Girar, disparar y el láser se mantienen apretados (y andan los tres a la
//  vez: son punteros independientes).
//  Los power-ups son los mismos cuadros del HUD, que acá se pueden tocar.

// id: para el CSS · accion: qué tecla de C.teclas simula (null = ninguna)
const ACELERADOR = [
  { id: 'turbo',   accion: 'adelante', icono: '&#9650;', etiqueta: 'Turbo' },
  { id: 'crucero', accion: null,       icono: '&#9679;', etiqueta: 'Normal' },
  { id: 'freno',   accion: 'freno',    icono: '&#9632;', etiqueta: 'Freno' },
];

class Tactil {
  constructor(raiz, ui) {
    this.raiz = raiz;
    this.ui = ui;
    this.activo = false;
    this.acel = 'crucero';       // arranca como si no hubiera ninguna tecla apretada
    this.ignorarVertical = false;
    this._construir();
    this._decidirSiSeMuestra();
  }

  // ---- ¿hay que mostrar los controles?

  _decidirSiSeMuestra() {
    const modo = C.tactil.activar;
    if (modo === true || modo === false) return this.mostrar(modo);
    // 'auto': pantalla sin mouse, o ?tactil=1 para probarlo desde la compu.
    const forzado = new URLSearchParams(location.search).get('tactil');
    if (forzado) return this.mostrar(forzado !== '0');
    this.mostrar(matchMedia('(pointer: coarse)').matches);
    // En equipos híbridos (notebook con pantalla táctil) aparecen al primer toque.
    addEventListener('touchstart', () => this.mostrar(true), { once: true, passive: true });
  }

  mostrar(si) {
    this.activo = si;
    document.body.classList.toggle('tactil', si);
    if (!si) this._soltarTodo();
  }

  // ---- construcción

  _construir() {
    const teclasPU = C.teclas.powerUps.slice(0, C.powerUps.espacios);

    document.body.insertAdjacentHTML('beforeend', `
      <div id="tactil">
        <div class="tac-lado tac-izq">
          <div class="tac-acel">
            ${ACELERADOR.map((a) => `
              <button type="button" class="tac-boton tac-acel-${a.id}" data-acel="${a.id}">
                <i>${a.icono}</i><span>${a.etiqueta}</span>
              </button>`).join('')}
          </div>
          <div class="tac-giro">
            <button type="button" class="tac-boton tac-redondo" data-mantener="izquierda">&#9664;</button>
            <button type="button" class="tac-boton tac-redondo" data-mantener="derecha">&#9654;</button>
          </div>
        </div>

        <div class="tac-lado tac-der">
          <button type="button" class="tac-boton tac-redondo tac-laser" data-laser>
            <span>Láser</span>
          </button>
          <button type="button" class="tac-boton tac-redondo tac-fuego" data-mantener="disparo">
            <span>Fuego</span>
          </button>
        </div>

        <button type="button" class="tac-boton tac-chico tac-pausa" data-pausa>&#10073;&#10073;</button>
      </div>

      <div id="tac-vertical" class="oculto">
        <div class="tac-girar-telefono">&#9633;</div>
        <h2>Girá el teléfono</h2>
        <p>Space Survival se juega apaisado.</p>
        <button type="button" class="boton-secundario" data-igual>Jugar igual</button>
      </div>
    `);

    this.el = {
      capa: document.getElementById('tactil'),
      vertical: document.getElementById('tac-vertical'),
      laser: document.querySelector('[data-laser]'),
      acel: [...document.querySelectorAll('[data-acel]')],
    };

    // Acelerador: tocar fija el estado (no hace falta mantener).
    for (const b of this.el.acel) {
      this._alTocar(b, () => this._fijarAcel(b.dataset.acel));
    }
    this._pintarAcel();

    // Girar y disparar: mientras esté el dedo apoyado.
    for (const b of document.querySelectorAll('[data-mantener]')) {
      const accion = b.dataset.mantener;
      this._mantener(b, () => M.teclas.add(this._tecla(accion)),
                        () => M.teclas.delete(this._tecla(accion)));
    }

    // Láser: es lo mismo que mantener el clic apretado (ver laserPedido()).
    this._mantener(this.el.laser, () => (M.mouseAbajo = true), () => (M.mouseAbajo = false));

    // Power-ups: los cuadros del HUD se vuelven botones (el CSS les da pointer-events).
    this.ui.el.pu.forEach((caja, i) => {
      this._alTocar(caja, () => M.alPresionarTecla(Motor.normalizarTecla(teclasPU[i])));
    });

    this._alTocar(document.querySelector('[data-pausa]'), () => this._pausar());

    // La pantalla de pausa explica teclas que en un teléfono no existen.
    document.getElementById('pausa').insertAdjacentHTML('beforeend', `
      <div class="tac-pausa-botones">
        <button type="button" class="boton-principal" data-seguir>Seguir</button>
        <button type="button" class="boton-secundario" data-menu>Menú</button>
      </div>`);
    this._alTocar(document.querySelector('[data-seguir]'), () => this._pausar());
    this._alTocar(document.querySelector('[data-menu]'), () => this.ui.irAlMenu());

    this._alTocar(document.querySelector('[data-igual]'), () => {
      this.ignorarVertical = true;
      this.el.vertical.classList.add('oculto');
    });
  }

  // ---- entrada

  _tecla(accion) {
    return Motor.normalizarTecla(C.teclas[accion]);
  }

  // Botón de apretar y soltar. Usa punteros (no 'touch') para que anden varios
  // dedos a la vez y para que girar + disparar funcionen juntos. La captura
  // hace que, si el dedo se corre fuera del botón, igual se suelte bien.
  _mantener(el, abajo, arriba) {
    let id = null;
    el.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (id !== null) return;
      id = e.pointerId;
      try { el.setPointerCapture(id); } catch (_) { /* da igual: igual soltamos en pointerup */ }
      el.classList.add('apretado');
      M.sonidos.desbloquear();
      abajo();
    });
    const soltar = (e) => {
      if (id === null || (e && e.pointerId !== id)) return;
      try { if (el.hasPointerCapture(id)) el.releasePointerCapture(id); } catch (_) { /* ya liberado */ }
      id = null;
      el.classList.remove('apretado');
      arriba();
    };
    el.addEventListener('pointerup', soltar);
    el.addEventListener('pointercancel', soltar);
    el.addEventListener('lostpointercapture', soltar);
    el._soltar = () => soltar(null);
  }

  // Botón de un toque.
  _alTocar(el, accion) {
    el.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      M.sonidos.desbloquear();
      accion();
    });
    // Sin puntero (teclado, lector de pantalla) sigue andando el click normal.
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      if (e.detail === 0) accion();
    });
  }

  _soltarTodo() {
    for (const b of document.querySelectorAll('#tactil [data-mantener], #tactil [data-laser]')) {
      b._soltar?.();
    }
  }

  _fijarAcel(id) {
    this.acel = id;
    this._aplicarAcel();
    this._pintarAcel();
  }

  // Deja M.teclas igual a como la dejaría el teclado en este estado.
  _aplicarAcel() {
    M.teclas.delete(this._tecla('adelante'));
    M.teclas.delete(this._tecla('freno'));
    const accion = ACELERADOR.find((a) => a.id === this.acel).accion;
    if (accion && !this.ui.pausado && this.ui.estado() === 'juego') M.teclas.add(this._tecla(accion));
  }

  _pintarAcel() {
    for (const b of this.el.acel) b.classList.toggle('elegido', b.dataset.acel === this.acel);
  }

  _pausar() {
    this.ui.manejarTecla(Motor.normalizarTecla(C.teclas.pausa));
    this._soltarTodo();
  }

  // ---- actualización (una vez por tick, desde el bucle de main.js)

  actualizar() {
    if (!this.activo) return;
    const jugando = this.ui.estado() === 'juego';

    // El acelerador es un estado fijo, así que hay que re-afirmarlo cada tick:
    // el motor vacía M.teclas al perder el foco y al empezar una partida nueva.
    this._aplicarAcel();

    this.el.capa.classList.toggle('oculto', !jugando || this.ui.pausado);
    if (jugando) {
      const G = M.G;
      const carga = G.laserListo ? 1 : Math.min(1, (M.tick - G.laserDesde) / G.laserCarga);
      this.el.laser.style.setProperty('--carga', carga);
      this.el.laser.classList.toggle('listo', G.laserListo);
    }

    const vertical = !this.ignorarVertical && C.tactil.avisoVertical &&
      matchMedia('(orientation: portrait)').matches;
    this.el.vertical.classList.toggle('oculto', !vertical);
  }
}
