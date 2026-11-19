import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { useIsMobile } from '@/lib/hooks/useIsMobile'

const MOBILE_DIALOG_CLASS = 'w-[calc(100%-24px)] max-h-[calc(100dvh-24px)] overflow-y-auto p-5'

interface ConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'destructive' | 'default'
  onConfirm: () => void
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  message,
  confirmLabel = 'Konfirmasi',
  cancelLabel = 'Batal',
  variant = 'default',
  onConfirm,
}: ConfirmDialogProps) {
  const isMobile = useIsMobile()
  const handleConfirm = () => {
    onConfirm()
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={isMobile ? MOBILE_DIALOG_CLASS : undefined}>
        <DialogHeader>
          <DialogTitle className={isMobile ? 'pr-8 leading-tight' : undefined}>{title}</DialogTitle>
          <DialogDescription>{message}</DialogDescription>
        </DialogHeader>
        <DialogFooter className={isMobile ? 'flex-wrap' : undefined}>
          <Button variant="ghost" onClick={() => onOpenChange(false)} className={isMobile ? 'h-10 flex-1' : undefined}>
            {cancelLabel}
          </Button>
          <Button
            variant={variant === 'destructive' ? 'accent' : 'default'}
            onClick={handleConfirm}
            className={isMobile ? 'h-10 flex-1' : undefined}
          >
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
