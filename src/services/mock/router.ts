import type { Credentials, Session, Settings, VulnStatus } from '@/types/api'
import { ApiError } from '@/services/errors'
import {
  applyPatch,
  connectRepository,
  createProject,
  createReport,
  ensureStore,
  generatePatch,
  getOverview,
  getPatch,
  getPatchForVulnerability,
  getProject,
  getReport,
  getScan,
  getSettings,
  getVulnerability,
  listActivity,
  listPatches,
  listProjects,
  listReports,
  listRepositories,
  listScans,
  listVulnerabilities,
  lookupRepository,
  resetStore,
  startScan,
  startValidation,
  updateSettings,
  updateVulnerability,
  workspaceMeta,
} from '@/services/mock/store'

const DEMO_USER = {
  id: 'user_avery_shah',
  name: 'Avery Shah',
  email: 'avery.shah@northline.dev',
  role: 'Security engineer',
  organization: 'Northline',
  timezone: 'Asia/Kolkata',
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function latency(method: string, path: string) {
  if (method === 'GET' && /^\/(scans|patches)\/[^/]+$/.test(path)) return 40
  if (method === 'GET' && path === '/activity') return 40
  return 240 + Math.round(Math.random() * 140)
}

function sessionFor(email: string, workspace: Session['workspace']): Session {
  const name =
    workspace === 'demo'
      ? DEMO_USER.name
      : email
          .split('@')[0]
          .split(/[.\-_]/)
          .filter(Boolean)
          .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
          .join(' ') || 'Operator'
  return {
    token: crypto.randomUUID(),
    workspace,
    issuedAt: new Date().toISOString(),
    user:
      workspace === 'demo'
        ? DEMO_USER
        : {
            id: `user_${email.toLowerCase()}`,
            name,
            email,
            role: 'Security engineer',
            organization: email.split('@')[1]?.split('.')[0] ?? 'Workspace',
            timezone: 'Asia/Kolkata',
          },
  }
}

export async function mockRequest<T>(path: string, init?: { method?: string; body?: unknown; session?: Session | null }): Promise<T> {
  const method = (init?.method ?? 'GET').toUpperCase()
  const url = new URL(path, 'http://patchpilot.local')
  const pathname = url.pathname.replace(/^\/api\/v1(?=\/|$)/, '') || '/'
  await delay(latency(method, pathname))
  return dispatch(method, pathname, url.searchParams, init?.body, init?.session ?? null) as T
}

function dispatch(method: string, pathname: string, search: URLSearchParams, body: unknown, session: Session | null) {
  const parts = pathname.split('/').filter(Boolean)

  if (method === 'POST' && pathname === '/auth/session') {
    const credentials = body as Credentials
    const email = credentials?.email?.trim().toLowerCase() ?? ''
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new ApiError(400, 'Enter a valid email address.')
    if ((credentials?.password ?? '').length < 8) throw new ApiError(400, 'Use a password of at least 8 characters.')
    const created = sessionFor(email, 'empty')
    ensureStore(created)
    return created
  }
  if (method === 'POST' && pathname === '/auth/demo') {
    const created = sessionFor(DEMO_USER.email, 'demo')
    ensureStore(created)
    return created
  }
  if (method === 'DELETE' && pathname === '/auth/session') {
    resetStore()
    return { ok: true }
  }

  if (!session) throw new ApiError(401, 'Sign in to open this workspace.')
  ensureStore(session)

  if (method === 'GET' && pathname === '/overview') return getOverview()
  if (method === 'GET' && pathname === '/meta') return workspaceMeta()
  if (method === 'GET' && pathname === '/activity') return listActivity()
  if (method === 'GET' && pathname === '/projects') return listProjects()
  if (method === 'POST' && pathname === '/projects') return createProject(body as never)
  if (method === 'GET' && parts[0] === 'projects' && parts[1]) return getProject(parts[1])
  if (method === 'GET' && pathname === '/repositories') return listRepositories()
  if (method === 'POST' && pathname === '/repositories/lookup') return lookupRepository(body as { url: string; branch?: string })
  if (method === 'POST' && pathname === '/repositories') return connectRepository(body as never)
  if (method === 'GET' && pathname === '/scans') return listScans(search.get('projectId') ?? undefined)
  if (method === 'POST' && pathname === '/scans') return startScan((body as { projectId: string }).projectId)
  if (method === 'POST' && parts[0] === 'scans' && parts[1]) return startScan(decodeURIComponent(parts[1]))
  if (method === 'GET' && parts[0] === 'scans' && parts[1]) return getScan(parts[1])
  if (method === 'GET' && pathname === '/vulnerabilities') {
    return listVulnerabilities({
      q: search.get('q') ?? undefined,
      severity: (search.get('severity') ?? undefined) as never,
      scanner: search.get('scanner') ?? undefined,
      language: search.get('language') ?? undefined,
      status: (search.get('status') ?? undefined) as never,
      projectId: search.get('projectId') ?? undefined,
      scanId: search.get('scanId') ?? undefined,
    })
  }
  if (method === 'GET' && parts[0] === 'vulnerabilities' && parts[1] && !parts[2]) return getVulnerability(parts[1])
  if (method === 'PATCH' && parts[0] === 'vulnerabilities' && parts[1]) {
    return updateVulnerability(parts[1], (body as { status: VulnStatus }).status)
  }
  if (method === 'POST' && parts[0] === 'vulnerabilities' && parts[2] === 'patches') return generatePatch(parts[1])
  if (method === 'GET' && pathname === '/patches') return listPatches(search.get('vulnerabilityId') ?? undefined)
  if (method === 'GET' && parts[0] === 'patches' && parts[1] && parts.length === 2) return getPatch(parts[1])
  if (method === 'GET' && parts[0] === 'vulnerabilities' && parts[2] === 'patch') return getPatchForVulnerability(parts[1])
  if (method === 'POST' && parts[0] === 'patches' && parts[2] === 'validation') return startValidation(parts[1])
  if (method === 'POST' && parts[0] === 'patches' && parts[2] === 'apply') {
    return applyPatch(parts[1], (body as { action: 'download' | 'pull_request' | 'mark_applied' }).action)
  }
  if (method === 'GET' && pathname === '/reports') return listReports()
  if (method === 'POST' && pathname === '/reports') return createReport((body ?? {}) as never)
  if (method === 'GET' && parts[0] === 'reports' && parts[1]) return getReport(parts[1])
  if (method === 'GET' && pathname === '/settings') return getSettings()
  if (method === 'PUT' && pathname === '/settings') return updateSettings(body as Partial<Settings>)

  throw new ApiError(404, `No route for ${method} ${pathname}`)
}
