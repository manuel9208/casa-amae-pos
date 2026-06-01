// frontend/set-cliente.js
const fs = require('fs');
const path = require('path');

const cliente = process.argv[2]; // Recibe 'casaamae' o 'coffeebook'

if (!cliente) {
  console.error('❌ Especifica un cliente. Ej: node set-cliente.js casaamae');
  process.exit(1);
}

const sourceDir = path.join(__dirname, 'public', 'clientes', cliente);
const destDir = path.join(__dirname, 'public');

if (!fs.existsSync(sourceDir)) {
  console.error(`❌ La carpeta del cliente no existe: ${sourceDir}`);
  process.exit(1);
}

// Archivos básicos a inyectar en la raíz
const filesToCopy = ['index.html', 'favicon.ico', 'manifest.json', 'logo192.png', 'logo512.png'];

filesToCopy.forEach(file => {
  const srcFile = path.join(sourceDir, file);
  const destFile = path.join(destDir, file);
  if (fs.existsSync(srcFile)) {
    fs.copyFileSync(srcFile, destFile);
    console.log(`✅ Marca blanca inyectada: ${file} (${cliente})`);
  }
});