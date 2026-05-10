// Icons (inline SVG components) — minimal stroke set
const Icon = ({ d, size = 16, sw = 1.6, fill = 'none' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
    {Array.isArray(d) ? d.map((p, i) => <path key={i} d={p} />) : <path d={d} />}
  </svg>
);
const I = {
  dash:    () => <Icon d={['M3 13l9-9 9 9','M5 11v9h5v-6h4v6h5v-9']} />,
  tx:      () => <Icon d={['M3 7h13l-3-3','M21 17H8l3 3']} />,
  report:  () => <Icon d={['M4 4h12l4 4v12H4z','M16 4v4h4','M8 12h8','M8 16h5']} />,
  cash:    () => <Icon d={['M3 7h18v10H3z','M3 11h18','M7 14h2','M11 14h2']} />,
  wrench:  () => <Icon d={['M14.7 6.3a4 4 0 015.6 5.6l-9.6 9.6-3.5.7.7-3.5 9.6-9.6','M2 22l4-4']} />,
  users:   () => <Icon d={['M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2','M9 11a4 4 0 100-8 4 4 0 000 8','M22 21v-2a4 4 0 00-3-3.87','M16 3.13a4 4 0 010 7.75']} />,
  truck:   () => <Icon d={['M1 7h13v10H1z','M14 10h4l3 3v4h-7','M5 21a2 2 0 100-4 2 2 0 000 4z','M17 21a2 2 0 100-4 2 2 0 000 4z']} />,
  tag:     () => <Icon d={['M20.6 13.4L12 22l-9-9V3h10l7.6 7.6a2 2 0 010 2.8z','M7 7h.01']} />,
  log:     () => <Icon d={['M4 6h16','M4 12h16','M4 18h10']} />,
  search:  () => <Icon d={['M11 19a8 8 0 100-16 8 8 0 000 16z','M21 21l-4.3-4.3']} size={15} />,
  bell:    () => <Icon d={['M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9','M14 21a2 2 0 01-4 0']} />,
  cal:     () => <Icon d={['M3 5h18v16H3z','M3 9h18','M8 3v4','M16 3v4']} size={14} />,
  plus:    () => <Icon d={['M12 5v14','M5 12h14']} />,
  arrow:   () => <Icon d={['M5 12h14','M13 5l7 7-7 7']} size={14} />,
  out:     () => <Icon d={['M16 17l5-5-5-5','M21 12H9','M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4']} size={14} />,
  download:() => <Icon d={['M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4','M7 10l5 5 5-5','M12 15V3']} size={14} />,
  eye:     () => <Icon d={['M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z','M12 15a3 3 0 100-6 3 3 0 000 6z']} size={16} />,
  eyeoff:  () => <Icon d={['M17.94 17.94A10.06 10.06 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94','M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19','M14.12 14.12A3 3 0 119.88 9.88','M1 1l22 22']} size={16} />,
  shield:  () => <Icon d={['M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z']} size={14} />,
  user:    () => <Icon d={['M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2','M12 11a4 4 0 100-8 4 4 0 000 8z']} size={14} />,
  power:   () => <Icon d={['M18.36 6.64a9 9 0 11-12.73 0','M12 2v10']} size={14} />,
  trend:   () => <Icon d={['M3 17l6-6 4 4 8-8','M14 7h7v7']} size={14} />,
  trendD:  () => <Icon d={['M3 7l6 6 4-4 8 8','M14 17h7v-7']} size={14} />,
  print:   () => <Icon d={['M6 9V2h12v7','M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2','M6 14h12v8H6z']} size={14} />,
  home:    () => <Icon d={['M3 13l9-9 9 9','M5 11v9h5v-6h4v6h5v-9']} size={16} />,
  pie:     () => <Icon d={['M21.21 15.89A10 10 0 118 2.83','M22 12A10 10 0 0012 2v10z']} size={16} />,
  bars:    () => <Icon d={['M3 21V11','M9 21V3','M15 21V8','M21 21V14']} size={16} />,
  star:    () => <Icon d={['M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z']} size={16} />,
  bolt:    () => <Icon d={['M13 2L3 14h7l-1 8 10-12h-7l1-8z']} size={16} />,
  filter:  () => <Icon d={['M3 4h18','M6 12h12','M10 20h4']} size={14} />,
  refresh: () => <Icon d={['M3 12a9 9 0 0115.5-6.36L21 8','M21 3v5h-5','M21 12a9 9 0 01-15.5 6.36L3 16','M3 21v-5h5']} size={14} />,
};
window.I = I;
