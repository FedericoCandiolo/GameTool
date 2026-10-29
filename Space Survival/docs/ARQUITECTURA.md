# Cómo está armado el juego

## La idea en una frase

En vez de reescribir el juego con otra lógica, se armó un **mini Scratch en JavaScript**
(`js/motor.js`) y cada sprite del proyecto original se pasó a código casi bloque por bloque
(`js/sprites.js`). Así el juego se comporta igual: mismas velocidades, mismas pausas, mismas
colisiones y hasta los mismos errores (que se pueden apagar en `config.js`).

Si sabés cómo funcionaba el proyecto en Scratch, ya sabés cómo funciona este código.

## Los archivos de código

| Archivo | Qué tiene | ¿Lo vas a tocar? |
|---|---|---|
| `js/sprites.js` | El juego: todos los sprites y sus guiones | Sí, casi siempre acá |
| `js/interfaz.js` | HUD y pantallas (título, pausa, fin) | Para mostrar algo nuevo en pantalla |
| `js/tactil.js` | Controles en pantalla para teléfonos | Para sumar o mover un botón táctil |
| `estilos.css` | Cómo se ve la interfaz | Para cambiar colores o tamaños |
| `js/motor.js` | El "Scratch": sprites, clones, mensajes, colisiones, lápiz, dibujo | Rara vez |
| `js/main.js` | Arranque: carga imágenes, teclado, mouse, bucle | Para sonidos nuevos |

`index.html` los carga en este orden: `config.js` → `assets-embebidos.js` → `motor.js` →
`sprites.js` → `interfaz.js` → `tactil.js` → `main.js`. Son scripts comunes (no módulos), así que lo que declara uno
(por ejemplo `CONFIG`, `Motor`, `esperar`) lo puede usar el siguiente.

---

## 1. El tiempo: ticks

El juego avanza en **ticks** de 1/30 de segundo, igual que Scratch, que dibuja 30 veces
por segundo. En `main.js`, el bucle llama a `M.paso()` 30 veces por segundo, después
dibuja el canvas (`M.dibujar()`) y actualiza el HUD (`interfaz.actualizar()`). Aunque el monitor sea de 60 Hz o de 144 Hz, la lógica siempre corre a 30.

Por eso en `config.js` las velocidades están en "píxeles por tick": la nave acelerando
avanza 8 px por tick, o sea 240 px por segundo.

## 2. Los guiones son funciones generadoras

En Scratch, cada sprite tiene varios guiones que corren "al mismo tiempo". Acá cada guion
es una **función generadora** de JavaScript (`function*`). La palabra clave `yield`
significa "terminé por este tick, seguí desde acá en el próximo".

Este guion de Scratch:

```
al comenzar como clon
mostrar
por siempre
    girar azar entre -5 y 5 grados
    mover 6 pasos
```

queda así:

```js
function* (s) {          // s es el sprite (o clon) que corre el guion
  s.mostrar();
  for (;;) {             // "por siempre"
    s.girar(azarEntero(-5, 5));
    s.avanzar(6);
    yield;               // fin de la vuelta: espera al próximo tick
  }
}
```

**Regla de oro: todo bucle termina con `yield`.** Scratch también cede el control al
final de cada vuelta de "por siempre" y de "repetir". Si te olvidás el `yield`, el bucle
corre infinitamente dentro del mismo tick y el navegador se cuelga.

Las pausas se escriben con `yield*` (con asterisco), porque delegan en otra generadora:

```js
yield* esperar(0.5);                          // "esperar 0.5 segundos"
yield* esperarHasta(() => s.tocando('nave')); // "esperar hasta que ¿tocando nave?"
yield* s.deslizar(1, x, y);                   // "deslizar en 1 segs a x: y:"
```

### Cómo los corre el motor

