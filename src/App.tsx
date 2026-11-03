import { lazy, Suspense, type ReactNode } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router'
import { useSession } from '@/context/session'
import { DashboardLayout } from '@/layouts/dashboard-layout'

const Landing = lazy(() => import('@/pages/landing'))
const Login = lazy(() => import('@/pages/login'))
const Overview = lazy(() => import('@/pages/overview'))
const Projects = lazy(() => import('@/pages/projects'))
const ProjectNew = lazy(() => import('@/pages/project-new'))
const ProjectDetail = lazy(() => import('@/pages/project-detail'))
const Repositories = lazy(() => import('@/pages/repositories'))
const ConnectRepository = lazy(() => import('@/pages/connect-repository'))
const Scans = lazy(() => import('@/pages/scans'))
const ScanDetail = lazy(() => import('@/pages/scan-detail'))
const Vulnerabilities = lazy(() => import('@/pages/vulnerabilities'))
const VulnerabilityDetail = lazy(() => import('@/pages/vulnerability-detail'))
const PatchView = lazy(() => import('@/pages/patch-view'))
const Validation = lazy(() => import('@/pages/validation'))
const Patches = lazy(() => import('@/pages/patches'))
const Reports = lazy(() => import('@/pages/reports'))
const Settings = lazy(() => import('@/pages/settings'))
const Profile = lazy(() => import('@/pages/profile'))
const NotFound = lazy(() => import('@/pages/not-found'))

function RequireAuth({ children }: { children: ReactNode }) {
  const { session } = useSession()
  const location = useLocation()
  if (!session) {
    const next = `${location.pathname}${location.search}`
    return <Navigate to={`/login?next=${encodeURIComponent(next)}`} replace />
  }
  return children
}

function Fallback() {
  return (
    <div className="px-6 py-8">
      <div className="h-px overflow-hidden bg-foreground/10">
        <div className="pp-route-bar h-full w-1/3 bg-accent" />
      </div>
    </div>
  )
}

export default function App() {
  return (
    <Suspense fallback={<Fallback />}>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route
          path="/app"
          element={
            <RequireAuth>
              <DashboardLayout />
            </RequireAuth>
          }
        >
          <Route index element={<Overview />} />
          <Route path="projects" element={<Projects />} />
          <Route path="projects/new" element={<ProjectNew />} />
          <Route path="projects/:projectId" element={<ProjectDetail />} />
          <Route path="repositories" element={<Repositories />} />
          <Route path="repositories/connect" element={<ConnectRepository />} />
          <Route path="scans" element={<Scans />} />
          <Route path="scans/:scanId" element={<ScanDetail />} />
          <Route path="vulnerabilities" element={<Vulnerabilities />} />
          <Route path="vulnerabilities/:vulnerabilityId" element={<VulnerabilityDetail />} />
          <Route path="vulnerabilities/:vulnerabilityId/patch" element={<PatchView />} />
          <Route path="patches" element={<Patches />} />
          <Route path="patches/:patchId/validate" element={<Validation />} />
          <Route path="reports" element={<Reports />} />
          <Route path="settings" element={<Settings />} />
          <Route path="profile" element={<Profile />} />
        </Route>
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  )
}
