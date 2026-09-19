/**
 * api.js - thin typed wrapper around the Watershed Insight REST API.
 *
 * Every call goes through the Vite dev-server proxy (/api, /static) so the
 * browser never has to know the backend host.
 */

import axios from 'axios'

const client = axios.create({
  baseURL: '/api/v1',
  timeout: 120000,
})

client.interceptors.response.use(
  (res) => res,
  (error) => {
    const detail = error?.response?.data?.detail
    const message = typeof detail === 'string' ? detail : error.message
    return Promise.reject(new Error(message || 'Request failed'))
  }
)

export const api = {
  // --- meta ------------------------------------------------------------- //
  health: () => client.get('/health').then((r) => r.data),

  // --- module 1: watershed explorer ------------------------------------- //
  catalog: () => client.get('/watersheds/catalog').then((r) => r.data),
  listWatersheds: (params) => client.get('/watersheds', { params }).then((r) => r.data),
  watershed: (id) => client.get(`/watersheds/${id}`).then((r) => r.data),
  summary: (id) => client.get(`/watersheds/${id}/summary`).then((r) => r.data),
  stats: (id) => client.get(`/watersheds/${id}/stats`).then((r) => r.data),
  timeseries: (id, params) => client.get(`/watersheds/${id}/timeseries`, { params }).then((r) => r.data),
  lulc: (id, params) => client.get(`/watersheds/${id}/lulc`, { params }).then((r) => r.data),
  drainage: (id, params) => client.get(`/watersheds/${id}/drainage`, { params }).then((r) => r.data),
  terrain: (id) => client.get(`/watersheds/${id}/terrain`).then((r) => r.data),
  overlays: (id, params) => client.get(`/watersheds/${id}/overlays`, { params }).then((r) => r.data),

  // --- modules 3 & 4: change detection & impact ------------------------- //
  changeDetection: (id, params) => client.get(`/analytics/${id}/change-detection`, { params }).then((r) => r.data),
  hotspots: (id, params) => client.get(`/analytics/${id}/hotspots`, { params }).then((r) => r.data),
  compare: (id, params) => client.get(`/analytics/${id}/compare`, { params }).then((r) => r.data),
  epochs: (id) => client.get(`/analytics/${id}/epochs`).then((r) => r.data),

  interventions: (params) => client.get('/interventions', { params }).then((r) => r.data),
  ranking: (wsId, radius) => client.get('/interventions/ranking', { params: { watershed_id: wsId, radius_m: radius } }).then((r) => r.data),
  analysis: (id, radius, epochA, epochB) =>
    client.get(`/interventions/${id}/analysis`, {
      params: { radius_m: radius, epoch_a: epochA || undefined, epoch_b: epochB || undefined },
    }).then((r) => r.data),
  interventionTimeseries: (id, radius) =>
    client.get(`/interventions/${id}/timeseries`, { params: { radius_m: radius } }).then((r) => r.data),
  catchment: (id) => client.get(`/interventions/${id}/catchment`).then((r) => r.data),

  // --- module 2: geo-coded photos --------------------------------------- //
  photos: (params) => client.get('/photos', { params }).then((r) => r.data),
  photoStats: (wsId) => client.get('/photos/stats', { params: { watershed_id: wsId } }).then((r) => r.data),
  photo: (id) => client.get(`/photos/${id}`).then((r) => r.data),
  interpretation: (id) => client.get(`/photos/${id}/interpretation`).then((r) => r.data),
  photosGeojson: (wsId) => client.get('/photos/geojson', { params: { watershed_id: wsId } }).then((r) => r.data),
  uploadPhotos: (formData) =>
    client.post('/photos/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } }).then((r) => r.data),
  revalidatePhotos: (wsId) => client.post('/photos/revalidate', null, { params: { watershed_id: wsId } }).then((r) => r.data),

  // --- module 5: evidence generation ------------------------------------ //
  reportUrl: (kind, id, radius) => `/api/v1/reports/${kind}/${id}${radius ? `?radius_m=${radius}` : ''}`,
  reportDownload: (kind, id, radius) =>
    client.post(`/reports/${kind}/${id}`, null, {
      params: radius ? { radius_m: radius } : undefined,
      responseType: 'blob',
    }),
  listReports: () => client.get('/reports').then((r) => r.data),
}

export default api