Cada guion en marcha es un **hilo** (`{ sprite, gen, clave, terminado }`) en la lista
`M.hilos`. En cada tick, `Motor.paso()` recorre la lista y avanza cada hilo hasta su
próximo `yield`. Un hilo termina cuando la función llega al final, cuando su sprite se
borra o cuando alguien lo detiene.

Los hilos nuevos (por ejemplo, los de un clon recién creado) se agregan al final de la
lista y arrancan en el mismo tick.

## 3. Sprites, clones y ganchos

Cada sprite se define en `sprites.js` como un objeto:

```js
const MANZANA = {
  nombre: 'Apple',                 // nombre con el que otros lo buscan: s.tocando('Apple')
  escala: 0.3,                     // tamaño inicial (0.3 = 30 %)
  x: 53, y: 24, direccion: 90,     // estado inicial (opcional)
  rotacion: 'ninguna',             // 'normal' (por defecto) o 'ninguna' (no rota el dibujo)
  variables: { vida: 0 },          // variables "sólo para este objeto" (cada clon tiene su copia)
  disfrazInicial: 'apple',
  disfraces: [d('apple', 'varios/manzana.svg', 1, 31, 31)],

  // los ganchos equivalen a los bloques sombrero de Scratch:
  alIniciar: [ ... ],              // "al hacer clic en la bandera verde"
  alRecibir: { 'Inicio del Juego': [ ... ] },  // "al recibir ..."
  alClonar: [ ... ],               // "al comenzar como clon"
  alPresionarTecla: { f: ... },    // "al presionar tecla ..."
  alHacerClic: ...,                // "al hacer clic en este objeto"
};
```

Cada gancho es una lista de guiones, y **el orden importa**: se arrancan en ese orden y
dentro de cada tick también corren en ese orden. Por ejemplo, en la babosa el primer guion
de `alClonar` le pone la vida y el segundo revisa si murió. Si estuvieran al revés, el
segundo vería la vida heredada (0) y la babosa moriría al nacer.

### Disfraces

`d(nombre, ruta, resolución, centroX, centroY)`:

- `ruta`: relativa a `assets/img/`.
- `resolución`: 2 para los PNG originales (están dibujados al doble de tamaño), 1 para los SVG.
- `centroX`, `centroY`: el centro de rotación en píxeles de la imagen, igual que en el
  editor de disfraces de Scratch. Puede estar fuera de la imagen: así las balas salen de las
  alas y el cañón del láser aparece detrás de la nave.

### Clones

`s.clonar()` crea un clon que copia posición, dirección, tamaño, disfraz, efectos y variables
locales, y arranca sus guiones de `alClonar`. Queda en la capa justo debajo del original.
`M.clonarA('Escudo')` clona otro sprite (como "crear clon de Escudo").

`s.borrarClon()` borra el clon y **corta el guion en ese mismo punto** (por dentro lanza una
excepción que el motor atrapa). Lo que esté después nunca se ejecuta. En el original, que no es
un clon, no hace nada, igual que en Scratch.

Hay un máximo de 300 clones a la vez (`CONFIG.juego.limiteDeClones`); si se llega, `clonar()`
no hace nada.

### Mensajes

`M.enviar('Laser')` es "enviar Laser". Lo reciben **todos** los sprites y **todos los clones**
que tengan `alRecibir.Laser`. Si ese guion ya estaba corriendo en ese sprite, vuelve a empezar
desde cero, como en Scratch.

Que los clones también reciban mensajes es lo que produce la "cascada" de balas enemigas
(ver `rafagaEnemiga` en `sprites.js` y `original.balasEnemigasEnCascada` en `config.js`).

Mensajes del juego:

| Mensaje | Quién lo envía | Para qué |
|---|---|---|
| `Inicio del Juego` | escenario, cuando la pantalla de título pide empezar | arranca todo |
| `Fin del juego` | nave, cuando la vida llega a 0 | explosión final |
| `Laser` | `rayo` (el cañón), al hacer clic con el láser listo | dispara el láser trasero |
| `disp_enem` | nave enemiga grande | ráfaga de 5 balas |
| `disp_enemch` | nave enemiga chica | ráfaga de 2 balas |

