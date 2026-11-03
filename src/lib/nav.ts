import {
  Boxes,
  FileDiff,
  FileText,
  GitBranch,
  LayoutDashboard,
  Radar,
  Settings,
  ShieldAlert,
  CircleUser,
  type LucideIcon,
} from 'lucide-react'

export interface NavItem {
  to: string
  label: string
  icon: LucideIcon
  end?: boolean
}

export const PRIMARY_NAV: NavItem[] = [
  { to: '/app', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/app/projects', label: 'Projects', icon: Boxes },
  { to: '/app/repositories', label: 'Repositories', icon: GitBranch },
  { to: '/app/scans', label: 'Scans', icon: Radar },
  { to: '/app/vulnerabilities', label: 'Vulnerabilities', icon: ShieldAlert },
  { to: '/app/patches', label: 'Patches', icon: FileDiff },
  { to: '/app/reports', label: 'Reports', icon: FileText },
]

export const SECONDARY_NAV: NavItem[] = [
  { to: '/app/settings', label: 'Settings', icon: Settings },
  { to: '/app/profile', label: 'Profile', icon: CircleUser },
]

export const COMMAND_ROUTES = [...PRIMARY_NAV, ...SECONDARY_NAV]
