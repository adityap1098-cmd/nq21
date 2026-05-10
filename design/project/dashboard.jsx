// Dashboard view
const { fmtRp, fmtRpShort } = window.NQ21Data;

const Sidebar = ({ active, onNav, onLogout, role }) => {
  const utama = [
    { id: 'dashboard', label: 'Dashboard', icon: <I.home /> },
  ];
  const transaksi = [
    { id: 'tx-input', label: 'Input Transaksi', icon: <I.plus /> },
    { id: 'tx-list',  label: 'Daftar Transaksi', icon: <I.report /> },
  ];
  const laporan = [
    { id: 'lap-kategori', num: '1', label: 'Per Kategori',   icon: <I.pie /> },
    { id: 'lap-cashflow', num: '2', label: 'Cash Flow',      icon: <I.bars /> },
    { id: 'lap-jasa',     num: '3', label: 'Jasa & Mekanik', icon: <I.star /> },
    { id: 'lap-dyno',     num: '4', label: 'Dyno',           icon: <I.bolt /> },
  ];
  const komisi = [
    { id: 'kom-periode', label: 'Periode Mingguan', icon: <I.cal /> },
    { id: 'kom-mekanik', label: 'Mekanik & Komisi', icon: <I.users /> },
  ];

  const renderItem = (n) => (
    <button key={n.id} className={'nav-item' + (active === n.id ? ' active' : '')} onClick={() => onNav(n.id)}>
      {n.num ? <span className="num">{n.num}</span> : null}
      <span className="ico">{n.icon}</span>
      <span>{n.label}</span>
      {n.badge && <span className="badge">{n.badge}</span>}
    </button>
  );

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="brand-glyph">N</div>
        <div className="brand-name">NQ21<small>PERFORMANCE</small></div>
      </div>

      <div className="nav-section">UTAMA</div>
      <div className="nav-list">{utama.map(renderItem)}</div>

      <div className="nav-section">TRANSAKSI</div>
      <div className="nav-list">{transaksi.map(renderItem)}</div>

      <div className="nav-section">LAPORAN</div>
      <div className="nav-list">{laporan.map(renderItem)}</div>

      <div className="nav-section">KOMISI</div>
      <div className="nav-list">{komisi.map(renderItem)}</div>

      <div className="sidebar-foot">
        <div className="user-avatar">{role === 'owner' ? 'P' : 'K'}</div>
        <div className="who">
          <div className="nm">{role === 'owner' ? 'Pak Nanang' : 'Kasir Sari'}</div>
          <div className="rl">{role === 'owner' ? 'OWNER' : 'KASIR'}</div>
        </div>
        <button className="logout" onClick={onLogout} title="Keluar"><I.power /></button>
      </div>
    </aside>
  );
};

// Page registry — used to render the right view based on active sidebar item
const PAGE_TITLES = {
  'dashboard':    { crumb: 'DASHBOARD',           heading: 'DASHBOARD OWNER' },
  'tx-input':     { crumb: 'TRANSAKSI / INPUT',   heading: 'INPUT TRANSAKSI' },
  'tx-list':      { crumb: 'TRANSAKSI / DAFTAR',  heading: 'DAFTAR TRANSAKSI' },
  'lap-kategori': { crumb: 'LAPORAN / KATEGORI',  heading: 'PER KATEGORI' },
  'lap-cashflow': { crumb: 'LAPORAN / CASH FLOW', heading: 'CASH FLOW' },
  'lap-jasa':     { crumb: 'LAPORAN / JASA',      heading: 'JASA & MEKANIK' },
  'lap-dyno':     { crumb: 'LAPORAN / DYNO',      heading: 'DYNO' },
  'kom-periode':  { crumb: 'KOMISI / PERIODE',    heading: 'PERIODE MINGGUAN' },
  'kom-mekanik':  { crumb: 'KOMISI / MEKANIK',    heading: 'MEKANIK & KOMISI' },
};

