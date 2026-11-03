# PatchPilot AI

PatchPilot detects vulnerabilities in a repository, explains the sink, drafts a patch, and holds that patch until validation passes.

The interface is a dark, technical workspace: security overview, live scans, a vulnerability register, a diff, and a verification run. It is built to sit in front of a FastAPI backend. Every API call goes through `src/services/client.ts`.

## Run

```bash
npm install
npm run dev
```

The dev server listens on [http://127.0.0.1:4731](http://127.0.0.1:4731).

```bash
npm run build
npm run lint
```

## Sign in

Sign-in and **Enter the Northline demo** call the API. The in-browser workspace is used only when `VITE_API_URL` and `VITE_API_BASE_URL` are both empty and the built-in Railway default has been removed.

The primary finding in the local workspace is SQL injection in `app/api/users.py` at line 42.

## Connect a FastAPI backend

The API origin is `import.meta.env.VITE_API_URL`, then `VITE_API_BASE_URL`, then the production Railway service:

```bash
VITE_API_URL=https://patchpilot-backend-production.up.railway.app
```

The client strips a trailing slash and a trailing `/api/v1`, then prefixes every path with `/api/v1`. A non-local value saved in Settings overrides the origin. A saved `localhost` or `127.0.0.1` value is ignored so an old Settings entry cannot point production at a developer machine.

From the browser, requests use a same-origin `/api/v1/...` path. Vite, Netlify, and Vercel proxy that path to the Railway origin. Railway’s CORS allowlist does not include every deployed frontend, and a blocked cross-origin response is what the UI reports as “could not be reached.”

The client sends `Authorization: Bearer <session token>`, `Accept: application/json`, and `Content-Type: application/json` for JSON bodies. FastAPI `detail` and `{ "message": "..." }` are both shown. Network failures include the failing URL and the browser error.

## Netlify

`netlify.toml` builds with Node 22 and publishes `dist`. `/api/*` is proxied to Railway before the SPA fallback. Set `VITE_API_URL` in the Netlify environment, then trigger a new deploy so the value is baked into the bundle.

| Method | Path | Purpose |
| --- | --- | --- |
| POST | `/api/v1/auth/session` | `{ email, password }` → session |
| POST | `/api/v1/auth/demo` | Demo session |
| DELETE | `/api/v1/auth/session` | Sign out |
| GET | `/api/v1/overview` | Score, counts, trend, activity |
| GET | `/api/v1/meta` | Scanner, language, and status filters |
| GET | `/api/v1/projects` | Project list with derived score |
| POST | `/api/v1/projects` | Create a project |
| GET | `/api/v1/projects/:id` | One project |
| GET | `/api/v1/repositories` | Connected sources |
| POST | `/api/v1/repositories/lookup` | Parse a GitHub URL |
| POST | `/api/v1/repositories` | Attach a source to a project |
| GET | `/api/v1/scans` | Scan history |
| POST | `/api/v1/scans/:projectId` | Start a scan |
| GET | `/api/v1/scans/:id` | Stages, progress, counts |
| GET | `/api/v1/vulnerabilities` | Filtered list without source |
| GET | `/api/v1/vulnerabilities/:id` | Finding, code, analysis |
| PATCH | `/api/v1/vulnerabilities/:id` | `{ status }` for review or accepted risk |
| POST | `/api/v1/vulnerabilities/:id/patches` | Generate a patch |
| GET | `/api/v1/vulnerabilities/:id/patch` | Patch for a finding |
| GET | `/api/v1/patches` | All patches |
| GET | `/api/v1/patches/:id` | One patch |
| POST | `/api/v1/patches/:id/validation` | Run syntax, build, tests, rescan, regression |
| POST | `/api/v1/patches/:id/apply` | `{ action: "download" \| "pull_request" \| "mark_applied" }` |
| GET | `/api/v1/reports` | Report index |
| POST | `/api/v1/reports` | Snapshot the workspace |
| GET | `/api/v1/reports/:id` | Markdown document |
| GET | `/api/v1/settings` | Workspace settings |
| PUT | `/api/v1/settings` | Update settings |
| GET | `/api/v1/activity` | Security activity |

Response shapes live in `src/types/api.ts`. UI code calls `src/services/*` and does not import the local workspace directly.

## Layout

```
src/components   interface
src/pages        screens
src/layouts      application shell
src/hooks        query hooks
src/services     API functions and the local workspace
src/types        response contracts
```
