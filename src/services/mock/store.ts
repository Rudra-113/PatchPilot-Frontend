import { countChanges, unifiedDiff } from '@/lib/diff'
import { computeScore, emptyCounts, isOpenStatus, severityRank } from '@/lib/severity'
import type {
  ActivityEvent,
  Analysis,
  CheckStatus,
  ConnectRepositoryInput,
  CreateProjectInput,
  DiffDownload,
  LookupResult,
  Overview,
  Patch,
  PatchStatus,
  PullRequestDraft,
  Report,
  ReportDocument,
  Repository,
  Scan,
  ScanStage,
  ScanStatus,
  Session,
  Settings,
  Severity,
  SeverityCounts,
  StageStatus,
  StepStatus,
  TrendPoint,
  ValidationCheck,
  Vulnerability,
  VulnerabilityListItem,
  VulnerabilityListResponse,
  VulnerabilityQuery,
  VulnStatus,
  WorkspaceMeta,
} from '@/types/api'
import { discoveriesFor, showcase, type Draft } from '@/services/mock/catalog'
import { ApiError } from '@/services/errors'
import { buildHistorical } from '@/services/mock/historical'
import { materialize } from '@/services/mock/source'

const STORAGE_KEY = 'patchpilot.workspace'
const HOUR = 60 * 60 * 1000
const DAY = 24 * HOUR

interface ProjectRecord {
  id: string
  key: string
  name: string
  description: string
  language: string
  framework: string
  repositoryId: string | null
  createdAt: string
}

interface Remediation {
  before: string
  after: string
  explanation: string
}

interface VulnRecord {
  id: string
  projectId: string
  scanId: string
  title: string
  summary: string
  severity: Severity
  cwe: string
  cweName: string
  file: string
  line: number
  endLine: number
  scanner: string
  language: string
  status: VulnStatus
  confidence: number
  discoveredAt: string
  updatedAt: string
  code: string
  vulnerableLines: number[]
  analysis: Analysis
  patchId: string | null
  remediation: Remediation | null
}

interface ScanRecord extends Scan {
  discovered: boolean
}

interface State {
  userId: string
  workspace: Session['workspace']
  projects: ProjectRecord[]
  repositories: Repository[]
  scans: ScanRecord[]
  vulnerabilities: VulnRecord[]
  patches: Patch[]
  activity: ActivityEvent[]
  reports: Report[]
  settings: Settings
  baselineScore: number
}

let state: State | null = null
const scanTimers = new Map<string, number>()
const validationTimers = new Map<string, number>()

function nid(prefix: string) {
  return `${prefix}_${crypto.randomUUID().slice(0, 8)}`
}

function iso(offsetMs: number) {
  return new Date(Date.now() + offsetMs).toISOString()
}

function sha(seed: string) {
  let hash = 2166136261
  for (const char of seed) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619)
  return `${(hash >>> 0).toString(16).padStart(8, '0')}${(hash >>> 8).toString(16).padStart(4, '0')}`
}

function persist() {
  if (!state) return
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    /* The workspace still works for this page load if storage is full. */
  }
}

function defaultSettings(): Settings {
  const theme = localStorage.getItem('patchpilot.theme') === 'light' ? 'light' : 'dark'
  return {
    theme,
    emailAlerts: true,
    scanOnPush: true,
    scanners: { semgrep: true, codeql: true, bandit: true, trivy: true, gitleaks: true },
    apiBaseUrl: localStorage.getItem('patchpilot.apiBaseUrl') ?? '',
  }
}

function stageBlueprint(): ScanStage[] {
  const specs: Array<Omit<ScanStage, 'status' | 'progress' | 'startedAt' | 'durationMs' | 'resultCount' | 'detail'>> = [
    {
      key: 'repository',
      name: 'Repository Analysis',
      scanner: 'PatchPilot Resolver',
      steps: [
        { label: 'Reading default branch', status: 'pending' },
        { label: 'Scanning files', status: 'pending' },
        { label: 'Dependency analysis', status: 'pending' },
      ],
    },
    {
      key: 'static',
      name: 'Static Analysis',
      scanner: 'Semgrep',
      steps: [
        { label: 'Loading rulesets', status: 'pending' },
        { label: 'Scanning files', status: 'pending' },
        { label: 'Deduplicating sinks', status: 'pending' },
      ],
    },
    {
      key: 'ai',
      name: 'AI Security Analysis',
      scanner: 'PatchPilot Analyst',
      steps: [
        { label: 'Tracing source to sink', status: 'pending' },
        { label: 'AI analyzing vulnerability', status: 'pending' },
        { label: 'Scoring confidence', status: 'pending' },
      ],
    },
    {
      key: 'patch',
      name: 'Patch Generation',
      scanner: 'PatchPilot Patcher',
      steps: [
        { label: 'Drafting minimal diff', status: 'pending' },
        { label: 'Checking call sites', status: 'pending' },
      ],
    },
    {
      key: 'validation',
      name: 'Validation',
      scanner: 'PatchPilot Verifier',
      steps: [
        { label: 'Syntax check', status: 'pending' },
        { label: 'Build check', status: 'pending' },
        { label: 'Unit tests', status: 'pending' },
        { label: 'Security scan', status: 'pending' },
        { label: 'Regression check', status: 'pending' },
      ],
    },
  ]
  return specs.map((spec) => ({
    ...spec,
    status: 'pending' as StageStatus,
    progress: 0,
    startedAt: null,
    durationMs: null,
    resultCount: null,
    detail: 'Waiting',
  }))
}

