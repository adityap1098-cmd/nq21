interface FormFieldProps {
  label: string
  htmlFor?: string
  helper?: string
  error?: string
  required?: boolean
  children: React.ReactNode
}

export function FormField({ label, htmlFor, helper, error, required, children }: FormFieldProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label
        htmlFor={htmlFor}
        style={{
          fontFamily: 'var(--mono)',
          fontSize: 10,
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          color: error ? 'var(--accent)' : 'var(--text-muted)',
          display: 'block',
        }}
      >
        {label}
        {required && (
          <span style={{ color: 'var(--accent)', marginLeft: 4 }}>*</span>
        )}
      </label>
      {children}
      {(error || helper) && (
        <div
          style={{
            fontSize: 11.5,
            color: error ? 'var(--accent)' : 'var(--text-muted)',
            marginTop: 2,
          }}
        >
          {error ?? helper}
        </div>
      )}
    </div>
  )
}
