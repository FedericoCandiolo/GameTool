'use strict';
// ============================================================================
//  SPRITES — el juego. Cada objeto conserva el nombre que tenía en el Scratch.
// ============================================================================
// Cada guion es una función generadora: corre hasta el próximo `yield` en cada
// tick (1/30 s). Al final de cada vuelta de un bucle hay un `yield`, igual que
// en Scratch, así que las velocidades y pausas son las mismas que en el original.
//
// Ganchos de cada sprite (equivalen a los bloques "al hacer clic en la bandera",
// "al recibir", "al comenzar como clon", etc.):
//   alIniciar, alRecibir: { mensaje: [...] }, alClonar, alPresionarTecla, alHacerClic

const C = window.CONFIG;
let M = null; // el Motor, lo crea main.js

const CENTRO = { x: 0, y: 0 };
const COLOR_RASTRO = '#5c0b0b';
const COLOR_RASTRO_RGB = [0x5c, 0x0b, 0x0b];
const ANGULOS_LANZAMETEOROS = [78, 55, 11, -13, -55, -77];

const nave = () => M.sprite('nave');
const tecla = (accion) => M.teclaPresionada(C.teclas[accion]);

function globalesIniciales() {
  return {
    municion: 0,
    vida: C.nave.vidaInicial,
    puntos: 0,
    fase: 1,
    mi: false,               // munición infinita activa
    nc: 1,                   // escala de "Nave Chica"
    cantEn: 0,               // naves enemigas en juego
    xEnem: 0, yEnem: 0, dEnem: 90,  // desde dónde dispara la última nave enemiga
    magnetoVive: false, xMag: 0, yMag: 0,
    disparoMet: false, xMet: 0, yMet: 0, dMet: 90, numClon: 0,
    powerUps: new Array(C.powerUps.espacios).fill(null), // { tipo, visible }
    powerUpsEnMapa: 0,
    // sólo para la interfaz (js/interfaz.js), no cambian la jugabilidad:
    pantalla: 'titulo',      // 'titulo' o 'juego'
    inicioPedido: false,     // la pantalla de título pide arrancar
    laserListo: false,
    laserDesde: 0,           // tick en que empezó a cargar
    laserCarga: 1,           // ticks que tarda en cargar
    efectos: {},             // power-ups activos: { tipo: { fin, duracion } } en ticks
  };
}

// d('nombre', 'ruta en assets/img', resolución, centroX, centroY)
function d(nombre, ruta, res, cx, cy) {
  return { nombre, ruta: 'img/' + ruta, res, cx, cy };
}

// ---------------------------------------------------------------- ayudas

// La fórmula original era x = 180 * (2*azar(0,1) - (-1)), que sólo da 180 o 540
// (siempre a la derecha). La corrección es 2*azar(0,1) - 1, que da -1 o 1.
function ladoAlAzar() {
  const r = azarEntero(0, 1);
  return C.original.aparicionSoloDerechaYArriba ? 2 * r + 1 : 2 * r - 1;
}

// Meteoritos y babosas: con puntos pares sobre los costados verticales, si no, por los laterales.
function aparecerComoMeteoro(s) {
  if (esPar(M.G.puntos)) {
    s.fijarX(180 * ladoAlAzar());
    s.fijarY(azarEntero(-240, 240));
  } else {
    s.fijarX(240 * ladoAlAzar());
    s.fijarY(azarEntero(-180, 180));
  }
}

function aparecerComoEnemigo(s) {
  if (esPar(M.G.puntos)) {
    s.fijarX(azarEntero(-240, 240));
    s.fijarY(180 * ladoAlAzar());
  } else {
    s.fijarX(240 * ladoAlAzar());
    s.fijarY(azarEntero(-180, 180));
  }
}

function tocaDisparoNaveOEnemigo(s) {
  return s.tocando('rayoluz') || s.tocando('rayo1') || s.tocando('rayo2') || s.tocando('nave') || s.tocando('enemigo');
}

function* explotaConEscudo(s) {
  for (;;) {
    if (s.tocando('Escudo')) {
      s.cambiarDisfraz('explosion');
      yield* esperar(0.5);
      s.borrarClon();
    }
    yield;
  }
}

function* recibeDisparos(s) {
  for (;;) {
    if (s.tocando('rayo1') || s.tocando('rayo2')) s.vars.vida -= C.disparo.danoPorTick;
    if (s.tocando('rayoluz')) s.vars.vida -= C.laser.danoPorTick;
    yield;
  }
}

function* aparecerCadaTanto(s, rango) {
  for (;;) {
    yield* esperar(azarSegundos(rango));
    s.clonar();
    yield;
  }
}

function* deambular(s) {
  s.mostrar();
  s.fijarX(azarEntero(-220, 220));
  s.fijarY(azarEntero(-160, 160));
  s.fijarDireccion(azarEntero(-179, 180));
  for (;;) {
    s.girar(azarEntero(-3, 3));
    s.avanzar(1);
    s.rebotarEnBorde();
    yield;
  }
}

function* seguirNave(s) {
  for (;;) {
    const n = nave();
    s.fijarX(n.x);
    s.fijarY(n.y);
    s.fijarDireccion(n.dir);
    yield;
  }
}

