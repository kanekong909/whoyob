const router = require('express').Router();
const db     = require('../db');
const auth   = require('./middleware');

// Todos los endpoints requieren token
router.use(auth);

// ── Workspaces ────────────────────────────────────────────────────────────────

// GET /workspaces  — listar los del usuario
router.get('/', async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT w.*, COUNT(c.id) AS card_count
       FROM workspaces w
       LEFT JOIN cards c ON c.workspace_id = w.id
       WHERE w.user_id = ?
       GROUP BY w.id
       ORDER BY w.created_at DESC`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener espacios de trabajo' });
  }
});

// POST /workspaces  — crear uno nuevo
router.post('/', async (req, res) => {
  const { name, description, icon } = req.body;
  if (!name) return res.status(400).json({ error: 'El nombre es requerido' });
  try {
    await db.query(
      'INSERT INTO workspaces (user_id, name, description, icon) VALUES (?, ?, ?, ?)',
      [req.user.id, name.trim(), description || null, icon || '📁']
    );
    const [rows] = await db.query(
      'SELECT * FROM workspaces WHERE user_id = ? ORDER BY created_at DESC LIMIT 1',
      [req.user.id]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al crear espacio de trabajo' });
  }
});

// PUT /workspaces/:id
router.put('/:id', async (req, res) => {
  const { name, description, icon } = req.body;
  try {
    const [owns] = await db.query('SELECT id FROM workspaces WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
    if (!owns.length) return res.status(404).json({ error: 'No encontrado' });
    await db.query(
      'UPDATE workspaces SET name = ?, description = ?, icon = ? WHERE id = ?',
      [name, description || null, icon || '📁', req.params.id]
    );
    const [rows] = await db.query('SELECT * FROM workspaces WHERE id = ?', [req.params.id]);
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Error al actualizar' });
  }
});

// DELETE /workspaces/:id
router.delete('/:id', async (req, res) => {
  try {
    const [owns] = await db.query('SELECT id FROM workspaces WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
    if (!owns.length) return res.status(404).json({ error: 'No encontrado' });
    await db.query('DELETE FROM workspaces WHERE id = ?', [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Error al eliminar' });
  }
});

// ── Categorías ────────────────────────────────────────────────────────────────

// GET /workspaces/:id/categories
router.get('/:id/categories', async (req, res) => {
  try {
    const [owns] = await db.query('SELECT id FROM workspaces WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
    if (!owns.length) return res.status(404).json({ error: 'Espacio no encontrado' });
    const [rows] = await db.query(
      `SELECT cat.*, COUNT(c.id) AS card_count
       FROM categories cat
       LEFT JOIN cards c ON c.category_id = cat.id
       WHERE cat.workspace_id = ?
       GROUP BY cat.id
       ORDER BY cat.name ASC`,
      [req.params.id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener categorías' });
  }
});

// POST /workspaces/:id/categories
router.post('/:id/categories', async (req, res) => {
  const { name, color } = req.body;
  if (!name) return res.status(400).json({ error: 'Nombre requerido' });
  try {
    const [owns] = await db.query('SELECT id FROM workspaces WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
    if (!owns.length) return res.status(404).json({ error: 'Espacio no encontrado' });
    await db.query(
      'INSERT INTO categories (workspace_id, name, color) VALUES (?, ?, ?)',
      [req.params.id, name.trim(), color || '#6366f1']
    );
    const [rows] = await db.query(
      'SELECT * FROM categories WHERE workspace_id = ? ORDER BY created_at DESC LIMIT 1',
      [req.params.id]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Error al crear categoría' });
  }
});

// DELETE /workspaces/:wid/categories/:cid
router.delete('/:wid/categories/:cid', async (req, res) => {
  try {
    const [owns] = await db.query('SELECT id FROM workspaces WHERE id = ? AND user_id = ?', [req.params.wid, req.user.id]);
    if (!owns.length) return res.status(404).json({ error: 'No encontrado' });
    await db.query('DELETE FROM categories WHERE id = ? AND workspace_id = ?', [req.params.cid, req.params.wid]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Error al eliminar categoría' });
  }
});

module.exports = router;
