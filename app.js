// Escapar HTML
function esc(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;');
}

const app = {
  async init() {
    if (!auth.init()) {
      this.showView('auth');
      return;
    }
    document.getElementById('user-name').textContent = auth.user?.name || '';
    await workspaces.load();
  },

  showView(name) {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    const el = document.getElementById(`view-${name}`);
    if (el) el.classList.add('active');
  },

  openSidebar() {
    document.getElementById('sidebar').classList.add('open');
    document.getElementById('sidebar-overlay').classList.add('open');
  },

  closeSidebar() {
    document.getElementById('sidebar').classList.remove('open');
    document.getElementById('sidebar-overlay').classList.remove('open');
  },

  logout() {
    auth.logout();
    location.reload();
  },

  toast(msg, type = 'info') {
    const t = document.createElement('div');
    t.className = `toast toast-${type}`;
    t.textContent = msg;
    document.getElementById('toasts').appendChild(t);
    setTimeout(() => t.classList.add('show'), 10);
    setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 300); }, 3000);
  },

  prompt(title, placeholder = '') {
    return new Promise(resolve => {
      const modal = document.getElementById('modal-prompt');
      document.getElementById('prompt-title').textContent = title;
      const input = document.getElementById('prompt-input');
      input.placeholder = placeholder;
      input.value = '';
      modal.classList.add('open');
      input.focus();
      document.getElementById('prompt-ok').onclick = () => {
        modal.classList.remove('open');
        resolve(input.value.trim() || null);
      };
      document.getElementById('prompt-cancel').onclick = () => {
        modal.classList.remove('open');
        resolve(null);
      };
    });
  },

  confirm(msg) {
    return new Promise(resolve => {
      const modal = document.getElementById('modal-confirm');
      document.getElementById('confirm-msg').textContent = msg;
      modal.classList.add('open');
      document.getElementById('confirm-ok').onclick = () => {
        modal.classList.remove('open');
        resolve(true);
      };
      document.getElementById('confirm-cancel').onclick = () => {
        modal.classList.remove('open');
        resolve(false);
      };
    });
  }
};

// Auth form handlers
async function submitLogin(e) {
  e.preventDefault();
  const email    = document.getElementById('login-email').value;
  const password = document.getElementById('login-pass').value;
  const btn      = document.getElementById('login-btn');
  btn.disabled   = true; btn.textContent = 'Entrando...';
  try {
    await auth.login(email, password);
    document.getElementById('user-name').textContent = auth.user?.name || '';
    await workspaces.load();
  } catch(err) {
    app.toast(err.message, 'error');
  } finally {
    btn.disabled = false; btn.textContent = 'Entrar';
  }
}

async function submitRegister(e) {
  e.preventDefault();
  const name     = document.getElementById('reg-name').value;
  const email    = document.getElementById('reg-email').value;
  const password = document.getElementById('reg-pass').value;
  const btn      = document.getElementById('reg-btn');
  btn.disabled   = true; btn.textContent = 'Creando cuenta...';
  try {
    await auth.register(name, email, password);
    document.getElementById('user-name').textContent = auth.user?.name || '';
    await workspaces.load();
  } catch(err) {
    app.toast(err.message, 'error');
  } finally {
    btn.disabled = false; btn.textContent = 'Crear cuenta';
  }
}

function showAuthTab(tab) {
  document.getElementById('login-form').style.display  = tab === 'login'    ? 'flex' : 'none';
  document.getElementById('register-form').style.display = tab === 'register' ? 'flex' : 'none';
  document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
  document.querySelector(`.auth-tab[data-tab="${tab}"]`).classList.add('active');
}

window.addEventListener('DOMContentLoaded', () => app.init());
window.app = app;
window.esc = esc;
