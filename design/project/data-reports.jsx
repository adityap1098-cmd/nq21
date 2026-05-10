// Mock data for laporan pages

const fmtRp2 = (n) => new Intl.NumberFormat('id-ID').format(Math.round(Math.abs(n)));

// Laporan 1 — Per Kategori (income & expense)
const reportKategori = {
  income: [
    { name: 'Jasa Service', count: 142, total: 28_450_000, isJasa: true },
    { name: 'Sparepart',    count: 89,  total: 19_220_000, isJasa: false },
    { name: 'Oli',          count: 156, total: 12_640_000, isJasa: false },
    { name: 'Dyno',         count: 11,  total:  9_850_000, isJasa: true },
    { name: 'Bubut Dalam',  count: 34,  total:  7_380_000, isJasa: true },
    { name: 'Bubut Luar',   count: 18,  total:  5_120_000, isJasa: true },
  ],
  expense: [
    { name: 'Beli Stok Sparepart', count: 12, total: 14_500_000 },
    { name: 'Gaji',                count:  4, total:  9_200_000 },
    { name: 'Beli Stok Oli',       count:  6, total:  6_800_000 },
    { name: 'Bayar Vendor Bubut',  count: 18, total:  3_240_000 },
    { name: 'Listrik & Air',       count:  2, total:  1_650_000 },
    { name: 'Sewa',                count:  1, total:  4_000_000 },
    { name: 'Lain-lain',           count:  3, total:    480_000 },
  ],
};

// Laporan 2 — Cash Flow
const reportCashFlow = (() => {
  const rows = [
    { tgl: '10 Mei', time: '14:32', ref: 'TRX-20260510-018', party: 'Dimas P.',         cat: 'Jasa, Sparepart', type: 'in',  method: 'cash',     amount:  425_000 },
    { tgl: '10 Mei', time: '14:08', ref: 'TRX-20260510-017', party: 'Rian S.',          cat: 'Oli',             type: 'in',  method: 'qris',     amount:   85_000 },
    { tgl: '10 Mei', time: '13:45', ref: 'EXP-20260510-004', party: 'Bubut Karya',      cat: 'Bayar Vendor',    type: 'out', method: 'transfer', amount:  350_000 },
    { tgl: '10 Mei', time: '13:21', ref: 'TRX-20260510-016', party: 'Aditya N.',        cat: 'Dyno, Jasa',      type: 'in',  method: 'transfer', amount:  950_000 },
    { tgl: '10 Mei', time: '12:54', ref: 'TRX-20260510-015', party: 'Bagas T.',         cat: 'Bubut Dalam',     type: 'in',  method: 'cash',     amount:  280_000 },
    { tgl: '10 Mei', time: '12:30', ref: 'TRX-20260510-014', party: 'Surya H.',         cat: 'Jasa, Oli',       type: 'in',  method: 'cash',     amount:  195_000 },
    { tgl: '10 Mei', time: '11:48', ref: 'TRX-20260510-013', party: 'Eka M.',           cat: 'Sparepart',       type: 'in',  method: 'qris',     amount:  540_000 },
    { tgl: '10 Mei', time: '11:10', ref: 'EXP-20260510-003', party: 'PLN',              cat: 'Listrik & Air',   type: 'out', method: 'transfer', amount:  180_000 },
    { tgl: '10 Mei', time: '10:42', ref: 'TRX-20260510-012', party: 'Hendra W.',        cat: 'Jasa',            type: 'in',  method: 'cash',     amount:  150_000 },
    { tgl: '10 Mei', time: '10:18', ref: 'TRX-20260510-011', party: 'Pradipta K.',      cat: 'Sparepart, Oli',  type: 'in',  method: 'qris',     amount:  365_000 },
    { tgl: '10 Mei', time: '09:50', ref: 'EXP-20260510-002', party: 'Toko Suparman',    cat: 'Beli Stok Spare', type: 'out', method: 'transfer', amount: 2_400_000 },
    { tgl: '10 Mei', time: '09:22', ref: 'TRX-20260510-010', party: 'Yoga A.',          cat: 'Jasa, Sparepart', type: 'in',  method: 'cash',     amount:  620_000 },
    { tgl: '09 Mei', time: '17:40', ref: 'TRX-20260509-022', party: 'Faisal R.',        cat: 'Bubut Luar',      type: 'in',  method: 'transfer', amount:  480_000 },
    { tgl: '09 Mei', time: '17:38', ref: 'EXP-20260509-006', party: 'Bubut Karya',      cat: 'Bayar Vendor',    type: 'out', method: 'transfer', amount:  280_000 },
    { tgl: '09 Mei', time: '16:15', ref: 'TRX-20260509-021', party: 'Bayu S.',          cat: 'Dyno',            type: 'in',  method: 'transfer', amount: 1_200_000 },
  ];
  // Compute running balance from oldest forward (saldo awal: 6.450.000)
  let bal = 6_450_000;
  // process oldest first
  const oldestFirst = [...rows].reverse();
  oldestFirst.forEach(r => {
    bal += (r.type === 'in' ? r.amount : -r.amount);
    r.saldo = bal;
  });
  return rows; // newest first for display
})();