function checkTemplates(status: CheckStatus, detailMode: 'waiting' | 'passed'): ValidationCheck[] {
  const rows: Array<[ValidationCheck['key'], string, string]> = [
    ['syntax', 'Syntax Check', 'Parser accepted the patched file.'],
    ['build', 'Build Check', 'Project build completed with the patch applied.'],
    ['unit', 'Unit Tests', 'Targeted tests for the changed module passed.'],
    ['security', 'Security Scan', 'The originating scanner no longer reports this sink.'],
    ['regression', 'Regression Check', 'Adjacent tests stayed green.'],
  ]
  return rows.map(([key, name, passed]) => ({
    key,
    name,
    detail: detailMode === 'passed' ? passed : 'Waiting',
    status,
    durationMs: detailMode === 'passed' ? 640 : null,
  }))
}

function projectById(projectId: string) {
  const project = state?.projects.find((item) => item.id === projectId)
  if (!project) throw new ApiError(404, 'Project not found.')
  return project
}

function countsFor(projectId: string) {
  const open = emptyCounts()
  let fixed = 0
  for (const vuln of state?.vulnerabilities ?? []) {
    if (vuln.projectId !== projectId) continue
    if (vuln.status === 'fixed') fixed += 1
    else if (isOpenStatus(vuln.status)) open[vuln.severity] += 1
  }
  return { open, fixed }
}

function scanned(projectId: string) {
  return Boolean(state?.scans.some((scan) => scan.projectId === projectId && scan.status === 'completed'))
}

function lastScanAt(projectId: string) {
  const times = (state?.scans ?? [])
    .filter((scan) => scan.projectId === projectId)
    .map((scan) => scan.completedAt ?? scan.startedAt)
  if (!times.length) return null
  return times.sort().at(-1) ?? null
}

function lastPatchAt(projectId: string) {
  const times = (state?.patches ?? [])
    .filter((patch) => patch.projectId === projectId && patch.appliedAt)
    .map((patch) => patch.appliedAt as string)
  if (!times.length) return null
  return times.sort().at(-1) ?? null
}

function freshness(when: string | null) {
  if (!when) return 'unscanned' as const
  const age = Date.now() - new Date(when).getTime()
  if (age < 6 * HOUR) return 'fresh' as const
  if (age < 36 * HOUR) return 'aging' as const
  return 'stale' as const
}

function presentProject(project: ProjectRecord) {
  const { open, fixed } = countsFor(project.id)
  const scanAt = lastScanAt(project.id)
  const repository = state?.repositories.find((item) => item.id === project.repositoryId) ?? null
  return {
    id: project.id,
    name: project.name,
    description: project.description,
    language: project.language,
    framework: project.framework,
    securityScore: scanned(project.id) ? computeScore(open) : 0,
    open,
    fixed,
    lastScanAt: scanAt,
    lastPatchAt: lastPatchAt(project.id),
    scanFreshness: freshness(scanAt),
    createdAt: project.createdAt,
    repository: repository
      ? {
          id: repository.id,
          name: repository.name,
          url: repository.url,
          branch: repository.branch,
          provider: repository.provider,
        }
      : null,
  }
}

function orgOpen() {
  const open = emptyCounts()
  let fixed = 0
  for (const project of state?.projects ?? []) {
    const counts = countsFor(project.id)
    fixed += counts.fixed
    for (const key of Object.keys(open) as Severity[]) open[key] += counts.open[key]
  }
  return { open, fixed }
}

function listItem(vuln: VulnRecord): VulnerabilityListItem {
  const project = state?.projects.find((item) => item.id === vuln.projectId)
  return {
    id: vuln.id,
    projectId: vuln.projectId,
    projectName: project?.name ?? 'Unknown project',
    scanId: vuln.scanId,
    title: vuln.title,
    severity: vuln.severity,
    cwe: vuln.cwe,
    cweName: vuln.cweName,
    file: vuln.file,
    line: vuln.line,
    scanner: vuln.scanner,
    language: vuln.language,
    status: vuln.status,
    confidence: vuln.confidence,
    discoveredAt: vuln.discoveredAt,
    patchId: vuln.patchId,
  }
}

function presentVulnerability(vuln: VulnRecord): Vulnerability {
  return {
    ...listItem(vuln),
    summary: vuln.summary,
    endLine: vuln.endLine,
    code: {
      language: vuln.language.toLowerCase(),
      filename: vuln.file,
      content: vuln.code,
      vulnerableLines: vuln.vulnerableLines,
    },
    analysis: vuln.analysis,
  }
}

function presentScan(scan: ScanRecord): Scan {
  const project = state?.projects.find((item) => item.id === scan.projectId)
  const repository = state?.repositories.find((item) => item.id === scan.repositoryId)
  return {
    id: scan.id,
    projectId: scan.projectId,
    projectName: project?.name ?? scan.projectName,
    repositoryId: scan.repositoryId,
    repositoryName: repository?.name ?? scan.repositoryName,
    branch: repository?.branch ?? scan.branch,
    status: scan.status,
    trigger: scan.trigger,
    startedAt: scan.startedAt,
    completedAt: scan.completedAt,
    stages: scan.stages,
    findings: scan.findings,
    commitSha: scan.commitSha,
  }
}

function presentPatch(patch: Patch): Patch {
  const project = state?.projects.find((item) => item.id === patch.projectId)
  const vuln = state?.vulnerabilities.find((item) => item.id === patch.vulnerabilityId)
  return {
    ...patch,
    projectName: project?.name ?? patch.projectName,
    vulnerabilityTitle: vuln?.title ?? patch.vulnerabilityTitle,
    severity: vuln?.severity ?? patch.severity,
  }
}

function pushActivity(message: string, tone: ActivityEvent['tone'], href: string | null, at = new Date().toISOString()) {
  if (!state) return
  state.activity.unshift({ id: nid('act'), at, message, tone, href })
  state.activity = state.activity.slice(0, 48)
}

function requireState() {
  if (!state) throw new ApiError(401, 'Sign in to open this workspace.')
  return state
}

