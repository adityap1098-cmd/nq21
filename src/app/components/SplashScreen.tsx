export function SplashScreen() {
  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'var(--text)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      zIndex: 9999,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
        <div style={{
          width: 56, height: 56,
          background: '#fff',
          display: 'grid', placeItems: 'center',
          fontFamily: 'var(--display)', fontSize: 32,
          color: 'var(--text)', borderRadius: 8,
          flexShrink: 0,
        }}>N</div>
        <div>
          <div style={{
            fontFamily: 'var(--display)', fontSize: 28,
            letterSpacing: '0.06em', color: '#fff',
            lineHeight: 1,
          }}>NQ21</div>
          <div style={{
            fontFamily: 'var(--mono)', fontSize: 10,
            letterSpacing: '0.22em', color: 'rgba(255,255,255,0.5)',
            textTransform: 'uppercase', marginTop: 3,
          }}>PERFORMANCE</div>
        </div>
      </div>
      <div style={{ width: 120, height: 2, background: 'var(--accent)' }} />
      <div style={{
        fontFamily: 'var(--mono)', fontSize: 10,
        letterSpacing: '0.14em', color: 'rgba(255,255,255,0.3)',
        marginTop: 16,
      }}>Workshop Ops · Tracked</div>
    </div>
  )
}
