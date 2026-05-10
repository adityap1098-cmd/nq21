// Mock data for NQ21 PERFORMANCE prototype

const fmtRp = (n) => {
  if (n == null) return '—';
  return new Intl.NumberFormat('id-ID').format(Math.round(Math.abs(n)));
};
const fmtRpShort = (n) => {
  const a = Math.abs(n);
  if (a >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'jt';
  if (a >= 1_000) return Math.round(n / 1_000) + 'rb';
  return String(Math.round(n));
};

// 7-day cash flow (Mon–Sun) — Senin lalu sampai hari ini (Minggu)
const cashflow = [
  { day: 'SEN', date: '04 Mei', in: 2_450_000, out: 1_100_000 },
  { day: 'SEL', date: '05 Mei', in: 3_220_000, out: 850_000 },
  { day: 'RAB', date: '06 Mei', in: 1_980_000, out: 420_000 },
  { day: 'KAM', date: '07 Mei', in: 4_150_000, out: 1_650_000 },
  { day: 'JUM', date: '08 Mei', in: 5_320_000, out: 1_980_000 },
  { day: 'SAB', date: '09 Mei', in: 6_780_000, out: 2_240_000 },
  { day: 'MIN', date: '10 Mei', in: 4_890_000, out: 980_000, today: true },
];

// Top kategori bulan ini
const topCategories = [
  { name: 'Jasa Service',   meta: '142 transaksi · komisi aktif',   amount: 28_450_000, pct: 1.0 },
  { name: 'Sparepart',      meta: '89 transaksi',                    amount: 19_220_000, pct: 0.68 },
  { name: 'Oli',            meta: '156 transaksi',                   amount: 12_640_000, pct: 0.44 },
  { name: 'Dyno',           meta: '11 transaksi · owner only',       amount:  9_850_000, pct: 0.35 },
  { name: 'Bubut Dalam',    meta: '34 transaksi · komisi aktif',     amount:  7_380_000, pct: 0.26 },
];

// Recent transactions
const recentTx = [
  { ref: 'TRX-20260510-018', time: '14:32', name: 'Dimas P. (Vario 150)', cat: 'Jasa, Sparepart', type: 'in',  amount: 425_000, method: 'cash' },
  { ref: 'TRX-20260510-017', time: '14:08', name: 'Rian S. (Beat)',       cat: 'Oli',            type: 'in',  amount:  85_000, method: 'qris' },
  { ref: 'EXP-20260510-004', time: '13:45', name: 'Bengkel Bubut Karya',  cat: 'Bayar Vendor',   type: 'out', amount: 350_000, method: 'transfer' },
  { ref: 'TRX-20260510-016', time: '13:21', name: 'Aditya N. (R15)',      cat: 'Dyno, Jasa',     type: 'in',  amount: 950_000, method: 'transfer' },
  { ref: 'TRX-20260510-015', time: '12:54', name: 'Bagas T. (Nmax)',      cat: 'Bubut Dalam',    type: 'in',  amount: 280_000, method: 'cash' },
  { ref: 'TRX-20260510-014', time: '12:30', name: 'Surya H. (Aerox)',     cat: 'Jasa, Oli',      type: 'in',  amount: 195_000, method: 'cash' },
  { ref: 'TRX-20260510-013', time: '11:48', name: 'Eka M. (PCX)',         cat: 'Sparepart',      type: 'in',  amount: 540_000, method: 'qris' },
];

// Periode komisi
const periods = [
  { id: 1, range: '04 – 10 MEI 2026', label: 'Periode aktif',  status: 'open',   total: 2_185_000, mechanics: 4, active: true },
  { id: 2, range: '27 APR – 03 MEI',  label: 'Closed',         status: 'closed', total: 1_980_000, mechanics: 4, paid: 4 },
  { id: 3, range: '20 – 26 APR',      label: 'Closed',         status: 'closed', total: 2_340_000, mechanics: 4, paid: 4 },
];

// Mekanik mini
const mechanics = [
  { initial: 'B', name: 'Budi',  basis: 1_840_000, komisi: 552_000 },
  { initial: 'A', name: 'Andi',  basis: 1_420_000, komisi: 355_000 },
  { initial: 'J', name: 'Joko',  basis: 1_980_000, komisi: 594_000 },
  { initial: 'R', name: 'Rizki', basis: 1_220_000, komisi: 268_400 },
];

window.NQ21Data = { cashflow, topCategories, recentTx, periods, mechanics, fmtRp, fmtRpShort };
