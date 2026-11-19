import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { useIsMobile } from '@/lib/hooks/useIsMobile'

const MOBILE_DIALOG_CLASS = 'w-[calc(100%-24px)] max-h-[calc(100dvh-24px)] overflow-y-auto p-5'
// 16px inputs stop iOS Safari from zooming in on focus
const MOBILE_FIELD_CLASS = '[&_input]:!h-10 [&_input]:!text-base [&_textarea]:!text-base [&_select]:!text-base'

interface AddEditDialogProps {
  open: boolean
  mode: 'add' | 'edit'
  title: string
  description?: string
  onClose: () => void
  onSubmit: () => void
  submitLabel?: string
  loading?: boolean
  children: React.ReactNode
}

export function AddEditDialog({
  open,
  mode,
  title,
  description,
  onClose,
  onSubmit,
  submitLabel,
  loading = false,
  children,
}: AddEditDialogProps) {
  const label = submitLabel ?? (mode === 'add' ? 'Tambah' : 'Simpan')
  const isMobile = useIsMobile()

  return (
    <Dialog open={open} onOpenChange={open => { if (!open) onClose() }}>
      <DialogContent className={isMobile ? MOBILE_DIALOG_CLASS : undefined}>
        <DialogHeader>
          <DialogTitle className={isMobile ? 'pr-8 leading-tight' : undefined}>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>

        <div
          className={isMobile ? MOBILE_FIELD_CLASS : undefined}
          style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '4px 0' }}
        >
          {children}
        </div>

        <DialogFooter className={isMobile ? 'flex-wrap' : undefined}>
          <Button variant="ghost" onClick={onClose} disabled={loading} className={isMobile ? 'h-10 flex-1' : undefined}>
            Batal
          </Button>
          <Button variant="accent" onClick={onSubmit} disabled={loading} className={isMobile ? 'h-10 flex-1' : undefined}>
            {loading ? 'Menyimpan...' : label}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
