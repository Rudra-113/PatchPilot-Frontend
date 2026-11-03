import { countChanges, unifiedDiff } from '@/lib/diff'
import { filesToZip } from '@/lib/zip'
import { computeScore, emptyCounts, isOpenStatus, severityRank } from '@/lib/severity'
import { request } from '@/services/client'
import { ApiError } from '@/services/errors'
import type {
  ActivityEvent,
  Analysis,
  ConnectRepositoryInput,
  CreateProjectInput,
  DiffDownload,
  LookupResult,
  Overview,
  Patch,
  PatchStatus,
  ProjectSummary,
  PullRequestDraft,
  Report,
  ReportDocument,
  Repository,
  Scan,
  ScanStage,
  Settings,
  Severity,
  ValidationCheck,
  Vulnerability,
  VulnerabilityListItem,
  VulnerabilityListResponse,
  VulnerabilityQuery,
  VulnStatus,
  WorkspaceMeta,
} from '@/types/api'

const KEY = 'patchpilot.live'

interface LiveVulnerability extends Vulnerability {
  repositoryId: string
  backendVulnerabilityId: string
  analysisLoaded: boolean
}

interface LiveState {
  projects: ProjectSummary[]
  repositories: Repository[]
  scans: Scan[]
  vulnerabilities: LiveVulnerability[]
  patches: Patch[]
  reports: ReportDocument[]
  activity: ActivityEvent[]
  settings: Settings
}

const memory: { current: LiveState | null } = { current: null }

function emptyState(): LiveState {
  const theme = localStorage.getItem('patchpilot.theme') === 'light' ? 'light' : 'dark'
  return {
    projects: [],
    repositories: [],
    scans: [],
    vulnerabilities: [],
    patches: [],
    reports: [],
    activity: [],
    settings: {
      theme,
      emailAlerts: true,
      scanOnPush: false,
      scanners: { semgrep: true, codeql: false, bandit: false, trivy: false, gitleaks: false },
      apiBaseUrl: localStorage.getItem('patchpilot.apiBaseUrl') ?? '',
    },
  }
}

function load(): LiveState {
  if (memory.current) return memory.current
  try {
    const raw = localStorage.getItem(KEY)
    memory.current = raw ? ({ ...emptyState(), ...JSON.parse(raw) } as LiveState) : emptyState()
  } catch {
    memory.current = emptyState()
  }
  return memory.current
}

function save(state: LiveState) {
  memory.current = state
  try {
    localStorage.setItem(KEY, JSON.stringify(state))
  } catch {
    /* The in-memory workspace still serves this page if storage is full. */
  }
}

function note(state: LiveState, message: string, tone: ActivityEvent['tone'], href: string | null) {
  state.activity.unshift({ id: crypto.randomUUID(), at: new Date().toISOString(), message, tone, href })
  state.activity = state.activity.slice(0, 40)
}

function projectOrThrow(state: LiveState, projectId: string) {
  const project = state.projects.find((item) => item.id === projectId)
  if (!project) throw new ApiError(404, 'Project not found.')
  return project
}

function countsFor(state: LiveState, projectId: string) {
  const open = emptyCounts()
  let fixed = 0
  for (const vuln of state.vulnerabilities) {
    if (vuln.projectId !== projectId) continue
    if (vuln.status === 'fixed') fixed += 1
    else if (isOpenStatus(vuln.status)) open[vuln.severity] += 1
  }
  return { open, fixed }
}

function presentProject(state: LiveState, project: ProjectSummary): ProjectSummary {
  const { open, fixed } = countsFor(state, project.id)
  const scans = state.scans.filter((scan) => scan.projectId === project.id)
  const lastScanAt = scans.map((scan) => scan.completedAt ?? scan.startedAt).sort().at(-1) ?? null
  const lastPatchAt = state.patches
    .filter((patch) => patch.projectId === project.id && patch.appliedAt)
    .map((patch) => patch.appliedAt as string)
    .sort()
    .at(-1) ?? null
  const scanned = scans.some((scan) => scan.status === 'completed')
  const age = lastScanAt ? Date.now() - new Date(lastScanAt).getTime() : null
  return {
    ...project,
    securityScore: scanned ? computeScore(open) : 0,
    open,
    fixed,
    lastScanAt,
    lastPatchAt,
    scanFreshness: age == null ? 'unscanned' : age < 6 * 60 * 60 * 1000 ? 'fresh' : age < 36 * 60 * 60 * 1000 ? 'aging' : 'stale',
  }
}