// Daño a la nave con espera entre golpes (cada fuente tiene su propia espera).
function danoAlTocar(condicion, dano, espera) {
  return function* (s) {
    for (;;) {
      if (condicion(s)) {
        M.G.vida -= dano;
        yield* esperar(espera);
      }
      yield;
    }
  };
}

// ---------------------------------------------------------------- meteoritos

function meteoro({ nombre, escala, disfraces, disfrazInicial, cfg, teledirigido = false, escudo = false }) {
  return {
    nombre, escala, disfraces, disfrazInicial,
    alIniciar: [function* (s) { s.esconder(); s.irA(0, 0); }],
    alRecibir: {
      'Inicio del Juego': [function* (s) {
        if (teledirigido) s.cambiarDisfraz('meteorito');
        yield* aparecerCadaTanto(s, cfg.aparicion);
      }],
    },
    alClonar: [
      function* (s) {
        s.cambiarDisfraz('meteorito');
        yield* esperar(0.5);
        for (;;) {
          if (s.tocandoBorde()) s.borrarClon();
          yield;
        }
      },
      function* (s) {
        s.mostrar();
        aparecerComoMeteoro(s);
        s.apuntarHacia(CENTRO);
        s.girar(azarEntero(-30, 30));
        for (;;) {
          if (tocaDisparoNaveOEnemigo(s)) {
            s.cambiarDisfraz('explosion');
            yield* esperar(0.5);
            s.borrarClon();
          } else if (teledirigido) {
            s.apuntarHacia(nave());
            s.avanzar(cfg.velocidad);
          } else {
            s.girar(azarEntero(-cfg.zigzag, cfg.zigzag));
            s.avanzar(cfg.velocidad);
          }
          yield;
        }
      },
      ...(escudo ? [explotaConEscudo] : []),
    ],
  };
}

const METEORITO = meteoro({
  nombre: 'meteorito', escala: 0.2, cfg: C.meteorito, disfrazInicial: 'explosion',
  disfraces: [
    d('meteorito', 'meteoritos/meteorito.png', 2, 298, 118),
    d('explosion', 'explosiones/explosion_meteorito.png', 2, 254, 250),
  ],
});

const METEORITITO = meteoro({
  nombre: 'meteoritito', escala: 0.1, cfg: C.meteoritoChico, disfrazInicial: 'explosion', escudo: true,
  disfraces: [
    d('meteorito', 'meteoritos/meteorito.png', 2, 298, 118),
    d('explosion', 'explosiones/explosion_meteorito.png', 2, 254, 250),
  ],
});

const METEORITITO2 = meteoro({
  nombre: 'meteoritito2', escala: 0.1, cfg: C.meteoritoTeledirigido, disfrazInicial: 'meteorito',
  teledirigido: true, escudo: true,
  disfraces: [
    d('explosion', 'explosiones/explosion_meteorito_azul.png', 2, 254, 250),
    d('meteorito', 'meteoritos/meteorito_azul.png', 2, 298, 118),
  ],
});

// ---------------------------------------------------------------- disparos de la nave

function disparoFrontal(gastaMunicion) {
  return function* (s) {
    for (;;) {
      if (tecla('disparo') && (M.G.mi || M.G.municion > 0)) {
        if (gastaMunicion && !M.G.mi) M.G.municion--;
        s.clonar();
        yield* esperar(C.disparo.pausaEntreRafagas);
        s.clonar();
      }
      yield;
    }
  };
}

function bala(tamano, sonido) {
  return function* (s) {
    if (sonido) M.sonidos.reproducir(sonido);
    s.mostrar();
    s.fijarTamano(tamano); // Scratch no deja achicarla de 100% (mínimo 5 px)
    while (!s.tocandoBorde()) {
      s.avanzar(C.disparo.velocidad);
      yield;
    }
    s.borrarClon();
  };
}

function* finDelJuegoBala(s) {
  M.detenerOtrosGuiones(s);
  s.esconder();
}

const RAYO1 = {
  nombre: 'rayo1', x: 168, y: 67, direccion: 127,
  disfraces: [d('linea2', 'disparos/bala_izq.png', 2, 24, 34)],
  alIniciar: [function* (s) { s.esconder(); }],
  alRecibir: {
    'Fin del juego': [finDelJuegoBala],
    'Inicio del Juego': [
      seguirNave,
      function* (s) {
        M.G.municion = C.municion.maxima;
        for (;;) {
          if (M.G.municion < C.municion.maxima) {
            yield* esperar(C.municion.recargaCada);
            M.G.municion++;
          }
          yield;
        }
      },
      disparoFrontal(true),
    ],
  },
  alClonar: [bala(10, 'laser')],
};

const RAYO2 = {
  nombre: 'rayo2', x: 168, y: 67, direccion: 127,
  disfraces: [d('linea2', 'disparos/bala_der.png', 2, 25, -32)],
  alIniciar: [function* (s) { s.esconder(); }],
  alRecibir: {
    'Fin del juego': [finDelJuegoBala],
    'Inicio del Juego': [seguirNave, disparoFrontal(false)],
  },
  alClonar: [bala(20, null)],
};

