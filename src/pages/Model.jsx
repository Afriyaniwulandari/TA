import React, { useState, useEffect } from 'react';
import Card from '../components/Card';
import { 
  Layers, Edit3, X, Save, AlertCircle, Plus, Trash2, GitMerge, RotateCcw 
} from 'lucide-react';
import { getModelData, saveModelData, DEFAULT_MODEL_DATA } from '../utils/modelEngine';
import CausalLoopDiagram from '../components/CausalLoopDiagram';
import StockFlowDiagram from '../components/StockFlowDiagram';

export default function Model() {
  const [activeTab, setActiveTab] = useState('variabel');
  const [modelData, setModelData] = useState({ variables: [], relationships: [] });
  
  // Modals state
  const [isVarModalOpen, setIsVarModalOpen] = useState(false);
  const [editingVar, setEditingVar] = useState(null);
  
  const [isRelModalOpen, setIsRelModalOpen] = useState(false);
  const [editingRel, setEditingRel] = useState(null);

  // Inline editing state for Formulasi tab
  const [inlineEditingId, setInlineEditingId] = useState(null);
  const [inlineFormula, setInlineFormula] = useState('');

  // Load from modelEngine on mount
  useEffect(() => {
    setModelData(getModelData());
  }, []);

  const saveAndApply = (newData) => {
    setModelData(newData);
    saveModelData(newData);
  };

  // ── VARIABLES CRUD ──────────────────────────────────────────────

  const handleAddVarClick = () => {
    setEditingVar({ id: `v_${Date.now()}`, name: '', type: 'Auxiliary', desc: '', formula: '' });
    setIsVarModalOpen(true);
  };

  const handleEditVarClick = (variable) => {
    setEditingVar({ ...variable });
    setIsVarModalOpen(true);
  };

  const handleDeleteVar = (id) => {
    const variable = modelData.variables.find(v => v.id === id);
    if (!variable) return;

    // Check if used in other formulations, relationships, CLD, SFD, or simulation.
    const activeVars = modelData.variables.filter(v => v.type !== 'Loop');
    const usedInFormula = activeVars.some(v => {
      if (v.id === id || !v.formula) return false;
      const escapedName = variable.name.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
      const regex = new RegExp(`(?<![a-zA-Z0-9_])${escapedName}(?![a-zA-Z0-9_])`, 'g');
      return regex.test(v.formula);
    });

    const usedInRelationships = modelData.relationships.some(r => r.source === id || r.target === id);
    const isInUse = usedInFormula || usedInRelationships;

    if (isInUse) {
      if (!window.confirm("Variabel ini masih digunakan oleh model. Menghapus variabel akan memengaruhi simulasi.")) {
        return;
      }
    } else {
      if (!window.confirm("Yakin ingin menghapus variabel ini? Hubungan yang terkait juga akan terhapus.")) {
        return;
      }
    }

    const newVars = modelData.variables.filter(v => v.id !== id);
    const newRels = modelData.relationships.filter(r => r.source !== id && r.target !== id);
    const deletedRels = modelData.relationships.filter(r => r.source === id || r.target === id);

    const newHistory = [
      ...(modelData.deletedHistory || []),
      {
        variable,
        relationships: deletedRels,
        timestamp: Date.now()
      }
    ];

    saveAndApply({
      variables: newVars,
      relationships: newRels,
      deletedHistory: newHistory
    });
  };

  const handleUndoDelete = () => {
    const history = [...(modelData.deletedHistory || [])];
    if (history.length === 0) return;
    
    const last = history.pop();
    const newVars = [...modelData.variables, last.variable];
    const newRels = [...modelData.relationships, ...last.relationships];
    
    saveAndApply({
      variables: newVars,
      relationships: newRels,
      deletedHistory: history
    });
  };

  const handleResetDefault = () => {
    if (!window.confirm("Apakah Anda yakin ingin mengatur ulang model ke default? Semua variabel, hubungan, dan formulasi kustom akan dihapus.")) return;
    saveAndApply({
      ...DEFAULT_MODEL_DATA,
      deletedHistory: []
    });
  };

  const handleSaveVar = () => {
    if (!editingVar.name.trim()) return alert("Nama variabel tidak boleh kosong");
    let newVars = [...modelData.variables];
    const exists = newVars.findIndex(v => v.id === editingVar.id);
    if (exists >= 0) {
      newVars[exists] = editingVar;
    } else {
      newVars.push(editingVar);
    }
    saveAndApply({ ...modelData, variables: newVars });
    setIsVarModalOpen(false);
  };

  // ── RELATIONSHIPS CRUD ──────────────────────────────────────────

  const handleAddRelClick = () => {
    setEditingRel({ id: `e_${Date.now()}`, source: '', target: '', type: 'information', polarity: '+' });
    setIsRelModalOpen(true);
  };

  const handleDeleteRel = (id) => {
    if (!window.confirm("Yakin ingin menghapus hubungan ini?")) return;
    const newRels = modelData.relationships.filter(r => r.id !== id);
    saveAndApply({ ...modelData, relationships: newRels });
  };

  const handleSaveRel = () => {
    if (!editingRel.source || !editingRel.target) return alert("Source dan Target harus dipilih");
    if (editingRel.source === editingRel.target) return alert("Variabel tidak bisa terhubung ke dirinya sendiri");
    
    let newRels = [...modelData.relationships];
    const exists = newRels.findIndex(r => r.id === editingRel.id);
    if (exists >= 0) {
      newRels[exists] = editingRel;
    } else {
      newRels.push(editingRel);
    }
    saveAndApply({ ...modelData, relationships: newRels });
    setIsRelModalOpen(false);
  };

  const getVarName = (id) => modelData.variables.find(v => v.id === id)?.name || id;

  const tabs = [
    { id: 'variabel', label: 'Variabel Model' },
    { id: 'hubungan', label: 'Hubungan Variabel' },
    { id: 'formulasi', label: 'Formulasi Matematis' },
    { id: 'cld', label: 'CLD Diagram' },
    { id: 'sfd', label: 'SFD Diagram' }
  ];

  return (
    <div className="space-y-6 md:space-y-8 animate-fade-in p-4 md:p-6 print:p-0">
      
      {/* Page Header */}
      <div className="border-b border-brand-grayMedium pb-4 print:hidden flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-800 tracking-tight flex items-center gap-2">
            <Layers className="text-brand-navy h-6 w-6" />
            Manajemen & Builder Model
          </h2>
          <p className="text-sm text-brand-grayDark mt-1">
            Kelola variabel, hubungan, dan lihat diagram model (CLD & SFD) yang di-generate secara otomatis.
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
            onClick={handleResetDefault} 
            className="px-3 py-1.5 bg-slate-500 hover:bg-slate-600 text-white rounded-lg text-xs font-bold inline-flex items-center gap-1 transition-colors"
          >
            <RotateCcw size={14} /> Reset Model Default
          </button>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex space-x-1 border-b border-slate-200 overflow-x-auto hide-scrollbar pb-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2.5 text-sm font-bold whitespace-nowrap transition-colors ${
              activeTab === tab.id
                ? 'text-brand-navy border-b-2 border-brand-navy'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB CONTENT: Variabel Model */}
      {activeTab === 'variabel' && (
        <Card 
          title="Daftar Variabel Model" 
          subtitle="Manajemen dan spesifikasi variabel sistem"
          headerAction={
            <button onClick={handleAddVarClick} className="px-3 py-1.5 bg-brand-navy text-white hover:bg-brand-navy/90 rounded-lg text-xs font-bold inline-flex items-center gap-1 transition-colors">
              <Plus size={14} /> Tambah Variabel
            </button>
          }
        >
          <div className="overflow-x-auto border border-brand-grayMedium rounded-xl bg-slate-50 p-2">
            <table className="w-full text-left text-xs border-collapse min-w-[700px]">
              <thead>
                <tr className="border-b border-brand-grayMedium text-brand-navy font-bold">
                  <th className="py-2.5 px-4 w-[20%]">Nama Variabel</th>
                  <th className="py-2.5 px-4 w-[15%]">Tipe Variabel</th>
                  <th className="py-2.5 px-4 w-[45%]">Formulasi Matematis</th>
                  <th className="py-2.5 px-4 w-[20%] text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-grayMedium text-slate-600 font-medium">
                {modelData.variables.filter(v => v.type !== 'Loop').map((v) => (
                  <tr key={v.id} className="hover:bg-white transition-colors">
                    <td className="py-3 px-4 text-slate-900 font-bold">{v.name}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase ${
                        v.type === 'Stock' ? 'bg-brand-navy text-white' :
                        v.type === 'Flow' ? 'bg-brand-accent text-white' :
                        v.type === 'Auxiliary' ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-700'
                      }`}>
                        {v.type}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-700 break-all">{v.formula}</td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button onClick={() => handleEditVarClick(v)} className="px-2.5 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg text-[10px] font-bold inline-flex items-center gap-1 transition-colors">
                          <Edit3 size={12} /> Edit
                        </button>
                        <button onClick={() => handleDeleteVar(v.id)} className="px-2.5 py-1.5 bg-red-50 text-red-700 hover:bg-red-100 rounded-lg text-[10px] font-bold inline-flex items-center gap-1 transition-colors">
                          <Trash2 size={12} /> Hapus
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* TAB CONTENT: Hubungan */}
      {activeTab === 'hubungan' && (
        <Card 
          title="Hubungan Antar Variabel" 
          subtitle="Tentukan panah koneksi antar variabel untuk menggambar diagram"
          headerAction={
            <button onClick={handleAddRelClick} className="px-3 py-1.5 bg-brand-navy text-white hover:bg-brand-navy/90 rounded-lg text-xs font-bold inline-flex items-center gap-1 transition-colors">
              <Plus size={14} /> Tambah Hubungan
            </button>
          }
        >
          <div className="overflow-x-auto border border-brand-grayMedium rounded-xl bg-slate-50 p-2">
            <table className="w-full text-left text-xs border-collapse min-w-[700px]">
              <thead>
                <tr className="border-b border-brand-grayMedium text-brand-navy font-bold">
                  <th className="py-2.5 px-4">Dari Variabel (Source)</th>
                  <th className="py-2.5 px-4 text-center">Arah</th>
                  <th className="py-2.5 px-4">Ke Variabel (Target)</th>
                  <th className="py-2.5 px-4 text-center">Tipe Koneksi</th>
                  <th className="py-2.5 px-4 text-center">Polaritas</th>
                  <th className="py-2.5 px-4 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-grayMedium text-slate-600 font-medium">
                {modelData.relationships.filter(r => r.type !== 'invisible').map((r) => (
                  <tr key={r.id} className="hover:bg-white transition-colors">
                    <td className="py-3 px-4 font-bold text-slate-800">{getVarName(r.source)}</td>
                    <td className="py-3 px-4 text-center text-brand-accent"><GitMerge size={14} className="mx-auto" /></td>
                    <td className="py-3 px-4 font-bold text-slate-800">{getVarName(r.target)}</td>
                    <td className="py-3 px-4 text-center">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${r.type === 'physical' ? 'bg-slate-800 text-white' : 'bg-blue-100 text-blue-800'}`}>
                        {r.type === 'physical' ? 'Aliran Fisik' : 'Informasi'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      {r.polarity && (
                        <span className={`px-2 py-0.5 rounded font-bold ${r.polarity === '+' ? 'text-emerald-600 bg-emerald-50' : 'text-red-600 bg-red-50'}`}>
                          {r.polarity}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button onClick={() => handleDeleteRel(r.id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded transition-colors">
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
                {modelData.relationships.filter(r => r.type !== 'invisible').length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-slate-500 italic">Belum ada hubungan yang didefinisikan.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* TAB CONTENT: Formulasi */}
      {activeTab === 'formulasi' && (
        <Card 
          title="Manajemen Formulasi Matematis" 
          subtitle="Edit persamaan diferensial dan aljabar secara langsung"
        >
          <div className="overflow-x-auto border border-brand-grayMedium rounded-xl bg-slate-50 p-2">
            <table className="w-full text-left text-xs border-collapse min-w-[700px]">
              <thead>
                <tr className="border-b border-brand-grayMedium text-brand-navy font-bold">
                  <th className="py-2.5 px-4 w-[25%]">Nama Variabel</th>
                  <th className="py-2.5 px-4 w-[55%]">Formulasi Matematis</th>
                  <th className="py-2.5 px-4 w-[20%] text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-grayMedium text-slate-600 font-medium">
                {modelData.variables.filter(v => v.type !== 'Loop').map((v) => {
                  const isInlineEditing = inlineEditingId === v.id;
                  
                  return (
                    <tr key={v.id} className="hover:bg-white transition-colors">
                      <td className="py-3 px-4 text-slate-900 font-bold align-top pt-4">
                        {v.name}
                        <span className="block mt-1 text-[9px] font-normal text-slate-500 bg-slate-200 inline-block px-1.5 py-0.5 rounded">{v.type}</span>
                      </td>
                      <td className="py-3 px-4">
                        {isInlineEditing ? (
                          <textarea
                            className="w-full bg-white border border-brand-navy rounded-lg p-2 font-mono text-xs shadow-inner focus:outline-none focus:ring-2 focus:ring-brand-navy/20 min-h-[80px]"
                            value={inlineFormula}
                            onChange={(e) => setInlineFormula(e.target.value)}
                          />
                        ) : (
                          <div className="font-mono text-[11px] text-slate-700 break-all bg-white p-2 rounded border border-slate-200">
                            {v.formula || '0'}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center align-top pt-4">
                        {isInlineEditing ? (
                          <div className="flex flex-col gap-1.5 items-center justify-center">
                            <button
                              onClick={() => {
                                const newVars = modelData.variables.map(varItem => varItem.id === v.id ? { ...varItem, formula: inlineFormula } : varItem);
                                saveAndApply({ ...modelData, variables: newVars });
                                setInlineEditingId(null);
                              }}
                              className="px-3 py-1.5 w-full bg-brand-navy text-white hover:bg-brand-navy/90 rounded-md text-[10px] font-bold flex items-center justify-center gap-1 transition-colors"
                            >
                              <Save size={12} /> Simpan
                            </button>
                            <button
                              onClick={() => setInlineEditingId(null)}
                              className="px-3 py-1.5 w-full bg-slate-200 text-slate-700 hover:bg-slate-300 rounded-md text-[10px] font-bold flex items-center justify-center gap-1 transition-colors"
                            >
                              <X size={12} /> Batal
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => {
                              setInlineEditingId(v.id);
                              setInlineFormula(v.formula);
                            }}
                            className="px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-md text-[10px] font-bold flex items-center justify-center gap-1 transition-colors mx-auto"
                          >
                            <Edit3 size={12} /> Edit
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* TAB CONTENT: CLD */}
      {activeTab === 'cld' && (
        <Card 
          title="Causal Loop Diagram (CLD)" 
          subtitle="Diagram ini digambar secara otomatis berdasarkan variabel dan hubungan informasi yang Anda buat"
        >
          <CausalLoopDiagram variables={modelData.variables} relationships={modelData.relationships} />
        </Card>
      )}

      {/* TAB CONTENT: SFD */}
      {activeTab === 'sfd' && (
        <Card 
          title="Stock Flow Diagram (SFD)" 
          subtitle="Diagram otomatis model fisik dengan node Stock (kotak) dan Flow (katup pipa)"
        >
          <StockFlowDiagram variables={modelData.variables} relationships={modelData.relationships} />
        </Card>
      )}

      {/* MODAL: EDIT/ADD VARIABLE */}
      {isVarModalOpen && editingVar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden border border-slate-200">
            <div className="flex justify-between items-center p-5 border-b border-slate-100">
              <h3 className="font-extrabold text-slate-800 flex items-center gap-2">
                <Edit3 size={18} className="text-brand-navy" />
                {editingVar.name ? `Edit Variabel: ${editingVar.name}` : 'Tambah Variabel Baru'}
              </h3>
              <button onClick={() => setIsVarModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-5 space-y-4">
              <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg flex items-start gap-3">
                <AlertCircle size={16} className="text-blue-600 shrink-0 mt-0.5" />
                <p className="text-[11px] text-blue-800 leading-relaxed">
                  Gunakan standar penulisan Vensim: <strong>INTEG</strong>, <strong>STEP</strong>, <strong>MIN</strong>, <strong>MAX</strong>. Penjumlahan/pengurangan menggunakan <code>+</code> dan <code>-</code>. Perkalian menggunakan <code>*</code> dan pembagian <code>/</code>. Pangkat menggunakan <code>^</code>.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-700">Nama Variabel</label>
                <input 
                  type="text" 
                  value={editingVar.name}
                  onChange={(e) => setEditingVar({...editingVar, name: e.target.value})}
                  placeholder="Misal: Biaya Produksi"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-semibold focus:outline-none focus:border-brand-navy transition-colors"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-700">Tipe Variabel</label>
                <select
                  value={editingVar.type}
                  onChange={(e) => setEditingVar({...editingVar, type: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-semibold focus:outline-none focus:border-brand-navy transition-colors"
                >
                  <option value="Stock">Stock (Kotak)</option>
                  <option value="Flow">Flow (Aliran Katup)</option>
                  <option value="Auxiliary">Auxiliary (Variabel Dinamis)</option>
                  <option value="Parameter">Parameter (Konstanta Tetap)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-700">Formulasi Matematis</label>
                <textarea 
                  rows={4}
                  value={editingVar.formula}
                  onChange={(e) => setEditingVar({...editingVar, formula: e.target.value})}
                  placeholder="Masukkan formula simulasi..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-mono focus:outline-none focus:border-brand-navy transition-colors"
                />
              </div>
            </div>

            <div className="p-5 bg-slate-50 border-t border-slate-100 flex justify-end gap-2">
              <button onClick={() => setIsVarModalOpen(false)} className="px-4 py-2 font-bold text-xs text-slate-600 hover:bg-slate-200 rounded-xl transition-colors">
                Batal
              </button>
              <button onClick={handleSaveVar} className="px-4 py-2 bg-brand-navy hover:bg-brand-navy/90 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-md transition-colors">
                <Save size={14} /> Simpan Variabel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: EDIT/ADD RELATIONSHIP */}
      {isRelModalOpen && editingRel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-slate-200">
            <div className="flex justify-between items-center p-5 border-b border-slate-100">
              <h3 className="font-extrabold text-slate-800">Tambah Hubungan</h3>
              <button onClick={() => setIsRelModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-5 space-y-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-700">Dari Variabel (Source)</label>
                <select
                  value={editingRel.source}
                  onChange={(e) => setEditingRel({...editingRel, source: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-semibold focus:outline-none focus:border-brand-navy transition-colors"
                >
                  <option value="" disabled>Pilih variabel asal...</option>
                  {modelData.variables.filter(v => v.type !== 'Loop').map(v => (
                    <option key={v.id} value={v.id}>{v.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-700">Ke Variabel (Target)</label>
                <select
                  value={editingRel.target}
                  onChange={(e) => setEditingRel({...editingRel, target: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-semibold focus:outline-none focus:border-brand-navy transition-colors"
                >
                  <option value="" disabled>Pilih variabel tujuan...</option>
                  {modelData.variables.filter(v => v.type !== 'Loop').map(v => (
                    <option key={v.id} value={v.id}>{v.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-700">Tipe Aliran Diagram (SFD)</label>
                <select
                  value={editingRel.type}
                  onChange={(e) => setEditingRel({...editingRel, type: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-semibold focus:outline-none focus:border-brand-navy transition-colors"
                >
                  <option value="information">Aliran Informasi (Panah Biru Melengkung)</option>
                  <option value="physical">Aliran Fisik (Pipa Lurus Hitam)</option>
                </select>
                <p className="text-[10px] text-slate-500 mt-1">Gunakan Aliran Fisik HANYA untuk menghubungkan Stock dan Flow.</p>
              </div>

              {editingRel.type === 'information' && (
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-700">Polaritas (Pengaruh)</label>
                  <select
                    value={editingRel.polarity || '+'}
                    onChange={(e) => setEditingRel({...editingRel, polarity: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-semibold focus:outline-none focus:border-brand-navy transition-colors"
                  >
                    <option value="+">Positif (+)</option>
                    <option value="-">Negatif (-)</option>
                  </select>
                </div>
              )}
            </div>

            <div className="p-5 bg-slate-50 border-t border-slate-100 flex justify-end gap-2">
              <button onClick={() => setIsRelModalOpen(false)} className="px-4 py-2 font-bold text-xs text-slate-600 hover:bg-slate-200 rounded-xl transition-colors">
                Batal
              </button>
              <button onClick={handleSaveRel} className="px-4 py-2 bg-brand-navy hover:bg-brand-navy/90 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-md transition-colors">
                <Save size={14} /> Simpan Hubungan
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
