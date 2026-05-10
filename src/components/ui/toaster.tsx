import { useToasts, dismissToast } from '@/hooks/use-toast'
import {
  ToastProvider, ToastViewport,
  Toast, ToastTitle, ToastDescription, ToastClose,
} from './toast'

export function Toaster() {
  const toasts = useToasts()

  return (
    <ToastProvider>
      {toasts.map((t) => (
        <Toast key={t.id} variant={t.variant}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <ToastTitle>{t.title}</ToastTitle>
            {t.description && <ToastDescription>{t.description}</ToastDescription>}
          </div>
          <ToastClose onClick={() => dismissToast(t.id)} />
        </Toast>
      ))}
      <ToastViewport />
    </ToastProvider>
  )
}
