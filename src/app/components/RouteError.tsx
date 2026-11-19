import { useEffect } from 'react'
import { useRouteError } from 'react-router-dom'
import { isChunkLoadError, reloadForNewBuild } from '@/lib/staleBuild'

/**
 * Router errorElement. A missing page chunk after a deploy reloads into the new build
 * automatically (once); anything else shows a readable message instead of React
 * Router's default "Unexpected Application Error!".
 */
export function RouteError() {
  const error = useRouteError()
  const staleBuild = isChunkLoadError(error)

  useEffect(() => {
    if (staleBuild) reloadForNewBuild()
  }, [staleBuild])

  const message = error instanceof Error ? error.message : String(error ?? '')

  return (
    <div style={{
      minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24,
      background: 'var(--bg)', color: 'var(--text)', fontFamily: 'var(--body)',
    }}>
      <div style={{ maxWidth: 440, textAlign: 'center' }}>
        <div style={{ fontFamily: 'var(--display)', fontSize: 28, letterSpacing: '0.02em', marginBottom: 8 }}>
          {staleBuild ? 'VERSI BARU TERSEDIA' : 'TERJADI KESALAHAN'}
        </div>
        <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6, margin: '0 0 20px' }}>
          {staleBuild
            ? 'Aplikasi baru saja diperbarui. Halaman sedang dimuat ulang ke versi terbaru…'
            : 'Halaman ini gagal ditampilkan. Muat ulang; kalau masih terjadi, hubungi owner.'}
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          style={{
            background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 8,
            padding: '10px 18px', fontWeight: 700, cursor: 'pointer',
          }}
        >
          Muat ulang
        </button>
        {!staleBuild && message && (
          <pre style={{
            marginTop: 20, fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'pre-wrap',
            fontFamily: 'var(--mono)', textAlign: 'left',
          }}>
            {message}
          </pre>
        )}
      </div>
    </div>
  )
}