function addDraft(current: State, draft: Draft, projectId: string, scanId: string, when: string) {
  const before = materialize(draft.vulnerable)
  const after = materialize(draft.patched)
  const vulnId = nid('vuln')
  const remediation = { before: before.content, after: after.content, explanation: draft.explanation }
  const record: VulnRecord = {
    id: vulnId,
    projectId,
    scanId,
    title: draft.title,
    summary: draft.summary,
    severity: draft.severity,
    cwe: draft.cwe,
    cweName: draft.cweName,
    file: draft.file,
    line: before.line,
    endLine: before.endLine,
    scanner: draft.scanner,
    language: draft.language,
    status: draft.status,
    confidence: draft.confidence,
    discoveredAt: when,
    updatedAt: when,
    code: before.content,
    vulnerableLines: Array.from({ length: before.endLine - before.line + 1 }, (_, index) => before.line + index),
    analysis: draft.analysis,
    patchId: null,
    remediation,
  }
  current.vulnerabilities.push(record)
  if (draft.status === 'patch_ready' || draft.status === 'in_review' || draft.status === 'fixed' || draft.status === 'verified') {
    createPatchRecord(record, draft.status === 'fixed' ? 'applied' : draft.status === 'verified' ? 'verified' : 'generated', when)
  }
}

function createPatchRecord(vuln: VulnRecord, status: PatchStatus, when: string) {
  if (!state || !vuln.remediation) return null
  const project = state.projects.find((item) => item.id === vuln.projectId)
  const changes = countChanges(vuln.remediation.before, vuln.remediation.after)
  const patch: Patch = {
    id: nid('pat'),
    vulnerabilityId: vuln.id,
    projectId: vuln.projectId,
    projectName: project?.name ?? '',
    vulnerabilityTitle: vuln.title,
    severity: vuln.severity,
    status,
    before: vuln.remediation.before,
    after: vuln.remediation.after,
    language: vuln.language.toLowerCase(),
    filename: vuln.file,
    explanation: vuln.remediation.explanation,
    model: 'patchpilot-analyst',
    additions: changes.additions,
    deletions: changes.deletions,
    checks: checkTemplates(status === 'generated' || status === 'validating' ? 'pending' : 'passed', status === 'generated' || status === 'validating' ? 'waiting' : 'passed'),
    generatedAt: when,
    verifiedAt: status === 'verified' || status === 'applied' ? when : null,
    appliedAt: status === 'applied' ? when : null,
  }
  state.patches.unshift(patch)
  vuln.patchId = patch.id
  return patch
}

function seedDemo(session: Session): State {
  const current: State = {
    userId: session.user.id,
    workspace: 'demo',
    projects: [],
    repositories: [],
    scans: [],
    vulnerabilities: [],
    patches: [],
    activity: [],
    reports: [],
    settings: defaultSettings(),
    baselineScore: 0,
  }
  const specs = [
    ['cyberguard', 'CyberGuard Backend', 'Detection pipeline and analyst API for the Northline SOC.', 'Python', 'FastAPI', 'northline/cyberguard-backend', 'main', 'Reject unsigned webhook retries from the collector', 'Mira Patel', -22 * 60 * 1000],
    ['patchpilot', 'PatchPilot API', 'Scan orchestration, patch generation, and verification.', 'Python', 'FastAPI', 'northline/patchpilot-api', 'main', 'Pin the analyzer image digest', 'Jonah Adler', -3 * HOUR],
    ['secureauth', 'SecureAuth', 'Token service and session issuance for operators and merchants.', 'Go', 'net/http', 'northline/secureauth', 'main', 'Move token verification off the request thread', 'Leah Okonkwo', -5 * HOUR],
    ['payments', 'Payment Gateway', 'Billing admin, refunds, and merchant invoice intake.', 'Python', 'FastAPI', 'northline/payment-gateway', 'main', 'Tighten settlement idempotency keys', 'Samir Rahman', -2 * HOUR],
    ['edge', 'Edge Proxy', 'TLS edge in front of settlement and login.', 'Rust', 'hyper', 'northline/edge-proxy', 'main', 'Drop the stale origin retry budget', 'Mira Patel', -2 * DAY],
    ['ledger', 'Ledger Ingest', 'Snapshot import and export for the settlement ledger.', 'Java', 'Spring', 'northline/ledger-ingest', 'release', 'Bound the snapshot upload size', 'Jonah Adler', -26 * HOUR],
  ] as const

  const projectIds = new Map<string, string>()
  const scanIds = new Map<string, string>()

  for (const spec of specs) {
    const [key, name, description, language, framework, repoName, branch, message, author, age] = spec
    const projectId = nid('prj')
    const repositoryId = nid('repo')
    const scanId = nid('scan')
    projectIds.set(key, projectId)
    scanIds.set(key, scanId)
    current.projects.push({
      id: projectId,
      key,
      name,
      description,
      language,
      framework,
      repositoryId,
      createdAt: iso(-120 * DAY),
    })
    current.repositories.push({
      id: repositoryId,
      projectId,
      name: repoName,
      provider: 'github',
      url: `https://github.com/${repoName}`,
      branch,
      language,
      visibility: 'private',
      lastCommit: {
        sha: sha(repoName),
        message,
        author,
        committedAt: iso(age),
      },
      connectedAt: iso(-90 * DAY),
    })
  }

  state = current
  const sql = showcase.find((item) => item.file === 'app/api/users.py')
  if (sql && materialize(sql.vulnerable).line !== 42) {
    throw new Error(`SQL sink landed on line ${materialize(sql.vulnerable).line}`)
  }

  for (const draft of [...showcase, ...buildHistorical()]) {
    const projectId = projectIds.get(draft.projectKey)
    const scanId = scanIds.get(draft.projectKey)
    if (!projectId || !scanId) continue
    const age = draft.status === 'fixed' ? -((draft.file.length % 20) + 4) * DAY : -((draft.confidence % 10) + 1) * HOUR
    addDraft(current, draft, projectId, scanId, iso(age))
  }

  for (const project of current.projects) {
    const repository = current.repositories.find((item) => item.id === project.repositoryId)
    const counts = countsFor(project.id)
    const scanId = scanIds.get(project.key) as string
    const started = lastCommitOffset(project.key)
    const stages = stageBlueprint().map((stage, index) => ({
      ...stage,
      status: 'completed' as StageStatus,
      progress: 100,
      startedAt: iso(started + index * 8000),
      durationMs: 6000 + index * 1800,
      resultCount: resultFor(stage.key, counts.open, repository?.name.length ?? 12),
      detail: 'Completed',
      steps: stage.steps.map((step) => ({ ...step, status: 'completed' as StepStatus })),
    }))
    current.scans.push({
      id: scanId,
      projectId: project.id,
      projectName: project.name,
      repositoryId: repository?.id ?? '',
      repositoryName: repository?.name ?? '',
      branch: repository?.branch ?? 'main',
      status: 'completed',
      trigger: project.key === 'edge' ? 'schedule' : 'push',
      startedAt: iso(started),
      completedAt: iso(started + 46_000),
      stages,
      findings: counts.open,
      commitSha: repository?.lastCommit?.sha ?? '',
      discovered: true,
    })
  }

  const payment = current.projects.find((item) => item.key === 'payments')
  const sqlVuln = current.vulnerabilities.find((item) => item.file === 'app/api/users.py')
  current.activity = [
    { id: nid('act'), at: iso(-2 * 60 * 1000), message: 'Semgrep discovered SQL Injection in app/api/users.py', tone: 'critical', href: sqlVuln ? `/app/vulnerabilities/${sqlVuln.id}` : null },
    { id: nid('act'), at: iso(-118 * 1000), message: 'AI analysis started for SQL Injection', tone: 'ai', href: sqlVuln ? `/app/vulnerabilities/${sqlVuln.id}` : null },
    { id: nid('act'), at: iso(-90 * 1000), message: 'Patch generated for SQL Injection', tone: 'ai', href: sqlVuln?.patchId ? `/app/vulnerabilities/${sqlVuln.id}/patch` : null },
    { id: nid('act'), at: iso(-20 * 60 * 1000), message: 'CyberGuard Backend scan completed', tone: 'info', href: '/app/scans' },
    { id: nid('act'), at: iso(-3 * HOUR), message: 'Trivy flagged pyyaml 5.3.1 in PatchPilot API', tone: 'warning', href: '/app/vulnerabilities' },
    { id: nid('act'), at: iso(-5 * HOUR), message: 'Gosec reported an unpinned JWT algorithm in SecureAuth', tone: 'warning', href: '/app/vulnerabilities' },
    { id: nid('act'), at: iso(-26 * HOUR), message: 'Ledger Ingest scan completed on release', tone: 'info', href: '/app/scans' },
    { id: nid('act'), at: iso(-2 * DAY), message: 'Edge Proxy has not been scanned in 2 days', tone: 'warning', href: payment ? '/app/projects' : '/app/projects' },
  ]

  current.reports = [
    makeReport(current, 'Northline weekly exposure', 'exposure', null),
    makeReport(current, 'Payment Gateway critical brief', 'brief', payment?.id ?? null),
    makeReport(current, 'Patch verification log', 'verification', current.projects.find((item) => item.key === 'cyberguard')?.id ?? null),
  ]
  current.baselineScore = orgScore(current) - 4
  return current
}

