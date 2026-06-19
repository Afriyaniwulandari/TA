import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import Card from '../components/Card';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import {
  RotateCcw, Sliders, TrendingUp, Table as TableIcon,
  AlertCircle, Package, Truck, DollarSign, Activity,
  Info, ChevronDown, ChevronUp, Award, BarChart2
} from 'lucide-react';
import { getModelData, runDynamicSimulation, validateModel, saveModelData, DEFAULT_MODEL_DATA } from '../utils/modelEngine';

// ─────────────────────────────────────────────────────────────
// GAP AKTUAL PARAMETER (Konfigurasi Sistem)
// Nilai ini merepresentasikan selisih antara kondisi ideal dan aktual
// masing-masing parameter dalam model System Dynamics.
// Dapat diubah tanpa mengubah logika integrasi ANP.
// ─────────────────────────────────────────────────────────────
const GAP_AKTUAL = {
  'K1.1 Lahan':          28.197,   // ha — gap luas lahan
  'K1.2 Produktivitas':   0.0,     // (belum dipetakan ke SD)
  'K1.3 Teknologi':       0.0,     // (belum dipetakan ke SD)
  'K2.1 Efisiensi':       0.0,
  'K2.2 Infrastruktur':   0.0,
  'K2.3 Jaringan':        0.0,
  'K3.1 Harga Petani':    0.0,
  'K3.2 Harga Pasar':     0.0,
  'K3.3 Margin':          0.0,
  'K4.1 Standar':        -1.189,   // gap curah hujan (negatif = pengurangan)
  'K4.2 Proses':          3.795,   // gap faktor musim
  'K4.3 Kontrol':         0.0,
  'K5.1 Regulasi':        0.0278,  // gap peran pemerintah
  'K5.2 Insentif':        0.0,
  'K5.3 Kelembagaan':     0.0,
};

// Pemetaan label subkriteria → parameter System Dynamics
const SC_TO_SD_PARAM = {
  'K1.1 Lahan':      'intervensiLuasLahan',
  'K1.3 Teknologi':  'intervensiLuasLahan',   // teknologi berdampak ke lahan efektif
  'K4.1 Standar':    'intervensiCurahHujan',
  'K4.2 Proses':     'intervensiFaktorMusim',
  'K5.1 Regulasi':   'intervensiPeranPemerintah',
};

// Label ramah untuk parameter SD
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

