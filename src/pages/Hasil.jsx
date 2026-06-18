import React, { useState, useEffect, useRef } from 'react';
import Card from '../components/Card';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, Legend
} from 'recharts';
import {
  Award, TrendingUp, Package, Truck, DollarSign, FileText,
  Download, CheckCircle, Star, ArrowRight, BarChart2, Activity,
  BookOpen, Lightbulb, FileSpreadsheet, AlertCircle
} from 'lucide-react';

// ============================================================
// STATIC ANP RESULTS (representative of computed ANP weights)
// ============================================================
const ANP_RESULTS = [
  { name: 'Peningkatan Teknologi Produksi', shortName: 'Teknologi Produksi', weight: 28.64, rank: 1 },
  { name: 'Pengurangan Ketergantungan Impor', shortName: 'Kurangi Impor', weight: 23.17, rank: 2 },
  { name: 'Stabilisasi Harga Kebijakan', shortName: 'Stabilisasi Harga', weight: 19.85, rank: 3 },
  { name: 'Penguatan Distribusi & Pergudangan', shortName: 'Distribusi & Gudang', weight: 16.42, rank: 4 },
  { name: 'Penguatan Kelembagaan Petani', shortName: 'Kelembagaan Petani', weight: 11.92, rank: 5 },
];

const ALT_FULL_NAMES = [
  'Peningkatan Teknologi dan Kualitas Produksi Garam Rakyat',
  'Pengurangan Ketergantungan Impor',
  'Stabilisasi Harga Melalui Kebijakan Pemerintah',
  'Penguatan Sistem Distribusi dan Pergudangan',
  'Penguatan Kelembagaan dan Kemitraan Petani',
];

// ============================================================
// SYSTEM DYNAMICS ENGINE  (same formulae as Simulasi.jsx)
// ============================================================
function runSimulation() {
  const defaultParams = {
    peranPemerintah: 0.913,
    permintaan: 116859,
    impor: 0.98,
    hargaImpor: 728,
    hargaReferensi: 767,
    luasLahan: 973.6,
    curahHujan: 0.18,
    faktorMusim: 1,
  };
  const results = [];
  // INTEG initial value — stokNow is beginning-of-year value (Vensim semantics)
  let stokNow = 19059.5;
  for (let year = 2024; year <= 2027; year++) {
    const s25 = year >= 2025 ? 1 : 0;
    const s26 = year >= 2026 ? 1 : 0;
    // Exogenous STEP variables
    const hargaRef_t      = defaultParams.hargaReferensi + s25 * 1481;
    const impor_t         = defaultParams.impor          + s25 * (-0.37);
    const hargaImpor_t    = defaultParams.hargaImpor     + s25 * 48;
    const peran_t         = defaultParams.peranPemerintah+ s25 * 0.084;
    const teknologi_t     = peran_t;
    const permintaan_t    = defaultParams.permintaan
                            + s25 * (defaultParams.permintaan * (-0.48))
                            + s26 * (-18000);
    const faktorMusim_t   = defaultParams.faktorMusim + s25 * (-0.576);
    const luasLahan_t     = defaultParams.luasLahan   + s25 * (-13.9);
    const curahHujan_t    = defaultParams.curahHujan  + s25 * defaultParams.curahHujan;
    // Flow computations
    const produktivitas_t = 122.96 * (teknologi_t / 0.913) * ((1 - curahHujan_t) / (1 - 0.18)) * faktorMusim_t;
    const produksiGaram_t = luasLahan_t * produktivitas_t;
    const distribusi_t    = Math.min(permintaan_t, stokNow + produksiGaram_t);
    // Harga uses beginning-of-year stock (stokNow) — Vensim INTEG convention
    const maxStok         = Math.max(stokNow, 1);
    const denominator     = (maxStok / 19059.5) * Math.max(impor_t / 0.98, 1e-9);
    const innerFrac       = (hargaImpor_t / 728) / Math.max(denominator, 1e-9);
    const pricePower      = Math.pow(Math.max(innerFrac, 1e-9), 1.655);
    const harga_t         = hargaRef_t * (permintaan_t / 116859) * pricePower;
    // Save — display stokNow (beginning-of-year) for this row
    results.push({
      tahun:         year,
      stokGaram:     Math.round(stokNow * 100) / 100,
      produksiGaram: Math.round(produksiGaram_t * 100) / 100,
      distribusi:    Math.round(distribusi_t * 100) / 100,
      harga:         Math.round(harga_t * 100) / 100,
    });
    // INTEG update: stock for next year
    stokNow = stokNow + produksiGaram_t - distribusi_t;
  }
  return results;
}

