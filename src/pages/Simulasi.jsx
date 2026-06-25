import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import Card from '../components/Card';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import {
  RotateCcw, Sliders, TrendingUp, Table as TableIcon,
  AlertCircle, Package, Truck, DollarSign, Activity,
  Info, ChevronDown, ChevronUp, Award, BarChart2,
  FileSpreadsheet, FileText, Download, ArrowRight,
  CheckCircle, Lightbulb, BookOpen
} from 'lucide-react';
import { getModelData, runDynamicSimulation, validateModel, saveModelData, DEFAULT_MODEL_DATA } from '../utils/modelEngine';

// ─────────────────────────────────────────────────────────────
// GAP AKTUAL PARAMETER (Konfigurasi Sistem)
// Intervensi = GAP_AKTUAL × Bobot Global Subkriteria
// Nilai dapat diubah tanpa mengubah logika integrasi ANP.
// ─────────────────────────────────────────────────────────────
const GAP_AKTUAL = {
  'K1.1 Lahan':          28.197,
  'K1.2 Produktivitas':   0.0,
  'K1.3 Teknologi':       0.0,
  'K2.1 Efisiensi':       0.0,
  'K2.2 Infrastruktur':   0.0,
  'K2.3 Jaringan':        0.0,
  'K3.1 Harga Petani':    0.0,
  'K3.2 Harga Pasar':     0.0,
  'K3.3 Margin':          0.0,
  'K4.1 Standar':        -1.189,
  'K4.2 Proses':          3.795,
  'K4.3 Kontrol':         0.0,
  'K5.1 Regulasi':        0.0278,
  'K5.2 Insentif':        0.0,
  'K5.3 Kelembagaan':     0.0,
};

const SC_TO_SD_PARAM = {
  'K1.1 Lahan':      'intervensiLuasLahan',
  'K1.3 Teknologi':  'intervensiLuasLahan',
  'K4.1 Standar':    'intervensiCurahHujan',
  'K4.2 Proses':     'intervensiFaktorMusim',
  'K5.1 Regulasi':   'intervensiPeranPemerintah',
};

const SD_PARAM_LABELS = {
  intervensiLuasLahan:       'Luas Lahan',
  intervensiCurahHujan:      'Curah Hujan',
  intervensiFaktorMusim:     'Faktor Musim',
  intervensiPeranPemerintah: 'Peran Pemerintah',
  intervensiImpor:           'Impor',
  intervensiPermintaan:      'Permintaan',
  intervensiHargaReferensi:  'Harga Referensi',
  intervensiHargaImpor:      'Harga Impor',
};

const ALT_NAMES = {
  A1: 'Peningkatan Teknologi Produksi Garam Rakyat',
  A2: 'Pengurangan Ketergantungan Impor Garam',
  A3: 'Stabilisasi Harga Garam',
  A4: 'Penguatan Sistem Distribusi dan Pergudangan',
  A5: 'Penguatan Kelembagaan dan Kemitraan Petani',
};

// ─────────────────────────────────────────────────────────────
// FORMATTERS
// ─────────────────────────────────────────────────────────────
const fmtNum = (n) =>
  new Intl.NumberFormat('id-ID', { minimumFractionDigits: 1, maximumFractionDigits: 2 }).format(n);

const fmtK = (v) => {
  if (v === 0) return '0';
  if (Math.abs(v) >= 1000) return `${Math.round(v / 1000)}k`;
  return String(Math.round(v));
};

const fmtRp = (v) =>
  `Rp ${new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(v)}`;

const tooltipFormatter = (value, name) => {
  if (name === 'Harga') return [`${fmtRp(value)}/kg`, 'Harga'];
  const labels = { stokGaram: 'Stok Garam', produksiGaram: 'Produksi Garam', distribusi: 'Distribusi' };
  return [`${fmtNum(value)} ton`, labels[name] || name];
};

// ─────────────────────────────────────────────────────────────
// COMPUTE INTERVENTIONS
// ─────────────────────────────────────────────────────────────
function computeInterventions(anpResults) {
  const zero = {
    intervensiLuasLahan: 0, intervensiFaktorMusim: 0,
    intervensiCurahHujan: 0, intervensiPeranPemerintah: 0,
    intervensiImpor: 0, intervensiPermintaan: 0,
    intervensiHargaReferensi: 0, intervensiHargaImpor: 0,
  };
  if (!anpResults || !anpResults.globalSubWeights) return { interventions: zero, details: [] };
  const result = { ...zero };
  const details = [];
  Object.entries(SC_TO_SD_PARAM).forEach(([scLabel, sdParam]) => {
    const globalW = anpResults.globalSubWeights[scLabel] ?? 0;
    const gap     = GAP_AKTUAL[scLabel] ?? 0;
    const interv  = gap * globalW;
    if (sdParam && Math.abs(interv) > 0) {
      result[sdParam] = (result[sdParam] || 0) + interv;
      details.push({ scLabel, sdParam, globalW, gap, interv });
    }
  });
  return { interventions: result, details };
}

