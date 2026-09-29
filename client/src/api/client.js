import axios from 'axios';

export const TOKEN_KEY = 'tuitionhub_token';

export const api = axios.create({ baseURL: '/api' });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    // An expired or invalid token logs the user out everywhere
    if (err.response?.status === 401 && localStorage.getItem(TOKEN_KEY) && !err.config.url.startsWith('/auth/login')) {
      window.dispatchEvent(new Event('auth:expired'));
    }
    return Promise.reject(err);
  }
);

export function errorMessage(err, fallback = 'Something went wrong. Please try again.') {
  if (!err.response) return 'Cannot reach the server. Is the backend running?';
  return err.response.data?.message || fallback;
}

export function fieldErrors(err) {
  return err.response?.data?.errors || {};
}

let metaPromise;
/** Subjects, grades, districts and mediums from the server (fetched once). */
export function getMeta() {
  metaPromise ??= api.get('/meta').then((r) => r.data).catch((e) => {
    metaPromise = undefined;
    throw e;
  });
  return metaPromise;
}