export function liveListProjects() {
  const state = load()
  return state.projects.map((project) => presentProject(state, project))
}

export function liveGetProject(projectId: string) {
  const state = load()
  return presentProject(state, projectOrThrow(state, projectId))
}

export function liveCreateProject(input: CreateProjectInput) {
  const name = input.name.trim()
  if (!name) throw new ApiError(400, 'Name the project.')
  const state = load()
  const project: ProjectSummary = {
    id: `proj_${crypto.randomUUID()}`,
    name,
    description: input.description.trim(),
    language: input.language.trim() || 'Python',
    framework: input.framework.trim(),
    securityScore: 0,
    open: emptyCounts(),
    fixed: 0,
    lastScanAt: null,
    lastPatchAt: null,
    scanFreshness: 'unscanned',
    createdAt: new Date().toISOString(),
    repository: null,
  }
  state.projects.unshift(project)
  note(state, `Project ${name} created`, 'info', `/app/projects/${project.id}`)
  save(state)
  return project
}

export function liveLookupRepository(input: { url: string; branch?: string }): LookupResult {
  const match = input.url.trim().match(/github\.com[/:]([^/\s]+)\/([^/\s#?]+)/i)
  if (!match) throw new ApiError(400, 'Enter a GitHub repository URL.')
  const repo = match[2].replace(/\.git$/i, '')
  return {
    name: repo,
    url: `https://github.com/${match[1]}/${repo}`,
    branch: input.branch?.trim() || 'main',
    language: '',
    visibility: 'private',
    lastCommit: null,
  }
}

export function liveListRepositories() {
  return load().repositories
}

export async function liveConnectRepository(input: ConnectRepositoryInput) {
  const state = load()
  const project = projectOrThrow(state, input.projectId)
  if (project.repository) throw new ApiError(409, `${project.name} already has a repository.`)
  let file = input.file ?? null
  if (!file && input.files?.length) {
    try {
      file = await filesToZip(input.files, input.fileName || project.name)
    } catch (error) {
      throw new ApiError(400, error instanceof Error ? error.message : 'The folder could not be packed.')
    }
  }
  if (!file) throw new ApiError(400, 'Only ZIP repositories are supported')
  if (!file.name.toLowerCase().endsWith('.zip')) throw new ApiError(400, 'Only ZIP repositories are supported')
  if (file.size > 50 * 1024 * 1024) throw new ApiError(413, 'Repository ZIP is too large. Maximum size is 50 MB.')
  const body = new FormData()
  body.append('file', file, file.name)
  const uploaded = await request<{ repository_id: string; filename?: string; status?: string }>('/api/v1/repositories/upload', {
    method: 'POST',
    body,
  })
  const repository: Repository = {
    id: uploaded.repository_id,
    projectId: project.id,
    name: input.name?.trim() || file.name.replace(/\.zip$/i, ''),
    provider: input.provider === 'github' ? 'zip' : input.provider,
    url: input.url || `upload://${file.name}`,
    branch: input.branch?.trim() || 'main',
    language: input.language || project.language,
    visibility: 'private',
    lastCommit: null,
    connectedAt: new Date().toISOString(),
  }
  state.repositories.unshift(repository)
  project.repository = { id: repository.id, name: repository.name, url: repository.url, branch: repository.branch, provider: repository.provider }
  note(state, `Uploaded ${repository.name}`, 'info', `/app/projects/${project.id}`)
  save(state)
  return repository
}

function severityOf(value: unknown): Severity {
  const text = String(value ?? '').toUpperCase()
  if (text === 'CRITICAL' || text === 'ERROR') return 'critical'
  if (text === 'HIGH' || text === 'WARNING') return 'high'
  if (text === 'LOW' || text === 'INFO') return 'low'
  return 'medium'
}

function confidencePercent(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) return Math.round(value <= 1 ? value * 100 : value)
  const text = String(value ?? '').toUpperCase()
  if (text === 'HIGH') return 90
  if (text === 'LOW') return 40
  if (text === 'MEDIUM') return 70
  const parsed = Number(value)
  if (Number.isFinite(parsed)) return Math.round(parsed <= 1 ? parsed * 100 : parsed)
  return 70
}

function cweOf(metadata: Record<string, unknown> | undefined, ruleId: string) {
  const raw = metadata?.cwe
  const text = Array.isArray(raw) ? String(raw[0] ?? '') : typeof raw === 'string' ? raw : ''
  const match = text.match(/CWE-\d+/i)
  const cwe = match ? match[0].toUpperCase() : ruleId || 'CWE'
  const cweName = text.includes(':') ? text.split(':').slice(1).join(':').trim() : ruleId
  return { cwe, cweName: cweName || cwe }
}

function displayPath(file: string, repositoryId: string) {
  const marker = `${repositoryId}/`
  const at = file.indexOf(marker)
  return at >= 0 ? file.slice(at + marker.length) : file.replace(/^scans\//, '')
}

function completedStage(stage: Omit<ScanStage, 'status' | 'progress' | 'startedAt' | 'durationMs' | 'resultCount' | 'detail'>, detail: string, resultCount: number | null, at: string): ScanStage {
  return { ...stage, status: 'completed', progress: 100, startedAt: at, durationMs: 1, resultCount, detail, steps: stage.steps.map((step) => ({ ...step, status: 'completed' })) }
}

function skippedStage(stage: Omit<ScanStage, 'status' | 'progress' | 'startedAt' | 'durationMs' | 'resultCount' | 'detail'>, detail: string): ScanStage {
  return { ...stage, status: 'skipped', progress: 0, startedAt: null, durationMs: null, resultCount: null, detail, steps: stage.steps.map((step) => ({ ...step, status: 'pending' })) }
}

function findingFromApi(item: Record<string, unknown>, project: ProjectSummary, scanId: string, at: string): LiveVulnerability {
  const repositoryId = project.repository?.id ?? ''
  const backendVulnerabilityId = String(item.id ?? '')
  const metadata = item.metadata && typeof item.metadata === 'object' ? (item.metadata as Record<string, unknown>) : undefined
  const ruleId = String(item.rule_id ?? '')
  const { cwe, cweName } = cweOf(metadata, ruleId)
  const file = displayPath(String(item.file ?? ''), repositoryId)
  const line = Number(item.line ?? 1) || 1
  const message = String(item.message ?? item.description ?? (ruleId || 'Security finding'))
  const analysis: Analysis = {
    rootCause: message,
    impact: String(item.impact ?? ''),
    attackScenario: ruleId,
    recommendedFix: '',
    confidence: confidencePercent(item.confidence),
  }
  return {
    id: `${repositoryId}_${backendVulnerabilityId}`,
    repositoryId,
    backendVulnerabilityId,
    analysisLoaded: false,
    projectId: project.id,
    projectName: project.name,
    scanId,
    title: message.split('\n')[0].slice(0, 140) || ruleId || 'Security finding',
    severity: severityOf(item.risk ?? item.severity),
    cwe,
    cweName,
    file,
    line,
    scanner: String(item.scanner ?? 'semgrep'),
    language: String(item.language ?? project.language),
    status: 'unresolved',
    confidence: analysis.confidence,
    discoveredAt: at,
    patchId: null,
    summary: message,
    endLine: Number(item.end_line ?? line) || line,
    code: { language: String(item.language ?? 'text'), filename: file, content: '', vulnerableLines: [line] },
    analysis,
  }
}

export async function liveStartScan(projectId: string) {
  const state = load()
  const project = projectOrThrow(state, projectId)
  const repositoryId = project.repository?.id
  if (!repositoryId) throw new ApiError(400, 'Only ZIP repositories are supported')
  const started = new Date().toISOString()
  const response = await request<{ repository_id: string; status?: string; results?: { total?: number; vulnerabilities?: Array<Record<string, unknown>> } }>(
    `/api/v1/scans/${encodeURIComponent(repositoryId)}`,
    { method: 'POST' },
  )
  const finished = new Date().toISOString()
  const raw = response.results?.vulnerabilities ?? []
  const scanId = `scan_${crypto.randomUUID()}`
  const findings = raw.map((item) => findingFromApi(item, project, scanId, finished))
  const tally = emptyCounts()
  for (const finding of findings) tally[finding.severity] += 1
  const scan: Scan = {
    id: scanId,
    projectId: project.id,
    projectName: project.name,
    repositoryId,
    repositoryName: project.repository?.name ?? repositoryId,
    branch: project.repository?.branch ?? 'main',
    status: 'completed',
    trigger: 'manual',
    startedAt: started,
    completedAt: finished,
    findings: tally,
    commitSha: '',
    stages: [
      completedStage({ key: 'repository', name: 'Repository Analysis', scanner: 'PatchPilot Resolver', steps: [{ label: 'Reading archive', status: 'pending' }, { label: 'Extracting tree', status: 'pending' }] }, 'ZIP extracted', null, started),
      completedStage({ key: 'static', name: 'Static Analysis', scanner: 'Semgrep', steps: [{ label: 'Loading rulesets', status: 'pending' }, { label: 'Scanning files', status: 'pending' }] }, `${findings.length} findings`, findings.length, finished),
      skippedStage({ key: 'ai', name: 'AI Security Analysis', scanner: 'PatchPilot Analyst', steps: [{ label: 'Tracing source to sink', status: 'pending' }] }, 'Runs when a finding is opened'),
      skippedStage({ key: 'patch', name: 'Patch Generation', scanner: 'PatchPilot Patcher', steps: [{ label: 'Drafting minimal diff', status: 'pending' }] }, 'Runs from the finding'),
      skippedStage({ key: 'validation', name: 'Validation', scanner: 'PatchPilot Verifier', steps: [{ label: 'Security scan', status: 'pending' }] }, 'Runs from the patch'),
    ],
  }
  state.scans = [scan, ...state.scans.filter((item) => item.projectId !== project.id)]
  state.vulnerabilities = [...findings, ...state.vulnerabilities.filter((item) => item.projectId !== project.id)]
  state.patches = state.patches.filter((item) => item.projectId !== project.id)
  note(state, `${findings.length} findings opened on ${project.name}`, findings.length ? 'warning' : 'secure', `/app/vulnerabilities?projectId=${project.id}`)
  save(state)
  return scan
}

export function liveListScans(projectId?: string) {
  const scans = load().scans
  return projectId ? scans.filter((scan) => scan.projectId === projectId) : scans
}

export function liveGetScan(scanId: string) {
  const scan = load().scans.find((item) => item.id === scanId)
  if (!scan) throw new ApiError(404, 'Scan not found.')
  return scan
}

function matchesQuery(item: VulnerabilityListItem, query: VulnerabilityQuery) {
  if (query.projectId && item.projectId !== query.projectId) return false
  if (query.scanId && item.scanId !== query.scanId) return false
  if (query.severity && item.severity !== query.severity) return false
  if (query.scanner && item.scanner !== query.scanner) return false
  if (query.language && item.language !== query.language) return false
  if (query.status === 'open' && !isOpenStatus(item.status)) return false
  if (query.status && query.status !== 'open' && item.status !== query.status) return false
  if (query.q) {
    const haystack = `${item.title} ${item.file} ${item.cwe} ${item.projectName}`.toLowerCase()
    if (!haystack.includes(query.q.toLowerCase())) return false
  }
  return true
}

export function liveListVulnerabilities(query: VulnerabilityQuery = {}): VulnerabilityListResponse {
  const items = load().vulnerabilities
    .filter((item) => matchesQuery(item, query))
    .sort((a, b) => severityRank(a.severity) - severityRank(b.severity) || b.confidence - a.confidence)
  const list = items.map(({ repositoryId: _repositoryId, backendVulnerabilityId: _backendId, analysisLoaded: _loaded, ...item }) => item)
  return { items: list, total: load().vulnerabilities.length, matched: list.length }
}

function vulnOrThrow(state: LiveState, vulnerabilityId: string) {
  const vuln = state.vulnerabilities.find((item) => item.id === vulnerabilityId)
  if (!vuln) throw new ApiError(404, 'Vulnerability was not found.')
  return vuln
}

export async function liveGetVulnerability(vulnerabilityId: string) {
  const state = load()
  const vuln = vulnOrThrow(state, vulnerabilityId)
  if (vuln.analysisLoaded || !vuln.repositoryId || !vuln.backendVulnerabilityId) return strip(vuln)
  const response = await request<{ analysis?: Record<string, unknown> }>(
    `/api/v1/scans/${encodeURIComponent(vuln.repositoryId)}/analyze/${encodeURIComponent(vuln.backendVulnerabilityId)}`,
    { method: 'POST' },
  )
  const analysis = response.analysis ?? {}
  vuln.analysis = {
    rootCause: String(analysis.root_cause ?? vuln.analysis.rootCause),
    impact: String(analysis.impact ?? vuln.analysis.impact),
    attackScenario: String(analysis.attack_context ?? vuln.analysis.attackScenario),
    recommendedFix: String(analysis.remediation ?? analysis.patch_strategy ?? ''),
    confidence: confidencePercent(analysis.confidence ?? vuln.confidence),
  }
  vuln.confidence = vuln.analysis.confidence
  if (typeof analysis.title === 'string' && analysis.title.trim()) vuln.title = analysis.title.trim()
  if (typeof analysis.code_context === 'string' && analysis.code_context.trim()) {
    vuln.code = { ...vuln.code, content: analysis.code_context }
  }
  const cwe = typeof analysis.cwe === 'string' ? analysis.cwe : ''
  if (cwe) {
    const parsed = cweOf({ cwe }, vuln.cweName)
    vuln.cwe = parsed.cwe
    if (parsed.cweName) vuln.cweName = parsed.cweName
  }
  vuln.analysisLoaded = true
  note(state, `Analyzed ${vuln.title}`, 'ai', `/app/vulnerabilities/${vuln.id}`)
  save(state)
  return strip(vuln)
}

function strip(vuln: LiveVulnerability): Vulnerability {
  const { repositoryId: _repositoryId, backendVulnerabilityId: _backendId, analysisLoaded: _loaded, ...item } = vuln
  return item
}

export async function liveUpdateVulnerability(vulnerabilityId: string, status: VulnStatus) {
  const state = load()
  const vuln = vulnOrThrow(state, vulnerabilityId)
  if (status === 'unresolved' && vuln.status === 'fixed') {
    await request(`/api/v1/scans/${encodeURIComponent(vuln.repositoryId)}/rollback/${encodeURIComponent(vuln.backendVulnerabilityId)}`, { method: 'POST' })
    const patch = state.patches.find((item) => item.id === vuln.patchId)
    if (patch) {
      patch.status = 'generated'
      patch.appliedAt = null
    }
    note(state, `Rolled back ${vuln.title}`, 'warning', `/app/vulnerabilities/${vuln.id}`)
  }
  vuln.status = status
  save(state)
  return strip(vuln)
}

export function liveMeta(): WorkspaceMeta {
  const state = load()
  return {
    scanners: [...new Set(['Semgrep', ...state.vulnerabilities.map((item) => item.scanner)])],
    languages: [...new Set([...state.projects.map((item) => item.language), ...state.vulnerabilities.map((item) => item.language)].filter(Boolean))],
    statuses: ['open', 'unresolved', 'in_review', 'patch_ready', 'validating', 'verified', 'fixed', 'accepted_risk'],
  }
}

function checks(status: ValidationCheck['status'], detail: string): ValidationCheck[] {
  const rows: Array<[ValidationCheck['key'], string]> = [
    ['syntax', 'Syntax Check'],
    ['build', 'Build Check'],
    ['unit', 'Unit Tests'],
    ['security', 'Security Scan'],
    ['regression', 'Regression Check'],
  ]
  return rows.map(([key, name]) => ({
    key,
    name,
    detail: key === 'security' || key === 'regression' ? detail : status === 'passed' ? 'Held with the security rescan.' : 'Not separately reported by the API.',
    status,
    durationMs: status === 'pending' ? null : 1,
  }))
}

function patchFromApi(vuln: LiveVulnerability, patch: Record<string, unknown>, status: PatchStatus): Patch {
  const before = String(patch.old_code ?? '')
  const after = String(patch.new_code ?? '')
  const changes = countChanges(before, after)
  const filename = displayPath(String(patch.file ?? vuln.file), vuln.repositoryId)
  return {
    id: vuln.patchId || `patch_${vuln.id}`,
    vulnerabilityId: vuln.id,
    projectId: vuln.projectId,
    projectName: vuln.projectName,
    vulnerabilityTitle: vuln.title,
    severity: vuln.severity,
    status,
    before,
    after,
    language: vuln.language,
    filename,
    explanation: String(patch.explanation ?? patch.safety_notes ?? ''),
    model: String(patch.model ?? ''),
    additions: changes.additions,
    deletions: changes.deletions,
    checks: checks('pending', 'Waiting'),
    generatedAt: new Date().toISOString(),
    verifiedAt: null,
    appliedAt: null,
  }
}

export async function liveGeneratePatch(vulnerabilityId: string) {
  const state = load()
  const vuln = vulnOrThrow(state, vulnerabilityId)
  const response = await request<{ patch?: Record<string, unknown> }>(
    `/api/v1/scans/${encodeURIComponent(vuln.repositoryId)}/patch/${encodeURIComponent(vuln.backendVulnerabilityId)}`,
    { method: 'POST' },
  )
  if (!response.patch) throw new ApiError(502, 'The API did not return a patch.')
  const created = patchFromApi(vuln, response.patch, 'generated')
  vuln.patchId = created.id
  vuln.status = 'patch_ready'
  state.patches = [created, ...state.patches.filter((item) => item.id !== created.id)]
  note(state, `Patch generated for ${vuln.title}`, 'ai', `/app/vulnerabilities/${vuln.id}/patch`)
  save(state)
  return created
}

function validationStatus(validation: Record<string, unknown> | undefined) {
  return String(validation?.status ?? '')
}

export async function liveStartValidation(patchId: string) {
  const state = load()
  const patch = state.patches.find((item) => item.id === patchId)
  if (!patch) throw new ApiError(404, 'Patch not found.')
  const vuln = vulnOrThrow(state, patch.vulnerabilityId)
  const validated = await request<{ validation?: Record<string, unknown> }>(
    `/api/v1/scans/${encodeURIComponent(vuln.repositoryId)}/validate-patch/${encodeURIComponent(vuln.backendVulnerabilityId)}`,
    { method: 'POST' },
  )
  const status = validationStatus(validated.validation)
  const detail = String(validated.validation?.message ?? validated.validation?.reason ?? (status || 'Validation finished.'))
  const passed = status === 'VALIDATED' || status === 'FALSE_POSITIVE'
  patch.checks = checks(passed ? 'passed' : 'failed', detail)
  patch.status = passed ? 'verified' : 'failed'
  patch.verifiedAt = passed ? new Date().toISOString() : null
  if (passed) {
    try {
      const remediated = await request<{ status?: string; sandbox?: Record<string, unknown>; validation?: Record<string, unknown> }>(
        `/api/v1/scans/${encodeURIComponent(vuln.repositoryId)}/remediate/${encodeURIComponent(vuln.backendVulnerabilityId)}`,
        { method: 'POST' },
      )
      const sandboxStatus = String(remediated.sandbox?.status ?? remediated.status ?? '')
      const sandboxDetail = String(remediated.sandbox?.reason ?? remediated.validation?.message ?? sandboxStatus)
      const sandboxPassed = sandboxStatus === 'SANDBOX_PASSED' || remediated.status === 'VALIDATED'
      patch.checks = patch.checks.map((check) => check.key === 'regression' ? { ...check, status: sandboxPassed ? 'passed' : 'failed', detail: sandboxDetail || check.detail } : check)
      if (!sandboxPassed) patch.status = 'failed'
    } catch (error) {
      const message = error instanceof ApiError ? error.message : 'Remediation did not finish.'
      patch.checks = patch.checks.map((check) => check.key === 'regression' ? { ...check, status: 'failed', detail: message } : check)
      patch.status = 'failed'
    }
  }
  vuln.status = patch.status === 'verified' ? 'verified' : 'unresolved'
  note(state, `Validation ${patch.status} for ${vuln.title}`, patch.status === 'verified' ? 'secure' : 'warning', `/app/patches/${patch.id}/validate`)
  save(state)
  return patch
}

export async function liveApplyPatch(patchId: string) {
  const state = load()
  const patch = state.patches.find((item) => item.id === patchId)
  if (!patch) throw new ApiError(404, 'Patch not found.')
  const vuln = vulnOrThrow(state, patch.vulnerabilityId)
  const response = await request<{ application?: Record<string, unknown> }>(
    `/api/v1/scans/${encodeURIComponent(vuln.repositoryId)}/apply-patch/${encodeURIComponent(vuln.backendVulnerabilityId)}`,
    { method: 'POST' },
  )
  if (response.application?.status && response.application.status !== 'PATCH_APPLIED') {
    throw new ApiError(409, String(response.application.reason ?? response.application.status))
  }
  patch.status = 'applied'
  patch.appliedAt = new Date().toISOString()
  vuln.status = 'fixed'
  note(state, `Patch applied for ${vuln.title}`, 'secure', `/app/vulnerabilities/${vuln.id}`)
  save(state)
  return patch
}

export function liveListPatches(vulnerabilityId?: string) {
  const patches = load().patches
  return vulnerabilityId ? patches.filter((patch) => patch.vulnerabilityId === vulnerabilityId) : patches
}

export function liveGetPatch(patchId: string) {
  const patch = load().patches.find((item) => item.id === patchId)
  if (!patch) throw new ApiError(404, 'Patch not found.')
  return patch
}

export function livePatchForVulnerability(vulnerabilityId: string) {
  const state = load()
  const vuln = vulnOrThrow(state, vulnerabilityId)
  if (!vuln.patchId) throw new ApiError(404, 'This finding has no patch yet.')
  return liveGetPatch(vuln.patchId)
}

export function liveDownloadPatch(patchId: string): DiffDownload {
  const patch = liveGetPatch(patchId)
  return { filename: `${patch.filename.replaceAll('/', '-')}.diff`, diff: unifiedDiff(patch.filename, patch.before, patch.after), delivery: 'file' }
}

export function livePreparePullRequest(patchId: string): PullRequestDraft {
  const patch = liveGetPatch(patchId)
  return {
    branch: `patchpilot/${patch.vulnerabilityId}`,
    title: `Fix ${patch.vulnerabilityTitle}`,
    body: patch.explanation,
    base: 'main',
    delivery: 'local',
    detail: 'The Railway API does not open pull requests. This draft stays in the browser.',
  }
}

export function liveOverview(): Overview {
  const state = load()
  const projects = liveListProjects()
  const open = emptyCounts()
  let fixed = 0
  for (const project of projects) {
    open.critical += project.open.critical
    open.high += project.open.high
    open.medium += project.open.medium
    open.low += project.open.low
    fixed += project.fixed
  }
  const scored = projects.filter((project) => project.securityScore > 0)
  const score = scored.length ? Math.round(scored.reduce((sum, project) => sum + project.securityScore, 0) / scored.length) : 0
  const attention = state.vulnerabilities
    .filter((item) => isOpenStatus(item.status))
    .sort((a, b) => severityRank(a.severity) - severityRank(b.severity))
    .slice(0, 6)
    .map((item) => strip(item))
  return {
    score,
    scoreDelta: 0,
    open,
    fixed,
    projects: projects.length,
    repositories: state.repositories.length,
    runningScans: state.scans.filter((scan) => scan.status === 'running').length,
    trend: [{ label: 'Now', ...open }],
    activity: state.activity,
    attention,
  }
}

export function liveActivity() {
  return load().activity
}

export function liveListReports() {
  return load().reports.map((document) => document.report)
}

export function liveGetReport(reportId: string) {
  const document = load().reports.find((item) => item.report.id === reportId)
  if (!document) throw new ApiError(404, 'Report not found.')
  return document
}

export function liveCreateReport(input: { title?: string; projectId?: string | null }) {
  const state = load()
  const project = input.projectId ? presentProject(state, projectOrThrow(state, input.projectId)) : null
  const findings = state.vulnerabilities.filter((item) => !project || item.projectId === project.id)
  const counts = emptyCounts()
  for (const finding of findings) if (isOpenStatus(finding.status)) counts[finding.severity] += 1
  const report: Report = {
    id: `report_${crypto.randomUUID()}`,
    title: input.title?.trim() || (project ? `${project.name} exposure` : 'Workspace exposure'),
    kind: 'exposure',
    projectId: project?.id ?? null,
    projectName: project?.name ?? null,
    createdAt: new Date().toISOString(),
    summary: `${counts.critical} critical, ${counts.high} high, ${counts.medium} medium, ${counts.low} low.`,
  }
  const lines = findings.map((item) => `- ${item.severity} ${item.title} (${item.file}:${item.line}) ${item.status}`)
  const document = { report, markdown: [`# ${report.title}`, '', report.summary, '', ...lines, ''].join('\n') }
  state.reports.unshift(document)
  save(state)
  return report
}

export function liveGetSettings() {
  return load().settings
}

export function liveUpdateSettings(patch: Partial<Settings>) {
  const state = load()
  state.settings = { ...state.settings, ...patch, scanners: { ...state.settings.scanners, ...patch.scanners } }
  localStorage.setItem('patchpilot.theme', state.settings.theme)
  localStorage.setItem('patchpilot.apiBaseUrl', state.settings.apiBaseUrl)
  save(state)
  return state.settings
}
