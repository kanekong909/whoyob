const router = require('express').Router();
const multer = require('multer');
const path   = require('path');
const fs     = require('fs');
const db     = require('../db');
const auth   = require('./middleware');

// Configurar multer para guardar fotos en /uploads
const uploadsDir = path.join(__dirname, '..', process.env.UPLOADS_DIR || 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const ext  = path.extname(file.originalname).toLowerCase();
    const name = `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;
    cb(null, name);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 8 * 1024 * 1024 },  // 8 MB
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    cb(null, allowed.includes(file.mimetype));
  }
});

router.use(auth);

// helper para construir URL pública de la foto
const photoUrl = (req, filename) =>
  filename ? `https://whoyob-production.up.railway.app/uploads/${filename}` : null;

// helper para parsear JSON guardado en texto
const parseJson = (str) => {
  try { return str ? JSON.parse(str) : []; }
  catch { return []; }
};

// ── CRUD de tarjetas ──────────────────────────────────────────────────────────

// GET /cards?workspace_id=X&category_id=Y&q=busqueda
router.get('/', async (req, res) => {
  const { workspace_id, category_id, q } = req.query;
  if (!workspace_id) return res.status(400).json({ error: 'workspace_id requerido' });

  try {
    // Verificar que el workspace pertenece al usuario
    const [owns] = await db.query(
      'SELECT id FROM workspaces WHERE id = ? AND user_id = ?',
      [workspace_id, req.user.id]
    );
    if (!owns.length) return res.status(403).json({ error: 'Sin acceso' });

    let sql    = `SELECT c.*, cat.name AS category_name, cat.color AS category_color
                  FROM cards c
                  LEFT JOIN categories cat ON cat.id = c.category_id
                  WHERE c.workspace_id = ?`;
    const args = [workspace_id];

    if (category_id) { sql += ' AND c.category_id = ?'; args.push(category_id); }

    if (q && q.trim()) {
      sql += ' AND MATCH(c.title, c.description, c.ingredients, c.tags) AGAINST(? IN BOOLEAN MODE)';
      args.push(q.trim() + '*');
    }

    sql += ' ORDER BY c.updated_at DESC';

    const [rows] = await db.query(sql, args);

    // Parsear campos JSON antes de enviar
    const cards = rows.map(r => ({
      ...r,
      ingredients: parseJson(r.ingredients),
      tags:        parseJson(r.tags)
    }));

    res.json(cards);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener tarjetas' });
  }
});

// GET /cards/:id
router.get('/:id', async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT c.*, cat.name AS category_name, cat.color AS category_color
       FROM cards c
       LEFT JOIN categories cat ON cat.id = c.category_id
       JOIN workspaces w ON w.id = c.workspace_id
       WHERE c.id = ? AND w.user_id = ?`,
      [req.params.id, req.user.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Tarjeta no encontrada' });
    const card = { ...rows[0], ingredients: parseJson(rows[0].ingredients), tags: parseJson(rows[0].tags) };
    res.json(card);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener tarjeta' });
  }
});

// POST /cards  (multipart/form-data con foto opcional)
router.post('/', upload.single('photo'), async (req, res) => {
  const { workspace_id, category_id, title, description, ingredients, tags } = req.body;
  if (!workspace_id || !title)
    return res.status(400).json({ error: 'workspace_id y title son requeridos' });

  try {
    const [owns] = await db.query('SELECT id FROM workspaces WHERE id = ? AND user_id = ?', [workspace_id, req.user.id]);
    if (!owns.length) return res.status(403).json({ error: 'Sin acceso al workspace' });

    const photo = req.file ? req.file.filename : null;
    // ingredients y tags llegan como JSON string o array
    const ingStr  = Array.isArray(ingredients) ? JSON.stringify(ingredients) : (ingredients || '[]');
    const tagsStr = Array.isArray(tags) ? JSON.stringify(tags) : (tags || '[]');

    await db.query(
      `INSERT INTO cards (workspace_id, category_id, title, description, ingredients, tags, photo_url)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [workspace_id, category_id || null, title.trim(), description || null, ingStr, tagsStr, photo]
    );

    const [rows] = await db.query(
      'SELECT * FROM cards WHERE workspace_id = ? ORDER BY created_at DESC LIMIT 1',
      [workspace_id]
    );
    const card = {
      ...rows[0],
      ingredients: parseJson(rows[0].ingredients),
      tags:        parseJson(rows[0].tags),
      photo_url:   photoUrl(req, rows[0].photo_url)
    };
    res.status(201).json(card);
  } catch (err) {
    console.error(err);
    if (req.file) fs.unlink(path.join(uploadsDir, req.file.filename), () => {});
    res.status(500).json({ error: 'Error al crear tarjeta' });
  }
});

// PUT /cards/:id
router.put('/:id', upload.single('photo'), async (req, res) => {
  const { title, description, ingredients, tags, category_id } = req.body;
  try {
    const [rows] = await db.query(
      'SELECT c.* FROM cards c JOIN workspaces w ON w.id = c.workspace_id WHERE c.id = ? AND w.user_id = ?',
      [req.params.id, req.user.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'No encontrado' });

    const old = rows[0];
    let photo = old.photo_url;

    // Si subieron foto nueva, borrar la vieja
    if (req.file) {
      if (old.photo_url) fs.unlink(path.join(uploadsDir, old.photo_url), () => {});
      photo = req.file.filename;
    }

    // Si mandaron remove_photo=true, borrar
    if (req.body.remove_photo === 'true' && old.photo_url) {
      fs.unlink(path.join(uploadsDir, old.photo_url), () => {});
      photo = null;
    }

    const ingStr  = Array.isArray(ingredients) ? JSON.stringify(ingredients) : (ingredients || old.ingredients);
    const tagsStr = Array.isArray(tags) ? JSON.stringify(tags) : (tags || old.tags);

    await db.query(
      `UPDATE cards SET title = ?, description = ?, ingredients = ?, tags = ?, category_id = ?, photo_url = ?
       WHERE id = ?`,
      [
        title || old.title,
        description !== undefined ? description : old.description,
        ingStr, tagsStr,
        category_id !== undefined ? (category_id || null) : old.category_id,
        photo,
        req.params.id
      ]
    );

    const [updated] = await db.query('SELECT * FROM cards WHERE id = ?', [req.params.id]);
    const card = {
      ...updated[0],
      ingredients: parseJson(updated[0].ingredients),
      tags:        parseJson(updated[0].tags),
      photo_url:   photoUrl(req, updated[0].photo_url)
    };
    res.json(card);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al actualizar tarjeta' });
  }
});

// DELETE /cards/:id
router.delete('/:id', async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT c.* FROM cards c JOIN workspaces w ON w.id = c.workspace_id WHERE c.id = ? AND w.user_id = ?',
      [req.params.id, req.user.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'No encontrado' });
    if (rows[0].photo_url) fs.unlink(path.join(uploadsDir, rows[0].photo_url), () => {});
    await db.query('DELETE FROM cards WHERE id = ?', [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Error al eliminar tarjeta' });
  }
});

module.exports = router;