// Láser trasero: una bola de energía que crece y sale hacia atrás.
const RAYOLUZ = {
  nombre: 'rayoluz', x: 106, y: 43, direccion: 81,
  disfraces: [d('rayoluz', 'disparos/laser.png', 2, -246, 34)],
  alIniciar: [function* (s) {
    s.esconder();
    for (;;) {
      s.fijarX(nave().x);
      s.fijarY(nave().y);
      yield;
    }
  }],
  alRecibir: { Laser: [function* (s) { s.clonar(); }] },
  alClonar: [function* (s) {
    s.fijarDireccion(nave().dir - 180);
    s.mostrar();
    s.fijarTamano(C.nave.tamano * M.G.nc);
    for (let i = 0; i < 8; i++) {
      s.cambiarTamano(10);
      yield;
    }
    while (!s.tocandoBorde()) {
      s.avanzar(C.laser.velocidad);
      yield;
    }
    s.borrarClon();
  }],
};

const laserPedido = () => M.mouseAbajo || tecla('laser');

// Para la barra de carga del HUD.
function cargarLaser(segundos) {
  M.G.laserListo = false;
  M.G.laserDesde = M.tick;
  M.G.laserCarga = segundos * M.tps;
}

// El cañón trasero de la nave: se ve cuando el láser está listo.
const RAYO = {
  nombre: 'rayo', escala: 0.2, x: 162, y: 72, direccion: 127,
  disfraces: [d('rayo', 'disparos/canon_laser.png', 2, 286, 40)],
  alIniciar: [
    function* (s) { s.esconder(); yield* seguirNave(s); },
    function* (s) {
      for (;;) {
        s.fijarTamano(C.nave.tamano * M.G.nc);
        yield;
      }
    },
  ],
  alRecibir: {
    Laser: [function* (s) {
      cargarLaser(C.laser.recarga);
      yield* esperar(1);
      s.esconder();
      yield* esperar(Math.max(0, C.laser.recarga - 1));
      s.mostrar();
      M.G.laserListo = true;
      yield* esperarHasta(laserPedido);
      M.enviar('Laser');
    }],
    'Fin del juego': [function* (s) { s.esconder(); M.detenerOtrosGuiones(s); }],
    'Inicio del Juego': [function* (s) {
      cargarLaser(1);
      yield* esperar(1);
      s.alFrente();
      s.mostrar();
      M.G.laserListo = true;
      yield* esperarHasta(laserPedido);
      M.enviar('Laser');
    }],
  },
};

// ---------------------------------------------------------------- naves enemigas

// Balas enemigas. Al recibir la orden de disparo se clonan desde (xEnem, yEnem).
function rafagaEnemiga(cantidad) {
  return function* (s) {
    // En Scratch los clones también reciben mensajes: cada bala en vuelo dispara otra ráfaga.
    if (s.esClon && !C.original.balasEnemigasEnCascada) return;
    for (let i = 0; i < cantidad; i++) {
      s.clonar();
      yield* esperar(C.enemigos.balaIntervalo);
      yield;
    }
  };
}

const PUNTO = {
  nombre: 'punto', escala: 0.4, direccion: 108,
  disfraces: [d('izq2', 'disparos/bala_enemiga.png', 2, -160, 9)],
  alRecibir: {
    disp_enem: [rafagaEnemiga(C.enemigos.grande.balas)],
    disp_enemch: [rafagaEnemiga(C.enemigos.chica.balas)],
  },
  alClonar: [
    function* (s) {
      s.irA(M.G.xEnem, M.G.yEnem);
      s.fijarDireccion(M.G.dEnem);
      s.mostrar();
      for (;;) {
        if (s.tocando('rayo1') || s.tocando('rayo2') || s.tocando('nave') || s.tocando('meteorito') || s.tocandoBorde()) {
          if (s.tocando('nave')) M.G.vida -= C.enemigos.balaDano;
          s.borrarClon();
        }
        s.avanzar(C.enemigos.balaVelocidad);
        yield;
      }
    },
    function* (s) {
      for (;;) {
        if (s.tocando('Escudo')) s.borrarClon();
        yield;
      }
    },
  ],
};

// Dirección hacia la nave calculada como en el original (atan sin cuadrante:
// apunta al revés cuando la nave está a la izquierda, y luego se corrige girando 180°).
function direccionHaciaNaveOriginal(s) {
  const n = nave();
  return (gradosAtan((n.y - s.y) / (n.x - s.x)) - 90) * -1;
}