const Topbar = ({ active }) => (
  <div className="topbar">
    <div className="crumb">
      NQ21 <span className="sep">/</span> <span className="now">{(PAGE_TITLES[active] || {crumb:''}).crumb}</span>
    </div>
    <div className="search-bar">
      <span className="icn"><I.search /></span>
      <input placeholder="Cari no referensi, customer, mekanik..." />
      <span className="kbd">⌘K</span>
    </div>
    <div className="period-pill">
      <span className="icn"><I.cal /></span>
      <strong>10 Mei 2026</strong>
      <span style={{color:'var(--text-muted)'}}>·</span>
      <span>Minggu ini</span>
    </div>
    <button className="btn-icon" title="Notifikasi"><I.bell /><span className="ping" /></button>
    <button className="btn-cta"><I.plus /> TRANSAKSI BARU</button>
  </div>
);

const KPIBlock = () => {
  const kpis = [
    { lbl: 'PENDAPATAN MINGGU INI', val: 28_790_000, delta: '+12.4%', dctx: 'vs minggu lalu', up: true, ico: <I.trend />, hi: false },
    { lbl: 'PENGELUARAN MINGGU INI', val: 9_220_000, delta: '+3.1%', dctx: 'vs minggu lalu', up: false, ico: <I.trendD />, hi: false },
    { lbl: 'LABA KOTOR', val: 19_570_000, delta: '+18.2%', dctx: 'vs minggu lalu', up: true, ico: <I.cash />, hi: false },
    { lbl: 'KOMISI PENDING PAYOUT', val: 2_185_000, delta: '4 mekanik', dctx: 'periode aktif', up: true, ico: <I.wrench />, hi: true },
  ];
  return (
    <div className="kpi-grid">
      {kpis.map((k, i) => (
        <div key={i} className={'kpi' + (k.hi ? ' hi' : '')}>
          <div className="ico-box">{k.ico}</div>
          <div className="lbl">{k.lbl}</div>
          <div className="val"><span className="currency">Rp</span>{fmtRp(k.val)}</div>
          <div className={'delta ' + (k.up ? 'up' : 'down')}>
            <span>{k.up ? '▲' : '▼'}</span>
            <span>{k.delta}</span>
            <span className="ctx">· {k.dctx}</span>
          </div>
        </div>
      ))}
    </div>
  );
};

