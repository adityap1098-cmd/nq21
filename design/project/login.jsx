// Login (Landing) view
const Login = ({ onLogin }) => {
  const [role, setRole] = React.useState('owner');
  const [user, setUser] = React.useState(role === 'owner' ? 'owner' : 'kasir1');
  const [pass, setPass] = React.useState('demo123');
  const [show, setShow] = React.useState(false);

  React.useEffect(() => { setUser(role === 'owner' ? 'owner' : 'kasir1'); }, [role]);

  const submit = (e) => { e.preventDefault(); onLogin(role); };

  return (
    <div className="login-shell" data-screen-label="01 Login">
      <div className="login-visual">
        <div className="brand-mark">
          <div className="brand-glyph">N</div>
          <div className="brand-name">NQ21<small>WORKSHOP OPS</small></div>
        </div>

        <div>
          <h1>Workshop<br />Ops, <span className="accent">Tracked.</span></h1>
          <p className="lede">
            Pencatatan transaksi internal, komisi mekanik mingguan, dan visibility cash flow —
            dalam satu sistem yang dirancang untuk kecepatan kasir, akurasi owner.
          </p>

          <div className="metric-row">
            <div className="m">
              <div className="v">142</div>
              <div className="l">Trx Minggu Ini</div>
            </div>
            <div className="m">
              <div className="v">4</div>
              <div className="l">Mekanik Aktif</div>
            </div>
            <div className="m">
              <div className="v">98<span style={{fontSize:18,color:'rgba(255,255,255,0.4)'}}>%</span></div>
              <div className="l">Akurasi Komisi</div>
            </div>
          </div>
        </div>

        <div className="login-foot">
          <div><span className="dot">●</span> SISTEM AKTIF</div>
          <div>v1.1 — INTERNAL ONLY</div>
        </div>
      </div>

      <div className="login-form-wrap">
        <form className="login-form" onSubmit={submit}>
          <div className="eyebrow">MASUK SISTEM</div>
          <h2>Selamat Datang</h2>
          <p className="sub">Pilih peran kamu dan masuk untuk mulai pencatatan.</p>

          <div className="role-pick">
            <button type="button" className={role === 'owner' ? 'active owner' : ''} onClick={() => setRole('owner')}>
              <I.shield /> OWNER
            </button>
            <button type="button" className={role === 'kasir' ? 'active' : ''} onClick={() => setRole('kasir')}>
              <I.user /> KASIR
            </button>
          </div>

          <div className="field">
            <label>USERNAME</label>
            <input value={user} onChange={(e) => setUser(e.target.value)} placeholder="masukkan username" autoFocus />
          </div>

          <div className="field has-icon">
            <label>PASSWORD</label>
            <input type={show ? 'text' : 'password'} value={pass} onChange={(e) => setPass(e.target.value)} placeholder="••••••••" />
            <button type="button" className="toggle-eye" onClick={() => setShow(!show)} aria-label="Toggle password">
              {show ? <I.eyeoff /> : <I.eye />}
            </button>
          </div>

          <button type="submit" className="btn-primary">
            MASUK KE DASHBOARD <span className="arrow">→</span>
          </button>

          <div className="helper-row">
            <label className="row-flex" style={{cursor:'pointer'}}>
              <input type="checkbox" defaultChecked style={{accentColor:'var(--accent)'}} />
              <span>Ingat saya</span>
            </label>
            <a href="#">Butuh bantuan?</a>
          </div>

          <div className="demo-creds">
            <div className="lbl">PROTOTYPE — MOCK AUTH</div>
            Login otomatis sebagai <code>{role === 'owner' ? 'Owner' : 'Kasir'}</code>. Password tidak divalidasi di mode demo.
          </div>
        </form>
      </div>
    </div>
  );
};
window.Login = Login;