// Nama lengkap alternatif
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
// COMPUTE POLICY INTERVENTIONS FROM ANP RESULTS
// Intervensi = Gap Aktual × Bobot Global Subkriteria
// ─────────────────────────────────────────────────────────────
function computeInterventions(anpResults) {
  const zero = {
    intervensiLuasLahan: 0,
    intervensiFaktorMusim: 0,
    intervensiCurahHujan: 0,
    intervensiPeranPemerintah: 0,
    intervensiImpor: 0,
    intervensiPermintaan: 0,
    intervensiHargaReferensi: 0,
    intervensiHargaImpor: 0,
  };

  if (!anpResults || !anpResults.globalSubWeights) return zero;

  const result = { ...zero };
  const details = [];  // detail per-subkriteria for display

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
  const [debugRows,       setDebugRows]       = useState([]);
  const [modelData,       setModelData]       = useState({ variables: [], relationships: [] });
  const [validation,      setValidation]      = useState({ isValid: true, errors: [] });
  const [anpResults,      setAnpResults]      = useState(null);
  const [anpPanelOpen,    setAnpPanelOpen]    = useState(true);

  // ── Load ANP results from localStorage ────────────────────
  const loadAnpResults = useCallback(() => {
    try {
      const raw = localStorage.getItem('anpCalculatedResults');
      if (raw) {
        const parsed = JSON.parse(raw);
        setAnpResults(parsed);
        return parsed;
      }
    } catch (e) {
      console.warn('Failed to load anpCalculatedResults:', e);
    }
    return null;
  }, []);

  // ── Load and validate SD model ─────────────────────────────
  const loadAndValidateModel = useCallback(() => {
    const data = getModelData();
    setModelData(data);
    const valResult = validateModel(data);
    setValidation(valResult);
    return { data, valResult };
  }, []);

  // ── Run both scenarios ─────────────────────────────────────
  const runSimulation = useCallback((currentData, anp) => {
    const valResult = validateModel(currentData);
    setValidation(valResult);

    if (!valResult.isValid) {
      setBaselineResults([]);
      setPolicyResults([]);
      setDebugRows([]);
      return;
    }

    // Scenario 1: Baseline (no interventions)
    const baselineInt = {
      intervensiLuasLahan: 0, intervensiFaktorMusim: 0,
      intervensiCurahHujan: 0, intervensiPeranPemerintah: 0,
      intervensiImpor: 0, intervensiPermintaan: 0,
      intervensiHargaReferensi: 0, intervensiHargaImpor: 0,
    };
    const { rows: bRows } = runDynamicSimulation(currentData.variables, baselineInt);
    setBaselineResults(bRows);

    // Scenario 2: Policy (ANP-driven interventions)
    const computed = computeInterventions(anp);
    const policyInt = computed.interventions || computed;
    const { rows: pRows, debug } = runDynamicSimulation(currentData.variables, policyInt);
    setPolicyResults(pRows);
    setDebugRows(debug);
  }, []);

  // ── Init ───────────────────────────────────────────────────
  useEffect(() => {
    const anp = loadAnpResults();
    const { data } = loadAndValidateModel();
    if (data.variables && data.variables.length > 0) {
      runSimulation(data, anp);
    }
  }, []); // eslint-disable-line

  // Re-run when modelData changes (not on first mount — handled above)
  useEffect(() => {
    if (modelData.variables && modelData.variables.length > 0) {
      runSimulation(modelData, anpResults);
    }
  }, [modelData]); // eslint-disable-line

  // Listen for ANP results changes from other tabs
  useEffect(() => {
    const handleStorage = (e) => {
      if (e.key === 'anpCalculatedResults') {
        const anp = loadAnpResults();
        if (modelData.variables && modelData.variables.length > 0) {
          runSimulation(modelData, anp);
        }
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [modelData, loadAnpResults, runSimulation]);

  // ── Undo / Reset handlers ─────────────────────────────────
  const handleUndoDelete = () => {
    const history = [...(modelData.deletedHistory || [])];
    if (history.length === 0) return;
    const last = history.pop();
    const newData = {
      ...modelData,
      variables: [...modelData.variables, last.variable],
      relationships: [...modelData.relationships, ...last.relationships],
      deletedHistory: history,
    };
    setModelData(newData);
    saveModelData(newData);
  };

  const handleResetModelDefault = () => {
    if (!window.confirm('Apakah Anda yakin ingin mengatur ulang model ke default?')) return;
    const newData = { ...DEFAULT_MODEL_DATA, deletedHistory: [] };
    setModelData(newData);
    saveModelData(newData);
  };

  // ── Axis formatters ────────────────────────────────────────
  const formatLeftAxis  = (v) => fmtK(v);
  const formatRightAxis = (v) => v === 0 ? 'Rp 0' : `Rp ${fmtK(v)}`;

  // ── Comparison (last year) ─────────────────────────────────
  const getComparisonData = () => {
    if (baselineResults.length === 0 || policyResults.length === 0) return [];
    const bLast = baselineResults[baselineResults.length - 1];
    const pLast = policyResults[policyResults.length - 1];
    return [
      { key: 'produksiGaram', name: 'Produksi Garam', unit: 'ton',
        bVal: bLast.produksiGaram, pVal: pLast.produksiGaram,
        icon: <Activity size={20} className="text-emerald-500" /> },
      { key: 'stokGaram', name: 'Stok Garam', unit: 'ton',
        bVal: bLast.stokGaram, pVal: pLast.stokGaram,
        icon: <Package size={20} className="text-blue-500" /> },
      { key: 'distribusi', name: 'Distribusi', unit: 'ton',
        bVal: bLast.distribusi, pVal: pLast.distribusi,
        icon: <Truck size={20} className="text-amber-500" /> },
      { key: 'harga', name: 'Harga Lokal', unit: 'Rp/kg', isPrice: true,
        bVal: bLast.harga, pVal: pLast.harga,
        icon: <DollarSign size={20} className="text-cyan-500" /> },
    ].map(v => {
      const diff = v.pVal - v.bVal;
      const pct  = v.bVal !== 0 ? (diff / v.bVal) * 100 : 0;
      return { ...v, diff, pct };
    });
  };

  const compData    = getComparisonData();
  const computed    = computeInterventions(anpResults);
  const policyInt   = computed.interventions || computed;
  const intDetails  = computed.details || [];
  const bestAlt     = anpResults?.bestAlternative;
  const bestAltName = bestAlt ? (ALT_NAMES[bestAlt.alt] || bestAlt.alt) : null;

  // ── Scenario section renderer ─────────────────────────────
  const renderScenarioSection = (title, subtitle, results, isPolicy) => (
    <div className="space-y-4">
      <div className="border-b border-brand-grayMedium pb-2">
        <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
          <TrendingUp className={isPolicy ? 'text-brand-navy h-5 w-5' : 'text-slate-500 h-5 w-5'} />
          {title}
        </h3>
        <p className="text-xs text-brand-grayDark mt-0.5">{subtitle}</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Chart */}
        <Card
          title={`Grafik Time Series – ${title}`}
          subtitle="Sumbu Y Kiri: Stok, Produksi & Distribusi (Ton) · Sumbu Y Kanan: Harga Lokal (Rp/Kg)"
        >
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={results} margin={{ top: 15, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="tahun" fontSize={11} stroke="#64748B" fontWeight="bold" />
                <YAxis yAxisId="left" fontSize={10} stroke="#64748B" width={45}
                  tickFormatter={formatLeftAxis}
                  label={{ value: 'Ton', angle: -90, position: 'insideLeft', fontSize: 10, offset: -2, fontWeight: 'bold' }} />
                <YAxis yAxisId="right" orientation="right" fontSize={10} stroke="#0891B2" width={75}
                  tickFormatter={formatRightAxis}
                  label={{ value: 'Rp/Kg', angle: 90, position: 'insideRight', fontSize: 10, offset: 2, fontWeight: 'bold' }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0F172A', borderRadius: '12px', color: '#fff', fontSize: '11px', border: 'none', padding: '10px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.3)' }}
                  formatter={tooltipFormatter}
                  labelFormatter={(l) => `Tahun ${l}`}
                />
                <Legend verticalAlign="top" height={36} fontSize={11} iconType="circle" />
                <Line yAxisId="left"  type="monotone" dataKey="stokGaram"     name="Stok Garam"     stroke="#3B82F6" strokeWidth={3}   dot={{ r: 4 }} activeDot={{ r: 6 }} />
                <Line yAxisId="left"  type="monotone" dataKey="produksiGaram" name="Produksi Garam" stroke="#10B981" strokeWidth={2.5} dot={{ r: 3 }} />
                <Line yAxisId="left"  type="monotone" dataKey="distribusi"    name="Distribusi"     stroke="#F59E0B" strokeWidth={2.5} dot={{ r: 3 }} />
                <Line yAxisId="right" type="monotone" dataKey="harga"         name="Harga"          stroke="#0891B2" strokeWidth={2.5} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Table */}
        <Card
          title={`Tabel Proyeksi – ${title}`}
          subtitle="Stok awal tahun (INTEG) vs Aliran Flow tahunan"
          headerAction={
            <span className="px-2.5 py-1 bg-slate-100 text-slate-600 rounded-md font-semibold text-[10px] uppercase tracking-wider flex items-center gap-1.5">
              <TableIcon size={12} /> Data Terkomputasi
            </span>
          }
        >
          <div className="overflow-x-auto border border-brand-grayMedium rounded-xl bg-slate-50 p-2">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-brand-grayMedium text-brand-navy font-bold">
                  <th className="py-2.5 px-3 text-center">Tahun</th>
                  <th className="py-2.5 px-3 text-right">Stok (Ton)</th>
                  <th className="py-2.5 px-3 text-right">Produksi (Ton)</th>
                  <th className="py-2.5 px-3 text-right">Distribusi (Ton)</th>
                  <th className="py-2.5 px-3 text-right text-cyan-700">Harga (Rp/Kg)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-grayMedium text-slate-600 font-medium font-mono text-[11px]">
                {results.map((row) => (
                  <tr key={row.tahun} className="hover:bg-white transition-colors">
                    <td className="py-3 px-3 text-center text-slate-900 font-sans font-bold">{row.tahun}</td>
                    <td className="py-3 px-3 text-right">{fmtNum(row.stokGaram)}</td>
                    <td className="py-3 px-3 text-right">{fmtNum(row.produksiGaram)}</td>
                    <td className="py-3 px-3 text-right">{fmtNum(row.distribusi)}</td>
                    <td className="py-3 px-3 text-right text-cyan-700 font-bold">{fmtRp(row.harga)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );

  // ─────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 md:space-y-8 animate-fade-in p-4 md:p-6 print:p-0">

      {/* Header */}
      <div className="border-b border-brand-grayMedium pb-4 print:hidden flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-800 tracking-tight flex items-center gap-2">
            <Sliders className="text-brand-navy h-6 w-6" />
            Dashboard Simulasi Dua Skenario Kebijakan
          </h2>
          <p className="text-sm text-brand-grayDark mt-1">
            Perbandingan skenario baseline (tanpa kebijakan) dengan skenario integrasi ANP secara bersamaan.
            <br />
            *Formulasi dasar model dapat diatur melalui halaman Model.
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          {modelData.deletedHistory && modelData.deletedHistory.length > 0 && (
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

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">

        {/* ── SIDEBAR: ANP Integration Panel ───────────────────── */}
        <div className="lg:col-span-1 space-y-5 print:hidden">

          {/* ANP Status Banner */}
          {anpResults ? (
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl px-4 py-3 flex items-center gap-3 shadow-sm">
              <div className="p-2 bg-emerald-100 rounded-xl text-emerald-600 shrink-0">
                <BarChart2 size={18} />
              </div>
              <div>
                <p className="text-[11px] font-bold text-emerald-800 uppercase tracking-wide">Hasil ANP Terdeteksi</p>
                <p className="text-[10px] text-emerald-700 mt-0.5 font-medium">
                  Dihitung: {anpResults.calculatedAt
                    ? new Date(anpResults.calculatedAt).toLocaleString('id-ID')
                    : '—'}
                </p>
              </div>
            </div>
          ) : (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 flex items-start gap-3 shadow-sm">
              <div className="p-2 bg-amber-100 rounded-xl text-amber-600 shrink-0 mt-0.5">
                <AlertCircle size={18} />
              </div>
              <div>
                <p className="text-[11px] font-bold text-amber-800 uppercase tracking-wide">Hasil ANP Tidak Ditemukan</p>
                <p className="text-[10px] text-amber-700 mt-0.5 font-medium">
                  Buka halaman ANP dan jalankan perhitungan terlebih dahulu. Simulasi kebijakan akan menggunakan intervensi nol.
                </p>
                <Link to="/anp" className="mt-2 inline-block text-[10px] font-bold text-amber-800 underline hover:text-amber-900">
                  → Buka Halaman ANP
                </Link>
              </div>
            </div>
          )}

          {/* ANP Info Panel */}
          <div className="bg-white border border-brand-grayMedium rounded-2xl shadow-sm overflow-hidden">
            <button
              onClick={() => setAnpPanelOpen(p => !p)}
              className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-50 transition-colors"
            >
              <h3 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-2">
                <Info size={15} className="text-brand-navy" />
                Panel Informasi Integrasi ANP
              </h3>
              {anpPanelOpen ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
            </button>

            {anpPanelOpen && (
              <div className="px-5 pb-5 space-y-4 border-t border-brand-grayMedium">

                {/* Best Alternative */}
                {bestAlt && (
                  <div className="mt-4">
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Alternatif Terpilih (Ranking #1)</p>
                    <div className="bg-brand-navy/5 border border-brand-navy/10 rounded-xl p-3 flex items-start gap-3">
                      <Award size={20} className="text-brand-navy shrink-0 mt-0.5" />
                      <div>
                        <p className="font-extrabold text-slate-800 text-xs leading-snug">{bestAltName}</p>
                        <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                          {bestAlt.alt} — Bobot: {(bestAlt.value / 100).toFixed(5)}
                          {' '}({bestAlt.value.toFixed(2)}%)
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Ranking List */}
                {anpResults?.ranking && (
                  <div>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Ranking Seluruh Alternatif</p>
                    <div className="space-y-1.5">
                      {anpResults.ranking.map((item, idx) => (
                        <div key={item.alt}
                          className={`flex items-center justify-between rounded-lg px-3 py-1.5 text-[11px] font-medium ${idx === 0 ? 'bg-brand-navy text-white' : 'bg-slate-50 text-slate-700'}`}>
                          <span className="font-bold">{idx + 1}. {item.alt}</span>
                          <span className="font-mono">{(item.value / 100).toFixed(5)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Global Subcriteria Weights */}
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
                    <p className="text-[9px] text-slate-400 mt-1.5 font-medium">
                      Bobot Global = Bobot Kriteria × Bobot Lokal
                    </p>
                  </div>
                )}

                {/* Intervention Details */}
                <div>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Nilai Intervensi Parameter SD</p>
                  <p className="text-[9px] text-slate-400 mb-2 font-medium">Intervensi = Gap Aktual × Bobot Global</p>
                  {intDetails.length > 0 ? (
                    <div className="space-y-1.5">
                      {intDetails.map((d, i) => (
                        <div key={i} className="bg-slate-50 border border-slate-100 rounded-lg p-2.5 text-[10px]">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-bold text-slate-700">{d.scLabel}</span>
                            <span className="font-mono text-brand-navy font-bold">
                              {d.interv > 0 ? '+' : ''}{d.interv.toFixed(5)}
                            </span>
                          </div>
                          <div className="text-slate-500 space-y-0.5">
                            <div className="flex justify-between">
                              <span>Gap Aktual:</span>
                              <span className="font-mono">{d.gap.toFixed(4)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Bobot Global:</span>
                              <span className="font-mono">{d.globalW.toFixed(5)}</span>
                            </div>
                            <div className="flex justify-between text-slate-400 italic">
                              <span>→ {SD_PARAM_LABELS[d.sdParam] || d.sdParam}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[10px] text-slate-400 italic">
                      Tidak ada subkriteria yang dipetakan ke parameter SD untuk alternatif ini.
                    </p>
                  )}
                </div>

                {/* Active Policy Parameters Summary */}
                <div>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Parameter Kebijakan Aktif</p>
                  <div className="space-y-1">
                    {Object.entries(policyInt)
                      .filter(([, v]) => Math.abs(v) > 1e-9)
                      .map(([key, val]) => (
                        <div key={key}
                          className="flex items-center justify-between bg-blue-50 border border-blue-100 rounded-lg px-3 py-1.5 text-[10px]">
                          <span className="text-slate-700 font-medium">{SD_PARAM_LABELS[key] || key}</span>
                          <span className="font-mono font-bold text-brand-navy">
                            {val > 0 ? '+' : ''}{val.toFixed(5)}
                          </span>
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

        {/* ── CHARTS + TABLES ──────────────────────────────── */}
        <div className="lg:col-span-2 space-y-8">
          {validation.isValid ? (
            <>
              {/* SECTION 1: Simulasi Tanpa Kebijakan */}
              {renderScenarioSection(
                'Simulasi Tanpa Kebijakan (Baseline)',
                'Proyeksi rantai pasok garam nasional menggunakan parameter dasar model tanpa intervensi ANP.',
                baselineResults,
                false
              )}

              {/* SECTION 2: Simulasi Dengan Kebijakan ANP */}
              {renderScenarioSection(
                'Simulasi Dengan Kebijakan (Integrasi ANP)',
                `Proyeksi dengan intervensi otomatis dari hasil ANP. Alternatif terpilih: ${bestAltName || '—'}.`,
                policyResults,
                true
              )}

              {/* RINGKASAN PERBANDINGAN */}
              <div className="pt-6 border-t border-brand-grayMedium space-y-4">
                <div className="border-b border-brand-grayMedium pb-2">
                  <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                    <Sliders className="text-emerald-600 h-5 w-5" />
                    Ringkasan Perbandingan Dampak Kebijakan (Tahun Akhir 2027)
                  </h3>
                  <p className="text-xs text-brand-grayDark mt-0.5">
                    Perbandingan selisih nilai indikator utama pada tahun proyeksi terakhir (2027).
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {compData.map((item) => {
                    const isPositive = item.pct >= 0;
                    const colorClass = isPositive
                      ? 'text-emerald-600 bg-emerald-50 border-emerald-200'
                      : 'text-rose-600 bg-rose-50 border-rose-200';
                    const pctSign = isPositive ? '▲' : '▼';
                    return (
                      <div key={item.key}
                        className="bg-white border border-brand-grayMedium rounded-2xl p-5 shadow-sm space-y-3 flex flex-col justify-between hover:border-brand-navy/25 transition-all">
                        <div className="flex items-center gap-2">
                          {item.icon}
                          <h4 className="font-extrabold text-slate-800 text-xs">{item.name}</h4>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-[11px] font-medium text-slate-600 pt-1">
                          <div className="border-r border-slate-100 pr-2">
                            <span className="text-[9px] text-slate-400 block font-sans font-bold uppercase tracking-wide">Baseline:</span>
                            <span className="font-mono font-bold text-slate-700">
                              {item.isPrice ? `${fmtRp(item.bVal)}/kg` : `${fmtNum(item.bVal)} ${item.unit}`}
                            </span>
                          </div>
                          <div className="pl-2">
                            <span className="text-[9px] text-slate-400 block font-sans font-bold uppercase tracking-wide">Kebijakan ANP:</span>
                            <span className="font-mono font-bold text-brand-navy">
                              {item.isPrice ? `${fmtRp(item.pVal)}/kg` : `${fmtNum(item.pVal)} ${item.unit}`}
                            </span>
                          </div>
                        </div>
                        <div className="mt-2 border-t border-brand-grayLight pt-2.5 flex items-center justify-between">
                          <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Perubahan</span>
                          <span className={`px-2.5 py-1 rounded-lg border text-[11px] font-mono font-extrabold flex items-center gap-1 ${colorClass}`}>
                            <span>{pctSign}</span>
                            <span>{Math.abs(item.pct).toFixed(2)} %</span>
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          ) : (
            /* Error Panel */
            <div className="bg-red-50 border border-red-200 rounded-2xl p-6 shadow-sm space-y-6 animate-fade-in">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-red-100 text-red-600 rounded-xl shrink-0">
                  <AlertCircle size={24} />
                </div>
                <div className="space-y-2">
                  <h3 className="font-extrabold text-red-800 text-lg leading-snug">
                    Simulasi tidak dapat dijalankan karena terdapat variabel yang hilang pada formulasi matematis.
                  </h3>
                  <p className="text-sm text-red-600">
                    Sistem mendeteksi bahwa satu atau lebih formulasi menggunakan variabel yang telah dihapus atau tidak tersedia.
                  </p>
                </div>
              </div>

              <div className="bg-white border border-red-100 rounded-xl overflow-hidden shadow-sm divide-y divide-slate-100">
                <div className="p-3 bg-slate-50 text-slate-500 font-bold text-[10px] uppercase tracking-wider grid grid-cols-12 gap-2 border-b border-slate-100">
                  <div className="col-span-4">Variabel Bermasalah</div>
                  <div className="col-span-5">Formulasi Matematis</div>
                  <div className="col-span-3 text-red-600">Variabel yang Hilang</div>
                </div>
                {validation.errors.map((err, idx) => (
                  <div key={idx} className="p-4 grid grid-cols-12 gap-2 text-xs font-medium items-center hover:bg-slate-50 transition-colors">
                    <div className="col-span-4 text-slate-800 font-bold">{err.variableName}</div>
                    <div className="col-span-5 font-mono text-slate-600 bg-slate-50 p-2 rounded border border-slate-200 break-all text-[11px]">{err.formula}</div>
                    <div className="col-span-3">
                      <div className="flex flex-wrap gap-1">
                        {err.missingVariables.map((mv, mvIdx) => (
                          <span key={mvIdx} className="px-2 py-0.5 bg-red-100 text-red-700 rounded-md font-bold text-[10px] uppercase tracking-wide">{mv}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-4 border-t border-red-100 flex flex-wrap gap-3">
                {modelData.deletedHistory && modelData.deletedHistory.length > 0 && (
                  <button onClick={handleUndoDelete}
                    className="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors">
                    <RotateCcw size={14} /> Undo Hapus Variabel
                  </button>
                )}
                <button onClick={handleResetModelDefault}
                  className="px-4 py-2.5 bg-slate-700 hover:bg-slate-800 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors">
                  <RotateCcw size={14} /> Reset Model Default
                </button>
                <Link to="/model"
                  className="px-4 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors">
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
