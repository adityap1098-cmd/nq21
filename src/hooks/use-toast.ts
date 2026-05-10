import { useState, useEffect } from 'react'

export type ToastVariant = 'default' | 'success' | 'destructive'

export interface ToastAction {
  label: string
  onClick: () => void
}

export interface ToastItem {
  id: string
  title: string
  description?: string
  variant?: ToastVariant
  duration?: number
  action?: ToastAction
}

// Module-level store — fine for single SPA
let _toasts: ToastItem[] = []
const _listeners = new Set<() => void>()

function _notify() {
  _listeners.forEach((l) => l())
}

export function toast(
  title: string,
  opts?: { description?: string; variant?: ToastVariant; duration?: number; action?: ToastAction }
) {
  const id = Date.now().toString(36) + Math.random().toString(36).slice(2)
  const duration = opts?.duration ?? 4000
  _toasts = [..._toasts, { id, title, ...opts }]
  _notify()
  setTimeout(() => {
    _toasts = _toasts.filter((t) => t.id !== id)
    _notify()
  }, duration)
}

export function dismissToast(id: string) {
  _toasts = _toasts.filter((t) => t.id !== id)
  _notify()
}

export function useToasts(): ToastItem[] {
  const [, rerender] = useState(0)
  useEffect(() => {
    const update = () => rerender((n) => n + 1)
    _listeners.add(update)
    return () => {
      _listeners.delete(update)
    }
  }, [])
  return _toasts
}
