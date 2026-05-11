import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Eye, EyeOff } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { useAuthStore } from '@/store/auth'

const schema = z.object({
  email: z.string().email('Format email tidak valid'),
  password: z.string().min(1, 'Password wajib diisi'),
})
type LoginForm = z.infer<typeof schema>

export default function Login() {
  const [showPw, setShowPw] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { user, login } = useAuthStore()

  // ALL hooks must be called before any early return (Rules of Hooks)
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '' },
  })

  if (user) return <Navigate to="/" replace />

  const onSubmit = async (data: LoginForm) => {
    setIsSubmitting(true)
    setSubmitError(null)
    const error = await login(data.email, data.password)
    if (error) {
      setSubmitError(
        error.includes('Invalid login credentials')
          ? 'Email atau password salah'
          : error
      )
      setIsSubmitting(false)
    }
    // success: onAuthStateChange fires → user set → Navigate to "/" fires
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'grid',
        gridTemplateColumns: '1.05fr 0.95fr',
        background: 'var(--bg)',
      }}
    >
      {/* ── Left panel — dark visual ──────────────────── */}
      <div
        className="login-bg-overlay"
        style={{
          position: 'relative',
          background: '#0A0908',
          color: '#fff',
          padding: '48px 56px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          overflow: 'hidden',
        }}
      >
        {/* Brand mark */}
        <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              width: 44, height: 44,
              border: '2px solid #fff',
              display: 'grid', placeItems: 'center',
              fontFamily: 'var(--display)', fontSize: 24, letterSpacing: '0.02em',
              position: 'relative', flexShrink: 0,
            }}
          >
            N
            <span
              aria-hidden
              style={{
                position: 'absolute', bottom: -2, left: -2,
                width: 10, height: 4, background: 'var(--accent)',
              }}
            />
          </div>
          <div>
            <div style={{ fontFamily: 'var(--display)', fontSize: 22, letterSpacing: '0.06em', lineHeight: 1 }}>
              NQ21
            </div>
            <div
              style={{
                fontFamily: 'var(--mono)', fontWeight: 600, fontSize: 9,
                letterSpacing: '0.32em', color: 'rgba(255,255,255,0.4)',
                marginTop: 4, textTransform: 'uppercase',
              }}
            >
              PERFORMANCE
            </div>
          </div>
        </div>

        {/* Hero content */}
        <div style={{ position: 'relative', zIndex: 1 }}>
          <h1
            style={{
              fontFamily: 'var(--display)', fontSize: 88, lineHeight: 0.92,
              letterSpacing: '0.005em', margin: '0 0 24px', textTransform: 'uppercase',
            }}
          >
            Workshop<br />Ops,{' '}
            <span style={{ color: 'var(--accent)' }}>Tracked.</span>
          </h1>
          <p
            style={{
              maxWidth: 460, fontSize: 15, lineHeight: 1.6,
              color: 'rgba(255,255,255,0.72)', margin: '0 0 36px',
            }}
          >
            Pencatatan transaksi internal, komisi mekanik mingguan, dan visibility cash flow —
            dalam satu sistem yang dirancang untuk kecepatan kasir, akurasi owner.
          </p>

          {/* Metrics */}
          <div
            style={{
              display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
              borderTop: '1px solid rgba(255,255,255,0.12)', paddingTop: 28,
            }}
          >
            {[
              { v: '142', l: 'Trx Minggu Ini' },
              { v: '4', l: 'Mekanik Aktif' },
              { v: '98%', l: 'Akurasi Komisi' },
            ].map((m, i) => (
              <div
                key={i}
                style={{
                  borderRight: i < 2 ? '1px solid rgba(255,255,255,0.08)' : 'none',
                  paddingRight: i < 2 ? 24 : 0,
                }}
              >
                <div style={{ fontFamily: 'var(--display)', fontSize: 40, lineHeight: 1 }}>
                  {m.v}
                </div>
                <div
                  style={{
                    fontFamily: 'var(--mono)', fontSize: 10, textTransform: 'uppercase',
                    letterSpacing: '0.16em', color: 'rgba(255,255,255,0.5)', marginTop: 8,
                  }}
                >
                  {m.l}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            position: 'relative', zIndex: 1,
            display: 'flex', justifyContent: 'space-between',
            fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.14em',
            textTransform: 'uppercase', color: 'rgba(255,255,255,0.42)',
          }}
        >
          <div>
            <span style={{ color: 'var(--accent)' }}>●</span> SISTEM AKTIF
          </div>
          <div>v1.0 — INTERNAL ONLY</div>
        </div>
      </div>

      {/* ── Right panel — form ────────────────────────── */}
      <div
        style={{
          display: 'flex', alignItems: 'center',
          justifyContent: 'center', padding: 48,
        }}
      >
        <form
          onSubmit={handleSubmit(onSubmit)}
          style={{ width: '100%', maxWidth: 400 }}
          noValidate
        >
          {/* Eyebrow */}
          <div className="login-eyebrow">MASUK SISTEM</div>

          <h2
            style={{
              fontFamily: 'var(--display)', fontWeight: 400, fontSize: 44,
              letterSpacing: '0.01em', textTransform: 'uppercase',
              margin: '0 0 8px', lineHeight: 1.05, color: 'var(--text)',
            }}
          >
            Selamat Datang
          </h2>
          <p style={{ color: 'var(--text-muted)', margin: '0 0 36px', fontSize: 14 }}>
            Masukkan akun kamu untuk masuk ke sistem NQ21.
          </p>

          {/* Server error */}
          {submitError && (
            <div
              style={{
                marginBottom: 18, padding: '12px 14px',
                background: 'var(--accent-tint)',
                border: '1px solid var(--accent)',
                borderRadius: 8, fontSize: 13,
                color: 'var(--accent)', fontWeight: 500,
              }}
            >
              {submitError}
            </div>
          )}

          {/* Email */}
          <div style={{ marginBottom: 18 }}>
            <label
              htmlFor="email"
              style={{
                fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.16em',
                textTransform: 'uppercase', color: errors.email ? 'var(--accent)' : 'var(--text-secondary)',
                display: 'block', marginBottom: 8,
              }}
            >
              EMAIL
            </label>
            <Input
              id="email"
              type="email"
              {...register('email')}
              placeholder="akun@nq21.app"
              autoFocus
              autoComplete="email"
              style={{ padding: '13px 14px', height: 'auto', fontSize: 14 }}
            />
            {errors.email && (
              <div style={{ color: 'var(--accent)', fontSize: 11.5, marginTop: 4 }}>
                {errors.email.message}
              </div>
            )}
          </div>

          {/* Password */}
          <div style={{ marginBottom: 18 }}>
            <label
              htmlFor="password"
              style={{
                fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.16em',
                textTransform: 'uppercase', color: errors.password ? 'var(--accent)' : 'var(--text-secondary)',
                display: 'block', marginBottom: 8,
              }}
            >
              PASSWORD
            </label>
            <div style={{ position: 'relative' }}>
              <Input
                id="password"
                {...register('password')}
                type={showPw ? 'text' : 'password'}
                placeholder="••••••••"
                autoComplete="current-password"
                style={{ padding: '13px 42px 13px 14px', height: 'auto', fontSize: 14 }}
              />
              <button
                type="button"
                onClick={() => setShowPw(!showPw)}
                aria-label="Toggle password visibility"
                style={{
                  position: 'absolute', right: 6, bottom: 6,
                  width: 32, height: 32,
                  border: 'none', background: 'transparent',
                  display: 'grid', placeItems: 'center',
                  color: 'var(--text-muted)', borderRadius: 4, cursor: 'pointer',
                }}
              >
                {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
            {errors.password && (
              <div style={{ color: 'var(--accent)', fontSize: 11.5, marginTop: 4 }}>
                {errors.password.message}
              </div>
            )}
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="login-btn-primary"
            style={{ opacity: isSubmitting ? 0.6 : 1, cursor: isSubmitting ? 'wait' : 'pointer' }}
          >
            {isSubmitting ? 'MEMVERIFIKASI...' : 'MASUK KE DASHBOARD'}{' '}
            {!isSubmitting && <span className="login-btn-arrow">→</span>}
          </button>

          {/* Helper row */}
          <div
            style={{
              display: 'flex', justifyContent: 'flex-end', alignItems: 'center',
              marginTop: 24, fontSize: 12, color: 'var(--text-muted)',
            }}
          >
            <span
              style={{
                color: 'var(--text-secondary)', fontSize: 12,
                borderBottom: '1px solid var(--border-strong)',
                paddingBottom: 1, cursor: 'pointer',
              }}
            >
              Butuh bantuan?
            </span>
          </div>

          {/* DEV reminder */}
          {import.meta.env.DEV && (
            <div
              style={{
                marginTop: 28, padding: '14px 16px',
                background: 'var(--surface-alt)',
                border: '1px dashed var(--border-strong)',
                borderRadius: 8, fontSize: 12, color: 'var(--text-secondary)',
              }}
            >
              <div
                style={{
                  fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '0.18em',
                  textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 6,
                }}
              >
                DEV — SUPABASE AUTH ACTIVE
              </div>
              <code style={{ fontFamily: 'var(--mono)', fontSize: 11 }}>owner@nq21.app</code> · Owner
              <br />
              <code style={{ fontFamily: 'var(--mono)', fontSize: 11 }}>kasir@nq21.app</code> · Kasir
            </div>
          )}
        </form>
      </div>
    </div>
  )
}
