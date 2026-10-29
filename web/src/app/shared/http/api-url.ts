// The API is served from the same origin as the app: in development the dev server proxies /api to it
// (proxy.conf.json), in production both sit behind one domain. No API address is baked into the build.
export const API_URL = '/api';