const CashflowChart = () => {
  const { cashflow } = window.NQ21Data;
  const max = Math.max(...cashflow.flatMap(d => [d.in, d.out]));
  const yScale = max * 1.1;
  const ticks = [yScale, yScale * 0.75, yScale * 0.5, yScale * 0.25, 0];

  const [filter, setFilter] = React.useState('7H');

  return (
    <div className="panel">
      <div className="panel-head">
        <div>
          <h3>Cash Flow Mingguan</h3>
          <div className="sub">04 — 10 MEI · IN vs OUT</div>
        </div>
        <div className="filter-pills">
          {['7H','30H','90H'].map(t => (
            <button key={t} className={filter === t ? 'active' : ''} onClick={() => setFilter(t)}>{t}</button>
          ))}
        </div>
      </div>
      <div className="chart-wrap">
        <div className="chart-y">
          {ticks.map((t, i) => <div key={i}>{fmtRpShort(t)}</div>)}
        </div>
        <div className="chart-area">
          {ticks.slice(0, -1).map((_, i) => (
            <div key={i} className="chart-grid-line" style={{ top: `${(i / 4) * 100}%` }} />
          ))}
          <div className="chart-bars">
            {cashflow.map((d, i) => {
              const inH = (d.in / yScale) * 100;
              const outH = (d.out / yScale) * 100;
              return (
                <div key={i} className={'bar-group' + (d.today ? ' today' : '')}>
                  <div className="bar-stack">
                    <div className="bar in" style={{ height: `${inH}%` }} />
                    <div className="bar out" style={{ height: `${outH}%` }} />
                  </div>
                  <div className="x-label">{d.day}</div>
                  <div className="bar-tooltip">
                    <div style={{fontSize:10, letterSpacing:'0.1em', color:'rgba(255,255,255,0.6)', marginBottom:4}}>{d.date}</div>
                    <div className="row in"><span className="swatch" /><span>IN</span><span className="v">Rp {fmtRp(d.in)}</span></div>
                    <div className="row out"><span className="swatch" /><span>OUT</span><span className="v">Rp {fmtRp(d.out)}</span></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
      <div className="legend">
        <div className="lg in"><span className="sw" />PEMASUKAN</div>
        <div className="lg out"><span className="sw" />PENGELUARAN</div>
        <div style={{marginLeft:'auto', color:'var(--text-muted)'}}>● HARI INI</div>
      </div>
    </div>
  );
};

const TopCategoriesPanel = () => {
  const { topCategories } = window.NQ21Data;
  return (
    <div className="panel">
      <div className="panel-head">
        <div>
          <h3>Top Kategori</h3>
          <div className="sub">Pendapatan · Mei 2026</div>
        </div>
        <button className="action-link">SEMUA <I.arrow /></button>
      </div>
      <div className="cat-list">
        {topCategories.slice(0, 5).map((c, i) => (
          <div key={i} className={'cat-row' + (i === 0 ? ' top' : '')}>
            <div className="rank">0{i + 1}</div>
            <div className="body">
              <div className="nm">{c.name}</div>
              <div className="meta">{c.meta}</div>
            </div>
            <div className="amount">Rp {fmtRp(c.amount)}</div>
            <div className="bar-track">
              <div className="bar-fill" style={{ width: `${c.pct * 100}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const RecentTransactions = () => {
  const { recentTx } = window.NQ21Data;
  return (
    <div className="panel">
      <div className="panel-head">
        <div>
          <h3>Transaksi Terbaru</h3>
          <div className="sub">10 MEI · {recentTx.length} ENTRI</div>
        </div>
        <button className="action-link">LIHAT SEMUA <I.arrow /></button>
      </div>
      <table className="tbl">
        <thead>
          <tr>
            <th>NO REFERENSI</th>
            <th>CUSTOMER / SUPPLIER</th>
            <th>KATEGORI</th>
            <th>TIPE</th>
            <th style={{textAlign:'right'}}>NOMINAL</th>
          </tr>
        </thead>
        <tbody>
          {recentTx.map((t, i) => (
            <tr key={i}>
              <td>
                <div className="ref">{t.ref}</div>
                <div style={{fontFamily:'var(--mono)', fontSize:10, color:'var(--text-muted)', marginTop:2}}>{t.time}</div>
              </td>
              <td>{t.name}</td>
              <td style={{color:'var(--text-secondary)', fontSize:12.5}}>{t.cat}</td>
              <td>
                <span className={'badge ' + t.type}>
                  <span className="dot" />{t.type === 'in' ? 'MASUK' : 'KELUAR'}
                </span>
              </td>
              <td className={'num ' + t.type}>
                {t.type === 'in' ? '+' : '−'} Rp {fmtRp(t.amount)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const PeriodPanel = () => {
  const { periods, mechanics } = window.NQ21Data;
  return (
    <div className="panel">
      <div className="panel-head">
        <div>
          <h3>Periode Komisi</h3>
          <div className="sub">SENIN — MINGGU</div>
        </div>
        <button className="action-link"><I.print /> SLIP</button>
      </div>

      {periods.map(p => (
        <div key={p.id} className={'period-card' + (p.active ? ' active' : '')}>
          <div>
            <div className="rng">{p.range}</div>
            <div className="meta" style={{display:'flex', alignItems:'center', gap:8, marginTop:6}}>
              <span className={'badge ' + p.status}>
                <span className="dot" />{p.status === 'open' ? 'AKTIF' : 'CLOSED'}
              </span>
              <span>{p.mechanics} mekanik{p.paid ? ` · ${p.paid} dibayar` : ''}</span>
            </div>
          </div>
          <div className="amount-block">
            <div className="amount">Rp {fmtRp(p.total)}</div>
            <div style={{fontFamily:'var(--mono)', fontSize:9.5, color:'var(--text-muted)', letterSpacing:'0.12em', textTransform:'uppercase', marginTop:3}}>
              {p.status === 'open' ? 'BERJALAN' : 'TOTAL KOMISI'}
            </div>
          </div>
        </div>
      ))}

      <div style={{borderTop:'1px solid var(--border)', marginTop:14, paddingTop:14}}>
        <div style={{fontFamily:'var(--mono)', fontSize:10, letterSpacing:'0.16em', textTransform:'uppercase', color:'var(--text-muted)', marginBottom:4}}>
          KOMISI BERJALAN — PER MEKANIK
        </div>
        <div className="mech-grid">
          {mechanics.map(m => (
            <div key={m.name} className="mech-mini">
              <div className="av">{m.initial}</div>
              <div className="info">
                <div className="nm">{m.name}</div>
                <div className="vl">Rp {fmtRp(m.komisi)}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const DashboardHome = () => (
  <>
    <div className="page-header">
      <div className="page-title">
        <div className="bar" />
        <div>
          <h1>DASHBOARD OWNER</h1>
          <div className="sub">Ringkasan operasional NQ21 PERFORMANCE · Update {new Date().toLocaleTimeString('id-ID', {hour:'2-digit', minute:'2-digit'})}</div>
        </div>
      </div>
      <div className="header-actions">
        <button className="btn-icon" title="Export"><I.download /></button>
        <div className="period-pill">
          <span className="icn"><I.cal /></span>
          <strong>04 — 10 Mei 2026</strong>
        </div>
      </div>
    </div>

    <KPIBlock />

    <div className="panel-grid">
      <CashflowChart />
      <TopCategoriesPanel />
    </div>

    <div className="table-grid">
      <RecentTransactions />
      <PeriodPanel />
    </div>
  </>
);

const PlaceholderPage = ({ title }) => (
  <>
    <div className="page-header">
      <div className="page-title">
        <div className="bar" />
        <div>
          <h1>{title}</h1>
          <div className="sub">Halaman ini menyusul · fokus saat ini: dashboard + 4 laporan</div>
        </div>
      </div>
    </div>
    <div className="panel" style={{padding:'48px', textAlign:'center'}}>
      <div style={{fontFamily:'var(--mono)', fontSize:10, letterSpacing:'0.18em', color:'var(--text-muted)', marginBottom:8}}>COMING SOON</div>
      <div style={{fontFamily:'var(--display)', fontSize:32, lineHeight:1.05}}>{title}</div>
      <div style={{color:'var(--text-muted)', marginTop:8}}>Mock UI akan dibangun di milestone berikutnya.</div>
    </div>
  </>
);

const Dashboard = ({ role, onLogout, view, setView }) => {
  const active = view || 'dashboard';

  let body;
  switch (active) {
    case 'dashboard':    body = <DashboardHome />; break;
    case 'lap-kategori': body = <window.LaporanKategori />; break;
    case 'lap-cashflow': body = <window.LaporanCashFlow />; break;
    case 'lap-jasa':     body = <window.LaporanJasa />; break;
    case 'lap-dyno':     body = <window.LaporanDyno />; break;
    default:             body = <PlaceholderPage title={(PAGE_TITLES[active] || {heading:'Halaman'}).heading} />;
  }

  return (
    <div className="app-shell" data-screen-label={'02 ' + ((PAGE_TITLES[active] || {heading:''}).heading || active)}>
      <Sidebar active={active} onNav={setView} onLogout={onLogout} role={role} />
      <div className="main-area">
        <Topbar active={active} />
        <div className="page">
          {body}
          <div style={{marginTop:24, fontFamily:'var(--mono)', fontSize:10, letterSpacing:'0.16em', textTransform:'uppercase', color:'var(--text-muted)', textAlign:'center'}}>
            NQ21 PERFORMANCE · INTERNAL OPS · PROTOTYPE v1.2
          </div>
        </div>
      </div>
    </div>
  );
};

window.Dashboard = Dashboard;
