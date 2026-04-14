const API_URL = 'https://whoyob-production.up.railway.app';

function getToken() { return localStorage.getItem('wn_token'); }

async function request(method, path, body, isFormData = false) {
  const headers = {};
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (!isFormData) headers['Content-Type'] = 'application/json';

  const opts = { method, headers };
  if (body) opts.body = isFormData ? body : JSON.stringify(body);

  const res = await fetch(API_URL + path, opts);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Error ${res.status}`);
  return data;
}

const api = {
  // Auth
  register: (name, email, password) => request('POST', '/auth/register', { name, email, password }),
  login:    (email, password)        => request('POST', '/auth/login',    { email, password }),
  me:       ()                       => request('GET',  '/auth/me'),

  // Workspaces
  getWorkspaces:    ()              => request('GET',    '/workspaces'),
  createWorkspace:  (data)          => request('POST',   '/workspaces', data),
  updateWorkspace:  (id, data)      => request('PUT',    `/workspaces/${id}`, data),
  deleteWorkspace:  (id)            => request('DELETE', `/workspaces/${id}`),

  // Categories
  getCategories:   (wsId)          => request('GET',    `/workspaces/${wsId}/categories`),
  createCategory:  (wsId, data)    => request('POST',   `/workspaces/${wsId}/categories`, data),
  updateCategory:  (wsId, catId, data) => request('PUT', `/workspaces/${wsId}/categories/${catId}`, data),
  deleteCategory:  (wsId, catId)   => request('DELETE', `/workspaces/${wsId}/categories/${catId}`),

  // Cards
  getCards: (wsId, catId, q) => {
    let url = `/cards?workspace_id=${wsId}`;
    if (catId) url += `&category_id=${catId}`;
    if (q)     url += `&q=${encodeURIComponent(q)}`;
    return request('GET', url);
  },
  getCard:    (id)       => request('GET',    `/cards/${id}`),
  deleteCard: (id)       => request('DELETE', `/cards/${id}`),
  createCard: (formData) => request('POST',   '/cards',     formData, true),
  updateCard: (id, formData) => request('PUT', `/cards/${id}`, formData, true),
};

window.api = api;