const ENEMIGO = {
  nombre: 'enemigo', escala: 1.4, direccion: 108, disfrazInicial: 'apagado',
  variables: { vida: 40, giro: 'no' },
  disfraces: [
    d('der1', 'enemigo/der1.png', 2, 121, 121),
    d('encendido1', 'enemigo/encendido1.png', 2, 121, 121),
    d('izq1', 'enemigo/izq1.png', 2, 121, 120),
    d('der2', 'enemigo/der2.png', 2, 121, 121),
    d('encendido2', 'enemigo/encendido2.png', 2, 121, 121),
    d('izq2', 'enemigo/izq2.png', 2, 121, 121),
    d('explosion', 'explosiones/explosion_enemigo.png', 2, 254, 250),
    d('apagado', 'enemigo/apagado.png', 2, 121, 121),
  ],
  alIniciar: [function* (s) { M.G.cantEn = 0; s.esconder(); s.irA(0, 0); }],
  alRecibir: {
    'Inicio del Juego': [function* (s) {
      for (;;) {
        yield* esperar(M.G.fase * azarSegundos(C.enemigos.aparicion));
        s.clonar();
        yield;
      }
    }],
  },
  alClonar: [
    // choque con meteorito grande
    function* (s) {
      for (;;) {
        if (s.tocando('meteorito')) {
          s.vars.vida -= C.meteorito.danoAEnemigos;
          yield* esperar(1);
        }
        yield;
      }
    },
    // propulsores (en el original cambiaba a "der1" y "der2" sin pausa, así que sólo se ve el 2)
    function* (s) {
      const disfraz = { no: 'apagado', re: 'der2', cre: 'izq2', ade: 'encendido2' };
      for (;;) {
        if (0 < s.vars.vida) s.cambiarDisfraz(disfraz[s.vars.giro]);
        yield;
      }
    },
    // comportamiento
    function* (s) {
      if (M.G.cantEn < M.G.puntos / C.enemigos.puntosPorEnemigo) M.G.cantEn++;
      else s.borrarClon();
      const grande = Math.random() < C.enemigos.probabilidadNaveGrande;
      const tipo = grande ? C.enemigos.grande : C.enemigos.chica;
      s.vars.vida = tipo.vida;
      s.fijarTamano(tipo.tamano);
      s.mostrar();
      aparecerComoEnemigo(s);
      s.apuntarHacia(CENTRO);
      s.girar(azarEntero(-20, 20));
      s.cambiarEfecto('color', -70);
      for (;;) {
        // avanza un poco hacia el centro
        s.vars.giro = 'ade';
        yield* s.deslizar(1,
          s.x - azarEntero(20, 80) * Math.sign(s.x),
          s.y - azarEntero(20, 80) * Math.sign(s.y));
        s.cambiarEfecto('color', 35);
        for (let disparo = 0; disparo < 2; disparo++) {
          // apunta a la nave
          for (let i = 0; i < 5; i++) {
            const diferencia = direccionHaciaNaveOriginal(s) - s.dir;
            s.vars.giro = 0 < diferencia ? 're' : 'cre';
            s.girar(diferencia / 2);
            yield;
          }
          if ((s.x - nave().x) * s.dir > 0) {
            for (let i = 0; i < 10; i++) {
              s.vars.giro = 're';
              s.girar(18);
              yield;
            }
          }
          s.vars.giro = 'no';
          s.cambiarEfecto('color', 35);
          yield* esperar(0.5);
          M.G.dEnem = s.dir;
          M.G.xEnem = s.x;
          M.G.yEnem = s.y;
          M.enviar(grande ? 'disp_enem' : 'disp_enemch');
          yield* esperar(0.5);
          s.cambiarEfecto('color', -35);
          yield;
        }
        s.cambiarEfecto('color', -35);
        yield;
      }
    },
    // muerte
    function* (s) {
      for (;;) {
        if (!(s.vars.vida > 0)) {
          s.vars.muriendo = true;
          M.G.cantEn--;
          s.cambiarDisfraz('explosion');
          yield* esperar(0.5);
          s.borrarClon();
        }
        yield;
      }
    },
    // se va después de un rato
    function* (s) {
      yield* esperar(azarSegundos(C.enemigos.duracion));
      if (!C.original.enemigosQueSeVanOcupanLugar && !s.vars.muriendo) M.G.cantEn--;
      s.borrarClon();
    },
    recibeDisparos,
  ],
};

// ---------------------------------------------------------------- imán

const MAGNETO = {
  nombre: 'magneto', escala: 0.7, x: 83, y: -56, variables: { vida: 0 },
  disfraces: [
    d('magnetoA', 'iman/apagado.png', 2, 122, 122),
    d('magnetoE', 'iman/electrico1.png', 2, 122, 122),
    d('magneto2', 'iman/electrico2.png', 2, 122, 122),
    d('explosion', 'explosiones/explosion_nave.png', 2, 254, 250),
  ],
  alIniciar: [function* (s) { M.G.magnetoVive = false; s.esconder(); }],
  alRecibir: {
    'Inicio del Juego': [
      // las fases del juego se controlaban desde el imán
      function* () {
        for (;;) {
          M.G.fase = 1;
          yield* esperar(C.fases.duracion);
          M.G.fase = 2;
          yield* esperar(C.fases.duracion);
          yield;
        }
      },
      function* (s) {
        for (;;) {
          yield* esperar(azarSegundos(C.iman.aparicion));
          yield* esperarHasta(() => M.G.fase === 2);
          s.clonar();
          yield;
        }
      },
    ],
  },
  alClonar: [
    // aparece de a poco y chispea
    function* (s) {
      s.vars.vida = C.iman.vida;
      s.cambiarDisfraz('magnetoA');
      s.fijarEfecto('fantasma', 100);
      s.mostrar();
      for (let i = 0; i < 20; i++) {
        s.cambiarEfecto('fantasma', -5);
        yield* esperar(0.1);
        yield;
      }
      yield* esperar(0.5);
      for (;;) {
        if (0 < s.vars.vida) {
          s.cambiarDisfraz('magnetoE');
          yield* esperar(0.05);
          s.cambiarDisfraz('magneto2');
          yield* esperar(0.05);
        }
        yield;
      }
    },
    function* (s) {
      s.fijarX(azarEntero(130, 190) * (2 * azarEntero(0, 1) - 1));
      s.fijarY(130 * (2 * azarEntero(0, 1) - 1));
      for (;;) {
        s.apuntarHacia(nave());
        yield;
      }
    },
    function* (s) {
      yield* esperar(2.5);
      for (;;) {
        if (s.tocando('nave')) M.G.vida -= C.iman.dano;
        yield* esperar(C.iman.intervaloDano);
        yield;
      }
    },
    recibeDisparos,
    function* (s) {
      yield* esperar(2);
      for (;;) {
        if (s.vars.vida > 0) {
          M.G.magnetoVive = true;
          M.G.xMag = s.x;
          M.G.yMag = s.y;
        } else {
          M.G.magnetoVive = false;
          s.cambiarDisfraz('explosion');
          yield* esperar(0.5);
          s.borrarClon();
        }
        yield;
      }
    },
  ],
};

