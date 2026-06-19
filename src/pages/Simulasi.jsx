import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Card from '../components/Card';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';
import { Play, RotateCcw, Sliders, TrendingUp, Table as TableIcon, AlertCircle, Package, Truck, DollarSign, Activity } from 'lucide-react';
import { getModelData, runDynamicSimulation, validateModel, saveModelData, DEFAULT_MODEL_DATA } from '../utils/modelEngine';

// ─────────────────────────────────────────────────────────────
// DEFAULT PARAMETERS  (base values for interventions)
// ─────────────────────────────────────────────────────────────
const DEFAULT_PARAMS = {
  intervensiPeranPemerintah: 0.003,
  intervensiFaktorMusim: 0.166,
  intervensiCurahHujan: -0.052,
  intervensiLuasLahan: 7.5,
  intervensiImpor: 0,
  intervensiPermintaan: 0,
  intervensiHargaReferensi: 0,
  intervensiHargaImpor: 0,
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

// Tooltip formatter for recharts
const tooltipFormatter = (value, name) => {
  const formatted = new Intl.NumberFormat('id-ID', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
  if (name === 'Harga') return [`${fmtRp(value)}/kg`, 'Harga'];
  const labels = { stokGaram: 'Stok Garam', produksiGaram: 'Produksi Garam', distribusi: 'Distribusi' };
  return [`${formatted} ton`, labels[name] || name];
};

// ─────────────────────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────────────────────
export default function Simulasi() {
  const [params,     setParams]     = useState({ ...DEFAULT_PARAMS });
  const [baselineResults, setBaselineResults] = useState([]);
  const [policyResults,   setPolicyResults]   = useState([]);
  const [debugRows,  setDebugRows]  = useState([]);
  const [modelData,  setModelData]  = useState({ variables: [], relationships: [] });
  const [validation, setValidation] = useState({ isValid: true, errors: [] });

  const loadAndValidateModel = () => {
    const data = getModelData();
    setModelData(data);
    
    const valResult = validateModel(data);
    setValidation(valResult);
    
    return { data, valResult };
  };

  // Run engine and store results
  const runSimulation = (p = params, currentData = modelData) => {
    const valResult = validateModel(currentData);
    setValidation(valResult);
    
    if (!valResult.isValid) {
      setBaselineResults([]);
      setPolicyResults([]);
      setDebugRows([]);
      return;
    }
    
    // Baseline scenario (no interventions)
    const baselineInterventions = {
      intervensiPeranPemerintah: 0,
      intervensiFaktorMusim: 0,
      intervensiCurahHujan: 0,
      intervensiLuasLahan: 0,
      intervensiImpor: 0,
      intervensiPermintaan: 0,
      intervensiHargaReferensi: 0,
      intervensiHargaImpor: 0,
    };
    const { rows: bRows } = runDynamicSimulation(currentData.variables, baselineInterventions);
    setBaselineResults(bRows);
    
    // Policy scenario (user adjustable interventions)
    const { rows: pRows, debug } = runDynamicSimulation(currentData.variables, p);
    setPolicyResults(pRows);
    setDebugRows(debug);
  };

  // Param input handler
  const handleInputChange = (key, value) =>
    setParams(prev => ({ ...prev, [key]: parseFloat(value) || 0 }));

  // Reset to defaults
  const handleReset = () => {
    setParams({ ...DEFAULT_PARAMS });
  };

  // Undo delete variable
  const handleUndoDelete = () => {
    const history = [...(modelData.deletedHistory || [])];
    if (history.length === 0) return;
    
    const last = history.pop();
    const newVars = [...modelData.variables, last.variable];
    const newRels = [...modelData.relationships, ...last.relationships];
    
    const newData = {
      ...modelData,
      variables: newVars,
      relationships: newRels,
      deletedHistory: history
    };
    
    setModelData(newData);
    saveModelData(newData);
  };

  // Reset entire model to defaults
  const handleResetModelDefault = () => {
    if (!window.confirm("Apakah Anda yakin ingin mengatur ulang model ke default? Semua variabel, hubungan, dan formulasi kustom akan dihapus.")) return;
    
    const newData = {
      ...DEFAULT_MODEL_DATA,
      deletedHistory: []
    };
    
    setModelData(newData);
    saveModelData(newData);
  };

  // Run on mount
  useEffect(() => {
    loadAndValidateModel();
  }, []); // eslint-disable-line

  // Run simulation automatically when params or modelData change
  useEffect(() => {
    if (modelData.variables && modelData.variables.length > 0) {
      runSimulation(params, modelData);
    }
  }, [params, modelData]); // eslint-disable-line

  // ── Axis formatters ────────────────────────────────────────
  const formatLeftAxis  = (v) => fmtK(v);
  const formatRightAxis = (v) => v === 0 ? 'Rp 0' : `Rp ${fmtK(v)}`;

  // Comparison helper for the final year (2027)
  const getComparisonData = () => {
    if (baselineResults.length === 0 || policyResults.length === 0) return [];
    
    const bLast = baselineResults[baselineResults.length - 1];
    const pLast = policyResults[policyResults.length - 1];
    
    const variables = [
      {
        key: 'produksiGaram',
        name: 'Produksi Garam',
        unit: 'ton',
        bVal: bLast.produksiGaram,
        pVal: pLast.produksiGaram,
        icon: <Activity size={20} className="text-emerald-500" />,
      },
      {
        key: 'stokGaram',
        name: 'Stok Garam',
        unit: 'ton',
        bVal: bLast.stokGaram,
        pVal: pLast.stokGaram,
        icon: <Package size={20} className="text-blue-500" />,
      },
      {
        key: 'distribusi',
        name: 'Distribusi',
        unit: 'ton',
        bVal: bLast.distribusi,
        pVal: pLast.distribusi,
        icon: <Truck size={20} className="text-amber-500" />,
      },
      {
        key: 'harga',
        name: 'Harga Lokal',
        unit: 'Rp/kg',
        bVal: bLast.harga,
        pVal: pLast.harga,
        isPrice: true,
        icon: <DollarSign size={20} className="text-cyan-500" />,
      },
    ];
    
    return variables.map(v => {
      const diff = v.pVal - v.bVal;
      const pct = v.bVal !== 0 ? (diff / v.bVal) * 100 : 0;
      return {
        ...v,
        diff,
        pct
      };
    });
  };

  const compData = getComparisonData();

  // Helper component to render chart and table side-by-side
  const renderScenarioSection = (title, subtitle, results, isPolicy) => {
    return (
      <div className="space-y-4">
        <div className="border-b border-brand-grayMedium pb-2">
          <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <TrendingUp className={isPolicy ? "text-brand-navy h-5 w-5" : "text-slate-500 h-5 w-5"} />
            {title}
          </h3>
          <p className="text-xs text-brand-grayDark mt-0.5">{subtitle}</p>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {/* Chart */}
          <Card
            title={`Grafik Time Series - ${title}`}
            subtitle="Sumbu Y Kiri: Stok, Produksi & Distribusi (Ton) · Sumbu Y Kanan: Harga Lokal (Rp/Kg)"
          >
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={results} margin={{ top: 15, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis dataKey="tahun" fontSize={11} stroke="#64748B" fontWeight="bold" />

                  <YAxis
                    yAxisId="left"
                    fontSize={10}
                    stroke="#64748B"
                    width={45}
                    tickFormatter={formatLeftAxis}
                    label={{ value: 'Ton', angle: -90, position: 'insideLeft', fontSize: 10, offset: -2, fontWeight: 'bold' }}
                  />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    fontSize={10}
                    stroke="#0891B2"
                    width={75}
                    tickFormatter={formatRightAxis}
                    label={{ value: 'Rp/Kg', angle: 90, position: 'insideRight', fontSize: 10, offset: 2, fontWeight: 'bold' }}
                  />

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
            title={`Tabel Proyeksi - ${title}`}
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
                      <td className="py-3 px-3 text-right text-cyan-700 font-bold">
                        {fmtRp(row.harga)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      </div>
    );
  };

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
            Perbandingan skenario baseline (tanpa kebijakan) dengan skenario intervensi hasil integrasi ANP secara bersamaan.
            <br/>
            *Formulasi dasar model dapat diatur melalui halaman Model.
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          {modelData.deletedHistory && modelData.deletedHistory.length > 0 && (
            <button
              onClick={handleUndoDelete}
              className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-bold inline-flex items-center gap-1 transition-colors"
            >
              <RotateCcw size={14} /> Undo Hapus Variabel
            </button>
          )}
          <button
            onClick={handleResetModelDefault}
            className="px-3 py-1.5 bg-slate-500 hover:bg-slate-600 text-white rounded-lg text-xs font-bold inline-flex items-center gap-1 transition-colors"
          >
            <RotateCcw size={14} /> Reset Model Default
          </button>
        </div>
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">

        {/* ── INPUT PANEL ─────────────────────────────────── */}
        <div className="lg:col-span-1 space-y-5 print:hidden">

          {/* Skenario Kebijakan Tahun 2026 Card */}
          <div className="bg-white border border-brand-grayMedium rounded-2xl p-5 md:p-6 shadow-sm">
            <h3 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider border-b border-brand-grayMedium pb-3 flex items-center gap-2 mb-4">
              <TrendingUp size={16} className="text-brand-navy" />
              Parameter Kebijakan (ANP)
            </h3>

            <div className="space-y-4 max-h-[550px] overflow-y-auto pr-1 sidebar-scroll">
              <p className="text-[11px] text-slate-500 mb-3">
                Masukkan nilai intervensi tambahan yang diaplikasikan mulai tahun 2026 berdasarkan prioritas ANP. Perubahan akan langsung meng-update skenario kebijakan secara otomatis.
              </p>
              {[
                { key: 'intervensiPeranPemerintah', label: 'Intervensi Peran Pemerintah', step: 0.001 },
                { key: 'intervensiFaktorMusim',     label: 'Intervensi Faktor Musim',     step: 0.001 },
                { key: 'intervensiCurahHujan',      label: 'Intervensi Curah Hujan',      step: 0.001 },
                { key: 'intervensiLuasLahan',       label: 'Intervensi Luas Lahan',       step: 0.1   },
                { key: 'intervensiImpor',           label: 'Intervensi Impor',           step: 0.01  },
                { key: 'intervensiPermintaan',      label: 'Intervensi Permintaan',      step: 100   },
                { key: 'intervensiHargaReferensi',  label: 'Intervensi Harga Referensi',  step: 1     },
                { key: 'intervensiHargaImpor',      label: 'Intervensi Harga Impor',      step: 1     },
              ].map(({ key, label, step }) => (
                <div key={key} className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-700 block">{label}</label>
                  <input
                    type="number"
                    step={step}
                    value={params[key]}
                    onChange={(e) => handleInputChange(key, e.target.value)}
                    className="w-full bg-slate-50 border border-brand-grayMedium rounded-xl px-3.5 py-2 text-xs font-semibold focus:outline-none focus:border-brand-navy transition-colors font-mono"
                  />
                </div>
              ))}
            </div>

            {/* Action buttons */}
            <div className="grid grid-cols-2 gap-3 pt-5 mt-5 border-t border-brand-grayMedium">
              <button
                onClick={handleReset}
                className="py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs flex items-center justify-center gap-1 transition-colors border border-slate-200 focus:outline-none w-full col-span-2"
              >
                <RotateCcw size={13} />
                <span>Reset Parameter Default</span>
              </button>
            </div>
          </div>

        </div>

        {/* ── CHARTS + TABLES ──────────────────────────────── */}
        <div className="lg:col-span-2 space-y-8">
          {validation.isValid ? (
            <>
              {/* SECTION 1: Simulasi Tanpa Kebijakan */}
              {renderScenarioSection(
                "Simulasi Tanpa Kebijakan (Baseline)",
                "Proyeksi rantai pasok garam nasional menggunakan parameter dasar model tanpa intervensi ANP.",
                baselineResults,
                false
              )}

              {/* SECTION 2: Simulasi Dengan Kebijakan */}
              {renderScenarioSection(
                "Simulasi Dengan Kebijakan (Kebijakan ANP)",
                "Proyeksi dengan intervensi kebijakan yang diintegrasikan berdasarkan parameter input hasil ANP.",
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
                    const isPrice = item.isPrice;
                    
                    const colorClass = isPositive 
                      ? 'text-emerald-600 bg-emerald-50 border-emerald-200' 
                      : 'text-rose-600 bg-rose-50 border-rose-200';
                    const pctSign = isPositive ? '▲' : '▼';
                    
                    return (
                      <div key={item.key} className="bg-white border border-brand-grayMedium rounded-2xl p-5 shadow-sm space-y-3 flex flex-col justify-between hover:border-brand-navy/25 transition-all">
                        <div className="flex items-center gap-2">
                          {item.icon}
                          <div>
                            <h4 className="font-extrabold text-slate-800 text-xs">{item.name}</h4>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-2 text-[11px] font-medium text-slate-600 pt-1">
                          <div className="border-r border-slate-100 pr-2">
                            <span className="text-[9px] text-slate-400 block font-sans font-bold uppercase tracking-wide">Baseline:</span>
                            <span className="font-mono font-bold text-slate-700">
                              {isPrice ? `${fmtRp(item.bVal)}/kg` : `${fmtNum(item.bVal)} ${item.unit}`}
                            </span>
                          </div>
                          <div className="pl-2">
                            <span className="text-[9px] text-slate-400 block font-sans font-bold uppercase tracking-wide">Kebijakan:</span>
                            <span className="font-mono font-bold text-brand-navy">
                              {isPrice ? `${fmtRp(item.pVal)}/kg` : `${fmtNum(item.pVal)} ${item.unit}`}
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
                    Sistem mendeteksi bahwa satu atau lebih formulasi menggunakan variabel yang telah dihapus atau tidak tersedia di dalam model. Silakan perbaiki formulasi atau pulihkan variabel yang hilang.
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
                          <span key={mvIdx} className="px-2 py-0.5 bg-red-100 text-red-700 rounded-md font-bold text-[10px] uppercase tracking-wide">
                            {mv}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="pt-4 border-t border-red-100 flex flex-wrap gap-3">
                {modelData.deletedHistory && modelData.deletedHistory.length > 0 && (
                  <button
                    onClick={handleUndoDelete}
                    className="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors shadow-md shadow-amber-500/10 focus:outline-none"
                  >
                    <RotateCcw size={14} />
                    <span>Undo Hapus Variabel</span>
                  </button>
                )}
                <button
                  onClick={handleResetModelDefault}
                  className="px-4 py-2.5 bg-slate-700 hover:bg-slate-800 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors shadow-md shadow-slate-700/10 focus:outline-none"
                >
                  <RotateCcw size={14} />
                  <span>Reset Model Default</span>
                </button>
                <Link
                  to="/model"
                  className="px-4 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors focus:outline-none"
                >
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
