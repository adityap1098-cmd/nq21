// Laporan pages — Per Kategori, Cash Flow, Jasa & Mekanik, Dyno

const { fmtRp: fr } = window.NQ21Data;
const { reportKategori, reportCashFlow, reportJasa, reportDyno } = window.NQ21Reports;

const PageHeader = ({ num, title, sub, actions }) => (
  <div className="page-header">
    <div className="page-title">
      <div className="bar" />
      <div>
        {num && <div style={{fontFamily:'var(--mono)', fontSize:10, letterSpacing:'0.2em', color:'var(--accent)', marginBottom:4, fontWeight:600}}>LAPORAN #{num}</div>}
        <h1>{title}</h1>
        <div className="sub">{sub}</div>
      </div>
    </div>
    <div className="header-actions">{actions}</div>
  </div>
);

const ReportToolbar = ({ children }) => (
  <div className="report-toolbar">
    <div className="toolbar-group">
      <span className="lbl">PERIODE</span>
      <div className="date-range">
        <span className="icn"><I.cal /></span>
        <span>01 Mei 2026</span>
        <span className="sep">→</span>
        <span>10 Mei 2026</span>
      </div>
    </div>
    {children}
    <button className="btn-ghost" style={{marginLeft:'auto'}}><I.refresh /> RESET</button>
    <button className="btn-ghost"><I.download /> EXPORT CSV</button>
  </div>
);

// ─────────────────────────────────────────────────────────
// LAPORAN 1 — PER KATEGORI
// ─────────────────────────────────────────────────────────

const LaporanKategori = () => {
  const totalIn = reportKategori.income.reduce((a, x) => a + x.total, 0);
  const totalOut = reportKategori.expense.reduce((a, x) => a + x.total, 0);
  const profit = totalIn - totalOut;

  return (
    <>
      <PageHeader
        num="1"
        title="PER KATEGORI"
        sub="Pendapatan & pengeluaran dipisah per kategori · Mei 2026"
        actions={<button className="btn-cta"><I.download /> EXPORT</button>}
      />

      <ReportToolbar />

      <div className="split-panels">
        <div className="panel panel-flush">
          <div className="section-head">
            <div className="lhs">
              <span className="pill-tag in"><span style={{marginRight:4}}>▲</span>INCOME</span>
              <h3>PENDAPATAN</h3>
            </div>
            <div className="total">
              <span className="lbl-mini">TOTAL</span>
              <span style={{color:'var(--success)'}}>Rp {fr(totalIn)}</span>
            </div>
          </div>
          <table className="cat-table">
            <thead>
              <tr><th>KATEGORI</th><th style={{textAlign:'right'}}>JUMLAH TRX</th><th style={{textAlign:'right'}}>NOMINAL</th></tr>
            </thead>
            <tbody>
              {reportKategori.income.map(r => (
                <tr key={r.name}>
                  <td>
                    <div className="nm-cell">
                      <span className="swatch in" />
                      <div>
                        <div style={{fontWeight:600}}>{r.name}</div>
                        {r.isJasa && <div className="meta-mini">JASA · KOMISI AKTIF</div>}
                      </div>
                    </div>
                  </td>
                  <td className="num" style={{color:'var(--text-muted)'}}>{r.count}</td>
                  <td className="num">Rp {fr(r.total)}</td>
                </tr>
              ))}
              <tr className="grand">
                <td>GRAND TOTAL</td>
                <td className="num">{reportKategori.income.reduce((a,x)=>a+x.count,0)}</td>
                <td className="num" style={{color:'var(--success)'}}>Rp {fr(totalIn)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="panel panel-flush">
          <div className="section-head">
            <div className="lhs">
              <span className="pill-tag out"><span style={{marginRight:4}}>▼</span>EXPENSE</span>
              <h3>PENGELUARAN</h3>
            </div>
            <div className="total">
              <span className="lbl-mini">TOTAL</span>
              <span style={{color:'var(--accent)'}}>Rp {fr(totalOut)}</span>
            </div>
          </div>
          <table className="cat-table">
            <thead>
              <tr><th>KATEGORI</th><th style={{textAlign:'right'}}>JUMLAH TRX</th><th style={{textAlign:'right'}}>NOMINAL</th></tr>
            </thead>
            <tbody>
              {reportKategori.expense.map(r => (
                <tr key={r.name}>
                  <td>
                    <div className="nm-cell">
                      <span className="swatch out" />
                      <div style={{fontWeight:600}}>{r.name}</div>
                    </div>
                  </td>
                  <td className="num" style={{color:'var(--text-muted)'}}>{r.count}</td>
                  <td className="num">Rp {fr(r.total)}</td>
                </tr>
              ))}
              <tr className="grand">
                <td>GRAND TOTAL</td>
                <td className="num">{reportKategori.expense.reduce((a,x)=>a+x.count,0)}</td>
                <td className="num" style={{color:'var(--accent)'}}>Rp {fr(totalOut)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="profit-banner">
        <div>
          <div className="label">SELISIH · LABA KOTOR</div>
          <h2>Profit Bulan Ini</h2>
        </div>
        <div className="breakdown">
          <div className="item in">
            <div className="v">+ Rp {fr(totalIn)}</div>
            <div className="l">PENDAPATAN</div>
          </div>
          <div className="item out">
            <div className="v">− Rp {fr(totalOut)}</div>
            <div className="l">PENGELUARAN</div>
          </div>
        </div>
        <div className="big">
          <span className="currency">Rp</span><span className="accent">{fr(profit)}</span>
        </div>
      </div>
    </>
  );
};

// ─────────────────────────────────────────────────────────
// LAPORAN 2 — CASH FLOW
// ─────────────────────────────────────────────────────────

const LaporanCashFlow = () => {
  const [methodFilter, setMethodFilter] = React.useState('all');
  const [typeFilter, setTypeFilter] = React.useState('all');

  const filtered = reportCashFlow.filter(r =>
    (methodFilter === 'all' || r.method === methodFilter) &&
    (typeFilter === 'all' || r.type === typeFilter)
  );
  const totalIn = filtered.filter(r => r.type === 'in').reduce((a,x) => a + x.amount, 0);
  const totalOut = filtered.filter(r => r.type === 'out').reduce((a,x) => a + x.amount, 0);
  const net = totalIn - totalOut;

  return (
    <>
      <PageHeader
        num="2"
        title="CASH FLOW"
        sub="Aliran kas kronologis dengan saldo berjalan"
        actions={<button className="btn-cta"><I.download /> EXPORT</button>}
      />

      <ReportToolbar>
        <div className="toolbar-group">
          <span className="lbl">TIPE</span>
          <div className="chip-group">
            {[['all','Semua'],['in','Masuk'],['out','Keluar']].map(([v,l]) => (
              <button key={v} className={'chip' + (typeFilter === v ? ' active' : '')} onClick={() => setTypeFilter(v)}>{l}</button>
            ))}
          </div>
        </div>
        <div className="toolbar-group">
          <span className="lbl">METODE</span>
          <div className="chip-group">
            {[['all','Semua'],['cash','Cash'],['transfer','Transfer'],['qris','QRIS']].map(([v,l]) => (
              <button key={v} className={'chip' + (methodFilter === v ? ' active' : '')} onClick={() => setMethodFilter(v)}>{l}</button>
            ))}
          </div>
        </div>
      </ReportToolbar>

      <div className="summary-strip">
        <div className="summary-card in">
          <div className="lbl">TOTAL MASUK</div>
          <div className="val"><span className="currency">Rp</span>{fr(totalIn)}</div>
          <div className="meta">{filtered.filter(r=>r.type==='in').length} transaksi</div>
        </div>
        <div className="summary-card out">
          <div className="lbl">TOTAL KELUAR</div>
          <div className="val"><span className="currency">Rp</span>{fr(totalOut)}</div>
          <div className="meta">{filtered.filter(r=>r.type==='out').length} transaksi</div>
        </div>
        <div className="summary-card net">
          <div className="lbl">SALDO BERSIH</div>
          <div className="val"><span className="currency">Rp</span>{fr(net)}</div>
          <div className="meta" style={{color: net >= 0 ? 'var(--success)' : 'var(--accent)'}}>
            {net >= 0 ? '▲ Surplus' : '▼ Defisit'} periode ini
          </div>
        </div>
      </div>

      <div className="panel panel-flush">
        <div className="section-head">
          <div className="lhs">
            <h3>RINCIAN KRONOLOGIS</h3>
            <span className="pill-tag" style={{background:'var(--surface-alt)', color:'var(--text-muted)'}}>{filtered.length} ENTRI</span>
          </div>
        </div>
        <div className="table-wrap" style={{overflow:'auto'}}>
          <table className="tbl cashflow-table" style={{minWidth:900}}>
            <thead>
              <tr>
                <th style={{padding:'12px 20px'}}>TGL</th>
                <th>NO REFERENSI</th>
                <th>PARTY</th>
                <th>KATEGORI</th>
                <th>METODE</th>
                <th style={{textAlign:'right'}}>NOMINAL</th>
                <th style={{textAlign:'right', paddingRight:20}}>SALDO</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r, i) => (
                <tr key={i}>
                  <td style={{padding:'13px 20px'}}>
                    <div style={{fontWeight:600, fontSize:12.5}}>{r.tgl}</div>
                    <div style={{fontFamily:'var(--mono)', fontSize:10, color:'var(--text-muted)', marginTop:2}}>{r.time}</div>
                  </td>
                  <td className="ref">{r.ref}</td>
                  <td style={{fontWeight:500}}>{r.party}</td>
                  <td style={{color:'var(--text-secondary)', fontSize:12.5}}>{r.cat}</td>
                  <td><span className={'method-pill ' + r.method}>{r.method}</span></td>
                  <td className={'num ' + r.type}>
                    {r.type === 'in' ? '+' : '−'} Rp {fr(r.amount)}
                  </td>
                  <td className="num" style={{paddingRight:20}}>Rp {fr(r.saldo)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
};

// ─────────────────────────────────────────────────────────
// LAPORAN 3 — JASA & MEKANIK
// ─────────────────────────────────────────────────────────

const LaporanJasa = () => {
  const [activeMech, setActiveMech] = React.useState('all');
  const [activeKat, setActiveKat] = React.useState('all');

  const jobs = reportJasa.jobs.filter(j =>
    (activeMech === 'all' || j.mechs.some(m => m.name === activeMech)) &&
    (activeKat === 'all' || j.kategori === activeKat)
  );
  const totalNominal = jobs.reduce((a,x) => a + x.nominal, 0);
  const totalBasis = jobs.reduce((a,x) => a + x.basis, 0);
  const totalKomisi = jobs.reduce((a,x) => a + x.mechs.reduce((b,m) => b + m.komisi, 0), 0);

  const kategoris = ['Jasa', 'Dyno', 'Bubut Dalam', 'Bubut Luar'];

  return (
    <>
      <PageHeader
        num="3"
        title="JASA & MEKANIK"
        sub="Rincian setiap jasa, mekanik yang ngerjain, basis komisi & komisi · Periode aktif 04—10 Mei"
        actions={<button className="btn-cta"><I.download /> EXPORT</button>}
      />

      <div className="mech-kpi-row">
        {reportJasa.mechanics.map(m => (
          <div key={m.name} className={'mech-kpi-card' + (m.top ? ' top' : '')}>
            <div className="header">
              <div className="av">{m.initial}</div>
              <div>
                <div className="nm">{m.name}</div>
                <div className="role-tag">{m.role}{m.top && ' · TOP'}</div>
              </div>
            </div>
            <div className="stat-row"><span className="l">Jobs</span><span className="v">{m.jobs}</span></div>
            <div className="stat-row"><span className="l">Total basis</span><span className="v">Rp {fr(m.basis)}</span></div>
            <div className="stat-row komisi"><span className="l">Komisi</span><span className="v">Rp {fr(m.komisi)}</span></div>
          </div>
        ))}
      </div>

      <ReportToolbar>
        <div className="toolbar-group">
          <span className="lbl">MEKANIK</span>
          <div className="chip-group">
            <button className={'chip' + (activeMech === 'all' ? ' active' : '')} onClick={() => setActiveMech('all')}>Semua</button>
            {reportJasa.mechanics.map(m => (
              <button key={m.name} className={'chip' + (activeMech === m.name ? ' active' : '')} onClick={() => setActiveMech(m.name)}>
                <span className="av">{m.initial}</span>{m.name}
              </button>
            ))}
          </div>
        </div>
        <div className="toolbar-group">
          <span className="lbl">KATEGORI</span>
          <div className="chip-group">
            <button className={'chip' + (activeKat === 'all' ? ' active' : '')} onClick={() => setActiveKat('all')}>Semua</button>
            {kategoris.map(k => (
              <button key={k} className={'chip' + (activeKat === k ? ' active' : '')} onClick={() => setActiveKat(k)}>{k}</button>
            ))}
          </div>
        </div>
      </ReportToolbar>

      <div className="panel panel-flush">
        <div className="section-head">
          <div className="lhs">
            <h3>RINCIAN JASA</h3>
            <span className="pill-tag" style={{background:'var(--surface-alt)', color:'var(--text-muted)'}}>{jobs.length} LINE</span>
          </div>
          <button className="btn-ghost"><I.print /> PRINT</button>
        </div>
        <div className="table-wrap" style={{overflow:'auto'}}>
          <table className="jasa-table" style={{minWidth:1100}}>
            <thead>
              <tr>
                <th style={{paddingLeft:20}}>TGL · REF</th>
                <th>CUSTOMER</th>
                <th>KATEGORI</th>
                <th style={{textAlign:'right'}}>NOMINAL</th>
                <th style={{textAlign:'right'}}>MATERIAL</th>
                <th style={{textAlign:'right'}}>BASIS</th>
                <th style={{paddingRight:20}}>MEKANIK · SHARE · KOMISI</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((j, i) => (
                <tr key={i}>
                  <td style={{paddingLeft:20}}>
                    <div style={{fontWeight:600}}>{j.tgl}</div>
                    <div className="ref" style={{marginTop:2}}>{j.ref}</div>
                  </td>
                  <td style={{fontWeight:500}}>{j.customer}</td>
                  <td><span className="kategori-tag">{j.kategori}</span></td>
                  <td style={{textAlign:'right', fontFamily:'var(--mono)', fontWeight:600}}>Rp {fr(j.nominal)}</td>
                  <td style={{textAlign:'right', fontFamily:'var(--mono)', color:'var(--text-muted)'}}>− Rp {fr(j.material)}</td>
                  <td style={{textAlign:'right', fontFamily:'var(--mono)', fontWeight:700}}>Rp {fr(j.basis)}</td>
                  <td style={{paddingRight:20}}>
                    <div className="mech-stack">
                      {j.mechs.map((m, k) => (
                        <span key={k} className="mech-pill">
                          <span className="ai">{m.i}</span>
                          {m.name}
                          <span className="share">{m.share}%</span>
                          <span className="komisi-mini">Rp {fr(m.komisi)}</span>
                        </span>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td style={{paddingLeft:20}} colSpan="3">GRAND TOTAL · {jobs.length} LINE</td>
                <td style={{textAlign:'right'}}>Rp {fr(totalNominal)}</td>
                <td style={{textAlign:'right', color:'var(--text-muted)'}}>Rp {fr(jobs.reduce((a,x)=>a+x.material,0))}</td>
                <td style={{textAlign:'right'}}>Rp {fr(totalBasis)}</td>
                <td style={{paddingRight:20, color:'var(--accent)', fontSize:14}}>Rp {fr(totalKomisi)} <span style={{color:'var(--text-muted)', fontSize:10, marginLeft:4}}>KOMISI</span></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </>
  );
};

// ─────────────────────────────────────────────────────────
// LAPORAN 4 — DYNO
// ─────────────────────────────────────────────────────────

const LaporanDyno = () => {
  const maxSession = Math.max(...reportDyno.sessionsPerDay.map(d => d.count));

  return (
    <>
      <PageHeader
        num="4"
        title="DYNO"
        sub="Sesi dyno khusus · Untuk owner only"
        actions={<button className="btn-cta"><I.download /> EXPORT</button>}
      />

      <div className="dyno-hero">
        <div className="crumb-mono"><span className="dot">●</span> KATEGORI KHUSUS · MEI 2026</div>
        <h2>Dyno <span className="accent">Performance.</span></h2>
        <div className="dyno-stats">
          <div className="item">
            <div className="l">TOTAL SESI</div>
            <div className="v">{reportDyno.hero.sessions}</div>
          </div>
          <div className="item">
            <div className="l">TOTAL REVENUE</div>
            <div className="v"><span className="currency">Rp</span>{fr(reportDyno.hero.revenue)}</div>
          </div>
          <div className="item">
            <div className="l">RATA-RATA / SESI</div>
            <div className="v"><span className="currency">Rp</span>{fr(reportDyno.hero.avg)}</div>
          </div>
        </div>
      </div>

      <ReportToolbar />

      <div className="dyno-insight-grid">
        <div className="panel">
          <div className="panel-head">
            <div>
              <h3>Top Operator</h3>
              <div className="sub">RANKING DYNO · MEI</div>
            </div>
          </div>
          <div className="operator-list">
            {reportDyno.topOperators.map((o, i) => (
              <div key={o.name} className={'operator-row' + (o.top ? ' top' : '')}>
                <div className="av">{o.i}</div>
                <div className="body">
                  <div className="nm">{o.name}{o.top && <span style={{color:'var(--accent)', marginLeft:6, fontFamily:'var(--mono)', fontSize:9, letterSpacing:'0.16em'}}>★ TOP</span>}</div>
                  <div className="meta">{o.sessions} SESI · MEI</div>
                </div>
                <div className="amount">Rp {fr(o.revenue)}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="panel">
          <div className="panel-head">
            <div>
              <h3>Sesi Per Tanggal</h3>
              <div className="sub">14 HARI TERAKHIR</div>
            </div>
          </div>
          <div className="session-chart">
            {reportDyno.sessionsPerDay.map((d, i) => {
              const h = d.count === 0 ? 4 : (d.count / maxSession) * 140;
              return (
                <div key={i} className="col">
                  {d.count > 0 && <div className="count">{d.count}</div>}
                  <div className="bar" style={{height: h, background: d.today ? 'var(--accent)' : (d.count === 0 ? 'var(--surface-alt)' : 'var(--text)')}} />
                  <div className="lbl" style={{color: d.today ? 'var(--accent)' : 'var(--text-muted)', fontWeight: d.today ? 700 : 400}}>{d.day}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="panel panel-flush">
        <div className="section-head">
          <div className="lhs">
            <h3>RINCIAN SESI DYNO</h3>
            <span className="pill-tag" style={{background:'var(--surface-alt)', color:'var(--text-muted)'}}>{reportDyno.jobs.length} SESI</span>
          </div>
          <button className="btn-ghost"><I.print /> PRINT</button>
        </div>
        <div className="table-wrap" style={{overflow:'auto'}}>
          <table className="tbl" style={{minWidth:900}}>
            <thead>
              <tr>
                <th style={{padding:'12px 20px'}}>TGL · JAM</th>
                <th>NO REFERENSI</th>
                <th>CUSTOMER</th>
                <th>OPERATOR</th>
                <th>METODE</th>
                <th style={{textAlign:'right', paddingRight:20}}>NOMINAL</th>
              </tr>
            </thead>
            <tbody>
              {reportDyno.jobs.map((j, i) => (
                <tr key={i}>
                  <td style={{padding:'13px 20px'}}>
                    <div style={{fontWeight:600, fontSize:12.5}}>{j.tgl}</div>
                    <div style={{fontFamily:'var(--mono)', fontSize:10, color:'var(--text-muted)', marginTop:2}}>{j.time}</div>
                  </td>
                  <td className="ref">{j.ref}</td>
                  <td style={{fontWeight:500}}>{j.customer}</td>
                  <td>
                    <span className="mech-pill">
                      <span className="ai">{j.mech[0]}</span>
                      {j.mech}
                    </span>
                  </td>
                  <td><span className={'method-pill ' + j.method}>{j.method}</span></td>
                  <td className="num" style={{paddingRight:20}}>Rp {fr(j.amount)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{background:'var(--surface-alt)'}}>
                <td colSpan="5" style={{padding:'14px 20px', fontFamily:'var(--mono)', fontWeight:700, borderTop:'2px solid var(--text)'}}>GRAND TOTAL DYNO</td>
                <td style={{padding:'14px 20px', textAlign:'right', fontFamily:'var(--mono)', fontWeight:700, fontSize:14, color:'var(--accent)', borderTop:'2px solid var(--text)'}}>Rp {fr(reportDyno.hero.revenue)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </>
  );
};

window.LaporanKategori = LaporanKategori;
window.LaporanCashFlow = LaporanCashFlow;
window.LaporanJasa = LaporanJasa;
window.LaporanDyno = LaporanDyno;
