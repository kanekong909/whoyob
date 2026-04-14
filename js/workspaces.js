window.workspaces = {
  current: null,
  list: [],
  categories: [],
  currentCategory: null,

  async load() {
    this.list = await api.getWorkspaces();
    this.renderList();
    const savedId = localStorage.getItem('wn_workspace');
    if (savedId) {
      const ws = this.list.find(w => w.id === savedId);
      if (ws) await this.select(ws);
    } else if (this.list.length > 0) {
      await this.select(this.list[0]);
    } else {
      app.showView('workspaces');
    }
  },

  renderList() {
    const el = document.getElementById('workspace-list');
    if (!el) return;
    el.innerHTML = this.list.map(ws => `
      <div class="ws-item ${this.current?.id === ws.id ? 'active' : ''}"
           onclick="workspaces.select(${JSON.stringify(ws).replace(/"/g, '&quot;')})">
        <span class="ws-icon">${ws.icon || '📁'}</span>
        <div class="ws-info">
          <span class="ws-name">${esc(ws.name)}</span>
          <span class="ws-count">${ws.card_count || 0} tarjetas</span>
        </div>
        <button class="ws-edit-btn" onclick="event.stopPropagation(); workspaces.showEdit(${JSON.stringify(ws).replace(/"/g, '&quot;')})" title="Editar">
          <img src="assets/icons/editv2.svg" alt="Editar" class="icon">
        </button>
      </div>
    `).join('');
  },

  async select(ws) {
    this.current = ws;
    this.currentCategory = null;
    localStorage.setItem('wn_workspace', ws.id);
    this.renderList();
    document.getElementById('ws-title').textContent = ws.name;
    document.getElementById('ws-icon-display').textContent = ws.icon || '📁';
    await this.loadCategories();
    await cards.load();
    app.showView('main');
    app.closeSidebar();
  },

  async loadCategories() {
    if (!this.current) return;
    this.categories = await api.getCategories(this.current.id);
    this.renderCategories();
  },

  renderCategories() {
    const el = document.getElementById('category-tabs');
    if (!el) return;
    el.innerHTML = `
      <button class="cat-tab ${!this.currentCategory ? 'active' : ''}"
              onclick="workspaces.filterCategory(null)">Todas</button>
      ${this.categories.map(c => `
        <div class="cat-tab-wrap">
          <button class="cat-tab ${this.currentCategory === c.id ? 'active' : ''}"
                  onclick="workspaces.filterCategory('${c.id}')">
            <span class="cat-dot" style="background:${c.color}"></span>
            ${esc(c.name)}
          </button>
          <button class="cat-options-btn" onclick="workspaces.showCategoryMenu(event, '${c.id}', '${esc(c.name)}', '${c.color}')" title="Opciones">⋯</button>
        </div>
      `).join('')}
      <button class="cat-tab cat-add" onclick="workspaces.showAddCategory()">+</button>
    `;
  },

  showCategoryMenu(e, catId, catName, catColor) {
    e.stopPropagation();
    // Cerrar cualquier menú abierto
    document.querySelectorAll('.cat-menu').forEach(m => m.remove());

    const menu = document.createElement('div');
    menu.className = 'cat-menu';
    menu.innerHTML = `
      <button onclick="workspaces.editCategory('${catId}', '${catName}', '${catColor}')">
        <img src="assets/icons/edit.svg" alt="Editar" class="icon"> Editar
      </button>
      <button class="danger" onclick="workspaces.deleteCategory('${catId}', '${catName}')">
        <img src="assets/icons/delete.svg" alt="Eliminar" class="icon"> Eliminar
      </button>
    `;

    // Posicionar debajo del botón
    const rect = e.currentTarget.getBoundingClientRect();
    menu.style.top  = (rect.bottom + 6) + 'px';
    menu.style.left = (rect.left - 80) + 'px';
    document.body.appendChild(menu);

    // Cerrar al click fuera
    setTimeout(() => {
      document.addEventListener('click', () => menu.remove(), { once: true });
    }, 0);
  },

  async editCategory(catId, currentName, currentColor) {
    document.querySelectorAll('.cat-menu').forEach(m => m.remove());
    const name = await app.prompt('Editar categoría', currentName);
    if (!name || name === currentName) return;
    try {
      await api.updateCategory(this.current.id, catId, { name, color: currentColor });
      if (this.currentCategory === catId) this.currentCategory = catId;
      await this.loadCategories();
      app.toast('Categoría actualizada', 'success');
    } catch(err) {
      app.toast(err.message, 'error');
    }
  },

  async deleteCategory(catId, catName) {
    document.querySelectorAll('.cat-menu').forEach(m => m.remove());
    const ok = await app.confirm(`¿Eliminar categoría "${catName}"? Las tarjetas no se borran.`);
    if (!ok) return;
    try {
      await api.deleteCategory(this.current.id, catId);
      if (this.currentCategory === catId) this.currentCategory = null;
      await this.loadCategories();
      await cards.load();
      app.toast('Categoría eliminada', 'success');
    } catch(err) {
      app.toast(err.message, 'error');
    }
  },

  filterCategory(catId) {
    this.currentCategory = catId;
    this.renderCategories();
    cards.load();
  },

  async showAddCategory() {
    const name = await app.prompt('Nueva categoría', 'Nombre (ej: Platos, Procedimientos)');
    if (!name) return;
    const color = '#' + Math.floor(Math.random()*0xffffff).toString(16).padStart(6,'0');
    await api.createCategory(this.current.id, { name, color });
    await this.loadCategories();
  },

  showEdit(ws) {
    document.getElementById('ws-edit-name').value = ws.name || '';
    document.getElementById('ws-edit-desc').value = ws.description || '';
    document.getElementById('ws-edit-icon').value = ws.icon || '📁';
    this._editingWs = ws;

    // Sugerencias de emojis rápidos
    const emojis = ['📁','💼','🍽️','☕','🏥','🛒','📚','🔧','🎨','💻','🏋️','✈️','🌿','🎵','📦','🏠','⚽','🧪','👔','🚗'];
    const row = document.getElementById('emoji-suggestions');
    row.innerHTML = emojis.map(e =>
      `<button type="button" class="emoji-opt" onclick="document.getElementById('ws-edit-icon').value='${e}'">${e}</button>`
    ).join('');

    document.getElementById('modal-workspace-edit').classList.add('open');
    document.getElementById('ws-edit-name').focus();
  },

  hideEdit() {
    document.getElementById('modal-workspace-edit').classList.remove('open');
    this._editingWs = null;
  },

  async submitEdit(e) {
    e.preventDefault();
    const ws   = this._editingWs;
    if (!ws) return;
    const name        = document.getElementById('ws-edit-name').value.trim();
    const description = document.getElementById('ws-edit-desc').value.trim();
    const icon        = document.getElementById('ws-edit-icon').value.trim() || '📁';
    if (!name) return;
    try {
      const updated = await api.updateWorkspace(ws.id, { name, description, icon });
      // Actualizar en la lista local
      const idx = this.list.findIndex(w => w.id === ws.id);
      if (idx !== -1) this.list[idx] = { ...this.list[idx], ...updated };
      // Si es el actual, actualizar topbar
      if (this.current?.id === ws.id) {
        this.current = { ...this.current, ...updated };
        document.getElementById('ws-title').textContent        = updated.name;
        document.getElementById('ws-icon-display').textContent = updated.icon || '📁';
      }
      this.renderList();
      this.hideEdit();
      app.toast('Espacio actualizado', 'success');
    } catch(err) {
      app.toast(err.message, 'error');
    }
  },

  showCreate() {
    const modal = document.getElementById('modal-workspace');
    modal.classList.add('open');
    document.getElementById('ws-form-name').focus();
  },

  hideCreate() {
    document.getElementById('modal-workspace').classList.remove('open');
    document.getElementById('ws-form-name').value = '';
    document.getElementById('ws-form-desc').value = '';
    document.getElementById('ws-form-icon').value = '📁';
  },

  async submitCreate(e) {
    e.preventDefault();
    const name = document.getElementById('ws-form-name').value.trim();
    const description = document.getElementById('ws-form-desc').value.trim();
    const icon = document.getElementById('ws-form-icon').value.trim() || '📁';
    if (!name) return;
    try {
      const ws = await api.createWorkspace({ name, description, icon });
      this.list.unshift(ws);
      this.hideCreate();
      await this.select(ws);
    } catch(err) {
      app.toast(err.message, 'error');
    }
  },

  async deleteCurrentWorkspace() {
    if (!this.current) return;
    const ok = await app.confirm(`¿Eliminar "${this.current.name}"? Se borrarán todas sus tarjetas.`);
    if (!ok) return;
    await api.deleteWorkspace(this.current.id);
    this.list = this.list.filter(w => w.id !== this.current.id);
    this.current = null;
    localStorage.removeItem('wn_workspace');
    await this.load();
  }
};

