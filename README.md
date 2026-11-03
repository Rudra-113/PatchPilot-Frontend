# PatchPilot AI

PatchPilot detects vulnerabilities in a repository, explains the sink, drafts a patch, and holds that patch until validation passes.

The interface is a dark, technical workspace: security overview, live scans, a vulnerability register, a diff, and a verification run. It is built to sit in front of a FastAPI backend. Until that service is configured, the same routes are served by a local workspace in the browser.

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

With no API configured, sign-in never leaves the browser.

- Enter any email and a password of at least 8 characters to open an empty workspace.
- **Enter the Northline demo** loads CyberGuard, PatchPilot API, SecureAuth, Payment Gateway, Edge Proxy, and Ledger Ingest.

The primary finding in the demo is SQL injection in `app/api/users.py` at line 42.

## Connect a FastAPI backend

Leave `VITE_API_URL` empty to keep the local workspace. Set it to the Railway FastAPI origin, or save an API base URL in Settings, when the backend is ready:

```bash
VITE_API_URL=https://your-service.up.railway.app
```

`VITE_API_BASE_URL` is still read if `VITE_API_URL` is empty. A value saved in Settings overrides both. The Railway service must allow the site origin in CORS.

## Netlify

`netlify.toml` builds with Node 22 and publishes `dist`. Client routes fall back to `index.html`. Set `VITE_API_URL` in the Netlify environment, then trigger a new deploy so the value is baked into the bundle.

The client sends `Authorization: Bearer <session token>` and `Content-Type: application/json`. Errors should return `{ "message": "..." }`.

| Method | Path | Purpose |
| --- | --- | --- |
| POST | `/auth/session` | `{ email, password }` → session |
| POST | `/auth/demo` | Demo session |
| DELETE | `/auth/session` | Sign out |
| GET | `/overview` | Score, counts, trend, activity |
| GET | `/meta` | Scanner, language, and status filters |
| GET | `/projects` | Project list with derived score |
| POST | `/projects` | Create a project |
| GET | `/projects/:id` | One project |
| GET | `/repositories` | Connected sources |
| POST | `/repositories/lookup` | Parse a GitHub URL |
| POST | `/repositories` | Attach a source to a project |
| GET | `/scans` | Scan history |
| POST | `/scans` | `{ projectId }` starts a scan |
| GET | `/scans/:id` | Stages, progress, counts |
| GET | `/vulnerabilities` | Filtered list without source |
| GET | `/vulnerabilities/:id` | Finding, code, analysis |
| PATCH | `/vulnerabilities/:id` | `{ status }` for review or accepted risk |
| POST | `/vulnerabilities/:id/patches` | Generate a patch |
| GET | `/vulnerabilities/:id/patch` | Patch for a finding |
| GET | `/patches` | All patches |
| GET | `/patches/:id` | One patch |
| POST | `/patches/:id/validation` | Run syntax, build, tests, rescan, regression |
| POST | `/patches/:id/apply` | `{ action: "download" \| "pull_request" \| "mark_applied" }` |
| GET | `/reports` | Report index |
| POST | `/reports` | Snapshot the workspace |
| GET | `/reports/:id` | Markdown document |
| GET | `/settings` | Workspace settings |
| PUT | `/settings` | Update settings |
| GET | `/activity` | Security activity |

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
