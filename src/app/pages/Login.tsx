import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Shield, User, Eye, EyeOff } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { useAuthStore } from '@/store/auth'

const schema = z.object({
  username: z.string().min(1, 'Username wajib diisi'),
  password: z.string().min(1, 'Password wajib diisi'),
})
type LoginForm = z.infer<typeof schema>

export default function Login() {
  const [role, setRole] = useState<'owner' | 'kasir'>('owner')
  const [showPw, setShowPw] = useState(false)
  const login = useAuthStore((s) => s.login)
  const navigate = useNavigate()

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(schema),
    defaultValues: { username: 'owner', password: 'demo123' },
  })

  const handleRoleToggle = (r: 'owner' | 'kasir') => {
    setRole(r)
    setValue('username', r)
  }

  const onSubmit = (data: LoginForm) => {
    login(data.username)
    navigate('/')
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
            Pilih peran kamu dan masuk untuk mulai pencatatan.
          </p>

          {/* Role picker */}
          <div
            style={{
              display: 'grid', gridTemplateColumns: '1fr 1fr',
              gap: 8, margin: '4px 0 22px',
              background: 'var(--surface-alt)',
              border: '1px solid var(--border)',
              borderRadius: 8, padding: 4,
            }}
          >
            {(['owner', 'kasir'] as const).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => handleRoleToggle(r)}
                style={{
                  border: 'none',
                  background: role === r ? 'var(--surface)' : 'transparent',
                  padding: 10,
                  borderRadius: 6,
                  fontFamily: 'var(--mono)',
                  fontSize: 11,
                  letterSpacing: '0.16em',
                  textTransform: 'uppercase',
                  color: role === r
                    ? r === 'owner' ? 'var(--accent)' : 'var(--text)'
                    : 'var(--text-muted)',
                  display: 'flex', alignItems: 'center',
                  justifyContent: 'center', gap: 8,
                  boxShadow: role === r ? '0 1px 2px rgba(0,0,0,0.04)' : 'none',
                  cursor: 'pointer', transition: 'all 0.1s',
                }}
              >
                {r === 'owner' ? <Shield size={13} /> : <User size={13} />}
                {r === 'owner' ? 'OWNER' : 'KASIR'}
              </button>
            ))}
          </div>

          {/* Username */}
          <div style={{ marginBottom: 18 }}>
            <label
              htmlFor="username"
              style={{
                fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.16em',
                textTransform: 'uppercase', color: errors.username ? 'var(--accent)' : 'var(--text-secondary)',
                display: 'block', marginBottom: 8,
              }}
            >
              USERNAME
            </label>
            <Input
              id="username"
              {...register('username')}
              placeholder="masukkan username"
              autoFocus
              style={{ padding: '13px 14px', height: 'auto', fontSize: 14 }}
            />
            {errors.username && (
              <div style={{ color: 'var(--accent)', fontSize: 11.5, marginTop: 4 }}>
                {errors.username.message}
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
            className="login-btn-primary"
          >
            MASUK KE DASHBOARD{' '}
            <span className="login-btn-arrow">→</span>
          </button>

          {/* Helper row */}
          <div
            style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              marginTop: 24, fontSize: 12, color: 'var(--text-muted)',
            }}
          >
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
              <input
                type="checkbox"
                defaultChecked
                style={{ accentColor: 'var(--accent)' }}
              />
              <span>Ingat saya</span>
            </label>
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

          {/* Demo creds */}
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
              PROTOTYPE — MOCK AUTH
            </div>
            Login otomatis sebagai{' '}
            <code
              style={{
                fontFamily: 'var(--mono)',
                background: 'var(--surface)',
                padding: '2px 6px',
                borderRadius: 4,
                border: '1px solid var(--border)',
                fontSize: 11,
              }}
            >
              {role === 'owner' ? 'Owner' : 'Kasir'}
            </code>
            . Password tidak divalidasi di mode demo.
          </div>
        </form>
      </div>
    </div>
  )
}