// ============================================================
// FORMATTERS
// ============================================================
const fmtNum = (n) =>
  new Intl.NumberFormat('id-ID', { minimumFractionDigits: 0, maximumFractionDigits: 1 }).format(n);
const fmtRp = (n) =>
  `Rp ${new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(n)}`;
const fmtK = (v) => (v >= 1000 ? `${Math.round(v / 1000)}k` : String(v));

// ============================================================
// CUSTOM RECHARTS TOOLTIP
// ============================================================
const CustomTooltipSim = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: '#0F172A', borderRadius: 12, padding: '10px 14px', fontSize: 11, color: '#fff', boxShadow: '0 10px 25px rgba(0,0,0,0.4)' }}>
      <p style={{ fontWeight: 800, marginBottom: 6, color: '#94A3B8', fontSize: 10, textTransform: 'uppercase' }}>Tahun {label}</p>
      {payload.map((p, i) => {
        const isHarga = p.dataKey === 'harga';
        return (
          <p key={i} style={{ color: p.color, margin: '2px 0', fontWeight: 600 }}>
            {p.name}: {isHarga ? fmtRp(p.value) + '/kg' : fmtNum(p.value) + ' ton'}
          </p>
        );
      })}
    </div>
  );
};

const CustomTooltipANP = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: '#0F172A', borderRadius: 12, padding: '10px 14px', fontSize: 11, color: '#fff', boxShadow: '0 10px 25px rgba(0,0,0,0.4)' }}>
      <p style={{ fontWeight: 700, color: '#94A3B8', marginBottom: 4 }}>{payload[0]?.payload?.name}</p>
      <p style={{ color: '#60A5FA', fontWeight: 700 }}>Bobot: {payload[0]?.value?.toFixed(2)}%</p>
    </div>
  );
};

