// ============================================================================
//  SPACE SURVIVAL — CONFIGURACIÓN
// ============================================================================
//  Editá los valores y recargá la página (F5). No hace falta tocar nada más.
//
//  Unidades:
//   - El juego corre a 30 "ticks" por segundo, igual que Scratch. Las
//     velocidades están en píxeles POR TICK y los giros en grados POR TICK
//     (multiplicá por 30 para obtener píxeles o grados por segundo).
//   - Los tiempos están en segundos.
//   - Los rangos [min, max] eligen un valor al azar entre ambos (de a 0,1 s).
//   - El escenario mide 480 x 360 (centro en 0,0), como en Scratch.
//   - Los tamaños están en % del dibujo original, como en Scratch.
//
//  Los valores por defecto son exactamente los del proyecto Scratch original.
// ============================================================================

window.CONFIG = {
  juego: {
    ticksPorSegundo: 30,
    limiteDeClones: 300,     // Scratch no permitía más de 300 clones a la vez
    volumen: 0.6,            // 0 a 1
  },

  // Tabla de récords. Se guarda en este navegador (localStorage): no viaja a
  // ningún lado, así que cada navegador y cada perfil tiene la suya.
  records: {
    puestos: 8,        // cuántos entran en la tabla
    enTitulo: 5,       // cuántos se ven en la pantalla de título
    largoNombre: 12,   // máximo de letras del nombre
  },

  // Controles en pantalla para teléfonos y tablets (js/tactil.js).
  tactil: {
    activar: 'auto',        // 'auto' = sólo en pantallas sin mouse · true = siempre · false = nunca
    avisoVertical: true,    // mostrar el cartel de "girá el teléfono" en vertical
  },

  // Nombres de tecla como los reporta el navegador: 'w', ' ' (espacio), 'Enter', 'ArrowUp'...
  teclas: {
    adelante: 'w',
    izquierda: 'a',
    freno: 's',
    derecha: 'd',
    disparo: ' ',
    powerUps: ['f', 'g'],    // una tecla por cada espacio de power-up
    laser: '',               // el láser trasero se dispara con clic; acá podés sumarle una tecla
    pausa: 'p',
    silenciar: 'm',
    reiniciar: 'Enter',      // al terminar la partida
  },

  nave: {
    vidaInicial: 200,
    tamano: 20,
    velocidadAcelerando: 8,  // con W
    velocidadCrucero: 1,     // sin tocar nada (o W + S)
    giroAcelerando: 9,       // A/D mientras se mantiene W
    giroSinAcelerar: 1,      // A/D sin W
    puntosPorSegundo: 1,
    danoBorde: 5,            // por tocar el borde del mapa
    esperaDanoBorde: 1,
  },

  municion: {
    maxima: 20,
    recargaCada: 0.5,        // +1 bala cada tanto tiempo
  },

  disparo: {                 // ESPACIO: dos cañones frontales
    pausaEntreRafagas: 0.2,
    velocidad: 18,
    danoPorTick: 10,         // las balas atraviesan y dañan mientras se superponen
  },

  laser: {                   // CLIC: bola de energía trasera
    recarga: 10,             // segundos entre disparos
    velocidad: 5,
    danoPorTick: 40,
  },

  meteorito: {               // grande
    aparicion: [5, 9],
    velocidad: 6,
    zigzag: 5,               // desvío al azar por tick (grados)
    dano: 20,
    esperaDano: 1,
    danoAEnemigos: 20,
  },

  meteoritoChico: {          // rojo
    aparicion: [2, 4],
    velocidad: 6,
    zigzag: 5,
    dano: 5,
    esperaDano: 1,           // compartida con todos los meteoritos chicos
  },

  meteoritoTeledirigido: {   // azul, persigue a la nave
    aparicion: [4, 8],
    velocidad: 4,
    dano: 5,
  },

  fases: {
    duracion: 40,            // alterna Fase 1 / Fase 2. En la 2 aparecen imanes y babosas
  },

  enemigos: {
    aparicion: [3, 6],       // se multiplica por el número de fase (en Fase 2 tardan el doble)
    puntosPorEnemigo: 20,    // máximo de naves a la vez = puntos / este valor
    probabilidadNaveGrande: 0.4,
    duracion: [15, 20],      // después se van
    chica:  { vida: 20, tamano: 20, balas: 2 },
    grande: { vida: 40, tamano: 40, balas: 5 },
    balaVelocidad: 5,
    balaDano: 4,
    balaIntervalo: 0.2,
  },

  iman: {
    vida: 240,
    aparicion: [25, 45],     // y sólo durante la Fase 2
    atraccion: 40,           // cada tick la nave recorre 1/atraccion de la distancia al imán (más bajo = más fuerte)
    dano: 10,
    intervaloDano: 0.5,
  },

  babosa: {
    vida: 20,
    aparicion: [3, 6],       // sólo durante la Fase 2
    duracion: [8, 12],       // al irse (o morir) se borran TODOS los rastros
    velocidad: 6,
    zigzag: 10,
    danoRastro: 5,           // tocar el rastro o el borde oscuro de la babosa
    esperaDano: 0.5,
    grosorRastro: 0.5,
  },

  lanzameteoros: {
    aparicion: 20,
    meteoritos: 6,
    puntosPorHordaExtra: 60, // hordas = 1 + redondear(puntos / este valor)
    probabilidadAzul: 0.4,   // azules = teledirigidos
    dano: 5,
  },

  manzanas: {
    verde:  { vida: 10, aparicion: [3, 6],  duracion: 10 },
    dorada: { vida: 40, aparicion: [7, 14], duracion: 8 },
  },

  powerUps: {
    espacios: 2,             // cuántos se pueden guardar a la vez (el Scratch original tenía 1, tecla F)
    aparicion: [4, 6],       // cuenta desde que hay un espacio libre
    duracionEnMapa: 10,
    turbo:            { ticks: 15, velocidad: 8 },
    municionInfinita: { duracion: 10 },
    naveChica:        { duracion: 10, escala: 0.5 },
    escudo:           { crecimientoPorTick: 3, ticks: 50 },
  },

  // --------------------------------------------------------------------------
  //  Comportamientos raros del Scratch original. Estaban en el juego (por
  //  errores en los bloques) y se conservan tal cual. Poné false para corregirlos.
  // --------------------------------------------------------------------------
  original: {
    // La fórmula de aparición tenía un error de signo: meteoritos y babosas salen
    // siempre por la derecha, y las naves enemigas por la derecha o por arriba.
    aparicionSoloDerechaYArriba: true,

    // El lápiz del Scratch era uno solo, así que una babosa no podía borrar su
    // rastro sin borrar el de todas: la que moría por disparos o por tiempo
    // limpiaba la pantalla entera, y la que desintegraba el escudo no limpiaba
    // nada (su rastro quedaba suelto haciendo daño). En false cada babosa tiene
    // su propio rastro y se lo lleva al morir, sea como sea que muera.
    rastroDeBabosaCompartido: false,

    // Las balas enemigas que ya están volando también reciben la orden de disparo
    // y generan más balas desde la nave que dispara (ráfagas cada vez más grandes).
    balasEnemigasEnCascada: true,

    // Las naves enemigas que se van por tiempo nunca liberan su lugar, así que
    // con el tiempo entran menos naves de las que permiten los puntos.
    enemigosQueSeVanOcupanLugar: true,

    // Después de la primera horda, el lanzameteoros suelta cada meteorito apenas
    // lo crea en vez de esperar a tener los 6.
    lanzameteorosSueltaEnseguida: true,

    // El power-up queda "en mano" apenas aparece en el mapa, aunque no lo agarres.
    powerUpSinAgarrar: false,
  },
};