function lastCommitOffset(key: string) {
  if (key === 'edge') return -2 * DAY
  if (key === 'ledger') return -26 * HOUR
  if (key === 'secureauth') return -5 * HOUR
  if (key === 'patchpilot') return -3 * HOUR
  if (key === 'payments') return -2 * HOUR
  return -22 * 60 * 1000
}

function resultFor(key: ScanStage['key'], open: SeverityCounts, nameLength: number) {
  const total = open.critical + open.high + open.medium + open.low
  if (key === 'repository') return 860 + nameLength * 37
  if (key === 'static' || key === 'ai') return total
  if (key === 'patch') return Math.min(total, 6)
  return Math.min(total, 5)
}

function orgScore(current: State) {
  const scores = current.projects.map((project) => presentProject(project).securityScore).filter((score) => score > 0)
  if (!scores.length) return 0
  return Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length)
}

function makeReport(current: State, title: string, kind: Report['kind'], projectId: string | null): Report {
  return {
    id: nid('rpt'),
    title,
    kind,
    projectId,
    projectName: current.projects.find((item) => item.id === projectId)?.name ?? null,
    createdAt: iso(kind === 'exposure' ? -2 * DAY : kind === 'brief' ? -5 * HOUR : -8 * HOUR),
    summary:
      kind === 'exposure'
        ? 'Open findings across Northline, grouped by severity and project.'
        : kind === 'brief'
          ? 'Critical and high findings that still need a decision on Payment Gateway.'
          : 'Patches verified or applied since the previous week.',
  }
}

function seedEmpty(session: Session): State {
  return {
    userId: session.user.id,
    workspace: 'empty',
    projects: [],
    repositories: [],
    scans: [],
    vulnerabilities: [],
    patches: [],
    activity: [
      {
        id: nid('act'),
        at: new Date().toISOString(),
        message: 'Workspace created. Connect a repository to run the first scan.',
        tone: 'info',
        href: '/app/projects/new',
      },
    ],
    reports: [],
    settings: defaultSettings(),
    baselineScore: 0,
  }
}

function resumeTimers() {
  if (!state) return
  for (const scan of state.scans) {
    if (scan.status === 'running') armScan(scan.id)
  }
  for (const patch of state.patches) {
    if (patch.status === 'validating') armValidation(patch.id)
  }
}