### Variables globales

Las variables "para todos los objetos" están en `M.G`. Se crean en `globalesIniciales()`
(al principio de `sprites.js`) cada vez que empieza una partida.

| Variable | Qué es |
|---|---|
| `vida`, `puntos`, `municion` | lo que muestra el HUD |
| `fase` | 1 o 2; cambia cada 40 s. En la 2 aparecen imanes y babosas |
| `mi` | munición infinita activa |
| `nc` | escala de la nave (1, o 0.5 con Nave Chica) |
| `cantEn` | naves enemigas en juego |
| `xEnem`, `yEnem`, `dEnem` | desde dónde y hacia dónde dispara la última nave enemiga |
| `magnetoVive`, `xMag`, `yMag` | si hay un imán activo y dónde está (la nave es atraída) |
| `disparoMet`, `xMet`, `yMet`, `dMet`, `numClon` | coordinación del lanzameteoros con sus meteoritos |
| `powerUps` | los espacios de power-up: `[ {tipo, visible} o null, ... ]` |
| `powerUpsEnMapa` | power-ups que están en el mapa esperando que los agarres |
| `pantalla`, `inicioPedido` | `'titulo'` o `'juego'`; la interfaz pone `inicioPedido` en `true` para arrancar |
| `laserListo`, `laserDesde`, `laserCarga` | estado del láser, para la barra de carga del HUD |
| `efectos` | power-ups activos y cuándo terminan, para el HUD |

Las últimas tres filas existen sólo para la interfaz: el juego las escribe, pero ninguna regla
del juego las lee.

Igual que en Scratch, los sprites se comunican mucho a través de estas variables: la nave
enemiga escribe `xEnem`/`yEnem` y después envía `disp_enem`; las balas leen esas variables
al nacer.

## 4. Colisiones

`s.tocando('meteorito')` es "¿tocando meteorito?". Revisa el sprite original y todos sus
clones. Como Scratch, la colisión es **píxel a píxel**: se tienen en cuenta las llamas de los
meteoritos y el resplandor del láser, no un círculo aproximado.

Cómo funciona (`colisionan()` en `motor.js`):

1. Al cargar, cada imagen se analiza una vez: una máscara de qué píxeles son visibles y la
   envolvente convexa del dibujo.
2. Primero se comparan las cajas de los dos sprites. Si no se superponen, terminó: es la
   mayoría de los casos y es muy rápido.
3. Si se superponen, se toman puntos de muestra del dibujo más chico (aproximadamente uno por
   píxel de pantalla) y se busca cada uno en la máscara del otro.

Detalles heredados de Scratch:

- Un sprite escondido no toca nada ni es tocado (pero `tocandoBorde()` funciona igual).
- `s.tocandoBorde()` es verdadero si alguna parte visible del dibujo sale del escenario.
- Los sprites no pueden salir del todo del escenario: siempre quedan unos 18 px adentro
  (`_mantenerEnEscenario`). Por eso un meteorito que "aparece" en x = 540 en realidad
  queda pegado al borde derecho.
- `s.tocandoColorDetectable()` es "¿tocando el color del rastro?". Detecta el dibujo del lápiz
  (el rastro de la babosa) y los píxeles de ese mismo color en otros sprites (el borde oscuro de
  la babosa). Por eso tocar la babosa también lastima.

## 5. Lápiz y sonido

