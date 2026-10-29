'use strict';
// ============================================================================
//  INTERFAZ — HUD y pantallas (título, pausa, fin), hechos con HTML y CSS
// ============================================================================
// El canvas dibuja sólo el juego; todo esto va en HTML encima (estilos en
// estilos.css). La interfaz LEE el estado del juego (M.G, M.tick) para
// mostrarlo y lo único que escribe es M.G.inicioPedido, para arrancar.
// Los textos de las instrucciones salen de config.js, así siempre coinciden.

const imagenAsset = (ruta) => window.ASSETS['img/' + ruta];

// La tabla de récords vive en este navegador. Si el navegador no deja guardar
// (modo incógnito, permisos), el juego anda igual: la tabla dura hasta cerrar.
const CLAVE_RECORDS = 'spaceSurvival.records';
const CLAVE_NOMBRE = 'spaceSurvival.nombre';
const CLAVE_RECORD_VIEJO = 'spaceSurvival.record'; // de antes de la tabla: un solo número

function leerGuardado(clave) {
  try {
    return localStorage.getItem(clave);
  } catch (e) {
    return null;
  }
}

function escribirGuardado(clave, valor) {
  try {
    localStorage.setItem(clave, valor);
  } catch (e) {
    /* sin almacenamiento: dura hasta cerrar la página */
  }
}

// El nombre lo escribe el jugador y después va a innerHTML: hay que escaparlo.
const escaparHTML = (t) =>
  String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

// Power-ups: nombre, ícono y descripción. La clave es el tipo que usa sprites.js.
const TIPOS_POWERUP = {
  Turbo: {
    nombre: 'Turbo',
    imagen: 'powerups/turbo.png',
    descripcion: () => 'Impulso rápido hacia adelante',
  },
  'Municion Infinita': {
    nombre: 'Munición infinita',
    imagen: 'powerups/municion_infinita.png',
    descripcion: () => `${C.powerUps.municionInfinita.duracion} s disparando sin gastar balas`,
  },
  'Nave Chica': {
    nombre: 'Nave chica',
    imagen: 'powerups/nave_chica.svg',
    descripcion: () => `La nave se achica al ${C.powerUps.naveChica.escala * 100} % por ${C.powerUps.naveChica.duracion} s`,
  },
  Escudo: {
    nombre: 'Escudo',
    imagen: 'powerups/escudo.png',
    descripcion: () => 'Onda que desintegra balas, meteoritos chicos y babosas',
  },
};

// Fichas de la pestaña "Enemigos". chico: dibujo más chico en la ficha.
const FICHAS_ENEMIGOS = [
  { nombre: 'Meteorito', imagen: 'meteoritos/meteorito.png', texto: () => `−${C.meteorito.dano} de vida` },
  { nombre: 'Meteorito chico', imagen: 'meteoritos/meteorito.png', chico: true, texto: () => `−${C.meteoritoChico.dano} de vida` },
  { nombre: 'Meteorito azul', imagen: 'meteoritos/meteorito_azul.png', chico: true, texto: () => `−${C.meteoritoTeledirigido.dano} · te persigue` },
  { nombre: 'Babosa', imagen: 'babosa/babosa1.png', texto: () => `Ella y su rastro: −${C.babosa.danoRastro}` },
  { nombre: 'Nave chica', imagen: 'enemigo/encendido2.png', chico: true, texto: () => `Dispara ${C.enemigos.chica.balas} balas de −${C.enemigos.balaDano}` },
  { nombre: 'Nave grande', imagen: 'enemigo/encendido2.png', texto: () => `Dispara ${C.enemigos.grande.balas} balas de −${C.enemigos.balaDano}` },
  { nombre: 'Imán', imagen: 'iman/electrico1.png', texto: () => `Te atrae · −${C.iman.dano} cada ${C.iman.intervaloDano} s` },
  { nombre: 'Lanzameteoros', imagen: 'lanzameteoros/cargado.png', texto: () => `Suelta hordas de ${C.lanzameteoros.meteoritos} meteoritos` },
];