export function ensureStore(session: Session) {
  if (state && state.userId === session.user.id && state.workspace === session.workspace) return
  stopTimers()
  const saved = sessionStorage.getItem(STORAGE_KEY)
  if (saved) {
    try {
      const parsed = JSON.parse(saved) as State
      if (parsed.userId === session.user.id && parsed.workspace === session.workspace) {
        state = parsed
        resumeTimers()
        return
      }
    } catch {
      sessionStorage.removeItem(STORAGE_KEY)
    }
  }
  state = session.workspace === 'demo' ? seedDemo(session) : seedEmpty(session)
  persist()
}

export function resetStore() {
  stopTimers()
  state = null
  sessionStorage.removeItem(STORAGE_KEY)
}

function stopTimers() {
  for (const timer of scanTimers.values()) window.clearInterval(timer)
  for (const timer of validationTimers.values()) window.clearInterval(timer)
  scanTimers.clear()
  validationTimers.clear()
}

export function getOverview(): Overview {
  const current = requireState()
  const { open, fixed } = orgOpen()
  const projects = current.projects.map(presentProject)
  const score = projects.some((project) => project.scanFreshness !== 'unscanned')
    ? Math.round(
        projects.filter((project) => project.securityScore > 0).reduce((sum, project) => sum + project.securityScore, 0) /
          Math.max(1, projects.filter((project) => project.securityScore > 0).length),
      )
    : 0
  return {
    score,
    scoreDelta: score - current.baselineScore,
    open,
    fixed,
    projects: current.projects.length,
    repositories: current.repositories.length,
    runningScans: current.scans.filter((scan) => scan.status === 'running').length,
    trend: trend(open),
    activity: current.activity.slice(0, 8),
    attention: current.vulnerabilities
      .filter((vuln) => isOpenStatus(vuln.status))
      .sort(compareVulns)
      .slice(0, 6)
      .map(listItem),
  }
}

function trend(open: SeverityCounts): TrendPoint[] {
  const format = new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', timeZone: 'Asia/Kolkata' })
  return Array.from({ length: 8 }, (_, index) => {
    const back = 7 - index
    return {
      label: format.format(new Date(Date.now() - back * 7 * DAY)),
      critical: open.critical + Math.round(back * 0.5),
      high: open.high + back,
      medium: open.medium + back * 2,
      low: open.low + Math.max(0, back - 1),
    }
  })
}

export function listProjects() {
  return requireState().projects.map(presentProject)
}

export function getProject(projectId: string) {
  return presentProject(projectById(projectId))
}

export function createProject(input: CreateProjectInput) {
  const current = requireState()
  const name = input.name.trim()
  if (name.length < 2) throw new ApiError(400, 'Project name needs at least 2 characters.')
  if (!input.language.trim()) throw new ApiError(400, 'Choose a language.')
  const project: ProjectRecord = {
    id: nid('prj'),
    key: name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
    name,
    description: input.description.trim(),
    language: input.language,
    framework: input.framework.trim() || '—',
    repositoryId: null,
    createdAt: new Date().toISOString(),
  }
  current.projects.unshift(project)
  pushActivity(`Project ${name} created`, 'info', `/app/projects/${project.id}`)
  persist()
  return presentProject(project)
}

export function listRepositories() {
  return requireState().repositories
}