- **Lápiz** (`M.lapiz`): lo usa la babosa para dejar su rastro. Se dibuja en una capa debajo de
  los sprites, y además se guarda una grilla de 480×360 para detectar colisiones con el rastro.
  - `M.lapiz.borrar()` borra todo, como el "borrar" del Scratch.
  - `s.borrarRastro()` borra **sólo lo que dibujó ese sprite**. En el Scratch no existía: el
    lápiz era uno solo, así que una babosa no podía irse sin llevarse el rastro de las demás.
    Para poder hacerlo, el lápiz guarda además los segmentos de cada dueño; como un canvas no
    se puede "des-dibujar", borrar uno limpia la capa y vuelve a dibujar los que quedan vivos
    (con 6 babosas y ~900 segmentos tarda ~1 ms, y sólo pasa cuando una muere).
  - El comportamiento viejo sigue disponible con `original.rastroDeBabosaCompartido`.
- **Sonido** (`M.sonidos.reproducir('laser')`): el navegador recién deja sonar audio después de
  la primera tecla, clic o toque, por eso `main.js` llama a `sonidos.desbloquear()` en esos eventos.

## 6. Dibujo

`Motor.dibujar()` pinta en el canvas, en orden: el fondo del escenario, la capa del lápiz y
los sprites visibles de la capa de abajo hacia arriba. La pantalla interna es de 960×720
(el doble del escenario de Scratch) porque los dibujos originales están a esa resolución;
el CSS la escala para que entre en la ventana.

Efectos de Scratch soportados: `fantasma` (transparencia, de 0 a 100) y `color` (giro de tono,
como el que usan las naves enemigas). La versión de cada dibujo con el color cambiado se
calcula una sola vez y se guarda.

El orden de las capas es el de la lista `SPRITES` al final de `sprites.js`, igual que en el
proyecto original (la nave por encima de los meteoritos, el escudo por encima de la nave, etc.).

## 7. La interfaz

Todo lo que no es el juego en sí (HUD, título, pausa, fin) es HTML y CSS encima del canvas,
armado por la clase `Interfaz` en `js/interfaz.js`. Se eligió HTML porque los textos, las
tipografías y los brillos quedan más nítidos y son más fáciles de cambiar que dibujados en
el canvas.

La regla es que **la interfaz sólo lee el estado del juego** (`M.G`, `M.tick`, `M.detenido`).
Lo único que escribe es `M.G.inicioPedido = true` para arrancar, y el único control propio que
tiene es la pausa (`interfaz.pausado`, que hace que `main.js` deje de llamar a `M.paso()`).
Así se puede rediseñar sin tocar la jugabilidad.

Qué pantalla se ve sale de `interfaz.estado()`:

| Estado | Cuándo | Qué se ve |
|---|---|---|
| `'titulo'` | `M.G.pantalla === 'titulo'` | logo, pestañas Controles / Enemigos / Power-ups, botón Jugar |
| `'juego'` | después de `Inicio del Juego` | el HUD (y la pausa, si `interfaz.pausado`) |
| `'fin'` | `M.detenido` (después de la explosión) | puntos, récord, Jugar de nuevo / Menú |

Partes del archivo:

- `TIPOS_POWERUP`, `FICHAS_ENEMIGOS`, `FICHAS_VIDA`: nombre, dibujo y descripción de cada cosa.
  Los textos son funciones que leen `config.js`, así que si cambiás un daño, la pantalla de
  instrucciones lo muestra solo.
- `_construir()`: arma todo el HTML una vez al cargar. Las teclas que se muestran salen de
  `CONFIG.teclas`.
- `manejarTecla(k)`: `main.js` le pasa cada tecla primero. Si es de la interfaz (menús, pausa,
  sonido) devuelve `true` y el juego no la ve.
- `actualizar()`: se llama después de cada tick. Muestra u oculta las pantallas y pone al día
  los números y las barras del HUD. Sólo toca el HTML cuando un valor cambió.
- Detalles: destello rojo o verde cuando la vida baja o sube, viñeta roja con menos del 25 % de
  vida, y récord guardado en `localStorage`.

Los colores y tamaños están en `estilos.css`. Las medidas usan `cqw` (1 % del ancho del juego),
así la interfaz se agranda y se achica junto con el canvas.

