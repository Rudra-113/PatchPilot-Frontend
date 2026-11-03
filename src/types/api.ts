export type Severity = 'critical' | 'high' | 'medium' | 'low'

export type VulnStatus =
  | 'unresolved'
  | 'in_review'
  | 'patch_ready'
  | 'validating'
  | 'verified'
  | 'fixed'
  | 'accepted_risk'

export type ScanStatus = 'queued' | 'running' | 'completed' | 'failed'
export type StageStatus = 'pending' | 'running' | 'completed' | 'failed' | 'skipped'
export type StepStatus = 'pending' | 'running' | 'completed'
export type PatchStatus = 'generated' | 'validating' | 'verified' | 'applied' | 'failed'
export type CheckStatus = 'pending' | 'running' | 'passed' | 'failed'
export type RepoProvider = 'github' | 'zip' | 'upload'
export type ThemeMode = 'dark' | 'light'
export type WorkspaceMode = 'demo' | 'empty'
export type ScanFreshness = 'unscanned' | 'fresh' | 'aging' | 'stale'

export interface SeverityCounts {
  critical: number
  high: number
  medium: number
  low: number
}

export interface User {
  id: string
  name: string
  email: string
  role: string
  organization: string
  timezone: string
}

export interface Session {
  token: string
  user: User
  workspace: WorkspaceMode
  issuedAt: string
}

export interface Repository {
  id: string
  projectId: string
  name: string
  provider: RepoProvider
  url: string
  branch: string
  language: string
  visibility: 'private' | 'internal'
  lastCommit: {
    sha: string
    message: string
    author: string
    committedAt: string
  } | null
  connectedAt: string
}

export interface ProjectSummary {
  id: string
  name: string
  description: string
  language: string
  framework: string
  securityScore: number
  open: SeverityCounts
  fixed: number
  lastScanAt: string | null
  lastPatchAt: string | null
  scanFreshness: ScanFreshness
  createdAt: string
  repository: {
    id: string
    name: string
    url: string
    branch: string
    provider: RepoProvider
  } | null
}

export interface ScanStep {
  label: string
  status: StepStatus
}

export interface ScanStage {
  key: 'repository' | 'static' | 'ai' | 'patch' | 'validation'
  name: string
  scanner: string
  status: StageStatus
  progress: number
  startedAt: string | null
  durationMs: number | null
  resultCount: number | null
  detail: string
  steps: ScanStep[]
}

export interface Scan {
  id: string
  projectId: string
  projectName: string
  repositoryId: string
  repositoryName: string
  branch: string
  status: ScanStatus
  trigger: 'manual' | 'push' | 'schedule'
  startedAt: string
  completedAt: string | null
  stages: ScanStage[]
  findings: SeverityCounts
  commitSha: string
}

export interface CodeBlock {
  language: string
  filename: string
  content: string
  vulnerableLines: number[]
}

export interface Analysis {
  rootCause: string
  impact: string
  attackScenario: string
  recommendedFix: string
  confidence: number
}

export interface VulnerabilityListItem {
  id: string
  projectId: string
  projectName: string
  scanId: string
  title: string
  severity: Severity
  cwe: string
  cweName: string
  file: string
  line: number
  scanner: string
  language: string
  status: VulnStatus
  confidence: number
  discoveredAt: string
  patchId: string | null
}

export interface Vulnerability extends VulnerabilityListItem {
  summary: string
  endLine: number
  code: CodeBlock
  analysis: Analysis
}

export interface VulnerabilityQuery {
  q?: string
  severity?: Severity | ''
  scanner?: string
  language?: string
  status?: VulnStatus | 'open' | ''
  projectId?: string
  scanId?: string
}

export interface VulnerabilityListResponse {
  items: VulnerabilityListItem[]
  total: number
  matched: number
}

export interface ValidationCheck {
  key: 'syntax' | 'build' | 'unit' | 'security' | 'regression'
  name: string
  detail: string
  status: CheckStatus
  durationMs: number | null
}

export interface Patch {
  id: string
  vulnerabilityId: string
  projectId: string
  projectName: string
  vulnerabilityTitle: string
  severity: Severity
  status: PatchStatus
  before: string
  after: string
  language: string
  filename: string
  explanation: string
  model: string
  additions: number
  deletions: number
  checks: ValidationCheck[]
  generatedAt: string
  verifiedAt: string | null
  appliedAt: string | null
}

export interface ActivityEvent {
  id: string
  at: string
  message: string
  tone: 'info' | 'warning' | 'critical' | 'secure' | 'ai'
  href: string | null
}

export interface TrendPoint {
  label: string
  critical: number
  high: number
  medium: number
  low: number
}

export interface Overview {
  score: number
  scoreDelta: number
  open: SeverityCounts
  fixed: number
  projects: number
  repositories: number
  runningScans: number
  trend: TrendPoint[]
  activity: ActivityEvent[]
  attention: VulnerabilityListItem[]
}

export interface Report {
  id: string
  title: string
  kind: 'exposure' | 'brief' | 'verification'
  projectId: string | null
  projectName: string | null
  createdAt: string
  summary: string
}

export interface ReportDocument {
  report: Report
  markdown: string
}

export interface Settings {
  theme: ThemeMode
  emailAlerts: boolean
  scanOnPush: boolean
  scanners: {
    semgrep: boolean
    codeql: boolean
    bandit: boolean
    trivy: boolean
    gitleaks: boolean
  }
  apiBaseUrl: string
}

export interface LookupResult {
  name: string
  url: string
  branch: string
  language: string
  visibility: 'private' | 'internal'
  lastCommit: Repository['lastCommit']
}

export interface PullRequestDraft {
  branch: string
  title: string
  body: string
  base: string
  delivery: 'local'
  detail: string
}

export interface DiffDownload {
  filename: string
  diff: string
  delivery: 'file'
}

export interface WorkspaceMeta {
  scanners: string[]
  languages: string[]
  statuses: Array<VulnStatus | 'open'>
}

export interface CreateProjectInput {
  name: string
  description: string
  language: string
  framework: string
}

export interface ConnectRepositoryInput {
  projectId: string
  provider: RepoProvider
  url?: string
  branch?: string
  name?: string
  language?: string
  fileName?: string
}

export interface Credentials {
  email: string
  password: string
}
