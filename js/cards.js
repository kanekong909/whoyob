const cards = {
  list: [],
  searchTimer: null,

  async load(q) {
    const wsId  = workspaces.current?.id;
    const catId = workspaces.currentCategory;
    if (!wsId) return;
    try {
      this.list = await api.getCards(wsId, catId, q);
      this.render();
    } catch(err) {
      app.toast(err.message, 'error');
    }
  },

  render() {
    const el = document.getElementById('cards-grid');
    if (!el) return;
    if (!this.list.length) {
      el.innerHTML = `<div class="empty-state">
        <p>No hay tarjetas aún</p>
        <button class="btn-primary" onclick="cards.showForm()">Crear primera tarjeta</button>
      </div>`;
      return;
    }
    el.innerHTML = this.list.map(c => this.cardHTML(c)).join('');
  },

  cardHTML(c) {
    const photo = c.photo_url
      ? `<div class="card-photo"><img src="${c.photo_url}" alt="${esc(c.title)}" loading="lazy" onerror="this.parentElement.style.display='none'"></div>`
      : '';
    const tags = (c.tags || []).map(t => `<span class="tag">${esc(t)}</span>`).join('');
    const catBadge = c.category_name
      ? `<span class="cat-badge" style="background:${c.category_color}22;color:${c.category_color}">${esc(c.category_name)}</span>` : '';
    const ings = c.ingredients?.length
      ? `<div class="card-ings"><strong>Ingredientes:</strong> ${c.ingredients.map(i => esc(i)).join(', ')}</div>` : '';

    return `<div class="card-item" onclick="cards.showDetail('${c.id}')">
      ${photo}
      <div class="card-body">
        <div class="card-meta">${catBadge}</div>
        <h3 class="card-title">${esc(c.title)}</h3>
        ${c.description ? `<p class="card-desc">${esc(c.description)}</p>` : ''}
        ${ings}
        ${tags ? `<div class="card-tags">${tags}</div>` : ''}
      </div>
    </div>`;
  },

  showForm(cardData) {
    const modal = document.getElementById('modal-card');
    const form  = document.getElementById('card-form');
    form.reset();
    document.getElementById('card-photo-preview').innerHTML = '';
    document.getElementById('card-id').value = cardData?.id || '';
    document.getElementById('card-form-title').value = cardData?.title || '';
    document.getElementById('card-form-desc').value  = cardData?.description || '';
    document.getElementById('card-form-ings').value  = (cardData?.ingredients || []).join('\n');
    document.getElementById('card-form-tags').value  = (cardData?.tags || []).join(', ');

    // Categorías en el select
    const sel = document.getElementById('card-form-category');
    sel.innerHTML = '<option value="">Sin categoría</option>' +
      workspaces.categories.map(c =>
        `<option value="${c.id}" ${cardData?.category_id === c.id ? 'selected' : ''}>${esc(c.name)}</option>`
      ).join('');

    if (cardData?.photo_url) {
      document.getElementById('card-photo-preview').innerHTML =
        `<img src="${cardData.photo_url}" class="photo-thumb">`;
    }

    document.getElementById('modal-card-title').textContent = cardData ? 'Editar tarjeta' : 'Nueva tarjeta';
    modal.classList.add('open');
    document.getElementById('card-form-title').focus();
  },

  hideForm() {
    document.getElementById('modal-card').classList.remove('open');
  },

  previewPhoto(input) {
    const file = input.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
      document.getElementById('card-photo-preview').innerHTML =
        `<img src="${e.target.result}" class="photo-thumb">`;
    };
    reader.readAsDataURL(file);
  },

  async submitForm(e) {
    e.preventDefault();
    const id    = document.getElementById('card-id').value;
    const title = document.getElementById('card-form-title').value.trim();
    if (!title) return;

    const fd = new FormData();
    fd.append('workspace_id', workspaces.current.id);
    fd.append('title',       title);
    fd.append('description', document.getElementById('card-form-desc').value.trim());
    fd.append('category_id', document.getElementById('card-form-category').value);

    const ings = document.getElementById('card-form-ings').value
      .split('\n').map(s => s.trim()).filter(Boolean);
    fd.append('ingredients', JSON.stringify(ings));

    const tags = document.getElementById('card-form-tags').value
      .split(',').map(s => s.trim()).filter(Boolean);
    fd.append('tags', JSON.stringify(tags));

    const photoInput = document.getElementById('card-form-photo');
    if (photoInput.files[0]) fd.append('photo', photoInput.files[0]);

    const btn = document.getElementById('card-submit-btn');
    btn.disabled = true;
    btn.textContent = 'Guardando...';

    try {
      if (id) {
        await api.updateCard(id, fd);
      } else {
        await api.createCard(fd);
      }
      this.hideForm();
      await this.load();
      app.toast('Tarjeta guardada', 'success');
    } catch(err) {
      app.toast(err.message, 'error');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Guardar';
    }
  },

  async showDetail(id) {
    try {
      const card = await api.getCard(id);
      const modal = document.getElementById('modal-detail');
      const photo = card.photo_url
        ? `<img src="${card.photo_url}" class="detail-photo" onerror="this.style.display='none'">` : '';
      const ings = card.ingredients?.length
        ? `<div class="detail-section"><h4>Ingredientes</h4><ul>${card.ingredients.map(i => `<li>${esc(i)}</li>`).join('')}</ul></div>` : '';
      const tags = card.tags?.length
        ? `<div class="detail-tags">${card.tags.map(t => `<span class="tag">${esc(t)}</span>`).join('')}</div>` : '';
      const catBadge = card.category_name
        ? `<span class="cat-badge" style="background:${card.category_color}22;color:${card.category_color}">${esc(card.category_name)}</span>` : '';

      document.getElementById('detail-content').innerHTML = `
        ${photo}
        <div class="detail-body">
          ${catBadge}
          <h2>${esc(card.title)}</h2>
          ${card.description ? `<p class="detail-desc">${esc(card.description)}</p>` : ''}
          ${ings}
          ${tags}
        </div>
      `;
      document.getElementById('detail-edit-btn').onclick  = () => { this.hideDetail(); this.showForm(card); };
      document.getElementById('detail-del-btn').onclick   = () => this.deleteCard(card.id, card.title);
      modal.classList.add('open');
    } catch(err) {
      app.toast(err.message, 'error');
    }
  },

  hideDetail() {
    document.getElementById('modal-detail').classList.remove('open');
  },

  async deleteCard(id, title) {
    const ok = await app.confirm(`¿Eliminar "${title}"?`);
    if (!ok) return;
    await api.deleteCard(id);
    this.hideDetail();
    await this.load();
    app.toast('Tarjeta eliminada', 'success');
  },

  onSearch(value) {
    clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => this.load(value), 350);
  }
};

window.cards = cards;
