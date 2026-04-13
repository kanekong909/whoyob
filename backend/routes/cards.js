const router     = require('express').Router();
const multer     = require('multer');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const db   = require('../db');
const auth = require('./middleware');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder:          'worknotes',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'gif'],
    transformation:  [{ width: 1200, crop: 'limit', quality: 'auto' }],
  },
});

const upload = multer({ storage, limits: { fileSize: 8 * 1024 * 1024 } });

router.use(auth);

const parseJson = (str) => {
  try { return str ? JSON.parse(str) : []; }
  catch { return []; }
};

const destroyPhoto = (url) => {
  if (!url) return;
  const parts   = url.split('/');
  const file    = parts[parts.length - 1].replace(/\.[^.]+$/, '');
  const folder  = parts[parts.length - 2];
  const publicId = `${folder}/${file}`;
  cloudinary.uploader.destroy(publicId).catch(() => {});
};

// GET /cards
router.get('/', async (req, res) => {
  const { workspace_id, category_id, q } = req.query;
  if (!workspace_id) return res.status(400).json({ error: 'workspace_id requerido' });
  try {
    const [owns] = await db.query(
      'SELECT id FROM workspaces WHERE id = ? AND user_id = ?',
      [workspace_id, req.user.id]
    );
    if (!owns.length) return res.status(403).json({ error: 'Sin acceso' });

    let sql  = `SELECT c.*, cat.name AS category_name, cat.color AS category_color
                FROM cards c LEFT JOIN categories cat ON cat.id = c.category_id
                WHERE c.workspace_id = ?`;
    const args = [workspace_id];
    if (category_id) { sql += ' AND c.category_id = ?'; args.push(category_id); }
    if (q && q.trim()) {
      sql += ' AND MATCH(c.title, c.description, c.ingredients, c.tags) AGAINST(? IN BOOLEAN MODE)';
      args.push(q.trim() + '*');
    }
    sql += ' ORDER BY c.updated_at DESC';

    const [rows] = await db.query(sql, args);
    res.json(rows.map(r => ({ ...r, ingredients: parseJson(r.ingredients), tags: parseJson(r.tags) })));
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
       FROM cards c LEFT JOIN categories cat ON cat.id = c.category_id
       JOIN workspaces w ON w.id = c.workspace_id
       WHERE c.id = ? AND w.user_id = ?`,
      [req.params.id, req.user.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Tarjeta no encontrada' });
    res.json({ ...rows[0], ingredients: parseJson(rows[0].ingredients), tags: parseJson(rows[0].tags) });
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener tarjeta' });
  }
});

// POST /cards
router.post('/', upload.single('photo'), async (req, res) => {
  const { workspace_id, category_id, title, description, ingredients, tags } = req.body;
  if (!workspace_id || !title)
    return res.status(400).json({ error: 'workspace_id y title son requeridos' });
  try {
    const [owns] = await db.query(
      'SELECT id FROM workspaces WHERE id = ? AND user_id = ?',
      [workspace_id, req.user.id]
    );
    if (!owns.length) return res.status(403).json({ error: 'Sin acceso' });

    const photo_url = req.file ? req.file.path : null;
    const ingStr    = Array.isArray(ingredients) ? JSON.stringify(ingredients) : (ingredients || '[]');
    const tagsStr   = Array.isArray(tags)        ? JSON.stringify(tags)        : (tags        || '[]');

    await db.query(
      `INSERT INTO cards (workspace_id, category_id, title, description, ingredients, tags, photo_url)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [workspace_id, category_id || null, title.trim(), description || null, ingStr, tagsStr, photo_url]
    );
    const [rows] = await db.query(
      'SELECT * FROM cards WHERE workspace_id = ? ORDER BY created_at DESC LIMIT 1',
      [workspace_id]
    );
    res.status(201).json({ ...rows[0], ingredients: parseJson(rows[0].ingredients), tags: parseJson(rows[0].tags) });
  } catch (err) {
    console.error(err);
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

    let photo_url = old.photo_url;
    if (req.file)                          { destroyPhoto(old.photo_url); photo_url = req.file.path; }
    if (req.body.remove_photo === 'true')  { destroyPhoto(old.photo_url); photo_url = null; }

    const ingStr  = Array.isArray(ingredients) ? JSON.stringify(ingredients) : (ingredients || old.ingredients);
    const tagsStr = Array.isArray(tags)        ? JSON.stringify(tags)        : (tags        || old.tags);

    await db.query(
      `UPDATE cards SET title=?, description=?, ingredients=?, tags=?, category_id=?, photo_url=? WHERE id=?`,
      [title || old.title, description !== undefined ? description : old.description,
       ingStr, tagsStr, category_id !== undefined ? (category_id || null) : old.category_id,
       photo_url, req.params.id]
    );
    const [updated] = await db.query('SELECT * FROM cards WHERE id = ?', [req.params.id]);
    res.json({ ...updated[0], ingredients: parseJson(updated[0].ingredients), tags: parseJson(updated[0].tags) });
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
    destroyPhoto(rows[0].photo_url);
    await db.query('DELETE FROM cards WHERE id = ?', [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Error al eliminar tarjeta' });
  }
});

module.exports = router;
