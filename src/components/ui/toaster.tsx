import { Toaster as Sonner } from 'sonner'
import { useTheme } from '@/context/theme'

export function Toaster() {
  const { theme } = useTheme()
  return (
    <Sonner
      theme={theme}
      position="bottom-right"
      toastOptions={{ className: 'pp-toast', duration: 3200 }}
    />
  )
}
