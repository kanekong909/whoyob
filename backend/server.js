require('dotenv').config();
const express  = require('express');
const cors     = require('cors');
const path     = require('path');

const authRoutes       = require('./routes/auth');
const workspaceRoutes  = require('./routes/workspaces');
const cardRoutes       = require('./routes/cards');

const app  = express();
const PORT = process.env.PORT || 3000;

// ── Middlewares ───────────────────────────────────────────────────────────────

app.use(cors({
  origin: [
    process.env.FRONTEND_URL,
    'http://localhost:5500',
    'http://127.0.0.1:5500',
    /\.github\.io$/   // cualquier dominio github pages
  ],
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Servir fotos subidas como archivos estáticos
app.use('/uploads', express.static(path.join(__dirname, process.env.UPLOADS_DIR || 'uploads')));

// ── Rutas ─────────────────────────────────────────────────────────────────────

app.use('/auth',       authRoutes);
app.use('/workspaces', workspaceRoutes);
app.use('/cards',      cardRoutes);

// Health check para Railway
app.get('/health', (req, res) => res.json({ status: 'ok', ts: new Date() }));

// ── Manejo de errores ─────────────────────────────────────────────────────────

app.use((err, req, res, next) => {
  console.error(err.stack);
  const status = err.status || 500;
  res.status(status).json({ error: err.message || 'Error interno del servidor' });
});

app.listen(PORT, () => {
  console.log(`🚀 WorkNotes backend corriendo en puerto ${PORT}`);
});