## 8. El recorrido de una partida

```
main.js: M.banderaVerde()
  │  reinicia todo y corre los guiones "alIniciar" de cada sprite
  ▼
Pantalla de título (interfaz.js). ENTER o clic en Jugar → M.G.inicioPedido = true
  │
  ▼  el escenario lo ve y hace M.enviar('Inicio del Juego')
  ├─ nave: movimiento, animación, daños, puntos (+1 por segundo)
  ├─ rayo1 / rayo2: siguen a la nave, disparan con ESPACIO; rayo1 maneja la munición
  ├─ rayo: el cañón; con clic envía 'Laser' → rayoluz crea la bola de energía
  ├─ meteorito, meteoritito, meteoritito2, Apple, Apple2: aparecen cada tanto
  ├─ enemigo: aparece cada tanto si los puntos lo permiten; apunta y envía disp_enem/disp_enemch
  ├─ magneto: alterna la fase cada 40 s; en fase 2 aparecen imanes (y babosas)
  ├─ enmet: cada 20 s un lanzameteoros suelta hordas de metboss
  └─ PowerUps: aparecen cuando hay un espacio libre; F/G los usan
  │
  ▼  vida <= 0 → M.enviar('Fin del juego')
nave: deriva, explota, borra el lápiz → M.detenerTodo()
  │  se detienen todos los guiones y se borran los clones
  ▼
interfaz.js muestra la pantalla de fin:
  ENTER → M.banderaVerde() + inicioPedido (otra partida)    ESC → M.banderaVerde() (título)
```

## 9. Tabla de sprites

Los nombres son los del Scratch original, para que puedas compararlos.

| Nombre en el código | Qué es en el juego |
|---|---|
| `nave` | la nave del jugador |
| `rayo1`, `rayo2` | las balas de los dos cañones frontales |
| `rayo` | el cañón del láser trasero (visible cuando está cargado) |
| `rayoluz` | la bola de energía del láser |
| `meteorito` | meteorito grande |
| `meteoritito` | meteorito chico rojo |
| `meteoritito2` | meteorito chico azul, teledirigido |
| `enemigo` | naves enemigas (chica o grande) |
| `punto` | balas enemigas |
| `magneto` | imán; también controla las fases |
| `babosa` | babosa con rastro venenoso |
| `enmet` | lanzameteoros |
| `metboss` | meteoritos del lanzameteoros |
| `Apple`, `Apple2` | manzana verde (+10) y dorada (+40) |
| `PowerUps` | los power-ups que flotan en el mapa |
| `Escudo` | la onda expansiva del power-up Escudo |
| `Escenario` (`ESCENARIO`) | el fondo de estrellas; espera el pedido de inicio |

Del original se sacaron las 5 imágenes de instrucciones y el botón SALTAR: ahora las
instrucciones están en la pantalla de título.

## 10. Referencia rápida: bloque de Scratch → código

