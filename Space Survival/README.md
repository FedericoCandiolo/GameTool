# Space Survival

Remake web del juego hecho en Scratch 2 en 2018. Conserva los dibujos, los sonidos y la
jugabilidad del original, con una interfaz nueva de estilo arcade (barra de vida, power-ups
con su tecla, carga del láser, pantalla de título con instrucciones y récord).
Corre en cualquier navegador, sin instalar nada.

## Jugar

Abrí `index.html` con doble clic. No hace falta servidor.

| Tecla | Acción |
|---|---|
| W | acelerar (además gira más rápido) |
| A / D | girar |
| S | frenar |
| Espacio | disparo frontal (gasta munición) |
| Clic | láser trasero (se recarga en 10 s) |
| F / G | usar el power-up guardado en el espacio 1 / 2 |
| P o Esc | pausa (en pausa, Esc vuelve al menú) |
| M | silenciar |
| Enter | empezar / jugar de nuevo |
| ← → | cambiar de pestaña en las instrucciones |

En celulares y tablets aparecen solos los controles en pantalla (apaisado). El acelerador
—**Turbo / Normal / Freno**— queda fijo: tocás uno y la nave sigue así, de modo que podés
girar y disparar al mismo tiempo. Frenado la nave no avanza pero igual gira. Los botones
de girar, fuego y láser se mantienen apretados, y los power-ups se usan tocando su cuadro
del HUD. Para probarlos desde la compu, abrí la página con `?tactil=1`.

## Cambiar parámetros

Todo lo que se puede ajustar sin programar está en [`config.js`](config.js): vidas,
velocidades, daños, tiempos de aparición, teclas, cantidad de espacios de power-up, etc.
Cada valor tiene un comentario. Guardá y recargá la página (F5).

La sección `original` de ese archivo agrupa los comportamientos raros que tenía el Scratch
por errores en los bloques (por ejemplo, que los meteoritos sólo aparezcan por la derecha).
Cada uno dice en su comentario qué pasa con `true` y con `false`: casi todos vienen en `true`,
para que el juego sea igual al original, salvo los que molestaban más que lo que aportaban.

## Estructura

```
index.html                  la página: carga los scripts en orden
estilos.css                 estilos de la interfaz (colores en :root)
config.js                   parámetros editables
js/
  motor.js                  mini intérprete al estilo Scratch: sprites, clones, guiones, colisiones, dibujo
  sprites.js                EL JUEGO: cada sprite del Scratch con sus guiones
  interfaz.js               HUD y pantallas (título, pausa, fin) en HTML encima del canvas
  tactil.js                 controles en pantalla para teléfonos y tablets
  main.js                   arranque: carga imágenes, teclado/mouse, bucle de 30 ticks/s
  assets-embebidos.js       GENERADO: todas las imágenes y sonidos en un solo archivo
assets/
  img/...                   dibujos originales, ordenados por carpeta
  sonidos/...               sonidos originales
herramientas/
  empaquetar-assets.js      regenera js/assets-embebidos.js
docs/
  ARQUITECTURA.md           cómo funciona el motor y cómo está organizado el juego
  AGREGAR-FUNCIONALIDADES.md  recetas paso a paso con ejemplos
RAW Scratch/                el proyecto original (no lo usa el juego)
```

## Documentación

- [docs/ARQUITECTURA.md](docs/ARQUITECTURA.md): cómo está armado. Empezá por acá.
- [docs/AGREGAR-FUNCIONALIDADES.md](docs/AGREGAR-FUNCIONALIDADES.md): cómo sumar enemigos,
  power-ups, imágenes, sonidos y teclas, con código de ejemplo.

El récord se guarda en el navegador (no en un archivo), así que cada navegador tiene el suyo.
Las tipografías se bajan de Google Fonts; sin internet se usan las del sistema y el juego anda igual.

## Si cambiás imágenes o sonidos

El navegador no deja leer los píxeles de imágenes abiertas desde el disco (`file://`), y el
juego los necesita para las colisiones. Por eso las imágenes van embebidas en
`js/assets-embebidos.js`. Después de agregar o modificar algo en `assets/`, corré:

```bash
node herramientas/empaquetar-assets.js
```

(Requiere [Node.js](https://nodejs.org).)