// ---------------------------------------------------------------- nave

// Para mostrar en el HUD cuánto le queda a un power-up activo.
function marcarEfecto(tipo, segundos) {
  const duracion = Math.ceil(segundos * M.tps);
  M.G.efectos[tipo] = { fin: M.tick + duracion, duracion };
}

function* usarPowerUp(i) {
  const p = M.G.powerUps[i];
  if (!p) return;
  M.G.powerUps[i] = null;
  const n = nave();
  const pu = C.powerUps;
  marcarEfecto(p.tipo, {
    Turbo: pu.turbo.ticks / M.tps,
    'Municion Infinita': pu.municionInfinita.duracion,
    Escudo: (pu.escudo.ticks + 5) / M.tps,
    'Nave Chica': pu.naveChica.duracion,
  }[p.tipo]);
  if (p.tipo === 'Turbo') {
    M.iniciarHilo(n, function* (s) {
      for (let t = 0; t < C.powerUps.turbo.ticks; t++) {
        s.avanzar(C.powerUps.turbo.velocidad);
        yield;
      }
    }, 'turbo');
  } else if (p.tipo === 'Municion Infinita') {
    M.iniciarHilo(n, function* () {
      M.G.mi = true;
      yield* esperar(C.powerUps.municionInfinita.duracion);
      M.G.mi = false;
    }, 'municionInfinita');
  } else if (p.tipo === 'Escudo') {
    M.clonarA('Escudo');
  } else if (p.tipo === 'Nave Chica') {
    M.iniciarHilo(n, function* () {
      M.G.nc = C.powerUps.naveChica.escala;
      yield* esperar(C.powerUps.naveChica.duracion);
      M.G.nc = 1;
    }, 'naveChica');
  }
}