const FICHAS_VIDA = [
  { nombre: 'Manzana', imagen: 'varios/manzana.svg', chico: true, texto: () => `+${C.manzanas.verde.vida} de vida` },
  { nombre: 'Manzana dorada', imagen: 'varios/manzana_dorada.svg', chico: true, texto: () => `+${C.manzanas.dorada.vida} de vida` },
];

const PESTANAS = ['Controles', 'Enemigos', 'Power-ups'];

function nombreTecla(k) {
  if (!k) return '';
  const especiales = { ' ': 'ESPACIO', Enter: 'ENTER', Escape: 'ESC', Shift: 'SHIFT', ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→' };
  return especiales[k] || k.toUpperCase();
}

const tecla$ = (k) => `<kbd>${nombreTecla(k)}</kbd>`;

function ficha({ nombre, imagen, chico, texto }) {
  return `<div class="ficha">
    <div class="ficha-img${chico ? ' chico' : ''}"><img src="${imagenAsset(imagen)}" alt=""></div>
    <div><b>${nombre}</b><span>${texto()}</span></div>
  </div>`;
}

class Interfaz {
  constructor(raiz) {
    this.raiz = raiz;
    this.pausado = false;
    this.pestana = 0;
    this.records = this._leerRecords();
    this._anterior = {};
    this._construir();
  }

  // ---- estado

  estado() {
    if (M.detenido) return 'fin';
    return M.G.pantalla;
  }

  iniciar() {
    M.G.inicioPedido = true;
  }

  jugarDeNuevo() {
    this.pausado = false;
    M.banderaVerde();
    M.G.inicioPedido = true;
  }

  irAlMenu() {
    this.pausado = false;
    M.banderaVerde();
  }

  // ---- teclado (devuelve true si la tecla era para la interfaz y no para el juego)

  manejarTecla(k) {
    // Mientras se pide el nombre para la tabla, las teclas son del formulario:
    // ni silencian, ni pausan, ni reinician. Si el foco se perdió, se recupera.
    if (!this.el.finAlta.classList.contains('oculto')) {
      if (document.activeElement !== this.el.finNombre) this.el.finNombre.focus();
      return true;
    }
    if (document.activeElement && document.activeElement.tagName === 'INPUT') return true;
    const T = C.teclas;
    const es = (t) => t && k === Motor.normalizarTecla(t);
    const estado = this.estado();
    if (es(T.silenciar)) {
      M.sonidos.silenciado = !M.sonidos.silenciado;
      this._aviso(M.sonidos.silenciado ? 'Sonido desactivado' : 'Sonido activado');
      return true;
    }
    if (estado === 'titulo') {
      if (k === 'ArrowLeft') this.mostrarPestana(this.pestana - 1);
      else if (k === 'ArrowRight') this.mostrarPestana(this.pestana + 1);
      else if (k === 'Enter' || k === ' ') this.iniciar();
      return true;
    }
    if (estado === 'fin') {
      if (es(T.reiniciar) || k === ' ') this.jugarDeNuevo();
      else if (k === 'Escape') this.irAlMenu();
      return true;
    }
    if (es(T.pausa) || (k === 'Escape' && !this.pausado)) {
      this.pausado = !this.pausado;
      return true;
    }
    if (this.pausado) {
      if (k === 'Escape') this.irAlMenu();
      return true;
    }
    return false;
  }

  // ---- construcción del HTML

  _construir() {
    const T = C.teclas;
    const teclasPU = T.powerUps.slice(0, C.powerUps.espacios);
    this.raiz.insertAdjacentHTML('beforeend', `
      <div id="destello"></div>

      <div id="hud" class="oculto">
        <div class="hud-panel hud-estado">
          <div class="hud-fila"><span class="hud-etiqueta">Vida</span><span id="hud-vida-num" class="hud-num"></span></div>
          <div class="barra barra-vida"><div id="hud-vida"></div><div id="hud-vida-extra"></div></div>
          <div class="hud-fila"><span class="hud-etiqueta">Munición</span><span id="hud-mun-num" class="hud-num chico"></span></div>
          <div id="hud-municion" class="pips">${'<i></i>'.repeat(C.municion.maxima)}</div>
        </div>

        <div class="hud-panel hud-puntos">
          <span class="hud-etiqueta">Puntos</span>
          <div id="hud-puntos"></div>
          <div class="hud-chips"><span id="hud-record" class="chip tenue"></span></div>
        </div>

        <div class="hud-powerups">
          <div id="hud-efectos"></div>
          <div class="hud-espacios">
            ${teclasPU.map((t, i) => `
              <div class="espacio-pu vacio" id="hud-pu${i}">
                <kbd>${nombreTecla(t)}</kbd><img alt=""><span></span>
              </div>`).join('')}
          </div>
        </div>

        <div class="hud-panel hud-laser" id="hud-laser">
          <img src="${imagenAsset('disparos/laser.png')}" alt="">
          <div>
            <span class="hud-etiqueta">Láser</span>
            <div class="barra"><div id="hud-laser-barra"></div></div>
            <span id="hud-laser-texto" class="hud-mini"></span>
          </div>
        </div>
      </div>

      <div id="titulo" class="pantalla oculto">
        <div class="logo">
          <img src="${imagenAsset('nave/encendido2.png')}" alt="">
          <h1>Space<br>Survival</h1>
        </div>
        <p class="lema">Sobreviví el máximo tiempo posible</p>
        <div class="tarjeta">
          <nav>${PESTANAS.map((p, i) => `<button data-pestana="${i}">${p}</button>`).join('')}</nav>
          <section data-pestana="0" class="controles teclas-tactil">
            <ul>
              <li><b>Turbo · Normal · Freno</b> quedan fijos: elegís uno y la nave sigue así</li>
              <li><b>&#9664; &#9654;</b> girar (se puede girar incluso frenado)</li>
              <li><b>Fuego</b> mantenelo apretado para disparar</li>
              <li><b>Láser</b> cuando se completa el anillo rojo</li>
              <li>Tocá un power-up guardado para usarlo</li>
              <li>Se juega apaisado</li>
            </ul>
          </section>
          <section data-pestana="0" class="controles teclas-teclado">
            <div class="wasd">
              <kbd class="w">${nombreTecla(T.adelante)}</kbd>
              <kbd class="a">${nombreTecla(T.izquierda)}</kbd><kbd class="s">${nombreTecla(T.freno)}</kbd><kbd class="d">${nombreTecla(T.derecha)}</kbd>
            </div>
            <ul>
              <li>${tecla$(T.adelante)} acelerar (y girar más rápido)</li>
              <li>${tecla$(T.izquierda)} ${tecla$(T.derecha)} girar · ${tecla$(T.freno)} frenar</li>
              <li>${tecla$(T.disparo)} disparo frontal (gasta munición)</li>
              <li><kbd>CLIC</kbd>${T.laser ? ' ' + tecla$(T.laser) : ''} láser trasero (carga en ${C.laser.recarga} s)</li>
              <li>${teclasPU.map(tecla$).join(' ')} usar power-ups</li>
              <li>${tecla$(T.pausa)} pausa · ${tecla$(T.silenciar)} sonido</li>
            </ul>
          </section>
          <section data-pestana="1">
            <div class="fichas">${FICHAS_ENEMIGOS.map(ficha).join('')}</div>
            <p class="nota">Cada ${C.fases.duracion} s cambia la fase: en la fase 2 aparecen imanes y babosas.</p>
          </section>
          <section data-pestana="2">
            <div class="fichas">${Object.values(TIPOS_POWERUP).map((p) => ficha({ ...p, chico: true, texto: p.descripcion })).join('')}
              ${FICHAS_VIDA.map(ficha).join('')}</div>
            <p class="nota">Guardás hasta ${C.powerUps.espacios} power-up${C.powerUps.espacios > 1 ? 's' : ''} y los usás <span class="solo-teclado">con ${teclasPU.map(tecla$).join(' ')}</span><span class="solo-tactil">tocándolos</span>.
              Tocar el borde del mapa resta ${C.nave.danoBorde} de vida.</p>
          </section>
          <div class="pie-tarjeta"><kbd>←</kbd><kbd>→</kbd> ver más</div>
        </div>
        <button class="boton-principal" id="boton-jugar">Jugar <kbd>ENTER</kbd></button>
        <div class="records" id="titulo-records"></div>
      </div>

      <div id="pausa" class="pantalla oculto">
        <h2>Pausa</h2>
        <p class="solo-teclado">${tecla$(T.pausa)} para seguir · <kbd>ESC</kbd> menú</p>
      </div>

      <div id="fin" class="pantalla oculto">
        <h2 class="peligro">Nave destruida</h2>
        <span class="hud-etiqueta">Puntos</span>
        <div id="fin-puntos"></div>

        <form id="fin-alta" class="oculto" autocomplete="off">
          <label for="fin-nombre">¡Entraste en la tabla! Poné tu nombre</label>
          <div class="fin-alta-fila">
            <input id="fin-nombre" type="text" maxlength="${C.records.largoNombre}"
                   autocomplete="off" spellcheck="false" placeholder="Tu nombre">
            <button type="submit" class="boton-principal">Guardar</button>
          </div>
          <button type="button" class="boton-secundario" id="boton-saltear">Saltear</button>
        </form>

        <div class="records" id="fin-records"></div>
        <p id="fin-record"></p>
        <div id="fin-botones">
          <button class="boton-principal" id="boton-otra">Jugar de nuevo <kbd>${nombreTecla(T.reiniciar)}</kbd></button>
          <button class="boton-secundario" id="boton-menu">Menú <kbd>ESC</kbd></button>
        </div>
      </div>

      <div id="aviso" class="oculto"></div>
    `);

    const $ = (id) => document.getElementById(id);
    this.el = {
      hud: $('hud'), titulo: $('titulo'), pausa: $('pausa'), fin: $('fin'), aviso: $('aviso'), destello: $('destello'),
      vidaNum: $('hud-vida-num'), vida: $('hud-vida'), vidaExtra: $('hud-vida-extra'),
      munNum: $('hud-mun-num'), municion: $('hud-municion'), pips: [...$('hud-municion').children],
      puntos: $('hud-puntos'), record: $('hud-record'),
      pu: teclasPU.map((_, i) => $('hud-pu' + i)), efectos: $('hud-efectos'),
      laser: $('hud-laser'), laserBarra: $('hud-laser-barra'), laserTexto: $('hud-laser-texto'),
      finPuntos: $('fin-puntos'), finRecord: $('fin-record'), tituloRecords: $('titulo-records'),
      finAlta: $('fin-alta'), finNombre: $('fin-nombre'), finRecords: $('fin-records'),
      finBotones: $('fin-botones'),
    };

    this.raiz.querySelectorAll('nav button').forEach((b) =>
      b.addEventListener('click', () => this.mostrarPestana(+b.dataset.pestana)));
    $('boton-jugar').addEventListener('click', () => this.iniciar());
    $('boton-otra').addEventListener('click', () => this.jugarDeNuevo());
    this.el.finAlta.addEventListener('submit', (e) => {
      e.preventDefault();
      this._mostrarTabla(this.agregarRecord(this.el.finNombre.value, M.G.puntos));
    });
    $('boton-saltear').addEventListener('click', () => this._mostrarTabla(-1));
    $('boton-menu').addEventListener('click', () => this.irAlMenu());
    // que los clics en botones no disparen el láser
    this.raiz.querySelectorAll('button').forEach((b) => b.addEventListener('mousedown', (e) => e.stopPropagation()));
    this.mostrarPestana(0);
  }

  mostrarPestana(i) {
    this.pestana = (i + PESTANAS.length) % PESTANAS.length;
    this.raiz.querySelectorAll('[data-pestana]').forEach((e) =>
      e.classList.toggle('activa', +e.dataset.pestana === this.pestana));
  }

  // ---- actualización (se llama después de cada tick)

  actualizar() {
    const estado = this.estado();
    const G = M.G;
    const el = this.el;
    el.titulo.classList.toggle('oculto', estado !== 'titulo');
    el.hud.classList.toggle('oculto', estado !== 'juego');
    el.pausa.classList.toggle('oculto', !this.pausado || estado !== 'juego');
    el.fin.classList.toggle('oculto', estado !== 'fin');

    // Después de mostrar la pantalla: un input escondido no puede recibir el foco.
    if (estado !== this._anterior.estado) this._entrarEn(estado);
    if (estado !== 'juego') return;

    // vida: barra de 0 a la vida inicial; lo que sobra se ve como "sobrecarga" celeste
    const max = C.nave.vidaInicial;
    const vida = G.vida;
    if (vida !== this._anterior.vida) {
      if (this._anterior.vida !== undefined) this._destello(vida < this._anterior.vida ? 'golpe' : 'cura');
      const p = Math.max(0, Math.min(1, vida / max));
      el.vidaNum.textContent = Math.max(0, vida);
      el.vida.style.width = p * 100 + '%';
      el.vida.style.setProperty('--tono', Math.round(p * 130));
      el.vidaExtra.style.width = Math.max(0, Math.min(1, (vida - max) / max)) * 100 + '%';
      el.hud.classList.toggle('critico', vida > 0 && p < 0.25);
      this._anterior.vida = vida;
    }

    // munición
    const clave = G.mi ? 'inf' : G.municion;
    if (clave !== this._anterior.municion) {
      el.munNum.textContent = G.mi ? '∞' : G.municion;
      el.municion.classList.toggle('infinita', G.mi);
      el.pips.forEach((pip, i) => pip.classList.toggle('lleno', G.mi || i < G.municion));
      this._anterior.municion = clave;
    }

    // puntos
    el.puntos.textContent = G.puntos;
    el.record.textContent = 'Récord ' + Math.max(this.record, G.puntos);

    // power-ups guardados
    el.pu.forEach((caja, i) => {
      const p = G.powerUps[i];
      const tipo = p && p.visible ? p.tipo : null;
      if (caja._tipo === tipo) return;
      caja._tipo = tipo;
      caja.classList.toggle('vacio', !tipo);
      if (tipo) caja.classList.remove('nuevo'), void caja.offsetWidth, caja.classList.add('nuevo');
      const info = TIPOS_POWERUP[tipo];
      caja.querySelector('img').src = info ? imagenAsset(info.imagen) : '';
      caja.querySelector('span').textContent = info ? info.nombre : 'vacío';
    });

    // power-ups activos con su tiempo restante
    const activos = Object.entries(G.efectos).filter(([, e]) => e.fin > M.tick);
    const firma = activos.map(([t]) => t).join();
    if (firma !== this._anterior.efectos) {
      el.efectos.innerHTML = activos.map(([t]) =>
        `<div class="efecto"><img src="${imagenAsset(TIPOS_POWERUP[t].imagen)}" alt=""><div class="barra"><div></div></div></div>`).join('');
      this._anterior.efectos = firma;
    }
    activos.forEach(([, e], i) => {
      el.efectos.children[i].querySelector('.barra div').style.width = ((e.fin - M.tick) / e.duracion) * 100 + '%';
    });

    // láser
    const carga = G.laserListo ? 1 : Math.min(1, (M.tick - G.laserDesde) / G.laserCarga);
    el.laserBarra.style.width = carga * 100 + '%';
    el.laser.classList.toggle('listo', G.laserListo);
    el.laserTexto.textContent = G.laserListo ? 'Listo · clic' : 'Cargando';
  }

  _entrarEn(estado) {
    this._anterior = { estado };
    if (estado === 'titulo') {
      this.el.tituloRecords.innerHTML = this._recordsHTML(C.records.enTitulo);
    }
    if (estado === 'fin') {
      const puntos = M.G.puntos;
      this.el.finPuntos.textContent = puntos;
      if (this.entraEnTabla(puntos)) {
        // Primero el nombre; la tabla y los botones aparecen al guardar.
        this.el.finAlta.classList.remove('oculto');
        this.el.finRecords.classList.add('oculto');
        this.el.finBotones.classList.add('oculto');
        this.el.finRecord.innerHTML = puntos > this.record ? '<span class="nuevo-record">¡Nuevo récord!</span>' : '';
        this.el.finNombre.value = leerGuardado(CLAVE_NOMBRE) || '';
        this.el.finNombre.focus();
        this.el.finNombre.select();
      } else {
        this.el.finAlta.classList.add('oculto');
        this.el.finRecords.classList.add('oculto');
        this.el.finBotones.classList.remove('oculto');
        this.el.finRecord.textContent = this.record ? `Récord: ${this.record}` : '';
      }
    }
  }

  _mostrarTabla(resaltado) {
    this.el.finNombre.blur();
    this.el.finAlta.classList.add('oculto');
    this.el.finRecords.innerHTML = this._recordsHTML(C.records.puestos, resaltado);
    this.el.finRecords.classList.remove('oculto');
    this.el.finBotones.classList.remove('oculto');
  }

  _destello(tipo) {
    const d = this.el.destello;
    d.className = '';
    void d.offsetWidth; // reinicia la animación CSS
    d.className = tipo;
  }

  _aviso(texto) {
    const a = this.el.aviso;
    a.textContent = texto;
    a.classList.remove('oculto');
    clearTimeout(this._tAviso);
    this._tAviso = setTimeout(() => a.classList.add('oculto'), 1200);
  }

  // ---- tabla de récords

  get record() {
    return this.records.length ? this.records[0].puntos : 0;
  }

  // ¿Este puntaje entra en la tabla?
  entraEnTabla(puntos) {
    if (!(puntos > 0)) return false;
    return this.records.length < C.records.puestos ||
      puntos > this.records[this.records.length - 1].puntos;
  }

  // Devuelve el puesto (0 = primero), o -1 si al final no entró.
  agregarRecord(nombre, puntos) {
    const fila = { nombre: this._limpiarNombre(nombre), puntos, fecha: Date.now() };
    this.records = this._ordenar([...this.records, fila]);
    escribirGuardado(CLAVE_RECORDS, JSON.stringify(this.records));
    escribirGuardado(CLAVE_NOMBRE, fila.nombre);
    return this.records.indexOf(fila);
  }

  _leerRecords() {
    let lista;
    try {
      lista = JSON.parse(leerGuardado(CLAVE_RECORDS));
    } catch (e) {
      lista = null; // guardado roto: se empieza de cero en vez de romper el juego
    }
    lista = (Array.isArray(lista) ? lista : [])
      .filter((r) => r && Number.isFinite(+r.puntos))
      .map((r) => ({
        nombre: this._limpiarNombre(r.nombre),
        puntos: Math.max(0, Math.trunc(+r.puntos)),
        fecha: Number.isFinite(+r.fecha) ? +r.fecha : 0,
      }));

    // Antes se guardaba un único récord sin nombre: pasa a ser una fila más.
    const viejo = Math.trunc(+leerGuardado(CLAVE_RECORD_VIEJO)) || 0;
    if (viejo > 0 && !lista.some((r) => r.puntos >= viejo)) {
      lista.push({ nombre: '—', puntos: viejo, fecha: 0 });
    }
    return this._ordenar(lista);
  }

  // De mayor a menor; si empatan, primero el más viejo (llegó antes).
  _ordenar(lista) {
    return lista
      .slice()
      .sort((a, b) => b.puntos - a.puntos || a.fecha - b.fecha)
      .slice(0, C.records.puestos);
  }

  _limpiarNombre(n) {
    const limpio = String(n == null ? '' : n)
      .replace(/[\u0000-\u001f\u007f]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, C.records.largoNombre);
    return limpio || 'Anónimo';
  }

  _recordsHTML(cuantos, resaltado = -1) {
    const filas = this.records.slice(0, cuantos);
    if (!filas.length) return '<p class="records-vacio">Todavía no hay récords. ¡Entrá en la tabla!</p>';
    return `<ol class="records-lista">${filas.map((r, i) => `
      <li${i === resaltado ? ' class="nuevo"' : ''}>
        <span class="puesto">${i + 1}</span>
        <span class="nombre">${escaparHTML(r.nombre)}</span>
        <span class="puntos">${r.puntos}</span>
      </li>`).join('')}</ol>`;
  }
}
