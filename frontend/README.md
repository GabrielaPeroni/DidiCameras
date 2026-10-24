# DidiCameras frontend

React + TypeScript SPA (Vite) that replaces the Django templates. It talks to the DRF API under `/api`.

## Development

```bash
npm install
npm run dev          # http://localhost:5173, proxies /api to Django on :8000
```

Set `DJANGO_URL` if Django runs somewhere other than `http://127.0.0.1:8000`.

## Scripts

| Script                  | What it does                                                  |
| ----------------------- | ------------------------------------------------------------- |
| `npm run lint`          | ESLint (typescript-eslint, strict type-checked)               |
| `npm run typecheck`     | `tsc -b` in strict mode                                       |
| `npm test`              | Vitest + Testing Library                                      |
| `npm run format`        | Prettier                                                      |
| `npm run build`         | Type-check + production build to `dist/`                      |
| `npm run gen:api`       | Regenerate `src/api/schema.gen.ts` from `openapi/schema.yml`  |
| `npm run gen:api:check` | Fail if `schema.gen.ts` is out of date with the snapshot (CI) |

## API types

The types come from the backend's drf-spectacular schema, so the frontend can't silently drift from the serializers:

1. `openapi/schema.yml` is a committed snapshot of the API schema.
2. `npm run gen:api` turns it into `src/api/schema.gen.ts` (generated, don't edit).
3. `src/api/types.ts` exposes friendly aliases (`Camera`, `Recording`, `FFmpegConfig`, ...) over the generated types.

When a serializer changes, refresh the snapshot from the repo root and regenerate:

```bash
DJANGO_SETTINGS_MODULE=DidiCameras.settings.test python manage.py spectacular --file frontend/openapi/schema.yml
cd frontend && npm run gen:api
```

TypeScript then points at every component the change affects.

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
