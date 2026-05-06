const express = require('express');
const fs = require('fs');
const path = require('path');
const cron = require('node-cron');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'pedidos.json');

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ─── Helpers de datos ────────────────────────────────────────────────────────

function leerDatos() {
  try {
    if (!fs.existsSync(DATA_FILE)) return crearArchivoVacio();
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  } catch (e) {
    return crearArchivoVacio();
  }
}

function crearArchivoVacio() {
  const data = {
    fecha: new Date().toISOString().split('T')[0],
    pedidos: []
  };
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
  return data;
}

function guardarDatos(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

function resetearPedidos() {
  const data = {
    fecha: new Date().toISOString().split('T')[0],
    pedidos: []
  };
  guardarDatos(data);
  console.log(`[${new Date().toISOString()}] Pedidos reseteados automáticamente (4 AM).`);
}

// ─── Reset automático a las 4 AM ─────────────────────────────────────────────

cron.schedule('0 4 * * *', resetearPedidos, {
  timezone: 'America/Santiago'
});

// ─── API ──────────────────────────────────────────────────────────────────────

// GET /api/pedidos — obtener todos los pedidos del día
app.get('/api/pedidos', (req, res) => {
  const data = leerDatos();
  res.json(data);
});

// POST /api/pedidos — agregar un nuevo pedido
app.post('/api/pedidos', (req, res) => {
  const { nombre, items } = req.body;

  if (!nombre || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Datos incompletos.' });
  }

  const data = leerDatos();

  const nuevoPedido = {
    id: Date.now().toString(),
    nombre: nombre.trim(),
    timestamp: new Date().toISOString(),
    items: items.map(i => ({
      nombre: i.nombre,
      unidad: i.unidad,
      cantidad: parseFloat(i.cantidad) || 0
    }))
  };

  data.pedidos.push(nuevoPedido);
  guardarDatos(data);

  console.log(`[${new Date().toISOString()}] Pedido de "${nombre}" guardado (${items.length} ítems).`);
  res.json({ success: true, pedido: nuevoPedido });
});

// DELETE /api/pedidos — reset manual (protegido por clave)
app.delete('/api/pedidos', (req, res) => {
  const { clave } = req.body;
  if (clave !== process.env.RESET_KEY && clave !== 'normandie2024') {
    return res.status(403).json({ error: 'No autorizado.' });
  }
  resetearPedidos();
  res.json({ success: true, mensaje: 'Pedidos reseteados.' });
});

// ─── Inicio ───────────────────────────────────────────────────────────────────

leerDatos(); // Inicializa el archivo si no existe
app.listen(PORT, () => {
  console.log(`Servidor Normandie corriendo en http://localhost:${PORT}`);
});
