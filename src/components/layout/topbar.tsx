import { Bell, Menu, Search } from 'lucide-react'
import { Link } from 'react-router'
import { ActivityFeed } from '@/components/security/activity-feed'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { useSession } from '@/context/session'
import { useActivity } from '@/hooks/queries'
import { initials } from '@/lib/utils'

export function Topbar({ onMenu, onSearch }: { onMenu: () => void; onSearch: () => void }) {
  const { session, signOutWorkspace } = useSession()
  const activity = useActivity()
  const user = session?.user
  return (
    <header className="flex h-14 items-center gap-3 border-b border-line bg-background/80 px-3 backdrop-blur sm:px-4">
      <button type="button" className="rounded-md p-2 text-secondary hover:bg-foreground/5 lg:hidden" onClick={onMenu} aria-label="Open navigation">
        <Menu className="size-4" />
      </button>
      <button type="button" onClick={onSearch} className="flex h-8 min-w-0 flex-1 items-center gap-2 rounded-md border border-line bg-inset px-2.5 text-[12px] text-muted transition-colors hover:border-line-strong sm:max-w-sm">
        <Search className="size-3.5" />
        <span className="truncate">Search the workspace</span>
        <kbd className="ml-auto hidden rounded-sm border border-line px-1 font-mono text-[10px] sm:inline">Ctrl K</kbd>
      </button>
      <div className="ml-auto flex items-center gap-1">
        <DropdownMenu>
          <DropdownMenuTrigger className="rounded-md p-2 text-secondary hover:bg-foreground/5 hover:text-foreground" aria-label="Security activity">
            <Bell className="size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-[min(380px,calc(100vw-2rem))] p-0">
            <div className="px-4 py-2.5 text-[11px] tracking-[0.14em] text-muted uppercase">Live security activity</div>
            <ActivityFeed events={(activity.data ?? []).slice(0, 6)} />
          </DropdownMenuContent>
        </DropdownMenu>
        <DropdownMenu>
          <DropdownMenuTrigger className="ml-1 grid size-8 place-items-center rounded-full border border-line bg-elevated text-[11px] font-medium" aria-label="Account">
            {user ? initials(user.name) : '—'}
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuLabel>{user?.organization ?? 'Workspace'}</DropdownMenuLabel>
            <DropdownMenuItem>
              <Link to="/app/profile" className="w-full">Profile</Link>
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Link to="/app/settings" className="w-full">Settings</Link>
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => void signOutWorkspace()}>Sign out</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