const NAVE = {
  nombre: 'nave', escala: 0.2, x: 200, y: 43, direccion: 127, disfrazInicial: 'explosion',
  disfraces: [
    d('apagado1', 'nave/apagado1.png', 2, 268, 200),
    d('der1', 'nave/der1.png', 2, 302, 200),
    d('encendido2', 'nave/encendido2.png', 2, 318, 200),
    d('izq2', 'nave/izq2.png', 2, 318, 200),
    d('apagado2', 'nave/apagado2.png', 2, 278, 200),
    d('der2', 'nave/der2.png', 2, 278, 200),
    d('encendido1', 'nave/encendido1.png', 2, 302, 200),
    d('izq1', 'nave/izq1.png', 2, 302, 200),
    d('explosion', 'explosiones/explosion_nave.png', 2, 254, 250),
    d('m.apagado', 'nave/freno_apagado.png', 2, 243, 200),
    d('m.der1', 'nave/freno_der1.png', 2, 268, 200),
    d('m.der2', 'nave/freno_der2.png', 2, 278, 200),
    d('m.izq1', 'nave/freno_izq1.png', 2, 268, 200),
    d('m.izq2', 'nave/freno_izq2.png', 2, 278, 200),
  ],
  alIniciar: [
    function* (s) { s.esconder(); },
    function* () { M.G.mi = false; M.G.nc = 1; },
    function* (s) {
      for (;;) {
        s.fijarTamano(C.nave.tamano * M.G.nc);
        yield;
      }
    },
    function* () { M.G.vida = C.nave.vidaInicial; M.G.puntos = 0; },
  ],
  alPresionarTecla: Object.fromEntries(
    C.teclas.powerUps.slice(0, C.powerUps.espacios).map((t, i) => [Motor.normalizarTecla(t), () => usarPowerUp(i)])
  ),
  alRecibir: {
    'Fin del juego': [function* (s) {
      M.detenerOtrosGuiones(s);
      for (let i = 0; i < 40; i++) {
        s.avanzar(1);
        yield;
      }
      s.cambiarDisfraz('explosion');
      for (let i = 0; i < 10; i++) {
        s.cambiarTamano(10);
        yield;
      }
      for (let i = 0; i < 10; i++) {
        s.cambiarTamano(-10);
        yield;
      }
      s.esconder();
      yield* esperar(0.2);
      M.lapiz.borrar();
      M.detenerTodo();
    }],
    'Inicio del Juego': [
      danoAlTocar((s) => s.tocandoBorde(), C.nave.danoBorde, C.nave.esperaDanoBorde),
      function* () {
        for (;;) {
          if (!(M.G.vida > 0)) M.enviar('Fin del juego');
          yield;
        }
      },
      // movimiento: siempre avanza un poco; W acelera y gira más rápido, S frena
      function* (s) {
        s.mostrar();
        s.irA(0, 0);
        s.fijarDireccion(90);
        const n = C.nave;
        for (;;) {
          if (tecla('adelante')) {
            if (tecla('izquierda')) s.girar(-(n.giroAcelerando - n.giroSinAcelerar));
            if (tecla('derecha')) s.girar(n.giroAcelerando - n.giroSinAcelerar);
            s.avanzar(tecla('freno') ? n.velocidadCrucero : n.velocidadAcelerando);
          } else if (!tecla('freno')) {
            s.avanzar(n.velocidadCrucero);
          }
          if (tecla('izquierda')) s.girar(-n.giroSinAcelerar);
          if (tecla('derecha')) s.girar(n.giroSinAcelerar);
          yield;
        }
      },
      // atracción del imán
      function* (s) {
        for (;;) {
          if (M.G.magnetoVive) {
            s.cambiarX((M.G.xMag - s.x) / C.iman.atraccion);
            s.cambiarY((M.G.yMag - s.y) / C.iman.atraccion);
          }
          yield;
        }
      },
      danoAlTocar((s) => s.tocandoColorDetectable(), C.babosa.danoRastro, C.babosa.esperaDano),
      danoAlTocar((s) => s.tocando('meteorito'), C.meteorito.dano, C.meteorito.esperaDano),
      danoAlTocar(
        (s) => s.tocando('meteoritito') || s.tocando('meteoritito2') || s.tocando('metboss'),
        C.meteoritoChico.dano, C.meteoritoChico.esperaDano),
      function* () {
        for (;;) {
          if (M.G.vida > 0) {
            yield* esperar(1 / C.nave.puntosPorSegundo);
            M.G.puntos++;
          }
          yield;
        }
      },
      // animación de propulsores
      function* (s) {
        const par = function* (a, b) {
          s.cambiarDisfraz(a);
          yield* esperar(0.1);
          s.cambiarDisfraz(b);
          yield* esperar(0.1);
        };
        for (;;) {
          const W = tecla('adelante'), A = tecla('izquierda'), S = tecla('freno'), D = tecla('derecha');
          if (S) {
            if (D) yield* par('m.der1', 'm.der2');
            else if (A) yield* par('m.izq1', 'm.izq2');
            else if (W) yield* par('apagado1', 'apagado2');
            else {
              s.cambiarDisfraz('m.apagado');
              yield* esperar(0.1);
            }
          } else if (W && A) yield* par('izq1', 'izq2');
          else if (W && D) yield* par('der1', 'der2');
          else if (W) yield* par('encendido1', 'encendido2');
          else yield* par('apagado1', 'apagado2');
          yield;
        }
      },
    ],
  },
};

// ---------------------------------------------------------------- lanzameteoros

function angulosLanzamiento() {
  const n = C.lanzameteoros.meteoritos;
  if (n === ANGULOS_LANZAMETEOROS.length) return ANGULOS_LANZAMETEOROS;
  return Array.from({ length: n }, (_, i) => (n === 1 ? 0 : 78 - (155 * i) / (n - 1)));
}

const ENMET = {
  nombre: 'enmet', x: 0, y: 241, direccion: 180, disfrazInicial: 'enmet2',
  disfraces: [
    d('enmet', 'lanzameteoros/cargado.png', 2, 156, 156),
    d('enmet2', 'lanzameteoros/vacio.png', 2, 156, 156),
  ],
  alIniciar: [function* (s) { M.G.disparoMet = false; s.esconder(); }],
  alRecibir: {
    'Inicio del Juego': [function* (s) {
      for (;;) {
        yield* esperar(C.lanzameteoros.aparicion);
        s.clonar();
        yield;
      }
    }],
  },
  alClonar: [function* (s) {
    const hordas = 1 + Math.round(M.G.puntos / C.lanzameteoros.puntosPorHordaExtra);
    for (let h = 0; h < hordas; h++) {
      s.cambiarDisfraz('enmet');
      s.mostrar();
      const vertical = azarEntero(1, 2) === 1;
      const primero = azarEntero(1, 2) === 1;
      s.fijarX(vertical ? 0 : primero ? 305 : -305);
      s.fijarY(vertical ? (primero ? -245 : 245) : 0);
      s.apuntarHacia(CENTRO);
      M.G.dMet = s.dir;
      M.G.xMet = s.x;
      M.G.yMet = s.y;
      if (!C.original.lanzameteorosSueltaEnseguida) M.G.disparoMet = false;
      for (let i = 0; i < 13; i++) {
        s.avanzar(5);
        yield;
      }
      for (let i = 0; i < C.lanzameteoros.meteoritos; i++) {
        M.clonarA('metboss');
        yield* esperar(0.5);
        yield;
      }
      yield* esperar(0.4);
      s.cambiarDisfraz('enmet2');
      M.G.disparoMet = true;
      yield* esperar(0.5);
      for (let i = 0; i < 13; i++) {
        s.avanzar(-5);
        yield;
      }
      s.esconder();
      yield;
    }
    s.borrarClon();
  }],
};

