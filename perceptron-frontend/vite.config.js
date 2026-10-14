import { defineConfig } from 'vite';

// The browser only talks to Vite; Vite forwards API calls to the two Quarkus apps.
// That way the backends need no CORS configuration.
const backends = {
  '/api/and': 'http://localhost:8080', // perceptron-demo
  '/api/xor': 'http://localhost:8081', // perceptron-mlp
};

const proxy = Object.fromEntries(
  Object.entries(backends).map(([prefix, target]) => [
    prefix,
    { target, changeOrigin: true, rewrite: (path) => path.slice(prefix.length) },
  ]),
);

export default defineConfig({
  server: { port: 5173, proxy },
  preview: { port: 4173, proxy },
});