// ─────────────────────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────────────────────
export default function Simulasi() {
  const [baselineResults, setBaselineResults] = useState([]);
  const [policyResults,   setPolicyResults]   = useState([]);
  const [modelData,       setModelData]       = useState({ variables: [], relationships: [] });
  const [validation,      setValidation]      = useState({ isValid: true, errors: [] });
  const [anpResults,      setAnpResults]      = useState(null);
  const [anpPanelOpen,    setAnpPanelOpen]    = useState(true);
  const [exporting,       setExporting]       = useState(null);
  const printRef = useRef(null);

  // ── Load ANP results ───────────────────────────────────────
  const loadAnpResults = useCallback(() => {
    try {
      const raw = localStorage.getItem('anpCalculatedResults');
      if (raw) { const p = JSON.parse(raw); setAnpResults(p); return p; }
    } catch (e) { console.warn('Failed to load anpCalculatedResults:', e); }
    return null;
  }, []);

  // ── Load SD model ──────────────────────────────────────────
  const loadAndValidateModel = useCallback(() => {
    const data = getModelData();
    setModelData(data);
    setValidation(validateModel(data));
    return data;
  }, []);

  // ── Run both scenarios ─────────────────────────────────────
  const runSimulation = useCallback((currentData, anp) => {
    const val = validateModel(currentData);
    setValidation(val);
    if (!val.isValid) { setBaselineResults([]); setPolicyResults([]); return; }

    const baselineInt = {
      intervensiLuasLahan: 0, intervensiFaktorMusim: 0,
      intervensiCurahHujan: 0, intervensiPeranPemerintah: 0,
      intervensiImpor: 0, intervensiPermintaan: 0,
      intervensiHargaReferensi: 0, intervensiHargaImpor: 0,
    };
    const { rows: bRows } = runDynamicSimulation(currentData.variables, baselineInt);
    setBaselineResults(bRows);

    const { interventions } = computeInterventions(anp);
    const { rows: pRows } = runDynamicSimulation(currentData.variables, interventions);
    setPolicyResults(pRows);
  }, []);

  useEffect(() => {
    const anp  = loadAnpResults();
    const data = loadAndValidateModel();
    if (data.variables?.length > 0) runSimulation(data, anp);
  }, []); // eslint-disable-line

  useEffect(() => {
    if (modelData.variables?.length > 0) runSimulation(modelData, anpResults);
  }, [modelData]); // eslint-disable-line

  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'anpCalculatedResults') {
        const anp = loadAnpResults();
        if (modelData.variables?.length > 0) runSimulation(modelData, anp);
      }
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, [modelData, loadAnpResults, runSimulation]);

  // ── Helpers ────────────────────────────────────────────────
  const handleUndoDelete = () => {
    const history = [...(modelData.deletedHistory || [])];
    if (!history.length) return;
    const last = history.pop();
    const newData = { ...modelData, variables: [...modelData.variables, last.variable], relationships: [...modelData.relationships, ...last.relationships], deletedHistory: history };
    setModelData(newData); saveModelData(newData);
  };

  const handleResetModelDefault = () => {
    if (!window.confirm('Apakah Anda yakin ingin mengatur ulang model ke default?')) return;
    const newData = { ...DEFAULT_MODEL_DATA, deletedHistory: [] };
    setModelData(newData); saveModelData(newData);
  };

  const formatLeftAxis  = (v) => fmtK(v);
  const formatRightAxis = (v) => v === 0 ? 'Rp 0' : `Rp ${fmtK(v)}`;

  // ── Derived data ───────────────────────────────────────────
  const { interventions: policyInt, details: intDetails } = computeInterventions(anpResults);
  const bestAlt     = anpResults?.bestAlternative;
  const bestAltName = bestAlt ? (ALT_NAMES[bestAlt.alt] || bestAlt.alt) : null;

  const bLast = baselineResults[baselineResults.length - 1] || {};
  const pLast = policyResults[policyResults.length - 1]   || {};
  const bFirst = baselineResults[0] || {};

  const compData = baselineResults.length && policyResults.length ? [
    { key: 'produksiGaram', name: 'Produksi Garam', unit: 'ton',  bVal: bLast.produksiGaram, pVal: pLast.produksiGaram, icon: <Activity size={20} className="text-emerald-500" /> },
    { key: 'stokGaram',     name: 'Stok Garam',     unit: 'ton',  bVal: bLast.stokGaram,     pVal: pLast.stokGaram,     icon: <Package  size={20} className="text-blue-500"    /> },
    { key: 'distribusi',    name: 'Distribusi',     unit: 'ton',  bVal: bLast.distribusi,    pVal: pLast.distribusi,    icon: <Truck    size={20} className="text-amber-500"   /> },
    { key: 'harga',         name: 'Harga Lokal',    unit: 'Rp/kg', isPrice: true, bVal: bLast.harga, pVal: pLast.harga, icon: <DollarSign size={20} className="text-cyan-500" /> },
  ].map(v => { const diff = v.pVal - v.bVal; const pct = v.bVal ? (diff/v.bVal)*100 : 0; return {...v, diff, pct}; }) : [];

  // ── EXPORT EXCEL: ANP ─────────────────────────────────────
  const handleExportAnpExcel = async () => {
    setExporting('anp-excel');
    try {
      const XLSX = await import('xlsx');
      const wb   = XLSX.utils.book_new();
      // Ranking sheet
      const rankRows = [['Ranking','Alternatif','Bobot (0-1)','Bobot (%)']];
      (anpResults?.ranking || []).forEach((r, i) => {
        rankRows.push([i+1, ALT_NAMES[r.alt] || r.alt, (r.value/100).toFixed(5), r.value.toFixed(2)]);
      });
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rankRows), 'Ranking Alternatif');
      // Global subcriteria weights
      const scRows = [['Subkriteria','Bobot Global']];
      Object.entries(anpResults?.globalSubWeights || {}).forEach(([k,v]) => scRows.push([k, v.toFixed(5)]));
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(scRows), 'Bobot Subkriteria');
      XLSX.writeFile(wb, 'DYNASALT_Hasil_ANP.xlsx');
    } catch (err) { console.error(err); alert('Gagal export Excel ANP.'); }
    setExporting(null);
  };

  // ── EXPORT EXCEL: SIMULASI ───────────────────────────────
  const handleExportSimExcel = async () => {
    setExporting('sim-excel');
    try {
      const XLSX = await import('xlsx');
      const wb   = XLSX.utils.book_new();
      const header = ['Tahun','Stok Garam (Ton)','Produksi (Ton)','Distribusi (Ton)','Harga (Rp/kg)'];
      const toRows = (rows) => rows.map(r => [r.tahun, r.stokGaram, r.produksiGaram, r.distribusi, r.harga]);
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([header, ...toRows(baselineResults)]), 'Baseline');
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([header, ...toRows(policyResults)]),  'Kebijakan ANP');
      XLSX.writeFile(wb, 'DYNASALT_Hasil_Simulasi.xlsx');
    } catch (err) { console.error(err); alert('Gagal export Excel Simulasi.'); }
    setExporting(null);
  };

  // ── EXPORT PDF ────────────────────────────────────────────
  const handleExportPDF = async () => {
    setExporting('pdf');
    try {
      const html2canvas = (await import('html2canvas')).default;
      const jsPDF       = (await import('jspdf')).default;
      const element     = printRef.current;
      const canvas      = await html2canvas(element, { scale: 1.5, useCORS: true, backgroundColor: '#ffffff' });
      const imgData     = canvas.toDataURL('image/png');
      const pdf         = new jsPDF('p', 'mm', 'a4');
      const pdfW        = pdf.internal.pageSize.getWidth();
      const pdfH        = pdf.internal.pageSize.getHeight();
      const imgH        = pdfW / (canvas.width / canvas.height);
      let heightLeft    = imgH;
      let position      = 0;
      pdf.addImage(imgData, 'PNG', 0, position, pdfW, imgH);
      heightLeft -= pdfH;
      while (heightLeft > 0) {
        position = heightLeft - imgH;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, pdfW, imgH);
        heightLeft -= pdfH;
      }
      pdf.save('DYNASALT_Laporan_Penelitian.pdf');
    } catch (err) { console.error(err); alert('Gagal export PDF.'); }
    setExporting(null);
  };

  // ── Conclusions (dynamic from results) ───────────────────
  const conclusions = [
    {
      icon:  <Award    size={18} className="text-yellow-600 mt-0.5 shrink-0" />,
      title: 'Alternatif Terbaik ANP',
      body:  bestAltName
        ? `Berdasarkan analisis ANP, alternatif strategis prioritas utama adalah "${bestAltName}" dengan bobot global ${bestAlt ? (bestAlt.value/100).toFixed(4) : '—'} (${bestAlt?.value?.toFixed(2) ?? '—'}%), mengungguli seluruh alternatif kebijakan lainnya dalam kerangka rantai pasok garam nasional.`
        : 'Belum ada hasil ANP. Buka halaman ANP untuk menjalankan perhitungan.',
    },
    {
      icon:  <TrendingUp size={18} className="text-emerald-600 mt-0.5 shrink-0" />,
      title: 'Dampak Kebijakan terhadap Produksi Garam',
      body:  policyResults.length
        ? `Simulasi dengan kebijakan ANP menunjukkan produksi garam pada tahun akhir (2027) sebesar ${fmtNum(pLast.produksiGaram)} ton, dibandingkan baseline ${fmtNum(bLast.produksiGaram)} ton. Selisih: ${pLast.produksiGaram >= bLast.produksiGaram ? '▲' : '▼'} ${fmtNum(Math.abs(pLast.produksiGaram - bLast.produksiGaram))} ton.`
        : 'Jalankan simulasi untuk melihat dampak kebijakan terhadap produksi garam.',
    },
    {
      icon:  <Package size={18} className="text-blue-600 mt-0.5 shrink-0" />,
      title: 'Dampak Kebijakan terhadap Stok Garam',
      body:  policyResults.length
        ? `Stok garam (2027) pada skenario kebijakan ANP: ${fmtNum(pLast.stokGaram)} ton vs baseline ${fmtNum(bLast.stokGaram)} ton, mencerminkan dinamika akumulasi stock-flow dengan intervensi luas lahan dan faktor produksi.`
        : 'Jalankan simulasi untuk melihat dampak kebijakan terhadap stok garam.',
    },
    {
      icon:  <Truck size={18} className="text-violet-600 mt-0.5 shrink-0" />,
      title: 'Dampak Kebijakan terhadap Distribusi',
      body:  policyResults.length
        ? `Volume distribusi pada skenario kebijakan (2027): ${fmtNum(pLast.distribusi)} ton vs baseline ${fmtNum(bLast.distribusi)} ton. Fungsi MIN(permintaan, stok+produksi) membatasi distribusi sesuai ketersediaan riil.`
        : 'Jalankan simulasi untuk melihat dampak kebijakan terhadap distribusi.',
    },
    {
      icon:  <DollarSign size={18} className="text-cyan-600 mt-0.5 shrink-0" />,
      title: 'Dampak Kebijakan terhadap Harga Garam',
      body:  policyResults.length
        ? `Harga garam (2027) pada skenario kebijakan: ${fmtRp(pLast.harga)}/kg vs baseline ${fmtRp(bLast.harga)}/kg. Harga dipengaruhi rasio permintaan, impor, dan stok ketersediaan.`
        : 'Jalankan simulasi untuk melihat dampak kebijakan terhadap harga garam.',
    },
  ];

  // ─────────────────────────────────────────────────────────
  // SCENARIO RENDERER (vertical layout)
  // ─────────────────────────────────────────────────────────
  const renderScenarioSection = (title, subtitle, results, isPolicy) => (
    <div className="space-y-6">
      <div className="border-b border-brand-grayMedium pb-2">
        <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
          <TrendingUp className={isPolicy ? 'text-brand-navy h-5 w-5' : 'text-slate-400 h-5 w-5'} />
          {title}
        </h3>
        <p className="text-xs text-brand-grayDark mt-0.5">{subtitle}</p>
      </div>

      {/* Chart — full width, 500px tall */}
      <Card
        title={`Grafik Time Series – ${title}`}
        subtitle="Sumbu Y Kiri: Stok, Produksi & Distribusi (Ton) · Sumbu Y Kanan: Harga Lokal (Rp/Kg)"
      >
        <div className="w-full" style={{ height: 500 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={results} margin={{ top: 20, right: 80, left: 10, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
              <XAxis dataKey="tahun" fontSize={12} stroke="#64748B" fontWeight="bold" />
              <YAxis yAxisId="left" fontSize={11} stroke="#64748B" width={55}
                tickFormatter={formatLeftAxis}
                label={{ value: 'Ton', angle: -90, position: 'insideLeft', fontSize: 11, offset: -2, fontWeight: 'bold' }} />
              <YAxis yAxisId="right" orientation="right" fontSize={11} stroke="#0891B2" width={85}
                tickFormatter={formatRightAxis}
                label={{ value: 'Rp/Kg', angle: 90, position: 'insideRight', fontSize: 11, offset: 2, fontWeight: 'bold' }} />
              <Tooltip
                contentStyle={{ backgroundColor: '#0F172A', borderRadius: '12px', color: '#fff', fontSize: '12px', border: 'none', padding: '12px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.3)' }}
                formatter={tooltipFormatter}
                labelFormatter={(l) => `Tahun ${l}`}
              />
              <Legend verticalAlign="top" height={40} fontSize={12} iconType="circle" />
              <Line yAxisId="left"  type="monotone" dataKey="stokGaram"     name="Stok Garam"     stroke="#3B82F6" strokeWidth={3}   dot={{ r: 5 }} activeDot={{ r: 7 }} />
              <Line yAxisId="left"  type="monotone" dataKey="produksiGaram" name="Produksi Garam" stroke="#10B981" strokeWidth={2.5} dot={{ r: 4 }} />
              <Line yAxisId="left"  type="monotone" dataKey="distribusi"    name="Distribusi"     stroke="#F59E0B" strokeWidth={2.5} dot={{ r: 4 }} />
              <Line yAxisId="right" type="monotone" dataKey="harga"         name="Harga"          stroke="#0891B2" strokeWidth={2.5} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Table — full width */}
      <Card
        title={`Tabel Proyeksi – ${title}`}
        subtitle="Nilai hasil komputasi per tahun simulasi"
        headerAction={
          <span className="px-2.5 py-1 bg-slate-100 text-slate-600 rounded-md font-semibold text-[10px] uppercase tracking-wider flex items-center gap-1.5">
            <TableIcon size={12} /> Data Terkomputasi
          </span>
        }
      >
        <div className="overflow-x-auto border border-brand-grayMedium rounded-xl bg-slate-50 p-2">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="border-b border-brand-grayMedium text-brand-navy font-bold">
                <th className="py-3 px-4 text-center">Tahun</th>
                <th className="py-3 px-4 text-right">Stok Garam (Ton)</th>
                <th className="py-3 px-4 text-right">Produksi Garam (Ton)</th>
                <th className="py-3 px-4 text-right">Distribusi (Ton)</th>
                <th className="py-3 px-4 text-right text-cyan-700">Harga (Rp/Kg)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-grayMedium text-slate-600 font-medium font-mono">
              {results.map((row) => (
                <tr key={row.tahun} className="hover:bg-white transition-colors">
                  <td className="py-3.5 px-4 text-center text-slate-900 font-sans font-bold text-sm">{row.tahun}</td>
                  <td className="py-3.5 px-4 text-right">{fmtNum(row.stokGaram)}</td>
                  <td className="py-3.5 px-4 text-right">{fmtNum(row.produksiGaram)}</td>
                  <td className="py-3.5 px-4 text-right">{fmtNum(row.distribusi)}</td>
                  <td className="py-3.5 px-4 text-right text-cyan-700 font-bold">{fmtRp(row.harga)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );

  // ─────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 md:space-y-8 animate-fade-in p-4 md:p-6 print:p-0">

      {/* ── PAGE HEADER ─────────────────────────────────── */}
      <div className="border-b border-brand-grayMedium pb-4 print:hidden flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-800 tracking-tight flex items-center gap-2">
            <Sliders className="text-brand-navy h-6 w-6" />
            Dashboard Simulasi Dua Skenario Kebijakan
          </h2>
          <p className="text-sm text-brand-grayDark mt-1">
            Perbandingan skenario baseline (tanpa kebijakan) dengan skenario integrasi ANP secara bersamaan.
            <br />*Formulasi dasar model dapat diatur melalui halaman Model.
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          {modelData.deletedHistory?.length > 0 && (
            <button onClick={handleUndoDelete}
              className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-bold inline-flex items-center gap-1 transition-colors">
              <RotateCcw size={14} /> Undo Hapus Variabel
            </button>
          )}
          <button onClick={handleResetModelDefault}
            className="px-3 py-1.5 bg-slate-500 hover:bg-slate-600 text-white rounded-lg text-xs font-bold inline-flex items-center gap-1 transition-colors">
            <RotateCcw size={14} /> Reset Model Default
          </button>
        </div>
      </div>

      {/* ── MAIN GRID ─────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 md:gap-8">

        {/* ── SIDEBAR ─────────────────────────────────────── */}
        <div className="lg:col-span-1 space-y-5 print:hidden">

          {/* ANP Status Banner */}
          {anpResults ? (
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl px-4 py-3 flex items-center gap-3 shadow-sm">
              <div className="p-2 bg-emerald-100 rounded-xl text-emerald-600 shrink-0"><BarChart2 size={18} /></div>
              <div>
                <p className="text-[11px] font-bold text-emerald-800 uppercase tracking-wide">Hasil ANP Terdeteksi</p>
                <p className="text-[10px] text-emerald-700 mt-0.5 font-medium">
                  {anpResults.calculatedAt ? new Date(anpResults.calculatedAt).toLocaleString('id-ID') : '—'}
                </p>
              </div>
            </div>
          ) : (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 flex items-start gap-3 shadow-sm">
              <div className="p-2 bg-amber-100 rounded-xl text-amber-600 shrink-0 mt-0.5"><AlertCircle size={18} /></div>
              <div>
                <p className="text-[11px] font-bold text-amber-800 uppercase tracking-wide">Hasil ANP Tidak Ditemukan</p>
                <p className="text-[10px] text-amber-700 mt-0.5 font-medium">Buka halaman ANP dan jalankan perhitungan terlebih dahulu.</p>
                <Link to="/anp" className="mt-2 inline-block text-[10px] font-bold text-amber-800 underline hover:text-amber-900">→ Buka Halaman ANP</Link>
              </div>
            </div>
          )}

          {/* ANP Info Panel */}
          <div className="bg-white border border-brand-grayMedium rounded-2xl shadow-sm overflow-hidden">
            <button onClick={() => setAnpPanelOpen(p => !p)}
              className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-50 transition-colors">
              <h3 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-2">
                <Info size={15} className="text-brand-navy" /> Panel Informasi Integrasi ANP
              </h3>
              {anpPanelOpen ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
            </button>

            {anpPanelOpen && (
              <div className="px-5 pb-5 space-y-4 border-t border-brand-grayMedium">

                {bestAlt && (
                  <div className="mt-4">
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Alternatif Terpilih (Ranking #1)</p>
                    <div className="bg-brand-navy/5 border border-brand-navy/10 rounded-xl p-3 flex items-start gap-3">
                      <Award size={20} className="text-brand-navy shrink-0 mt-0.5" />
                      <div>
                        <p className="font-extrabold text-slate-800 text-xs leading-snug">{bestAltName}</p>
                        <p className="text-[10px] text-slate-500 font-mono mt-0.5">{bestAlt.alt} — {(bestAlt.value/100).toFixed(5)} ({bestAlt.value.toFixed(2)}%)</p>
                      </div>
                    </div>
                  </div>
                )}

                {anpResults?.ranking && (
                  <div>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Ranking Seluruh Alternatif</p>
                    <div className="space-y-1.5">
                      {anpResults.ranking.map((item, idx) => (
                        <div key={item.alt}
                          className={`flex items-center justify-between rounded-lg px-3 py-1.5 text-[11px] font-medium ${idx === 0 ? 'bg-brand-navy text-white' : 'bg-slate-50 text-slate-700'}`}>
                          <span className="font-bold">{idx+1}. {item.alt}</span>
                          <span className="font-mono">{(item.value/100).toFixed(5)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {anpResults?.globalSubWeights && (
                  <div>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Bobot Global Subkriteria</p>
                    <div className="space-y-1 max-h-40 overflow-y-auto pr-1">
                      {Object.entries(anpResults.globalSubWeights).map(([label, w]) => (
                        <div key={label} className="flex items-center justify-between text-[10px] py-0.5">
                          <span className="text-slate-600 font-medium truncate mr-2">{label}</span>
                          <span className="font-mono font-bold text-slate-800 shrink-0">{w.toFixed(5)}</span>
                        </div>
                      ))}
                    </div>
                    <p className="text-[9px] text-slate-400 mt-1.5 font-medium">Bobot Global = Bobot Kriteria × Bobot Lokal</p>
                  </div>
                )}

                {intDetails.length > 0 && (
                  <div>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Rincian Intervensi</p>
                    <p className="text-[9px] text-slate-400 mb-2">Intervensi = Gap Aktual × Bobot Global</p>
                    <div className="space-y-1.5">
                      {intDetails.map((d, i) => (
                        <div key={i} className="bg-slate-50 border border-slate-100 rounded-lg p-2.5 text-[10px]">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-bold text-slate-700">{d.scLabel}</span>
                            <span className="font-mono text-brand-navy font-bold">{d.interv > 0 ? '+' : ''}{d.interv.toFixed(5)}</span>
                          </div>
                          <div className="text-slate-500 space-y-0.5">
                            <div className="flex justify-between"><span>Gap:</span><span className="font-mono">{d.gap.toFixed(4)}</span></div>
                            <div className="flex justify-between"><span>Bobot:</span><span className="font-mono">{d.globalW.toFixed(5)}</span></div>
                            <div className="flex justify-between text-slate-400 italic"><span>→ {SD_PARAM_LABELS[d.sdParam]}</span></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Parameter Kebijakan Aktif</p>
                  <div className="space-y-1">
                    {Object.entries(policyInt).filter(([,v]) => Math.abs(v) > 1e-9).map(([key, val]) => (
                      <div key={key} className="flex items-center justify-between bg-blue-50 border border-blue-100 rounded-lg px-3 py-1.5 text-[10px]">
                        <span className="text-slate-700 font-medium">{SD_PARAM_LABELS[key] || key}</span>
                        <span className="font-mono font-bold text-brand-navy">{val > 0 ? '+' : ''}{val.toFixed(5)}</span>
                      </div>
                    ))}
                    {Object.values(policyInt).every(v => Math.abs(v) < 1e-9) && (
                      <p className="text-[10px] text-slate-400 italic">Semua intervensi bernilai nol.</p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── MAIN CONTENT ──────────────────────────────── */}
        <div className="lg:col-span-3 space-y-10" ref={printRef}>
          {validation.isValid ? (
            <>
              {/* SECTION 1: Baseline */}
              {renderScenarioSection(
                'Simulasi Tanpa Kebijakan (Baseline)',
                'Proyeksi rantai pasok garam nasional menggunakan parameter dasar model tanpa intervensi ANP.',
                baselineResults, false
              )}

              {/* SECTION 2: Kebijakan ANP */}
              {renderScenarioSection(
                'Simulasi Dengan Kebijakan (Integrasi ANP)',
                `Proyeksi dengan intervensi otomatis dari hasil ANP. Alternatif terpilih: ${bestAltName || '—'}.`,
                policyResults, true
              )}

              {/* PERBANDINGAN */}
              <div className="pt-2 space-y-4">
                <div className="border-b border-brand-grayMedium pb-2">
                  <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                    <Sliders className="text-emerald-600 h-5 w-5" />
                    Ringkasan Perbandingan Dampak Kebijakan (Tahun Akhir 2027)
                  </h3>
                  <p className="text-xs text-brand-grayDark mt-0.5">Selisih nilai indikator utama antara skenario baseline dan skenario kebijakan ANP.</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                  {compData.map((item) => {
                    const isPos = item.pct >= 0;
                    const colorClass = isPos ? 'text-emerald-600 bg-emerald-50 border-emerald-200' : 'text-rose-600 bg-rose-50 border-rose-200';
                    return (
                      <div key={item.key} className="bg-white border border-brand-grayMedium rounded-2xl p-4 shadow-sm space-y-3 hover:border-brand-navy/25 transition-all">
                        <div className="flex items-center gap-2">{item.icon}<h4 className="font-extrabold text-slate-800 text-xs">{item.name}</h4></div>
                        <div className="space-y-1 text-[11px] font-medium text-slate-600">
                          <div><span className="text-[9px] text-slate-400 block font-bold uppercase tracking-wide">Baseline:</span>
                            <span className="font-mono font-bold text-slate-700">{item.isPrice ? `${fmtRp(item.bVal)}/kg` : `${fmtNum(item.bVal)} ${item.unit}`}</span></div>
                          <div><span className="text-[9px] text-slate-400 block font-bold uppercase tracking-wide">Kebijakan ANP:</span>
                            <span className="font-mono font-bold text-brand-navy">{item.isPrice ? `${fmtRp(item.pVal)}/kg` : `${fmtNum(item.pVal)} ${item.unit}`}</span></div>
                        </div>
                        <div className="border-t border-brand-grayLight pt-2 flex items-center justify-between">
                          <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Perubahan</span>
                          <span className={`px-2 py-0.5 rounded-lg border text-[11px] font-mono font-extrabold flex items-center gap-1 ${colorClass}`}>
                            <span>{isPos ? '▲' : '▼'}</span><span>{Math.abs(item.pct).toFixed(2)} %</span>
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* ══ KESIMPULAN SISTEM ═══════════════════════ */}
              <div className="pt-2 space-y-4">
                <div className="border-b border-brand-grayMedium pb-2">
                  <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                    <BookOpen className="text-brand-navy h-5 w-5" />
                    Kesimpulan Sistem
                  </h3>
                  <p className="text-xs text-brand-grayDark mt-0.5">
                    Ringkasan hasil integrasi Analytic Network Process (ANP) dan System Dynamics berdasarkan hasil simulasi yang telah dihitung.
                  </p>
                </div>

                {/* Best alt hero card */}
                {bestAltName && (
                  <div className="bg-gradient-to-br from-brand-navy to-blue-800 rounded-2xl p-6 text-white shadow-lg shadow-brand-navy/25">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-white/15 rounded-xl flex items-center justify-center shrink-0">
                        <Lightbulb size={24} className="text-yellow-300" />
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-blue-200 uppercase tracking-widest">Rekomendasi Utama</span>
                        <h4 className="text-xl font-extrabold mt-1 leading-tight">{bestAltName}</h4>
                        <p className="text-sm text-blue-100 mt-2 leading-relaxed">
                          Alternatif dengan prioritas tertinggi berdasarkan analisis ANP dengan bobot global&nbsp;
                          <strong className="text-yellow-300">{bestAlt?.value?.toFixed(2) ?? '—'}%</strong>.
                          Strategi ini direkomendasikan sebagai intervensi utama dalam meningkatkan kinerja rantai pasok garam nasional.
                        </p>
                        <div className="flex flex-wrap gap-2 mt-3">
                          {['Produktivitas Meningkat', 'Impor Berkurang', 'Petani Sejahtera', 'Stok Terjaga'].map((tag) => (
                            <span key={tag} className="px-3 py-1 bg-white/10 border border-white/20 rounded-full text-[10px] font-bold text-blue-100">✓ {tag}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Conclusion cards */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {conclusions.map((c, i) => (
                    <div key={i}
                      className={`bg-white border rounded-2xl p-5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 ${i === 0 ? 'lg:col-span-2 border-yellow-200 bg-yellow-50/30' : 'border-brand-grayMedium'}`}>
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
              </div>

              {/* ══ DOWNLOAD DOKUMEN ════════════════════════ */}
              <div className="pt-2 space-y-4">
                <div className="border-b border-brand-grayMedium pb-2">
                  <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                    <Download className="text-brand-navy h-5 w-5" />
                    Download Dokumen
                  </h3>
                  <p className="text-xs text-brand-grayDark mt-0.5">
                    Unduh hasil analisis ANP, data simulasi, dan laporan lengkap penelitian DYNASALT.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  {/* Excel ANP */}
                  <button
                    onClick={handleExportAnpExcel}
                    disabled={!!exporting || !anpResults}
                    className="group bg-white border border-brand-grayMedium rounded-2xl p-6 shadow-sm hover:shadow-lg hover:-translate-y-1 hover:border-emerald-300 transition-all duration-200 text-left disabled:opacity-50 disabled:pointer-events-none"
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center group-hover:bg-emerald-100 transition-colors shrink-0">
                        <FileSpreadsheet size={24} className="text-emerald-600" />
                      </div>
                      <div>
                        <h4 className="font-extrabold text-slate-800 text-sm">Download Hasil ANP</h4>
                        <p className="text-xs text-slate-500 mt-1 leading-relaxed">Ranking alternatif, bobot prioritas, dan bobot global subkriteria.</p>
                        <div className="flex flex-wrap gap-1.5 mt-3">
                          {['Ranking ANP','Bobot Global'].map(t => (
                            <span key={t} className="px-2 py-0.5 bg-emerald-50 border border-emerald-200 text-emerald-700 text-[9px] font-bold rounded-full uppercase">{t}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="mt-4 flex items-center gap-2 text-emerald-600 font-bold text-xs">
                      <Download size={13} />
                      {exporting === 'anp-excel' ? 'Mengekspor...' : 'Unduh Excel (.xlsx)'}
                      <ArrowRight size={13} className="group-hover:translate-x-1 transition-transform" />
                    </div>
                  </button>

                  {/* Excel Simulasi */}
                  <button
                    onClick={handleExportSimExcel}
                    disabled={!!exporting || !baselineResults.length}
                    className="group bg-white border border-brand-grayMedium rounded-2xl p-6 shadow-sm hover:shadow-lg hover:-translate-y-1 hover:border-blue-300 transition-all duration-200 text-left disabled:opacity-50 disabled:pointer-events-none"
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center group-hover:bg-blue-100 transition-colors shrink-0">
                        <FileSpreadsheet size={24} className="text-blue-600" />
                      </div>
                      <div>
                        <h4 className="font-extrabold text-slate-800 text-sm">Download Hasil Simulasi</h4>
                        <p className="text-xs text-slate-500 mt-1 leading-relaxed">Data numerik simulasi baseline dan skenario kebijakan ANP per tahun.</p>
                        <div className="flex flex-wrap gap-1.5 mt-3">
                          {['Baseline','Kebijakan ANP','2024–2027'].map(t => (
                            <span key={t} className="px-2 py-0.5 bg-blue-50 border border-blue-200 text-blue-700 text-[9px] font-bold rounded-full uppercase">{t}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="mt-4 flex items-center gap-2 text-blue-600 font-bold text-xs">
                      <Download size={13} />
                      {exporting === 'sim-excel' ? 'Mengekspor...' : 'Unduh Excel (.xlsx)'}
                      <ArrowRight size={13} className="group-hover:translate-x-1 transition-transform" />
                    </div>
                  </button>

                  {/* PDF */}
                  <button
                    onClick={handleExportPDF}
                    disabled={!!exporting}
                    className="group bg-white border border-brand-grayMedium rounded-2xl p-6 shadow-sm hover:shadow-lg hover:-translate-y-1 hover:border-brand-navy/40 transition-all duration-200 text-left disabled:opacity-50 disabled:pointer-events-none"
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center group-hover:bg-slate-100 transition-colors shrink-0">
                        <FileText size={24} className="text-brand-navy" />
                      </div>
                      <div>
                        <h4 className="font-extrabold text-slate-800 text-sm">Download Laporan PDF</h4>
                        <p className="text-xs text-slate-500 mt-1 leading-relaxed">Laporan lengkap halaman simulasi beserta grafik, tabel, dan kesimpulan sistem.</p>
                        <div className="flex flex-wrap gap-1.5 mt-3">
                          {['Grafik','Tabel','Kesimpulan'].map(t => (
                            <span key={t} className="px-2 py-0.5 bg-slate-100 border border-slate-200 text-slate-600 text-[9px] font-bold rounded-full uppercase">{t}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="mt-4 flex items-center gap-2 text-brand-navy font-bold text-xs">
                      <Download size={13} />
                      {exporting === 'pdf' ? 'Mengekspor...' : 'Unduh PDF (.pdf)'}
                      <ArrowRight size={13} className="group-hover:translate-x-1 transition-transform" />
                    </div>
                  </button>
                </div>

                <div className="flex items-start gap-2.5 p-4 bg-slate-50 border border-slate-200 rounded-xl">
                  <CheckCircle size={15} className="text-slate-400 mt-0.5 shrink-0" />
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    <strong className="text-slate-700">Catatan:</strong> File yang diekspor mencakup data hasil komputasi terkini.
                    Untuk analisis detail supermatrix dan perbandingan matriks pairwise, gunakan halaman <strong>ANP</strong> secara langsung.
                  </p>
                </div>
              </div>
            </>
          ) : (
            /* Error state */
            <div className="bg-red-50 border border-red-200 rounded-2xl p-6 shadow-sm space-y-6 animate-fade-in">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-red-100 text-red-600 rounded-xl shrink-0"><AlertCircle size={24} /></div>
                <div className="space-y-2">
                  <h3 className="font-extrabold text-red-800 text-lg leading-snug">
                    Simulasi tidak dapat dijalankan karena terdapat variabel yang hilang pada formulasi matematis.
                  </h3>
                  <p className="text-sm text-red-600">Perbaiki formulasi atau pulihkan variabel yang hilang.</p>
                </div>
              </div>
              <div className="bg-white border border-red-100 rounded-xl overflow-hidden shadow-sm divide-y divide-slate-100">
                <div className="p-3 bg-slate-50 text-slate-500 font-bold text-[10px] uppercase tracking-wider grid grid-cols-12 gap-2 border-b border-slate-100">
                  <div className="col-span-4">Variabel Bermasalah</div>
                  <div className="col-span-5">Formulasi Matematis</div>
                  <div className="col-span-3 text-red-600">Variabel yang Hilang</div>
                </div>
                {validation.errors.map((err, idx) => (
                  <div key={idx} className="p-4 grid grid-cols-12 gap-2 text-xs font-medium items-center hover:bg-slate-50">
                    <div className="col-span-4 text-slate-800 font-bold">{err.variableName}</div>
                    <div className="col-span-5 font-mono text-slate-600 bg-slate-50 p-2 rounded border border-slate-200 break-all text-[11px]">{err.formula}</div>
                    <div className="col-span-3 flex flex-wrap gap-1">
                      {err.missingVariables.map((mv, i) => (
                        <span key={i} className="px-2 py-0.5 bg-red-100 text-red-700 rounded-md font-bold text-[10px] uppercase">{mv}</span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap gap-3">
                {modelData.deletedHistory?.length > 0 && (
                  <button onClick={handleUndoDelete} className="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl text-xs flex items-center gap-1.5">
                    <RotateCcw size={14} /> Undo Hapus Variabel
                  </button>
                )}
                <button onClick={handleResetModelDefault} className="px-4 py-2.5 bg-slate-700 hover:bg-slate-800 text-white font-bold rounded-xl text-xs flex items-center gap-1.5">
                  <RotateCcw size={14} /> Reset Model Default
                </button>
                <Link to="/model" className="px-4 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold rounded-xl text-xs flex items-center gap-1.5">
                  Perbaiki di Model Builder
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
