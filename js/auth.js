window.auth = {
  user: null,

  init() {
    const token = localStorage.getItem('wn_token');
    const user  = localStorage.getItem('wn_user');
    if (token && user) {
      this.user = JSON.parse(user);
      return true;
    }
    return false;
  },

  async login(email, password) {
    const data = await api.login(email, password);
    this.save(data);
    return data;
  },

  async register(name, email, password) {
    const data = await api.register(name, email, password);
    this.save(data);
    return data;
  },

  save({ token, user }) {
    localStorage.setItem('wn_token', token);
    localStorage.setItem('wn_user', JSON.stringify(user));
    this.user = user;
  },

  logout() {
    localStorage.removeItem('wn_token');
    localStorage.removeItem('wn_user');
    localStorage.removeItem('wn_workspace');
    this.user = null;
  },

  isLoggedIn() {
    return !!localStorage.getItem('wn_token');
  }
};