// Los meteoritos que suelta el lanzameteoros (rojos al azar o azules teledirigidos).
const METBOSS = {
  nombre: 'metboss', escala: 0.1, y: 122, direccion: 180, disfrazInicial: 'meteoritoazul',
  disfraces: [
    d('meteorito', 'meteoritos/meteorito_lanzado.png', 2, 298, 118),
    d('explosion', 'explosiones/explosion_meteorito_azul.png', 2, 254, 250),
    d('meteoritoazul', 'meteoritos/meteorito_azul.png', 2, 298, 118),
  ],
  alIniciar: [function* (s) { M.G.numClon = 0; s.esconder(); }],
  alClonar: [
    function* (s) {
      const angulos = angulosLanzamiento();
      if (M.G.numClon >= angulos.length) M.G.numClon = 0;
      M.G.numClon++;
      s.fijarX(M.G.xMet);
      s.fijarY(M.G.yMet);
      s.fijarDireccion(M.G.dMet);
      s.girar(-angulos[M.G.numClon - 1]);
      s.avanzar(65);
      yield* esperarHasta(() => M.G.disparoMet);
      const azul = Math.random() < C.lanzameteoros.probabilidadAzul;
      s.mostrar();
      // (en el original este bucle pisa el disfraz de explosión, por eso casi no se ve)
      for (;;) {
        if (azul) {
          s.cambiarDisfraz('meteoritoazul');
          s.apuntarHacia(nave());
          s.avanzar(C.meteoritoTeledirigido.velocidad);
        } else {
          s.cambiarDisfraz('meteorito');
          s.girar(azarEntero(-C.meteoritoChico.zigzag, C.meteoritoChico.zigzag));
          s.avanzar(C.meteoritoChico.velocidad);
        }
        yield;
      }
    },
    function* (s) {
      yield* esperar(0.5);
      for (;;) {
        if (s.tocandoBorde()) s.borrarClon();
        if (tocaDisparoNaveOEnemigo(s)) {
          s.cambiarDisfraz('explosion');
          yield* esperar(0.5);
          s.borrarClon();
        }
        yield;
      }
    },
    explotaConEscudo,
  ],
};

// ---------------------------------------------------------------- manzanas (vida)

function manzana(nombre, ruta, cfg, x, y) {
  return {
    nombre, escala: 0.3, x, y, rotacion: 'ninguna',
    disfraces: [d('apple', ruta, 1, 31, 31)],
    alIniciar: [function* (s) { s.esconder(); }],
    alRecibir: { 'Inicio del Juego': [(s) => aparecerCadaTanto(s, cfg.aparicion)] },
    alClonar: [
      function* (s) {
        for (;;) {
          if (s.tocando('nave')) {
            M.G.vida += cfg.vida;
            s.borrarClon();
          }
          yield;
        }
      },
      deambular,
      function* (s) {
        yield* esperar(cfg.duracion);
        s.borrarClon();
      },
    ],
  };
}

const APPLE = manzana('Apple', 'varios/manzana.svg', C.manzanas.verde, 53, 24);
const APPLE2 = manzana('Apple2', 'varios/manzana_dorada.svg', C.manzanas.dorada, -162, -105);

// ---------------------------------------------------------------- babosa

const BABOSA = {
  nombre: 'babosa', escala: 0.3, x: 99, y: -9, variables: { vida: 0 }, disfrazInicial: 'babosa1',
  disfraces: [
    d('babosa1', 'babosa/babosa1.png', 2, 62, 90),
    d('babosa5', 'babosa/babosa5.png', 2, 56, 88),
    d('babosa3', 'babosa/babosa3.png', 2, 56, 88),
    d('babosa4', 'babosa/babosa4.png', 2, 56, 88),
    d('babosa6', 'babosa/babosa6.png', 2, 62, 90),
    d('babosa2', 'babosa/babosa2.png', 2, 62, 90),
  ],
  alIniciar: [function* (s) {
    M.G.fase = 1;
    M.lapiz.borrar();
    s.subirLapiz();
    s.cambiarDisfraz('babosa1');
    s.esconder();
  }],
  alRecibir: {
    'Inicio del Juego': [function* (s) {
      for (;;) {
        if (M.G.fase === 2) {
          yield* esperar(azarSegundos(C.babosa.aparicion));
          s.clonar();
        }
        yield;
      }
    }],
  },
  alClonar: [
    function* (s) {
      s.vars.vida = C.babosa.vida;
      s.mostrar();
      for (;;) {
        yield* esperar(0.2);
        s.siguienteDisfraz();
        yield;
      }
    },
    function* (s) {
      for (;;) {
        if (s.tocando('rayo1') || s.tocando('rayo2')) s.vars.vida -= C.disparo.danoPorTick;
        if (s.tocando('rayoluz')) s.vars.vida -= C.laser.danoPorTick;
        if (!(0 < s.vars.vida)) {
          M.lapiz.borrar(); // borra los rastros de TODAS las babosas
          s.borrarClon();
        }
        yield;
      }
    },
    function* (s) {
      aparecerComoMeteoro(s);
      s.apuntarHacia(CENTRO);
      s.girar(azarEntero(-30, 30));
      s.grosorLapiz = C.babosa.grosorRastro;
      s.colorLapiz = COLOR_RASTRO;
      s.bajarLapiz();
      for (;;) {
        s.girar(azarEntero(-C.babosa.zigzag, C.babosa.zigzag));
        s.avanzar(C.babosa.velocidad);
        s.rebotarEnBorde();
        yield;
      }
    },
    function* (s) {
      yield* esperar(azarSegundos(C.babosa.duracion));
      M.lapiz.borrar();
      s.borrarClon();
    },
    function* (s) {
      for (;;) {
        if (s.tocando('Escudo')) {
          // Los otros dos modos de morir (disparos y tiempo) borran el rastro;
          // éste no, y el rastro sigue haciendo daño sin la babosa. Como ellos,
          // borra el de TODAS las babosas: el lápiz del Scratch es uno solo.
          if (!C.original.babosaConEscudoDejaRastro) M.lapiz.borrar();
          s.borrarClon();
        }
        yield;
      }
    },
  ],
};