| Scratch | Código |
|---|---|
| mover 10 pasos | `s.avanzar(10)` |
| girar ↻ 15 grados / ↺ | `s.girar(15)` / `s.girar(-15)` |
| apuntar en dirección 90 | `s.fijarDireccion(90)` |
| apuntar hacia nave | `s.apuntarHacia(nave())` (o `CENTRO` para el centro) |
| ir a x: y: | `s.irA(x, y)` |
| ir a nave | `s.irHacia(nave())` |
| fijar x a / cambiar x por | `s.fijarX(x)` / `s.cambiarX(dx)` (igual con Y) |
| deslizar en 1 segs a x: y: | `yield* s.deslizar(1, x, y)` |
| rebotar si toca un borde | `s.rebotarEnBorde()` |
| posición x / y / dirección | `s.x` / `s.y` / `s.dir` |
| mostrar / esconder | `s.mostrar()` / `s.esconder()` |
| cambiar disfraz a | `s.cambiarDisfraz('nombre')` |
| siguiente disfraz | `s.siguienteDisfraz()` |
| fijar tamaño a 20 % / cambiar tamaño por | `s.fijarTamano(20)` / `s.cambiarTamano(10)` |
| fijar efecto fantasma a / cambiar efecto color por | `s.fijarEfecto('fantasma', 50)` / `s.cambiarEfecto('color', 35)` |
| enviar al frente | `s.alFrente()` |
| ¿tocando X? / ¿tocando borde? | `s.tocando('X')` / `s.tocandoBorde()` |
| ¿tecla w presionada? | `tecla('adelante')` (usa los nombres de `CONFIG.teclas`) |
| ¿mouse presionado? | `M.mouseAbajo` |
| esperar 1 segundos | `yield* esperar(1)` |
| esperar hasta que | `yield* esperarHasta(() => condición)` |
| por siempre / repetir 10 | `for (;;) { ...; yield; }` / `for (let i = 0; i < 10; i++) { ...; yield; }` |
| crear clon de mí mismo / de X | `s.clonar()` / `M.clonarA('X')` |
| eliminar este clon | `s.borrarClon()` |
| enviar mensaje | `M.enviar('mensaje')` |
| detener otros programas del objeto | `M.detenerOtrosGuiones(s)` |
| detener todos | `M.detenerTodo()` |
| número al azar entre 1 y 5 | `azarEntero(1, 5)` (o `azarSegundos([4, 6])` para tiempos) |
| variable para todos / sólo para este objeto | `M.G.vida` / `s.vars.vida` |
| bajar lápiz / subir lápiz / borrar | `s.bajarLapiz()` / `s.subirLapiz()` / `M.lapiz.borrar()` (o `s.borrarRastro()`, que no está en Scratch) |
| tocar sonido | `M.sonidos.reproducir('laser')` |


---

## Controles táctiles

`js/tactil.js` dibuja los botones que se ven en un teléfono. **No toca la lógica del
juego**: lo único que hace es escribir las mismas cosas que escribiría un teclado o un
mouse, así que `sprites.js` no se entera de si del otro lado hay un dedo.

| Botón | Qué escribe |
|---|---|
| Turbo / Normal / Freno | agrega o saca `C.teclas.adelante` / `C.teclas.freno` de `M.teclas` |
| ◀ ▶ | `M.teclas` con `C.teclas.izquierda` / `derecha` mientras está apretado |
| Fuego | `M.teclas` con `C.teclas.disparo` mientras está apretado |
| Láser | `M.mouseAbajo = true` mientras está apretado (es lo que mira `laserPedido()`) |
| Power-ups | son los mismos cuadros del HUD; llaman a `M.alPresionarTecla(...)` |

El acelerador **queda fijo** (no hay que mantenerlo apretado) porque en un teléfono los
pulgares ya están ocupados girando y disparando. Son los tres estados que da el teclado:
frenado la nave no avanza pero sigue girando, sin nada avanza a velocidad de crucero, y
con turbo avanza rápido y gira más rápido. Como el motor vacía `M.teclas` al perder el
foco y al empezar una partida, `Tactil.actualizar()` vuelve a aplicar el estado elegido
en cada tick.

Los botones usan eventos de **puntero** (no `touch`), que es lo que permite varios dedos a
la vez: girar y disparar al mismo tiempo son dos punteros independientes.

La capa cuelga del `<body>` y no de `#juego`, y se mide en `vmin` en vez de `cqw`: un
juego 4:3 en un teléfono 19,5:9 deja dos franjas negras a los costados, y ahí es justo
donde apoyan los pulgares. En una pantalla 4:3 los botones quedan sobre el juego.

Cuándo aparecen: `CONFIG.tactil.activar` es `'auto'` por defecto (pantallas sin mouse, o
al primer toque en una notebook con pantalla táctil). `true` o `false` lo fuerzan, y
`?tactil=1` en la URL sirve para probarlo desde la compu.
