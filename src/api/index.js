import { http } from './client.js'

export const authApi = {
  login: (payload) => http.post('/auth/login', payload).then((r) => r.data),
  logout: () => http.post('/auth/logout').then(() => true),
  me: () => http.get('/auth/me').then((r) => r.data.user),
  updateProfile: (payload) => http.patch('/auth/me', payload).then((r) => r.data.user),
}

export const vehiclesApi = {
  list: () => http.get('/vehicles').then((r) => r.data),
  create: (payload) => http.post('/vehicles', payload).then((r) => r.data.item),
  update: (id, payload) => http.patch(`/vehicles/${id}`, payload).then((r) => r.data.item),
  remove: (id) => http.delete(`/vehicles/${id}`).then(() => true),
}

export const importApi = {
  expenses: (payload) => http.post('/import/expenses', payload).then((r) => r.data),
}

export const categoriesApi = {
  list: () => http.get('/categories').then((r) => r.data.items),
  create: (payload) => http.post('/categories', payload).then((r) => r.data.item),
  update: (id, payload) => http.patch(`/categories/${id}`, payload).then((r) => r.data.item),
  remove: (id) => http.delete(`/categories/${id}`).then(() => true),
}

export const expensesApi = {
  list: (params) => http.get('/expenses', { params }).then((r) => r.data),
  create: (payload) => http.post('/expenses', payload).then((r) => r.data.item),
  update: (id, payload) => http.patch(`/expenses/${id}`, payload).then((r) => r.data.item),
  remove: (id) => http.delete(`/expenses/${id}`).then(() => true),
}

export const statsApi = {
  overview: (params) => http.get('/stats/overview', { params }).then((r) => r.data),
  fuel: (params) => http.get('/stats/fuel', { params }).then((r) => r.data.items),
}

export const passportsApi = {
  list: () => http.get('/passports').then((r) => r.data.items),
  create: (payload) => http.post('/passports', payload).then((r) => r.data.item),
  revoke: (id) => http.delete(`/passports/${id}`).then(() => true),
  read: (token, pin) =>
    http.get(`/public/passport/${token}`, { params: pin ? { pin } : {} }).then((r) => r.data),
}

export const exportApi = {
  download: (params) =>
    http
      .get('/export/expenses', { params, responseType: 'blob' })
      .then((response) => response.data),
}