// ============================================================
// RANK BADGE
// ============================================================
const RankBadge = ({ rank }) => {
  const colors = { 1: 'bg-yellow-50 text-yellow-700 border-yellow-300', 2: 'bg-slate-100 text-slate-600 border-slate-300', 3: 'bg-orange-50 text-orange-700 border-orange-300' };
  const cls = colors[rank] || 'bg-slate-50 text-slate-500 border-slate-200';
  return (
    <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full border-2 font-extrabold text-xs ${cls}`}>
      {rank}
    </span>
  );
};

// ============================================================
// MAIN COMPONENT
// ============================================================
export default function Hasil() {
  const [simData, setSimData] = useState([]);
  const [exporting, setExporting] = useState(null); // 'pdf' | 'excel' | null
  const printRef = useRef(null);

  useEffect(() => {
    setSimData(runSimulation());
  }, []);

  // Derived convenience values
  const lastSim = simData[simData.length - 1] || {};
  const firstSim = simData[0] || {};
  const bestAlt = ANP_RESULTS[0];

  // ── Trend helper ──────────────────────────────────────────
  const trend = (start, end) => {
    if (!start || !end) return { val: 0, up: true };
    const diff = ((end - start) / Math.abs(start || 1)) * 100;
    return { val: Math.abs(diff).toFixed(1), up: diff >= 0 };
  };
  const tStok = trend(firstSim.stokGaram, lastSim.stokGaram);
  const tProd = trend(firstSim.produksiGaram, lastSim.produksiGaram);
  const tDist = trend(firstSim.distribusi, lastSim.distribusi);
  const tHarga = trend(firstSim.harga, lastSim.harga);

  // ── Summary KPI cards ────────────────────────────────────
  const kpiCards = [
    {
      label: 'Alternatif Terbaik ANP',
      value: 'Peningkatan Teknologi Produksi',
      sub: `Bobot prioritas ${bestAlt.weight}%`,
      icon: <Award size={22} />,
      color: 'from-yellow-500 to-amber-400',
      bg: 'bg-yellow-50',
      text: 'text-yellow-700',
    },
    {
      label: 'Stok Garam Akhir (2027)',
      value: `${fmtNum(lastSim.stokGaram)} ton`,
      sub: `${tStok.up ? '▲' : '▼'} ${tStok.val}% dari 2024`,
      icon: <Package size={22} />,
      color: 'from-blue-600 to-sky-400',
      bg: 'bg-blue-50',
      text: 'text-blue-700',
    },
    {
      label: 'Produksi Garam Akhir (2027)',
      value: `${fmtNum(lastSim.produksiGaram)} ton`,
      sub: `${tProd.up ? '▲' : '▼'} ${tProd.val}% dari 2024`,
      icon: <TrendingUp size={22} />,
      color: 'from-emerald-600 to-green-400',
      bg: 'bg-emerald-50',
      text: 'text-emerald-700',
    },
    {
      label: 'Distribusi Akhir (2027)',
      value: `${fmtNum(lastSim.distribusi)} ton`,
      sub: `${tDist.up ? '▲' : '▼'} ${tDist.val}% dari 2024`,
      icon: <Truck size={22} />,
      color: 'from-violet-600 to-purple-400',
      bg: 'bg-violet-50',
      text: 'text-violet-700',
    },
    {
      label: 'Harga Garam Akhir (2027)',
      value: `${fmtRp(lastSim.harga)}/kg`,
      sub: `${tHarga.up ? '▲' : '▼'} ${tHarga.val}% dari 2024`,
      icon: <DollarSign size={22} />,
      color: 'from-cyan-600 to-teal-400',
      bg: 'bg-cyan-50',
      text: 'text-cyan-700',
    },
    {
      label: 'Bobot Prioritas Tertinggi',
      value: `${bestAlt.weight}%`,
      sub: 'Selisih dengan prioritas ke-2: +5.47%',
      icon: <Star size={22} />,
      color: 'from-rose-600 to-pink-400',
      bg: 'bg-rose-50',
      text: 'text-rose-700',
    },
  ];

  // ── Conclusion bullets ────────────────────────────────────
  const conclusions = [
    {
      icon: <Award size={18} className="text-yellow-600 mt-0.5 shrink-0" />,
      title: 'Alternatif Terbaik ANP',
      body: `Berdasarkan analisis ANP, alternatif strategis prioritas utama adalah "${ALT_FULL_NAMES[0]}" dengan bobot global sebesar ${bestAlt.weight}%, mengungguli seluruh alternatif kebijakan lainnya dalam kerangka rantai pasok garam nasional.`,
    },
    {
      icon: <TrendingUp size={18} className="text-emerald-600 mt-0.5 shrink-0" />,
      title: 'Dampak terhadap Produksi Garam',
      body: `Hasil simulasi System Dynamics menunjukkan produksi garam bergerak dari ${fmtNum(firstSim.produksiGaram)} ton (2024) menjadi ${fmtNum(lastSim.produksiGaram)} ton (2027). Penerapan teknologi produksi berpotensi mendongkrak produktivitas lahan dan memperbaiki rasio hasil panen terhadap curah hujan.`,
    },
    {
      icon: <Package size={18} className="text-blue-600 mt-0.5 shrink-0" />,
      title: 'Dampak terhadap Stok Garam',
      body: `Stok garam mengalami perubahan dari ${fmtNum(firstSim.stokGaram)} ton (2024) menjadi ${fmtNum(lastSim.stokGaram)} ton (2027), mencerminkan dinamika akumulasi (INTEG) antara laju produksi dan laju distribusi dalam model stock-flow.`,
    },
    {
      icon: <Truck size={18} className="text-violet-600 mt-0.5 shrink-0" />,
      title: 'Dampak terhadap Distribusi',
      body: `Volume distribusi menunjukkan nilai ${fmtNum(firstSim.distribusi)} ton (2024) menjadi ${fmtNum(lastSim.distribusi)} ton (2027). Nilai distribusi dibatasi oleh fungsi MIN antara permintaan pasar dan ketersediaan stok, sehingga mencerminkan kondisi suplai riil.`,
    },
    {
      icon: <DollarSign size={18} className="text-cyan-600 mt-0.5 shrink-0" />,
      title: 'Dampak terhadap Harga Garam',
      body: `Harga garam bergerak dari ${fmtRp(firstSim.harga)}/kg (2024) ke ${fmtRp(lastSim.harga)}/kg (2027), dipengaruhi oleh rasio permintaan, impor, dan stok ketersediaan. Stabilisasi harga memerlukan koordinasi kebijakan impor dan peningkatan produksi domestik.`,
    },
  ];

  // ── EXPORT EXCEL ─────────────────────────────────────────
  const handleExportExcel = async () => {
    setExporting('excel');
    try {
      const XLSX = await import('xlsx');
      const wb = XLSX.utils.book_new();

      // Sheet 1: Ranking ANP
      const anpRows = [
        ['Ranking', 'Alternatif Strategi', 'Bobot Prioritas (%)'],
        ...ANP_RESULTS.map((a) => [a.rank, a.name, a.weight]),
      ];
      const ws1 = XLSX.utils.aoa_to_sheet(anpRows);
      XLSX.utils.book_append_sheet(wb, ws1, 'Ranking ANP');

      // Sheet 2: Simulasi
      const simRows = [
        ['Tahun', 'Stok Garam (Ton)', 'Produksi Garam (Ton)', 'Distribusi (Ton)', 'Harga (Rp/kg)'],
        ...simData.map((r) => [r.tahun, r.stokGaram, r.produksiGaram, r.distribusi, r.harga]),
      ];
      const ws2 = XLSX.utils.aoa_to_sheet(simRows);
      XLSX.utils.book_append_sheet(wb, ws2, 'Simulasi 2024-2027');

      // Sheet 3: Kesimpulan
      const concRows = [
        ['Aspek', 'Uraian Kesimpulan'],
        ...conclusions.map((c) => [c.title, c.body]),
      ];
      const ws3 = XLSX.utils.aoa_to_sheet(concRows);
      XLSX.utils.book_append_sheet(wb, ws3, 'Kesimpulan');

      XLSX.writeFile(wb, 'DYNASALT_Hasil_Analisis.xlsx');
    } catch (err) {
      console.error(err);
      alert('Gagal mengekspor Excel. Pastikan dependensi xlsx sudah terinstall.');
    }
    setExporting(null);
  };

  // ── EXPORT PDF ────────────────────────────────────────────
  const handleExportPDF = async () => {
    setExporting('pdf');
    try {
      const html2canvas = (await import('html2canvas')).default;
      const jsPDF = (await import('jspdf')).default;

      const element = printRef.current;
      const canvas = await html2canvas(element, {
        scale: 1.5,
        useCORS: true,
        backgroundColor: '#ffffff',
        scrollX: 0,
        scrollY: 0,
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfW = pdf.internal.pageSize.getWidth();
      const pdfH = pdf.internal.pageSize.getHeight();
      const ratio = canvas.width / canvas.height;
      const imgH = pdfW / ratio;

      let heightLeft = imgH;
      let position = 0;
      pdf.addImage(imgData, 'PNG', 0, position, pdfW, imgH);
      heightLeft -= pdfH;
      while (heightLeft > 0) {
        position = heightLeft - imgH;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, pdfW, imgH);
        heightLeft -= pdfH;
      }

      pdf.save('DYNASALT_Hasil_Analisis.pdf');
    } catch (err) {
      console.error(err);
      alert('Gagal mengekspor PDF. Pastikan dependensi jspdf & html2canvas sudah terinstall.');
    }
    setExporting(null);
  };

  // ============================================================
  // RENDER
  // ============================================================
  return (
    <div className="space-y-8 animate-fade-in p-4 md:p-6">

      {/* ── PAGE HEADER ─────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-brand-grayMedium pb-5">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-800 tracking-tight flex items-center gap-2">
            <BookOpen className="text-brand-navy h-6 w-6" />
            Hasil Analisis Rantai Pasok Garam
          </h2>
          <p className="text-sm text-brand-grayDark mt-1">
            Integrasi hasil System Dynamics (SD) dan Analytic Network Process (ANP) — DYNASALT 2024–2027
          </p>
        </div>

        {/* Export Buttons */}
        <div className="flex gap-3 shrink-0">
          <button
            onClick={handleExportExcel}
            disabled={!!exporting}
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-bold text-xs rounded-xl shadow-sm shadow-emerald-600/20 transition-all"
          >
            <FileSpreadsheet size={15} />
            {exporting === 'excel' ? 'Mengekspor...' : 'Export Excel'}
          </button>
          <button
            onClick={handleExportPDF}
            disabled={!!exporting}
            className="flex items-center gap-2 px-4 py-2.5 bg-brand-navy hover:bg-brand-navy/90 disabled:opacity-60 text-white font-bold text-xs rounded-xl shadow-sm shadow-brand-navy/20 transition-all"
          >
            <Download size={15} />
            {exporting === 'pdf' ? 'Mengekspor...' : 'Export PDF'}
          </button>
        </div>
      </div>

      {/* ── PRINTABLE CONTENT AREA ──────────────────────── */}
      <div ref={printRef} className="space-y-8">

        {/* ══ SECTION 1: RINGKASAN HASIL ═══════════════════ */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <span className="w-8 h-8 rounded-xl bg-brand-navy flex items-center justify-center text-white font-black text-sm">1</span>
            <h3 className="text-lg font-extrabold text-slate-800 tracking-tight">Ringkasan Hasil Analisis</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {kpiCards.map((card, idx) => (
              <div
                key={idx}
                className="bg-white border border-brand-grayMedium rounded-2xl p-5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex items-start gap-4"
              >
                <div className={`w-11 h-11 rounded-xl ${card.bg} flex items-center justify-center shrink-0`}>
                  <span className={card.text}>{card.icon}</span>
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider truncate">{card.label}</p>
                  <p className="text-sm font-extrabold text-slate-900 mt-0.5 leading-snug">{card.value}</p>
                  <p className="text-[10px] text-slate-500 mt-1 font-medium">{card.sub}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ══ SECTION 2: HASIL PRIORITAS ANP ══════════════ */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <span className="w-8 h-8 rounded-xl bg-brand-navy flex items-center justify-center text-white font-black text-sm">2</span>
            <h3 className="text-lg font-extrabold text-slate-800 tracking-tight">Hasil Prioritas ANP</h3>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
            {/* Bar Chart */}
            <div className="lg:col-span-3">
              <Card title="Grafik Bobot Prioritas Alternatif" subtitle="Diurutkan dari bobot tertinggi ke terendah (%)">
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={ANP_RESULTS} layout="vertical" margin={{ top: 4, right: 30, left: 10, bottom: 4 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E2E8F0" />
                      <XAxis type="number" fontSize={10} stroke="#64748B" tickFormatter={(v) => `${v}%`} />
                      <YAxis type="category" dataKey="shortName" width={115} fontSize={10} stroke="#64748B" fontWeight="600" />
                      <Tooltip content={<CustomTooltipANP />} />
                      <Bar dataKey="weight" fill="#1E3A8A" radius={[0, 6, 6, 0]} barSize={22}
                        label={{ position: 'right', fontSize: 10, fontWeight: 700, fill: '#1E3A8A', formatter: (v) => `${v}%` }}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            </div>
            {/* Ranking Table */}
            <div className="lg:col-span-2">
              <Card title="Tabel Ranking Alternatif" subtitle="Berdasarkan limit matrix ANP">
                <div className="space-y-2.5">
                  {ANP_RESULTS.map((alt) => (
                    <div key={alt.rank} className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${alt.rank === 1 ? 'bg-yellow-50 border-yellow-200' : 'bg-slate-50 border-brand-grayMedium'}`}>
                      <RankBadge rank={alt.rank} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-slate-800 leading-snug truncate">{alt.name}</p>
                      </div>
                      <span className={`text-xs font-extrabold font-mono shrink-0 ${alt.rank === 1 ? 'text-yellow-700' : 'text-slate-600'}`}>
                        {alt.weight}%
                      </span>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </div>
        </section>

        {/* ══ SECTION 3: HASIL SIMULASI SYSTEM DYNAMICS ═══ */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <span className="w-8 h-8 rounded-xl bg-brand-navy flex items-center justify-center text-white font-black text-sm">3</span>
            <h3 className="text-lg font-extrabold text-slate-800 tracking-tight">Hasil Simulasi System Dynamics (2024–2027)</h3>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Time Series Chart */}
            <div className="lg:col-span-2">
              <Card
                title="Grafik Time Series Rantai Pasok Garam"
                subtitle="Sumbu Y Kiri: Stok, Produksi & Distribusi (Ton) · Sumbu Y Kanan: Harga (Rp/kg)"
              >
                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={simData} margin={{ top: 15, right: 80, left: 10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                      <XAxis dataKey="tahun" fontSize={11} stroke="#64748B" fontWeight="bold" />
                      <YAxis yAxisId="left" fontSize={10} stroke="#64748B" width={50} tickFormatter={fmtK}
                        label={{ value: 'Ton', angle: -90, position: 'insideLeft', fontSize: 10, fontWeight: 'bold' }} />
                      <YAxis yAxisId="right" orientation="right" fontSize={10} stroke="#0891B2" width={85}
                        tickFormatter={(v) => `Rp ${fmtK(v)}`}
                        label={{ value: 'Rp/kg', angle: 90, position: 'insideRight', fontSize: 10, fontWeight: 'bold' }} />
                      <Tooltip content={<CustomTooltipSim />} />
                      <Legend verticalAlign="top" height={36} fontSize={11} iconType="circle" />
                      <Line yAxisId="left" type="monotone" dataKey="stokGaram" name="Stok Garam" stroke="#3B82F6" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                      <Line yAxisId="left" type="monotone" dataKey="produksiGaram" name="Produksi Garam" stroke="#10B981" strokeWidth={2.5} dot={{ r: 3 }} />
                      <Line yAxisId="left" type="monotone" dataKey="distribusi" name="Distribusi" stroke="#F59E0B" strokeWidth={2.5} dot={{ r: 3 }} />
                      <Line yAxisId="right" type="monotone" dataKey="harga" name="Harga" stroke="#0891B2" strokeWidth={2.5} dot={{ r: 3 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            </div>

            {/* Simulation Data Table */}
            <div className="lg:col-span-2">
              <Card title="Tabel Data Numerik Simulasi" subtitle="Nilai hasil komputasi per tahun simulasi">
                <div className="overflow-x-auto border border-brand-grayMedium rounded-xl bg-slate-50 p-2">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-brand-grayMedium text-brand-navy font-bold">
                        <th className="py-2.5 px-4 text-center">Tahun</th>
                        <th className="py-2.5 px-4 text-right">Stok Garam (Ton)</th>
                        <th className="py-2.5 px-4 text-right">Produksi Garam (Ton)</th>
                        <th className="py-2.5 px-4 text-right">Distribusi (Ton)</th>
                        <th className="py-2.5 px-4 text-right">Harga (Rp/Kg)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-brand-grayMedium text-slate-600 font-medium font-mono">
                      {simData.map((row) => (
                        <tr key={row.tahun} className="hover:bg-white transition-colors">
                          <td className="py-3 px-4 text-center text-slate-900 font-sans font-extrabold">{row.tahun}</td>
                          <td className="py-3 px-4 text-right">{fmtNum(row.stokGaram)}</td>
                          <td className="py-3 px-4 text-right">{fmtNum(row.produksiGaram)}</td>
                          <td className="py-3 px-4 text-right">{fmtNum(row.distribusi)}</td>
                          <td className="py-3 px-4 text-right text-cyan-700 font-bold">{fmtRp(row.harga)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          </div>
        </section>

        {/* ══ SECTION 4: REKOMENDASI STRATEGI ══════════════ */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <span className="w-8 h-8 rounded-xl bg-brand-navy flex items-center justify-center text-white font-black text-sm">4</span>
            <h3 className="text-lg font-extrabold text-slate-800 tracking-tight">Rekomendasi Strategi</h3>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Main recommendation */}
            <div className="lg:col-span-2">
              <div className="bg-gradient-to-br from-brand-navy to-blue-800 rounded-2xl p-6 text-white shadow-lg shadow-brand-navy/30 h-full flex flex-col justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-white/15 rounded-xl flex items-center justify-center shrink-0">
                    <Lightbulb size={24} className="text-yellow-300" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-blue-200 uppercase tracking-widest">Rekomendasi Utama</span>
                    <h4 className="text-xl font-extrabold mt-1 leading-tight">
                      {ALT_FULL_NAMES[0]}
                    </h4>
                  </div>
                </div>
                <p className="text-sm text-blue-100 leading-relaxed">
                  Alternatif dengan prioritas tertinggi adalah <strong className="text-white">{ALT_FULL_NAMES[0]}</strong> dengan bobot global ANP sebesar <strong className="text-yellow-300">{bestAlt.weight}%</strong>, sehingga direkomendasikan sebagai strategi utama dalam meningkatkan kinerja rantai pasok garam nasional. Strategi ini berpotensi meningkatkan produktivitas lahan, memperbaiki kualitas NaCl, dan mengurangi ketergantungan pada pasokan impor secara signifikan.
                </p>
                <div className="flex flex-wrap gap-2 mt-2">
                  {['Produktivitas Meningkat', 'Kualitas NaCl Terjaga', 'Impor Berkurang', 'Petani Sejahtera'].map((tag) => (
                    <span key={tag} className="px-3 py-1 bg-white/10 border border-white/20 rounded-full text-[10px] font-bold text-blue-100">
                      ✓ {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Supporting alternatives */}
            <div>
              <Card title="Prioritas Pendukung" subtitle="Alternatif ke-2 hingga ke-5">
                <div className="space-y-3">
                  {ANP_RESULTS.slice(1).map((alt) => (
                    <div key={alt.rank} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-brand-grayMedium">
                      <span className="text-xs font-black text-slate-400 w-4 shrink-0">#{alt.rank}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-bold text-slate-700 leading-snug">{alt.name}</p>
                        <div className="mt-1.5 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-brand-navy rounded-full"
                            style={{ width: `${(alt.weight / bestAlt.weight) * 100}%` }}
                          />
                        </div>
                      </div>
                      <span className="text-xs font-extrabold text-brand-navy font-mono shrink-0">{alt.weight}%</span>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </div>
        </section>

        {/* ══ SECTION 5: KESIMPULAN SISTEM ═════════════════ */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <span className="w-8 h-8 rounded-xl bg-brand-navy flex items-center justify-center text-white font-black text-sm">5</span>
            <h3 className="text-lg font-extrabold text-slate-800 tracking-tight">Kesimpulan Sistem</h3>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {conclusions.map((c, i) => (
              <div
                key={i}
                className={`bg-white border rounded-2xl p-5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 ${i === 0 ? 'lg:col-span-2 border-yellow-200 bg-yellow-50/40' : 'border-brand-grayMedium'}`}
              >
                <div className="flex items-start gap-3">
                  {c.icon}
                  <div>
                    <h4 className="text-sm font-extrabold text-slate-800 mb-1.5">{c.title}</h4>
                    <p className="text-xs text-slate-600 leading-relaxed">{c.body}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ══ SECTION 6: EKSPOR HASIL ══════════════════════ */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <span className="w-8 h-8 rounded-xl bg-brand-navy flex items-center justify-center text-white font-black text-sm">6</span>
            <h3 className="text-lg font-extrabold text-slate-800 tracking-tight">Ekspor Hasil Analisis</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Excel Export */}
            <button
              onClick={handleExportExcel}
              disabled={!!exporting}
              className="group bg-white border border-brand-grayMedium rounded-2xl p-6 shadow-sm hover:shadow-lg hover:-translate-y-1 hover:border-emerald-300 transition-all duration-200 text-left disabled:opacity-60 disabled:pointer-events-none"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center group-hover:bg-emerald-100 transition-colors shrink-0">
                  <FileSpreadsheet size={24} className="text-emerald-600" />
                </div>
                <div>
                  <h4 className="font-extrabold text-slate-800 text-sm">Export ke Excel (.xlsx)</h4>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    Unduh data ranking ANP, hasil simulasi numerik, dan kesimpulan sistem dalam format spreadsheet yang siap diolah.
                  </p>
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {['Ranking ANP', 'Bobot Prioritas', 'Data Simulasi', 'Kesimpulan'].map((t) => (
                      <span key={t} className="px-2.5 py-0.5 bg-emerald-50 border border-emerald-200 text-emerald-700 text-[9px] font-bold rounded-full uppercase">{t}</span>
                    ))}
                  </div>
                </div>
              </div>
              <div className="mt-4 flex items-center gap-2 text-emerald-600 font-bold text-xs">
                <Download size={13} />
                {exporting === 'excel' ? 'Sedang mengekspor...' : 'Klik untuk unduh Excel'}
                <ArrowRight size={13} className="group-hover:translate-x-1 transition-transform" />
              </div>
            </button>

            {/* PDF Export */}
            <button
              onClick={handleExportPDF}
              disabled={!!exporting}
              className="group bg-white border border-brand-grayMedium rounded-2xl p-6 shadow-sm hover:shadow-lg hover:-translate-y-1 hover:border-brand-navy/40 transition-all duration-200 text-left disabled:opacity-60 disabled:pointer-events-none"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center group-hover:bg-blue-100 transition-colors shrink-0">
                  <FileText size={24} className="text-brand-navy" />
                </div>
                <div>
                  <h4 className="font-extrabold text-slate-800 text-sm">Export ke PDF (.pdf)</h4>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    Unduh laporan lengkap halaman hasil analisis beserta grafik dan tabel dalam format PDF siap cetak.
                  </p>
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {['Grafik Simulasi', 'Grafik ANP', 'Tabel Data', 'Rekomendasi'].map((t) => (
                      <span key={t} className="px-2.5 py-0.5 bg-blue-50 border border-blue-200 text-brand-navy text-[9px] font-bold rounded-full uppercase">{t}</span>
                    ))}
                  </div>
                </div>
              </div>
              <div className="mt-4 flex items-center gap-2 text-brand-navy font-bold text-xs">
                <Download size={13} />
                {exporting === 'pdf' ? 'Sedang mengekspor...' : 'Klik untuk unduh PDF'}
                <ArrowRight size={13} className="group-hover:translate-x-1 transition-transform" />
              </div>
            </button>
          </div>

          {/* Info note */}
          <div className="mt-4 flex items-start gap-2.5 p-4 bg-slate-50 border border-slate-200 rounded-xl">
            <AlertCircle size={15} className="text-slate-400 mt-0.5 shrink-0" />
            <p className="text-[11px] text-slate-500 leading-relaxed">
              <strong className="text-slate-700">Catatan:</strong> File yang diekspor mencakup seluruh data statis hasil analisis. Untuk simulasi skenario interaktif dan perbandingan matriks ANP, gunakan halaman <strong>Simulasi</strong> dan <strong>ANP</strong> secara langsung.
            </p>
          </div>
        </section>

      </div>{/* end printRef */}
    </div>
  );
}