// Laporan 3 — Jasa & Mekanik
const reportJasa = {
  mechanics: [
    { initial: 'B', name: 'Budi',  role: 'Senior',  jobs: 28, basis: 1_840_000, komisi: 552_000, top: false },
    { initial: 'A', name: 'Andi',  role: 'Senior',  jobs: 22, basis: 1_420_000, komisi: 355_000, top: false },
    { initial: 'J', name: 'Joko',  role: 'Lead',    jobs: 31, basis: 1_980_000, komisi: 594_000, top: true },
    { initial: 'R', name: 'Rizki', role: 'Junior',  jobs: 18, basis: 1_220_000, komisi: 268_400, top: false },
  ],
  jobs: [
    { tgl: '10 Mei', ref: 'TRX-20260510-018', customer: 'Dimas P. (Vario 150)',   kategori: 'Jasa',         nominal: 250_000, material:  50_000, basis: 200_000,
      mechs: [{ name: 'Budi', i: 'B', share: 100, komisi: 50_000 }] },
    { tgl: '10 Mei', ref: 'TRX-20260510-016', customer: 'Aditya N. (R15)',        kategori: 'Dyno',         nominal: 800_000, material:       0, basis: 800_000,
      mechs: [{ name: 'Joko', i: 'J', share: 100, komisi: 240_000 }] },
    { tgl: '10 Mei', ref: 'TRX-20260510-015', customer: 'Bagas T. (Nmax)',        kategori: 'Bubut Dalam',  nominal: 280_000, material:  40_000, basis: 240_000,
      mechs: [{ name: 'Andi', i: 'A', share: 100, komisi: 60_000 }] },
    { tgl: '10 Mei', ref: 'TRX-20260510-014', customer: 'Surya H. (Aerox)',       kategori: 'Jasa',         nominal: 150_000, material:  30_000, basis: 120_000,
      mechs: [{ name: 'Rizki', i: 'R', share: 60, komisi: 16_200 },
              { name: 'Joko', i: 'J', share: 40, komisi: 14_400 }] },
    { tgl: '10 Mei', ref: 'TRX-20260510-012', customer: 'Hendra W. (Beat)',       kategori: 'Jasa',         nominal: 150_000, material:  20_000, basis: 130_000,
      mechs: [{ name: 'Budi', i: 'B', share: 100, komisi: 32_500 }] },
    { tgl: '09 Mei', ref: 'TRX-20260509-022', customer: 'Faisal R. (CBR250)',     kategori: 'Bubut Luar',   nominal: 480_000, material: 280_000, basis: 200_000,
      mechs: [{ name: 'Joko', i: 'J', share: 100, komisi: 50_000 }] },
    { tgl: '09 Mei', ref: 'TRX-20260509-021', customer: 'Bayu S. (Ninja 250)',    kategori: 'Dyno',         nominal: 1_200_000, material:    0, basis: 1_200_000,
      mechs: [{ name: 'Joko', i: 'J', share: 100, komisi: 360_000 }] },
    { tgl: '09 Mei', ref: 'TRX-20260509-018', customer: 'Galih P. (Vario)',       kategori: 'Jasa',         nominal: 320_000, material:  80_000, basis: 240_000,
      mechs: [{ name: 'Andi', i: 'A', share: 70, komisi: 42_000 },
              { name: 'Rizki', i: 'R', share: 30, komisi: 16_200 }] },
  ],
};