// ---------------------------------------------------------------- power-ups

function hayLugarParaPowerUp() {
  const enMano = M.G.powerUps.filter(Boolean).length;
  const reservados = C.original.powerUpSinAgarrar ? 0 : M.G.powerUpsEnMapa;
  return enMano + reservados < C.powerUps.espacios;
}

function guardarPowerUp(tipo, visible) {
  const i = M.G.powerUps.indexOf(null);
  if (i < 0) return null;
  return (M.G.powerUps[i] = { tipo, visible });
}

const POWERUPS = {
  nombre: 'PowerUps', escala: 0.1, x: 63, y: 43, rotacion: 'ninguna', disfrazInicial: 'Nave Chica',
  disfraces: [
    d('Escudo', 'powerups/escudo.png', 2, 286, 336),
    d('Municion Infinita', 'powerups/municion_infinita.png', 2, 312, 360),
    d('Turbo', 'powerups/turbo.png', 2, 360, 314),
    d('Nave Chica', 'powerups/nave_chica.svg', 1, 120, 156),
  ],
  alIniciar: [function* (s) { s.esconder(); }],
  alRecibir: {
    'Inicio del Juego': [function* (s) {
      for (;;) {
        yield* esperarHasta(hayLugarParaPowerUp);
        yield* esperar(azarSegundos(C.powerUps.aparicion));
        s.clonar();
        yield;
      }
    }],
  },
  alClonar: [
    function* (s) {
      const par = esPar(M.G.puntos);
      const tipo = Math.random() < 0.6 ? (par ? 'Turbo' : 'Nave Chica') : (par ? 'Escudo' : 'Municion Infinita');
      s.cambiarDisfraz(tipo);
      if (C.original.powerUpSinAgarrar) {
        // como en el Scratch: ya se puede usar, sólo falta que se vea en pantalla
        const guardado = guardarPowerUp(tipo, false);
        yield* esperarHasta(() => s.tocando('nave'));
        if (guardado) guardado.visible = true;
      } else {
        M.G.powerUpsEnMapa++;
        s.vars.enMapa = true;
        yield* esperarHasta(() => s.tocando('nave'));
        M.G.powerUpsEnMapa--;
        s.vars.enMapa = false;
        guardarPowerUp(tipo, true);
      }
      s.borrarClon();
    },
    function* (s) {
      yield* esperar(C.powerUps.duracionEnMapa);
      if (s.vars.enMapa) M.G.powerUpsEnMapa--;
      s.borrarClon();
    },
    deambular,
  ],
};

// Onda expansiva del escudo: desintegra balas, meteoritos chicos y babosas.
const ESCUDO = {
  nombre: 'Escudo', escala: 0.0139, x: -84, y: 9,
  disfraces: [d('EscForma', 'powerups/onda_escudo.png', 1, 180, 180)],
  alIniciar: [function* (s) { s.fijarTamano(1); s.esconder(); }],
  alClonar: [function* (s) {
    s.irHacia(nave());
    s.fijarEfecto('fantasma', 0);
    s.mostrar();
    for (let i = 0; i < C.powerUps.escudo.ticks; i++) {
      s.cambiarTamano(C.powerUps.escudo.crecimientoPorTick);
      yield;
    }
    for (let i = 0; i < 5; i++) {
      s.cambiarEfecto('fantasma', 20);
      yield;
    }
    s.borrarClon();
  }],
};

// ---------------------------------------------------------------- escenario

// En el Scratch el escenario mostraba 5 pantallas de instrucciones (imágenes). Ahora
// las instrucciones las muestra la interfaz (js/interfaz.js), que pide arrancar con
// M.G.inicioPedido.
const ESCENARIO = {
  nombre: 'Escenario', disfrazInicial: 'stars',
  disfraces: [d('stars', 'escenario/estrellas.png', 2, 480, 360)],
  alIniciar: [function* () {
    yield* esperarHasta(() => M.G.inicioPedido);
    M.enviar('Inicio del Juego');
  }],
  alRecibir: {
    'Inicio del Juego': [function* (st) {
      M.detenerOtrosGuiones(st);
      M.G.pantalla = 'juego';
    }],
  },
};

// Orden de capas del proyecto original (de abajo hacia arriba).
const SPRITES = [
  METEORITO, RAYO1, RAYO2, RAYOLUZ, PUNTO, METEORITITO, APPLE, ENEMIGO, METEORITITO2, MAGNETO,
  NAVE, ENMET, METBOSS, APPLE2, BABOSA, POWERUPS, ESCUDO, RAYO,
];
