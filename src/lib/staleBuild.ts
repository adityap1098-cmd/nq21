/**
 * Recovery when the tab is running an older build than the one deployed.
 *
 * Every deploy renames the lazy page chunks (Dashboard-<hash>.js, ...) and Vercel no
 * longer serves the old names, so a tab opened before the deploy gets a 404 the first
 * time it navigates to a page it has not loaded yet ("Failed to fetch dynamically
 * imported module"). Activate a waiting service worker if there is one, then reload
 * once to pick up the new build. Guarded so a persistent failure cannot reload-loop.
 */
const RELOAD_GUARD_KEY = 'nq21:stale-build-reload-at'
const RELOAD_GUARD_MS = 30_000
const SW_ACTIVATE_TIMEOUT_MS = 3_000

export function isChunkLoadError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err ?? '')
  return /Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module/i.test(msg)
}

/** Returns false when a reload was already attempted recently (caller should show an error). */
export function reloadForNewBuild(): boolean {
  try {
    const last = Number(sessionStorage.getItem(RELOAD_GUARD_KEY) ?? 0)
    if (Date.now() - last < RELOAD_GUARD_MS) return false
    sessionStorage.setItem(RELOAD_GUARD_KEY, String(Date.now()))
  } catch {
    // sessionStorage unavailable — still try one reload
  }

  void activateWaitingWorkerThenReload()
  return true
}

async function activateWaitingWorkerThenReload(): Promise<void> {
  const reg = 'serviceWorker' in navigator ? await navigator.serviceWorker.getRegistration() : undefined
  if (reg?.waiting) {
    navigator.serviceWorker.addEventListener('controllerchange', () => window.location.reload(), { once: true })
    reg.waiting.postMessage({ type: 'SKIP_WAITING' })
    setTimeout(() => window.location.reload(), SW_ACTIVATE_TIMEOUT_MS)
    return
  }
  window.location.reload()
}

/** Vite fires this when a dynamic import (lazy page) fails to load. */
export function installStaleBuildRecovery(): void {
  window.addEventListener('vite:preloadError', (event) => {
    if (reloadForNewBuild()) event.preventDefault()
  })
}
