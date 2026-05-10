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
          {t.action && (
            <button
              onClick={() => { t.action!.onClick(); dismissToast(t.id) }}
              style={{
                padding: '4px 10px', borderRadius: 6, cursor: 'pointer',
                border: '1px solid rgba(255,255,255,0.25)',
                background: 'rgba(255,255,255,0.12)',
                color: '#fff', fontSize: 12, fontWeight: 600,
                whiteSpace: 'nowrap', flexShrink: 0,
              }}
            >
              {t.action.label}
            </button>
          )}
          <ToastClose onClick={() => dismissToast(t.id)} />
        </Toast>
      ))}
      <ToastViewport />
    </ToastProvider>
  )
}