export function lookupRepository(input: { url: string; branch?: string }): LookupResult {
  requireState()
  const url = input.url.trim()
  const match = url.match(/github\.com[:/]+([^/\s]+)\/([^/\s#.]+)/i)
  if (!match) throw new ApiError(400, 'Enter a GitHub URL such as https://github.com/org/repo.')
  const repo = match[2].replace(/\.git$/, '')
  const owner = match[1]
  return {
    name: `${owner}/${repo}`,
    url: `https://github.com/${owner}/${repo}`,
    branch: input.branch?.trim() || 'main',
    language: 'Unknown',
    visibility: 'private',
    lastCommit: null,
  }
}

export function connectRepository(input: ConnectRepositoryInput) {
  const current = requireState()
  const project = projectById(input.projectId)
  if (project.repositoryId) throw new ApiError(409, 'This project already has a repository. Create another project to connect a second one.')
  let name = input.name?.trim() || 'repository'
  let url = input.url?.trim() || ''
  let branch = input.branch?.trim() || 'main'
  let commit: Repository['lastCommit'] = null
  if (input.provider === 'github') {
    const looked = lookupRepository({ url, branch })
    name = looked.name
    url = looked.url
    branch = looked.branch
    commit = {
      sha: sha(url),
      message: 'Parsed from the repository URL',
      author: 'workspace',
      committedAt: new Date().toISOString(),
    }
  } else {
    name = (input.fileName || name).replace(/\.zip$/i, '')
    url = input.provider === 'zip' ? `upload://${name}.zip` : `folder://${name}`
    commit = {
      sha: sha(name),
      message: input.provider === 'zip' ? 'Uploaded archive' : 'Uploaded working tree',
      author: 'workspace',
      committedAt: new Date().toISOString(),
    }
  }
  const repository: Repository = {
    id: nid('repo'),
    projectId: project.id,
    name,
    provider: input.provider,
    url,
    branch,
    language: input.language?.trim() || project.language,
    visibility: 'private',
    lastCommit: commit,
    connectedAt: new Date().toISOString(),
  }
  current.repositories.unshift(repository)
  project.repositoryId = repository.id
  pushActivity(`Connected ${name}`, 'info', '/app/repositories')
  persist()
  return repository
}

export function listScans(projectId?: string) {
  return requireState()
    .scans.filter((scan) => (projectId ? scan.projectId === projectId : true))
    .map(presentScan)
}

export function getScan(scanId: string) {
  const scan = requireState().scans.find((item) => item.id === scanId)
  if (!scan) throw new ApiError(404, 'Scan not found.')
  return presentScan(scan)
}

export function startScan(projectId: string) {
  const current = requireState()
  const project = projectById(projectId)
  const repository = current.repositories.find((item) => item.id === project.repositoryId)
  if (!repository) throw new ApiError(409, 'Connect a repository before starting a scan.')
  const running = current.scans.find((scan) => scan.projectId === projectId && scan.status === 'running')
  if (running) return presentScan(running)
  const stages = stageBlueprint()
  stages[0].status = 'running'
  stages[0].progress = 8
  stages[0].startedAt = new Date().toISOString()
  stages[0].detail = stages[0].steps[0].label
  stages[0].steps[0].status = 'running'
  const scan: ScanRecord = {
    id: nid('scan'),
    projectId: project.id,
    projectName: project.name,
    repositoryId: repository.id,
    repositoryName: repository.name,
    branch: repository.branch,
    status: 'running' as ScanStatus,
    trigger: 'manual',
    startedAt: new Date().toISOString(),
    completedAt: null,
    stages,
    findings: emptyCounts(),
    commitSha: repository.lastCommit?.sha ?? sha(repository.name),
    discovered: false,
  }
  current.scans.unshift(scan)
  pushActivity(`Scan started for ${project.name}`, 'info', `/app/scans/${scan.id}`)
  armScan(scan.id)
  persist()
  return presentScan(scan)
}

function armScan(scanId: string) {
  const existing = scanTimers.get(scanId)
  if (existing) window.clearInterval(existing)
  scanTimers.set(scanId, window.setInterval(() => tickScan(scanId), 900))
}

function tickScan(scanId: string) {
  if (!state) return
  const scan = state.scans.find((item) => item.id === scanId)
  if (!scan || scan.status !== 'running') {
    const timer = scanTimers.get(scanId)
    if (timer) window.clearInterval(timer)
    scanTimers.delete(scanId)
    return
  }
  const stage = scan.stages.find((item) => item.status === 'running')
  if (!stage) {
    finishScan(scan)
    return
  }
  stage.progress = Math.min(100, stage.progress + 17)
  const stepIndex = Math.min(stage.steps.length - 1, Math.floor((stage.progress / 100) * stage.steps.length))
  stage.steps.forEach((step, index) => {
    step.status = index < stepIndex ? 'completed' : index === stepIndex ? 'running' : 'pending'
  })
  stage.detail = stage.steps[stepIndex]?.label ?? stage.detail
  if (stage.progress >= 100) completeStage(scan, stage)
  persist()
}

function completeStage(scan: ScanRecord, stage: ScanStage) {
  if (!state) return
  stage.status = 'completed'
  stage.progress = 100
  stage.steps.forEach((step) => {
    step.status = 'completed'
  })
  stage.durationMs = stage.startedAt ? Date.now() - new Date(stage.startedAt).getTime() : 1000
  const project = projectById(scan.projectId)
  if (stage.key === 'static' && !scan.discovered && !state.vulnerabilities.some((vuln) => vuln.projectId === project.id)) {
    const drafts = discoveriesFor(project.language, project.key || 'app')
    for (const draft of drafts) {
      addDraft(state, { ...draft, projectKey: project.key }, project.id, scan.id, new Date().toISOString())
    }
    scan.discovered = true
    pushActivity(`${drafts.length} findings opened on ${project.name}`, 'warning', `/app/vulnerabilities?projectId=${project.id}`)
  }
  if (stage.key === 'patch') {
    const created = ensurePatches(project.id)
    stage.resultCount = created
    stage.detail = created ? `${created} patches drafted` : 'No new patches'
    pushActivity(created ? `Patch generated for ${project.name}` : `${project.name} had no new patches`, 'ai', `/app/scans/${scan.id}`)
  } else if (stage.key === 'repository') {
    const repository = state.repositories.find((item) => item.id === scan.repositoryId)
    stage.resultCount = 860 + (repository?.name.length ?? 8) * 37
    stage.detail = 'Tree indexed'
  } else if (stage.key === 'static' || stage.key === 'ai') {
    const { open } = countsFor(project.id)
    stage.resultCount = open.critical + open.high + open.medium + open.low
    stage.detail = stage.key === 'ai' ? 'Root cause written' : 'Rules finished'
  } else {
    const waiting = state.patches.filter((patch) => patch.projectId === project.id && patch.status === 'generated').length
    stage.resultCount = waiting
    stage.detail = waiting ? `${waiting} patches waiting for verification` : 'Nothing queued'
  }
  const next = scan.stages.find((item) => item.status === 'pending')
  if (!next) {
    finishScan(scan)
    return
  }
  next.status = 'running'
  next.progress = 8
  next.startedAt = new Date().toISOString()
  next.detail = next.steps[0]?.label ?? 'Running'
  if (next.steps[0]) next.steps[0].status = 'running'
}

function ensurePatches(projectId: string) {
  if (!state) return 0
  let created = 0
  for (const vuln of state.vulnerabilities) {
    if (vuln.projectId !== projectId || vuln.patchId || !vuln.remediation) continue
    if (vuln.status === 'accepted_risk' || vuln.status === 'fixed') continue
    createPatchRecord(vuln, 'generated', new Date().toISOString())
    if (vuln.status === 'unresolved' || vuln.status === 'in_review') vuln.status = 'patch_ready'
    vuln.updatedAt = new Date().toISOString()
    created += 1
  }
  return created
}

function finishScan(scan: ScanRecord) {
  if (!state) return
  scan.status = 'completed'
  scan.completedAt = new Date().toISOString()
  scan.findings = countsFor(scan.projectId).open
  const timer = scanTimers.get(scan.id)
  if (timer) window.clearInterval(timer)
  scanTimers.delete(scan.id)
  pushActivity(`Scan completed for ${scan.projectName}`, 'secure', `/app/scans/${scan.id}`)
  persist()
}

function compareVulns(a: VulnRecord, b: VulnRecord) {
  const rank = severityRank(a.severity) - severityRank(b.severity)
  if (rank !== 0) return rank
  if (a.confidence !== b.confidence) return b.confidence - a.confidence
  return b.discoveredAt.localeCompare(a.discoveredAt)
}

export function listVulnerabilities(query: VulnerabilityQuery): VulnerabilityListResponse {
  const current = requireState()
  const items = current.vulnerabilities.filter((vuln) => matches(vuln, query)).sort(compareVulns).map(listItem)
  return { items, total: current.vulnerabilities.length, matched: items.length }
}

function matches(vuln: VulnRecord, query: VulnerabilityQuery) {
  if (query.projectId && vuln.projectId !== query.projectId) return false
  if (query.scanId && vuln.scanId !== query.scanId) return false
  if (query.severity && vuln.severity !== query.severity) return false
  if (query.scanner && vuln.scanner !== query.scanner) return false
  if (query.language && vuln.language !== query.language) return false
  if (query.status === 'open') {
    if (!isOpenStatus(vuln.status)) return false
  } else if (query.status && vuln.status !== query.status) return false
  if (query.q) {
    const haystack = `${vuln.title} ${vuln.file} ${vuln.cwe} ${vuln.cweName} ${vuln.scanner} ${vuln.summary}`.toLowerCase()
    if (!haystack.includes(query.q.toLowerCase())) return false
  }
  return true
}

export function getVulnerability(vulnerabilityId: string) {
  const vuln = requireState().vulnerabilities.find((item) => item.id === vulnerabilityId)
  if (!vuln) throw new ApiError(404, 'Vulnerability not found.')
  return presentVulnerability(vuln)
}

export function updateVulnerability(vulnerabilityId: string, status: VulnStatus) {
  const current = requireState()
  const vuln = current.vulnerabilities.find((item) => item.id === vulnerabilityId)
  if (!vuln) throw new ApiError(404, 'Vulnerability not found.')
  const allowed = new Set<VulnStatus>(['unresolved', 'in_review', 'accepted_risk'])
  if (!allowed.has(status)) throw new ApiError(400, 'That status is set by patch validation, not directly.')
  if (vuln.status === 'validating') throw new ApiError(409, 'Validation is still running.')
  if (vuln.status === 'fixed') throw new ApiError(409, 'This finding is already fixed.')
  vuln.status = status
  vuln.updatedAt = new Date().toISOString()
  pushActivity(`${vuln.title} marked ${status.replaceAll('_', ' ')}`, status === 'accepted_risk' ? 'warning' : 'info', `/app/vulnerabilities/${vuln.id}`)
  persist()
  return presentVulnerability(vuln)
}

export function generatePatch(vulnerabilityId: string) {
  const vuln = requireState().vulnerabilities.find((item) => item.id === vulnerabilityId)
  if (!vuln) throw new ApiError(404, 'Vulnerability not found.')
  if (vuln.patchId) {
    const existing = requireState().patches.find((patch) => patch.id === vuln.patchId)
    if (existing) return presentPatch(existing)
  }
  if (!vuln.remediation) throw new ApiError(409, 'PatchPilot has no remediation for this finding yet.')
  const patch = createPatchRecord(vuln, 'generated', new Date().toISOString())
  if (!patch) throw new ApiError(409, 'PatchPilot has no remediation for this finding yet.')
  if (vuln.status === 'unresolved' || vuln.status === 'in_review' || vuln.status === 'accepted_risk') vuln.status = 'patch_ready'
  vuln.updatedAt = new Date().toISOString()
  pushActivity(`Patch generated for ${vuln.title}`, 'ai', `/app/vulnerabilities/${vuln.id}/patch`)
  persist()
  return presentPatch(patch)
}

export function listPatches(vulnerabilityId?: string) {
  return requireState()
    .patches.filter((patch) => (vulnerabilityId ? patch.vulnerabilityId === vulnerabilityId : true))
    .map(presentPatch)
}

export function getPatch(patchId: string) {
  const patch = requireState().patches.find((item) => item.id === patchId)
  if (!patch) throw new ApiError(404, 'Patch not found.')
  return presentPatch(patch)
}

export function getPatchForVulnerability(vulnerabilityId: string) {
  const vuln = requireState().vulnerabilities.find((item) => item.id === vulnerabilityId)
  if (!vuln?.patchId) throw new ApiError(404, 'No patch has been generated for this finding.')
  return getPatch(vuln.patchId)
}

export function startValidation(patchId: string) {
  const current = requireState()
  const patch = current.patches.find((item) => item.id === patchId)
  if (!patch) throw new ApiError(404, 'Patch not found.')
  const vuln = current.vulnerabilities.find((item) => item.id === patch.vulnerabilityId)
  patch.status = 'validating'
  patch.verifiedAt = null
  patch.checks = checkTemplates('pending', 'waiting')
  patch.checks[0].status = 'running'
  patch.checks[0].detail = 'Running'
  if (vuln && vuln.status !== 'fixed') {
    vuln.status = 'validating'
    vuln.updatedAt = new Date().toISOString()
  }
  pushActivity(`Validation started for ${patch.vulnerabilityTitle}`, 'info', `/app/patches/${patch.id}/validate`)
  armValidation(patch.id)
  persist()
  return presentPatch(patch)
}

function armValidation(patchId: string) {
  const existing = validationTimers.get(patchId)
  if (existing) window.clearInterval(existing)
  validationTimers.set(patchId, window.setInterval(() => tickValidation(patchId), 800))
}

function tickValidation(patchId: string) {
  if (!state) return
  const patch = state.patches.find((item) => item.id === patchId)
  if (!patch || patch.status !== 'validating') {
    const timer = validationTimers.get(patchId)
    if (timer) window.clearInterval(timer)
    validationTimers.delete(patchId)
    return
  }
  const running = patch.checks.find((check) => check.status === 'running')
  if (running) {
    running.status = 'passed'
    running.durationMs = 480 + Math.round(Math.random() * 700)
    running.detail = 'Passed'
  }
  const next = patch.checks.find((check) => check.status === 'pending')
  if (next) {
    next.status = 'running'
    next.detail = 'Running'
  } else if (patch.checks.every((check) => check.status === 'passed')) {
    patch.status = 'verified'
    patch.verifiedAt = new Date().toISOString()
    const vuln = state.vulnerabilities.find((item) => item.id === patch.vulnerabilityId)
    if (vuln && vuln.status !== 'fixed') {
      vuln.status = 'verified'
      vuln.updatedAt = new Date().toISOString()
    }
    const timer = validationTimers.get(patchId)
    if (timer) window.clearInterval(timer)
    validationTimers.delete(patchId)
    pushActivity(`Validation completed for ${patch.vulnerabilityTitle}`, 'secure', `/app/patches/${patch.id}/validate`)
  }
  persist()
}

export function applyPatch(patchId: string, action: 'download' | 'pull_request' | 'mark_applied'): DiffDownload | PullRequestDraft | Patch {
  const current = requireState()
  const patch = current.patches.find((item) => item.id === patchId)
  if (!patch) throw new ApiError(404, 'Patch not found.')
  if (action === 'download') {
    const filename = `${patch.filename.split('/').at(-1) ?? 'patch'}.diff`
    return {
      filename: `patchpilot-${patch.id.slice(0, 8)}-${filename}`,
      diff: unifiedDiff(patch.filename, patch.before, patch.after),
      delivery: 'file',
    }
  }
  if (action === 'pull_request') {
    const project = current.projects.find((item) => item.id === patch.projectId)
    const repository = current.repositories.find((item) => item.id === project?.repositoryId)
    const draft: PullRequestDraft = {
      branch: `patchpilot/${patch.vulnerabilityTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`,
      base: repository?.branch ?? 'main',
      title: `fix: ${patch.vulnerabilityTitle} in ${patch.filename}`,
      body: `${patch.explanation}\n\nFinding: ${patch.vulnerabilityTitle}\nFile: ${patch.filename}\nGenerated by PatchPilot Analyst.`,
      delivery: 'local',
      detail: 'Prepared in this workspace. No remote was contacted. Copy the request or download the diff to open it yourself.',
    }
    pushActivity(`Pull request prepared for ${patch.vulnerabilityTitle}`, 'info', `/app/vulnerabilities/${patch.vulnerabilityId}/patch`)
    persist()
    return draft
  }
  if (patch.status !== 'verified' && patch.status !== 'applied') {
    throw new ApiError(409, 'Validate the patch before marking it applied.')
  }
  patch.status = 'applied'
  patch.appliedAt = new Date().toISOString()
  const vuln = current.vulnerabilities.find((item) => item.id === patch.vulnerabilityId)
  if (vuln) {
    vuln.status = 'fixed'
    vuln.updatedAt = patch.appliedAt
  }
  pushActivity(`${patch.vulnerabilityTitle} resolved`, 'secure', `/app/vulnerabilities/${patch.vulnerabilityId}`)
  persist()
  return presentPatch(patch)
}

export function listActivity() {
  return requireState().activity
}

export function workspaceMeta(): WorkspaceMeta {
  const current = requireState()
  const scanners = Array.from(new Set(current.vulnerabilities.map((vuln) => vuln.scanner))).sort()
  const languages = Array.from(new Set(current.vulnerabilities.map((vuln) => vuln.language))).sort()
  return {
    scanners: scanners.length ? scanners : ['Semgrep', 'CodeQL', 'Bandit', 'Gitleaks', 'Trivy', 'Gosec'],
    languages: languages.length ? languages : ['Python', 'TypeScript', 'Go', 'Java', 'Rust'],
    statuses: ['open', 'unresolved', 'in_review', 'patch_ready', 'validating', 'verified', 'fixed', 'accepted_risk'],
  }
}

function reportMarkdown(report: Report) {
  const current = requireState()
  const overview = getOverview()
  const vulns = current.vulnerabilities.filter((vuln) => (report.projectId ? vuln.projectId === report.projectId : true))
  const lines = [
    `# ${report.title}`,
    '',
    `Generated ${report.createdAt}`,
    '',
    report.summary,
    '',
    `Security score: ${overview.score}`,
    `Critical ${overview.open.critical} · High ${overview.open.high} · Medium ${overview.open.medium} · Low ${overview.open.low} · Fixed ${overview.fixed}`,
    '',
    '## Findings',
    '',
  ]
  for (const vuln of vulns.sort(compareVulns).slice(0, 40)) {
    lines.push(`- ${vuln.severity.toUpperCase()} ${vuln.title} — ${vuln.file}:${vuln.line} (${vuln.cwe}, ${vuln.status})`)
  }
  lines.push('')
  return lines.join('\n')
}

export function listReports() {
  return requireState().reports
}

export function getReport(reportId: string): ReportDocument {
  const report = requireState().reports.find((item) => item.id === reportId)
  if (!report) throw new ApiError(404, 'Report not found.')
  return { report, markdown: reportMarkdown(report) }
}

export function createReport(input: { title?: string; projectId?: string | null; kind?: Report['kind'] }) {
  const current = requireState()
  const project = input.projectId ? projectById(input.projectId) : null
  const report = makeReport(
    current,
    input.title?.trim() || (project ? `${project.name} exposure` : 'Workspace exposure'),
    input.kind ?? 'exposure',
    project?.id ?? null,
  )
  report.createdAt = new Date().toISOString()
  current.reports.unshift(report)
  pushActivity(`Report created: ${report.title}`, 'info', '/app/reports')
  persist()
  return report
}

export function getSettings() {
  return requireState().settings
}

export function updateSettings(patch: Partial<Settings>) {
  const current = requireState()
  current.settings = {
    ...current.settings,
    ...patch,
    scanners: { ...current.settings.scanners, ...patch.scanners },
  }
  localStorage.setItem('patchpilot.theme', current.settings.theme)
  localStorage.setItem('patchpilot.apiBaseUrl', current.settings.apiBaseUrl)
  persist()
  return current.settings
}
