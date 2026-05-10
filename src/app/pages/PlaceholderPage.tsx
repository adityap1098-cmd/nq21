interface PlaceholderPageProps {
  heading: string
  sub?: string
}

export default function PlaceholderPage({ heading, sub = 'Mock UI akan dibangun di milestone berikutnya.' }: PlaceholderPageProps) {
  return (
    <>
      <div className="flex items-start gap-3 mb-6">
        <div className="accent-bar" />
        <div>
          <h1 className="page-title">{heading}</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">{sub}</p>
        </div>
      </div>
      <div className="kpi-card flex flex-col items-center justify-center py-16 text-center">
        <div
          className="font-mono text-[10px] tracking-[0.18em] uppercase text-[var(--text-muted)] mb-3"
        >
          COMING SOON
        </div>
        <div className="font-display text-[32px] leading-none">{heading}</div>
        <div className="text-sm text-[var(--text-muted)] mt-3">{sub}</div>
      </div>
    </>
  )
}
