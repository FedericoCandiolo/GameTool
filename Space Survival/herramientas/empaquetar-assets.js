// Empaqueta todo lo que hay en /assets dentro de js/assets-embebidos.js.
//
// ¿Por qué? Los navegadores no dejan leer los píxeles de imágenes cargadas desde
// archivos locales (file://), y el juego los necesita para las colisiones
// píxel a píxel (igual que Scratch). Embebiendo las imágenes como data URI el
// juego funciona abriendo index.html con doble clic, sin servidor.
//
// Uso (después de modificar o agregar una imagen o sonido en /assets):
//   node herramientas/empaquetar-assets.js

const fs = require('fs');
const path = require('path');

const raiz = path.join(__dirname, '..');
const carpetaAssets = path.join(raiz, 'assets');
const salida = path.join(raiz, 'js', 'assets-embebidos.js');

const tipos = { '.png': 'image/png', '.svg': 'image/svg+xml', '.wav': 'audio/wav', '.jpg': 'image/jpeg' };

function recorrer(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const ruta = path.join(dir, e.name);
    return e.isDirectory() ? recorrer(ruta) : [ruta];
  });
}

const entradas = recorrer(carpetaAssets)
  .filter((f) => tipos[path.extname(f).toLowerCase()])
  .sort()
  .map((f) => {
    const clave = path.relative(carpetaAssets, f).split(path.sep).join('/');
    const datos = fs.readFileSync(f).toString('base64');
    return `  ${JSON.stringify(clave)}: "data:${tipos[path.extname(f).toLowerCase()]};base64,${datos}"`;
  });

fs.writeFileSync(
  salida,
  '// GENERADO AUTOMÁTICAMENTE por herramientas/empaquetar-assets.js. No editar a mano.\n' +
    'window.ASSETS = {\n' + entradas.join(',\n') + '\n};\n'
);
console.log(`${entradas.length} archivos empaquetados en ${path.relative(raiz, salida)}`);
