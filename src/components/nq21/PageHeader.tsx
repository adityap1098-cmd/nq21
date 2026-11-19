import { useIsMobile } from '@/lib/hooks/useIsMobile'

interface PageHeaderProps {
  title: string
  subtitle?: string
  action?: React.ReactNode
}

export function PageHeader({ title, subtitle, action }: PageHeaderProps) {
  const isMobile = useIsMobile()
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        justifyContent: 'space-between',
        alignItems: isMobile ? 'stretch' : 'flex-start',
        gap: isMobile ? 12 : 0,
        marginBottom: isMobile ? 18 : 28,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'stretch', gap: isMobile ? 10 : 14, minWidth: 0 }}>
        <div style={{ width: 3, background: 'var(--accent)', flexShrink: 0 }} />
        <div style={{ minWidth: 0 }}>
          <h1
            style={{
              fontFamily: 'var(--display)',
              fontSize: isMobile ? 26 : 36,
              textTransform: 'uppercase',
              lineHeight: 1.05,
              color: 'var(--text)',
              margin: 0,
              overflowWrap: 'anywhere',
            }}
          >
            {title}
          </h1>
          {subtitle && (
            <div style={{ fontSize: isMobile ? 12.5 : 13.5, color: 'var(--text-muted)', marginTop: 4 }}>
              {subtitle}
            </div>
          )}
        </div>
      </div>
      {action && (
        <div style={{ flexShrink: 0, display: 'flex', flexWrap: 'wrap', gap: 8, maxWidth: '100%' }}>
          {action}
        </div>
      )}
    </div>
  )
}
