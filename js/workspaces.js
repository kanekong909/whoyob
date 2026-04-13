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
        <button class="cat-tab ${this.currentCategory === c.id ? 'active' : ''}"
                style="--cat-color: ${c.color}"
                onclick="workspaces.filterCategory('${c.id}')">
          ${esc(c.name)}
        </button>
      `).join('')}
      <button class="cat-tab cat-add" onclick="workspaces.showAddCategory()">+</button>
    `;
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