// Laporan 4 — Dyno
const reportDyno = {
  hero: {
    sessions: 11,
    revenue: 9_850_000,
    avg: 895_000,
  },
  topOperators: [
    { i: 'J', name: 'Joko',  sessions: 7, revenue: 6_300_000, top: true },
    { i: 'B', name: 'Budi',  sessions: 3, revenue: 2_700_000 },
    { i: 'A', name: 'Andi',  sessions: 1, revenue:   850_000 },
  ],
  // sessions per day (last 14 days)
  sessionsPerDay: [
    { day: '27', count: 0 },
    { day: '28', count: 1 },
    { day: '29', count: 0 },
    { day: '30', count: 1 },
    { day: '01', count: 0 },
    { day: '02', count: 2 },
    { day: '03', count: 1 },
    { day: '04', count: 0 },
    { day: '05', count: 1 },
    { day: '06', count: 0 },
    { day: '07', count: 1 },
    { day: '08', count: 1 },
    { day: '09', count: 2 },
    { day: '10', count: 2, today: true },
  ],
  jobs: [
    { tgl: '10 Mei', time: '13:21', ref: 'TRX-20260510-016', customer: 'Aditya N. (R15)',     mech: 'Joko', method: 'transfer', amount:   800_000 },
    { tgl: '09 Mei', time: '16:15', ref: 'TRX-20260509-021', customer: 'Bayu S. (Ninja 250)', mech: 'Joko', method: 'transfer', amount: 1_200_000 },
    { tgl: '09 Mei', time: '11:30', ref: 'TRX-20260509-009', customer: 'Reza F. (CBR150)',    mech: 'Joko', method: 'qris',     amount:   850_000 },
    { tgl: '08 Mei', time: '15:42', ref: 'TRX-20260508-014', customer: 'Aldi K. (R25)',       mech: 'Budi', method: 'transfer', amount: 1_100_000 },
    { tgl: '07 Mei', time: '14:10', ref: 'TRX-20260507-011', customer: 'Iqbal M. (Ninja ZX)', mech: 'Joko', method: 'transfer', amount: 1_500_000 },
    { tgl: '06 Mei', time: '10:20', ref: 'TRX-20260506-008', customer: 'Toni W. (R15)',       mech: 'Andi', method: 'cash',     amount:   850_000 },
    { tgl: '03 Mei', time: '13:55', ref: 'TRX-20260503-019', customer: 'Pram H. (CBR250)',    mech: 'Joko', method: 'transfer', amount:   950_000 },
    { tgl: '02 Mei', time: '16:30', ref: 'TRX-20260502-022', customer: 'Vino A. (Ninja 250)', mech: 'Budi', method: 'transfer', amount:   800_000 },
    { tgl: '02 Mei', time: '11:15', ref: 'TRX-20260502-008', customer: 'Doni R. (R15)',       mech: 'Joko', method: 'cash',     amount:   650_000 },
    { tgl: '30 Apr', time: '14:40', ref: 'TRX-20260430-017', customer: 'Yusuf P. (CBR150)',   mech: 'Budi', method: 'qris',     amount:   800_000 },
    { tgl: '28 Apr', time: '15:00', ref: 'TRX-20260428-016', customer: 'Rifki S. (R25)',      mech: 'Joko', method: 'transfer', amount:   350_000 },
  ],
};

window.NQ21Reports = { reportKategori, reportCashFlow, reportJasa, reportDyno };
