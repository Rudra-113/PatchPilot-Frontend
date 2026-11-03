import { useNavigate } from 'react-router'
import { PageHeader } from '@/components/layout/page-header'
import { Button } from '@/components/ui/button'
import { useSession } from '@/context/session'
import { formatWhen } from '@/lib/format'

export default function Profile() {
  const { session, signOutWorkspace } = useSession()
  const navigate = useNavigate()
  const user = session?.user
  if (!user || !session) return null
  return (
    <>
      <PageHeader kicker={user.organization} title={user.name} description={user.role} />
      <dl className="max-w-lg space-y-3 rounded-lg border border-line bg-surface p-4 text-[13px]">
        <Row label="Email" value={user.email} />
        <Row label="Timezone" value={user.timezone} />
        <Row label="Workspace" value={session.workspace === 'demo' ? 'Northline demo' : 'Private workspace'} />
        <Row label="Session started" value={formatWhen(session.issuedAt)} />
      </dl>
      <Button
        className="mt-4"
        variant="secondary"
        onClick={() => {
          void signOutWorkspace().then(() => navigate('/login'))
        }}
      >
        Sign out
      </Button>
    </>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-line pb-3 last:border-b-0 last:pb-0">
      <dt className="text-muted">{label}</dt>
      <dd>{value}</dd>
    </div>
  )
}
