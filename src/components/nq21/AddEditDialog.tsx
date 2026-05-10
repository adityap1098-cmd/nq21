import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

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

  return (
    <Dialog open={open} onOpenChange={open => { if (!open) onClose() }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '4px 0' }}>
          {children}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={loading}>
            Batal
          </Button>
          <Button variant="accent" onClick={onSubmit} disabled={loading}>
            {loading ? 'Menyimpan...' : label}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
