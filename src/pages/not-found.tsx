import { Link } from 'react-router'
import { Button } from '@/components/ui/button'

export default function NotFound() {
  return (
    <div className="grid min-h-screen place-items-center px-6">
      <div>
        <p className="font-mono text-[11px] tracking-[0.16em] text-muted uppercase">404</p>
        <h1 className="mt-2 text-[22px] font-medium">That route is not part of PatchPilot.</h1>
        <Button className="mt-4" asChild><Link to="/">Return home</Link></Button>
      </div>
    </div>
  )
}
