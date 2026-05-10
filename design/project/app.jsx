// Root app — routes between Login and Dashboard
const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "accent": "#C8102E",
  "startScreen": "login"
}/*EDITMODE-END*/;

const App = () => {
  const [tweaks, setTweak] = window.useTweaks ? window.useTweaks(TWEAK_DEFAULTS) : [TWEAK_DEFAULTS, () => {}];

  const [view, setView] = React.useState(tweaks.startScreen || 'login');
  const [role, setRole] = React.useState('owner');

  React.useEffect(() => {
    document.documentElement.style.setProperty('--accent', tweaks.accent);
  }, [tweaks.accent]);

  const handleLogin = (r) => { setRole(r); setView('dashboard'); };
  const handleLogout = () => setView('login');

  const isLogin = view === 'login';

  return (
    <>
      {isLogin ? (
        <Login onLogin={handleLogin} />
      ) : (
        <Dashboard role={role} onLogout={handleLogout} view={view} setView={setView} />
      )}

      {window.TweaksPanel && (
        <window.TweaksPanel title="Tweaks">
          <window.TweakSection title="Brand">
            <window.TweakColor
              label="Accent"
              value={tweaks.accent}
              onChange={(v) => setTweak('accent', v)}
              options={['#C8102E', '#0A0908', '#1E7A50', '#B86E00']}
            />
          </window.TweakSection>
          <window.TweakSection title="Navigation">
            <window.TweakSelect
              label="View"
              value={view}
              onChange={(v) => setView(v)}
              options={[
                { value: 'login',        label: 'Login' },
                { value: 'dashboard',    label: 'Dashboard' },
                { value: 'lap-kategori', label: 'Laporan 1 — Per Kategori' },
                { value: 'lap-cashflow', label: 'Laporan 2 — Cash Flow' },
                { value: 'lap-jasa',     label: 'Laporan 3 — Jasa & Mekanik' },
                { value: 'lap-dyno',     label: 'Laporan 4 — Dyno' },
              ]}
            />
          </window.TweakSection>
        </window.TweaksPanel>
      )}
    </>
  );
};

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
