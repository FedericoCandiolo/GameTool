# Cómo agregar funcionalidades

Recetas paso a paso. Antes de empezar conviene leer [ARQUITECTURA.md](ARQUITECTURA.md), por lo
menos las secciones 2 (guiones) y 3 (sprites y ganchos).

Para probar cualquier cambio: guardá y recargá `index.html` (F5). Si algo falla, abrí la consola
del navegador (F12) y buscá el error en rojo.

---

## 1. Cambiar un número del juego

Si el valor ya está en `config.js`, cambialo ahí y listo.

Si el número está escrito directamente en `sprites.js` y querés poder ajustarlo:

1. Agregalo en `config.js`, en la sección que corresponda:
   ```js
   meteorito: {
     ...
     desvioInicial: 30,   // nuevo
   },
   ```
2. Usalo en `sprites.js` a través de `C` (que es `window.CONFIG`):
   ```js
   s.girar(azarEntero(-C.meteorito.desvioInicial, C.meteorito.desvioInicial));
   ```

## 2. Agregar una imagen o un sonido

1. Copiá el archivo a `assets/img/<carpeta>/` o `assets/sonidos/`.
2. Regenerá el paquete:
   ```bash
   node herramientas/empaquetar-assets.js
   ```
3. **Imagen**: agregala como disfraz del sprite que la usa:
   ```js
   d('nombreDelDisfraz', 'carpeta/archivo.png', 2, centroX, centroY)
   ```
   - Usá resolución `2` si dibujaste al doble del tamaño en que se va a ver (como los originales)
     o `1` si está a tamaño real. Los SVG van con `1`.
   - El centro de rotación va en píxeles de la imagen. Para el medio: la mitad del ancho y
     del alto.
4. **Sonido**: registralo en `main.js`, en el objeto que se pasa a `new Sonidos(...)`:
   ```js
   { laser: window.ASSETS['sonidos/laser.wav'],
     pop: window.ASSETS['sonidos/pop.wav'],
     explosion: window.ASSETS['sonidos/explosion.wav'] }   // nuevo
   ```
   y reproducilo desde un guion con `M.sonidos.reproducir('explosion')`.

Formatos aceptados: `.png`, `.jpg`, `.svg` y `.wav`.

## 3. Agregar un enemigo nuevo

Ejemplo: una **mina** que aparece en un lugar al azar, gira, explota si la tocás (y te saca
vida) y se puede destruir a disparos.

**Paso 1. Parámetros** en `config.js`:

```js
mina: {
  aparicion: [6, 10],   // cada cuántos segundos aparece una
  vida: 30,
  dano: 15,
  duracion: 12,         // después desaparece sola
},
```

**Paso 2. El dibujo.** Poné `assets/img/mina/mina.png` y corré el empaquetador (receta 2).
Para probar antes de dibujarla, usá una imagen existente, por ejemplo `'iman/apagado.png'`
con centro `122, 122`.

**Paso 3. El sprite** en `sprites.js`, por ejemplo después de la sección del imán:

```js
const MINA = {
  nombre: 'mina',
  escala: 0.3,
  variables: { vida: 0 },
  disfraces: [
    d('mina', 'mina/mina.png', 2, 60, 60),
    d('explosion', 'explosiones/explosion_enemigo.png', 2, 254, 250),
  ],
  alIniciar: [function* (s) { s.esconder(); }],
  alRecibir: {
    // el original (escondido) crea un clon cada tanto
    'Inicio del Juego': [(s) => aparecerCadaTanto(s, C.mina.aparicion)],
  },
  alClonar: [
    // 1) aparece, gira y explota. Va PRIMERO porque es el que le pone la vida al clon.
    function* (s) {
      s.vars.vida = C.mina.vida;
      s.cambiarDisfraz('mina');
      s.irA(azarEntero(-200, 200), azarEntero(-150, 150));
      s.mostrar();
      for (;;) {
        const tocoNave = s.tocando('nave');
        if (tocoNave || !(s.vars.vida > 0)) {
          if (tocoNave) M.G.vida -= C.mina.dano;
          s.cambiarDisfraz('explosion');
          yield* esperar(0.5);
          s.borrarClon();             // corta el guion acá
        }
        s.girar(2);
        yield;                        // ¡fin de la vuelta!
      }
    },
    // 2) las balas y el láser le sacan vida (ya existe, lo usan la nave enemiga y el imán)
    recibeDisparos,
    // 3) se va sola después de un rato
    function* (s) {
      yield* esperar(C.mina.duracion);
      s.borrarClon();
    },
    // 4) opcional: que la onda del Escudo la destruya
    explotaConEscudo,
  ],
};
```

**Paso 4. Sumarla a la lista** `SPRITES` (al final de `sprites.js`). La posición define la capa:
lo que está antes se dibuja abajo. Para que quede debajo de la nave:

