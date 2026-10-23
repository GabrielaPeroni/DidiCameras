# DidiCameras frontend

React + TypeScript SPA (Vite) that replaces the Django templates. It talks to the DRF API under `/api`.

## Development

```bash
npm install
npm run dev          # http://localhost:5173, proxies /api to Django on :8000
```

Set `DJANGO_URL` if Django runs somewhere other than `http://127.0.0.1:8000`.

## Scripts

| Script              | What it does                                             |
| ------------------- | -------------------------------------------------------- |
| `npm run lint`      | ESLint (typescript-eslint, strict type-checked)          |
| `npm run typecheck` | `tsc -b` in strict mode                                  |
| `npm test`          | Vitest + Testing Library                                 |
| `npm run format`    | Prettier                                                 |
| `npm run build`     | Type-check + production build to `dist/`                 |
| `npm run gen:api`   | Generate `src/api/schema.gen.ts` from the OpenAPI schema |

`gen:api` reads `http://127.0.0.1:8000/api/schema/` by default; set `OPENAPI_SCHEMA` to use a file or another URL.
Until the backend ships its drf-spectacular schema, `src/api/types.ts` holds hand-written types that follow the planned contract.

## Layout

```
src/
  api/          fetch wrapper + one module per resource
  features/     auth, cameras, recordings, config, player
  components/   shared UI
  routes/       react-router definitions (mirrors app/urls.py)
  lib/          auth context, hooks
  test/         test setup + helpers
```
