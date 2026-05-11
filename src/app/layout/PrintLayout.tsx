interface Props {
  children: React.ReactNode
}

export function PrintLayout({ children }: Props) {
  return (
    <div style={{
      minHeight: '100vh',
      background: '#fff',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '24px 16px 48px',
    }}>
      <div style={{
        width: '100%',
        maxWidth: 794,
      }}>
        {children}
      </div>
    </div>
  )
}