```js
const SPRITES = [
  METEORITO, RAYO1, RAYO2, RAYOLUZ, PUNTO, METEORITITO, APPLE, ENEMIGO, METEORITITO2, MAGNETO,
  MINA,
  NAVE, ENMET, ...
];
```

**Paso 5. Que aparezca en las instrucciones.** En `js/interfaz.js`, sumá una ficha a
`FICHAS_ENEMIGOS`:

```js
{ nombre: 'Mina', imagen: 'mina/mina.png', texto: () => `−${C.mina.dano} de vida si la tocás` },
```

Listo. Ideas para seguir:

- Que los meteoritos exploten al chocarla: agregá `|| s.tocando('mina')` en
  `tocaDisparoNaveOEnemigo`.
- Que sólo aparezca en la fase 2: en `alRecibir` usá un bucle como el de la babosa, que revisa
  `M.G.fase === 2` antes de esperar y clonar.
- Que el daño sea continuo con pausa entre golpes (como los meteoritos): en vez de restar vida
  desde la mina, agregá en `NAVE.alRecibir['Inicio del Juego']`:
  ```js
  danoAlTocar((s) => s.tocando('mina'), C.mina.dano, 1),
  ```

## 4. Agregar un power-up nuevo

Ejemplo: **Reparación**, que suma 50 de vida al usarlo.

Los power-ups pasan por cinco lugares:

1. **Parámetros** en `config.js`, dentro de `powerUps`:
   ```js
   reparacion: { vida: 50, probabilidad: 0.2 },
   ```
2. **Dibujo**: agregá el disfraz a `POWERUPS` en `sprites.js`. **El nombre del disfraz tiene que
   ser igual al tipo de power-up**, porque el clon hace `s.cambiarDisfraz(tipo)`:
   ```js
   d('Reparacion', 'powerups/reparacion.png', 2, 300, 300),
   ```
3. **Cuándo aparece**: en el primer guion de `POWERUPS.alClonar` se elige el tipo. El original
   decide con un número al azar y si los puntos son pares. Para sumar el nuevo:
   ```js
   const par = esPar(M.G.puntos);
   let tipo = Math.random() < 0.6 ? (par ? 'Turbo' : 'Nave Chica') : (par ? 'Escudo' : 'Municion Infinita');
   if (Math.random() < C.powerUps.reparacion.probabilidad) tipo = 'Reparacion';
   ```
4. **Qué hace**: en `usarPowerUp()` (sección de la nave), agregá una rama:
   ```js
   } else if (p.tipo === 'Reparacion') {
     M.G.vida += C.powerUps.reparacion.vida;
   }
   ```
5. **Interfaz**: en `js/interfaz.js`, sumalo a `TIPOS_POWERUP`. Con eso aparece con su ícono
   en los espacios del HUD y en la pestaña Power-ups de las instrucciones:
   ```js
   Reparacion: {
     nombre: 'Reparación',
     imagen: 'powerups/reparacion.png',
     descripcion: () => `+${C.powerUps.reparacion.vida} de vida`,
   },
   ```
   Si además querés que se vea su barra de tiempo restante mientras está activo, agregá su
   duración en el objeto que se le pasa a `marcarEfecto` dentro de `usarPowerUp()`. Para uno
   instantáneo como este no hace falta.

### Power-ups que duran un tiempo

Mirá cómo están hechos Munición Infinita y Nave Chica: arrancan un hilo en la nave con una
**clave**. Si lo usás de nuevo mientras está activo, el hilo vuelve a empezar y la duración se
renueva:

```js
M.iniciarHilo(n, function* () {
  M.G.invencible = true;
  yield* esperar(5);
  M.G.invencible = false;
}, 'invencible');
```

Si agregás una variable global nueva (como `invencible`), ponela también en
`globalesIniciales()` para que vuelva a su valor al empezar otra partida.

Los hilos que corren en la nave se cortan solos cuando la nave explota, porque "Fin del juego"
detiene todos los guiones de la nave.

## 5. Agregar una tecla

1. Ponele un nombre en `CONFIG.teclas`:
   ```js
   hiperespacio: 'h',
   ```
2. Hay dos formas de usarla:
   - **Mientras está apretada** (como acelerar o disparar): dentro de un bucle, preguntá
     `tecla('hiperespacio')`.
   - **Una vez por cada vez que se aprieta** (como los power-ups): agregala a
     `alPresionarTecla` del sprite. En la nave esa lista ya tiene las teclas de power-up, así
     que se suma así:
     ```js
     alPresionarTecla: {
       ...Object.fromEntries(
         C.teclas.powerUps.slice(0, C.powerUps.espacios).map((t, i) => [Motor.normalizarTecla(t), () => usarPowerUp(i)])
       ),
       [Motor.normalizarTecla(C.teclas.hiperespacio)]: function* (s) {
         if (!s.visible) return;   // durante las instrucciones la nave está escondida
         s.irA(azarEntero(-200, 200), azarEntero(-150, 150));
         M.G.vida -= 10;
       },
     },
     ```
