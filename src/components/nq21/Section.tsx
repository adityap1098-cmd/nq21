import { useIsMobile } from '@/lib/hooks/useIsMobile'

interface SectionProps {
  title: string
  subtitle?: string
  action?: React.ReactNode
  children: React.ReactNode
}

export function Section({ title, subtitle, action, children }: SectionProps) {
  const isMobile = useIsMobile()
  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: isMobile ? 14 : 18,
          flexWrap: isMobile ? 'wrap' : undefined,
          gap: isMobile ? 10 : undefined,
        }}
      >
        <div style={isMobile ? { minWidth: 0 } : undefined}>
          <h3
            style={{
              fontFamily: 'var(--display)',
              fontSize: 22,
              textTransform: 'uppercase',
              lineHeight: 1.05,
              margin: 0,
              color: 'var(--text)',
            }}
          >
            {title}
          </h3>
          {subtitle && (
            <div
              style={{
                fontFamily: 'var(--mono)',
                fontSize: 10.5,
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                color: 'var(--text-muted)',
                marginTop: 4,
              }}
            >
              {subtitle}
            </div>
          )}
        </div>
        {action}
      </div>
      {children}
    </div>
  )
}