3. Sumala a la lista de controles de la pantalla de título: en `js/interfaz.js`, dentro de
   `_construir()`, en la `<ul>` de la sección Controles:
   ```js
   <li>${tecla$(T.hiperespacio)} hiperespacio</li>
   ```
   Las demás teclas ya se leen de `CONFIG.teclas`, así que si sólo cambiás una tecla en
   `config.js` la pantalla se actualiza sola.

Ojo: `P`, `M`, `Esc`, `Enter` y las flechas en los menús las usa la interfaz, y el juego no las
ve (ver `manejarTecla` en `interfaz.js`).

Nombres de tecla: una letra en minúscula (`'h'`), `' '` para espacio, o el nombre que da el
navegador para las especiales: `'Enter'`, `'Shift'`, `'ArrowUp'`, `'ArrowLeft'`...

## 6. Agregar un mensaje

No hay que registrarlo en ningún lado:

```js
M.enviar('Jefe aparece');                          // desde cualquier guion

alRecibir: {
  'Jefe aparece': [function* (s) { ... }],         // en cada sprite que lo escuche
},
```

Acordate de que **los clones también reciben mensajes**. Si sólo querés que reaccione el
original, empezá el guion con `if (s.esClon) return;`.

## 7. Mostrar algo nuevo en el HUD

Ejemplo: un indicador de cuántas naves enemigas hay en juego.

1. En `js/interfaz.js`, dentro de `_construir()`, agregá el HTML adentro de `<div id="hud">`.
   Podés reutilizar las clases de los paneles que ya existen:
   ```html
   <div class="hud-panel hud-enemigos">
     <span class="hud-etiqueta">Enemigos</span>
     <span id="hud-enemigos" class="hud-num chico"></span>
   </div>
   ```
2. Guardá el elemento en `this.el` (al final de `_construir()`):
   ```js
   enemigos: $('hud-enemigos'),
   ```
3. Actualizalo en `actualizar()`, después de la línea `if (estado !== 'juego') return;`:
   ```js
   el.enemigos.textContent = G.cantEn;
   ```
4. Ubicalo en `estilos.css`:
   ```css
   .hud-enemigos { top: 8cqw; right: 1.2cqw; }
   ```

Las medidas en `cqw` son porcentajes del ancho del juego (100cqw = todo el ancho).
Si el dato que querés mostrar no está en `M.G`, guardalo ahí desde `sprites.js` y agregalo
también en `globalesIniciales()`.

## 8. Cambiar colores o la tipografía

Los colores están como variables al principio de `estilos.css` (`--cian`, `--oro`,
`--peligro`...). Cambiando esos valores cambia toda la interfaz. Las tipografías son
`--titulos` (Orbitron) y `--cuerpo` (Rajdhani), que se cargan desde Google Fonts en
`index.html`.

---

## Errores comunes

- **Se cuelga el navegador**: casi seguro hay un `for (;;)` o un `while` sin `yield` al final de
  la vuelta.
- **Una espera no espera**: falta el asterisco. Es `yield* esperar(1)`, no `esperar(1)` ni
  `yield esperar(1)`.
- **El código después de `borrarClon()` no corre**: es lo esperado, corta el guion.
- **Un clon muere al nacer o no tiene vida**: revisá el orden de los guiones en `alClonar`; el
  que fija las variables tiene que ir primero.
- **`tocando` siempre da falso**: alguno de los dos sprites está escondido, o el nombre no
  coincide con el `nombre` del sprite (distingue mayúsculas: `'Escudo'`, `'Apple'`).
- **Cambié una imagen y se ve la vieja**: faltó correr `node herramientas/empaquetar-assets.js`.
- **Se acumulan clones y deja de aparecer todo**: algo crea clones que nunca se borran. Hay un
  límite de 300 en total, compartido por todos los sprites.

## Depurar desde la consola

Con el juego abierto, apretá F12 y en la pestaña Consola podés escribir:

```js
M.G                               // todas las variables globales
M.G.vida = 99999                  // para probar tranquilo
M.G.puntos = 200                  // para que aparezcan muchos enemigos y hordas
M.instancias('punto').length      // cuántas balas enemigas hay (incluye el original escondido)
M.cantidadClones                  // clones vivos en total
M.clonarA('magneto')              // hacer aparecer un imán ya
M.enviar('Fin del juego')         // terminar la partida
interfaz.pausado = true           // pausar desde la consola
```

Con el juego en pausa (P), `M.paso()` avanza un solo tick, y `M.dibujar()` e
`interfaz.actualizar()` refrescan la pantalla. Sirve para mirar una colisión cuadro por cuadro.
