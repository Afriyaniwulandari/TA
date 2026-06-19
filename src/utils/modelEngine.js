export const DEFAULT_MODEL_DATA = {
  variables: [
    { id: "v_stok", name: "Stok Garam", type: "Stock", desc: "", formula: "INTEG(Produksi Garam - Distribusi, 19059.5)" },
    { id: "v_produksi", name: "Produksi Garam", type: "Flow", desc: "", formula: "Luas Lahan * Produktivitas" },
    { id: "v_distribusi", name: "Distribusi", type: "Flow", desc: "", formula: "MIN(Permintaan, Stok Garam + Produksi Garam)" },
    { id: "v_harga", name: "Harga", type: "Auxiliary", desc: "", formula: "Harga Referensi * (Permintaan / 116859) * ((Harga Impor / 728) / (((MAX(Stok Garam,1)) / 19059.5) * (Impor / 0.98)))^1.655" },
    { id: "v_pendapatan", name: "Pendapatan Petani", type: "Auxiliary", desc: "", formula: "MIN(Harga / Harga Referensi, 1)" },
    { id: "v_hargaref", name: "Harga Referensi", type: "Parameter", desc: "", formula: "767 + STEP(1481,2025)" },
    { id: "v_impor", name: "Impor", type: "Parameter", desc: "", formula: "0.98 + STEP(-0.37,2025)" },
    { id: "v_hargaimpor", name: "Harga Impor", type: "Parameter", desc: "", formula: "728 + STEP(48,2025)" },
    { id: "v_produktivitas", name: "Produktivitas", type: "Auxiliary", desc: "", formula: "122.96 * (Teknologi / 0.913) * ((1 - Curah Hujan) / (1 - 0.18)) * Faktor Musim" },
    { id: "v_pemerintah", name: "Peran Pemerintah", type: "Parameter", desc: "", formula: "0.913 + STEP(0.084,2025)" },
    { id: "v_teknologi", name: "Teknologi", type: "Auxiliary", desc: "", formula: "Peran Pemerintah" },
    { id: "v_permintaan", name: "Permintaan", type: "Parameter", desc: "", formula: "116859 + STEP(116859 * (-0.48),2025) + STEP(-18000,2026)" },
    { id: "v_musim", name: "Faktor Musim", type: "Parameter", desc: "", formula: "1 + STEP(-0.576,2025)" },
    { id: "v_lahan", name: "Luas Lahan", type: "Parameter", desc: "", formula: "973.6 + STEP(-13.9,2025)" },
    { id: "v_hujan", name: "Curah Hujan", type: "Parameter", desc: "", formula: "0.18 + STEP(0.18,2025)" },
    
    // Explicit Loop nodes (text only for diagram)
    { id: "l_r1", name: "R1", type: "Loop", desc: "", formula: "" },
    { id: "l_r2", name: "R2", type: "Loop", desc: "", formula: "" },
    { id: "l_b1", name: "B1", type: "Loop", desc: "", formula: "" },
    { id: "l_b2", name: "B2", type: "Loop", desc: "", formula: "" },
    { id: "l_b3", name: "B3", type: "Loop", desc: "", formula: "" },
  ],
  relationships: [
    // Physical Flows
    { id: "e_prod_stok", source: "v_produksi", target: "v_stok", type: "physical" },
    { id: "e_stok_dist", source: "v_stok", target: "v_distribusi", type: "physical" },

    // Information Flows (Dependencies with polarity)
    { id: "e_lahan_prod", source: "v_lahan", target: "v_produksi", type: "information", polarity: "+" },
    { id: "e_prodv_prod", source: "v_produktivitas", target: "v_produksi", type: "information", polarity: "+" },
    { id: "e_pemerintah_tek", source: "v_pemerintah", target: "v_teknologi", type: "information", polarity: "+" },
    { id: "e_tek_prodv", source: "v_teknologi", target: "v_produktivitas", type: "information", polarity: "+" },
    { id: "e_hujan_prodv", source: "v_hujan", target: "v_produktivitas", type: "information", polarity: "-" },
    { id: "e_musim_prodv", source: "v_musim", target: "v_produktivitas", type: "information", polarity: "+" },
    
    { id: "e_stok_harga", source: "v_stok", target: "v_harga", type: "information", polarity: "-" },
    { id: "e_harga_pend", source: "v_harga", target: "v_pendapatan", type: "information", polarity: "+" },
    { id: "e_pend_prod", source: "v_pendapatan", target: "v_produksi", type: "information", polarity: "+" },
    
    { id: "e_permintaan_harga", source: "v_permintaan", target: "v_harga", type: "information", polarity: "+" },
    { id: "e_impor_harga", source: "v_impor", target: "v_harga", type: "information", polarity: "-" },
    { id: "e_himpor_harga", source: "v_hargaimpor", target: "v_harga", type: "information", polarity: "+" },
    { id: "e_href_harga", source: "v_hargaref", target: "v_harga", type: "information", polarity: "+" },
    { id: "e_href_pend", source: "v_hargaref", target: "v_pendapatan", type: "information", polarity: "-" },
    
    { id: "e_stok_dist2", source: "v_stok", target: "v_distribusi", type: "information", polarity: "+" },
    { id: "e_prod_dist", source: "v_produksi", target: "v_distribusi", type: "information", polarity: "+" },
    { id: "e_perm_dist", source: "v_permintaan", target: "v_distribusi", type: "information", polarity: "+" },
    
    // Links to loop labels just for layout positioning
    { id: "e_r1", source: "v_pemerintah", target: "l_r1", type: "invisible" },
    { id: "e_r2", source: "v_pendapatan", target: "l_r2", type: "invisible" },
    { id: "e_b1", source: "v_produksi", target: "l_b1", type: "invisible" },
    { id: "e_b2", source: "v_stok", target: "l_b2", type: "invisible" },
    { id: "e_b3", source: "v_harga", target: "l_b3", type: "invisible" },
  ]
};

export const parseFormula = (formula) => {
  let parsed = formula
    .replace(/×/g, '*')
    .replace(/–/g, '-')
    .replace(/\^/g, '**') 
    .replace(/MAX/g, 'Math.max')
    .replace(/MIN/g, 'Math.min');

  parsed = parsed.replace(/STEP\(([^,]+),\s*([^)]+)\)/g, '(year >= $2 ? ($1) : 0)');

  return parsed;
};

export const createEvaluator = (parsedFormula, varMap) => {
  const varNames = Object.keys(varMap);
  const args = ['year', ...varNames.map(name => name.replace(/ /g, '_'))];
  
  let safeFormula = parsedFormula;
  const sortedNames = [...varNames].sort((a,b) => b.length - a.length);

  for (const name of sortedNames) {
    const safeName = name.replace(/ /g, '_');
    safeFormula = safeFormula.split(name).join(safeName);
  }

  try {
    return new Function(...args, `return ${safeFormula};`);
  } catch (e) {
    console.error("Error parsing formula:", safeFormula, e);
    return () => 0; 
  }
};

export const getModelData = () => {
  const saved = localStorage.getItem('dynasalt_model_data_v2');
  if (saved) {
    return JSON.parse(saved);
  }
  return DEFAULT_MODEL_DATA;
};

export const saveModelData = (data) => {
  localStorage.setItem('dynasalt_model_data_v2', JSON.stringify(data));
};

export const runDynamicSimulation = (variables, interventions) => {
  const rows = [];
  const debug = [];
  
  // Filter out loops
  const vars = variables.filter(v => v.type !== 'Loop');
  
  const formulaMap = {};
  vars.forEach(v => {
    formulaMap[v.name] = v.formula;
  });

  let stockVarName = "Stok Garam";
  const stockVar = vars.find(v => v.type === "Stock" || v.id === "v_stok");
  if (stockVar) {
    stockVarName = stockVar.name;
  }

  let stokNow = 19059.5;
  const stockMatch = formulaMap[stockVarName]?.match(/INTEG\([^,]+,\s*([^)]+)\)/);
  if (stockMatch) {
    stokNow = parseFloat(stockMatch[1]) || 19059.5;
  }

  const dependencies = {};
  const allNames = vars.map(v => v.name);
  
  vars.forEach(v => {
    dependencies[v.name] = [];
    allNames.forEach(depName => {
      if (v.name !== depName && v.formula.includes(depName)) {
        if (depName !== stockVarName) {
          dependencies[v.name].push(depName);
        }
      }
    });
  });

  const order = [];
  const visited = {};
  
  const visit = (name) => {
    if (visited[name] === true) return;
    if (visited[name] === 'visiting') return; 
    visited[name] = 'visiting';
    if (dependencies[name]) {
      dependencies[name].forEach(dep => visit(dep));
    }
    visited[name] = true;
    if (name !== stockVarName) {
      order.push(name);
    }
  };

  allNames.forEach(name => visit(name));

  for (let year = 2024; year <= 2027; year++) {
    const context = {
      [stockVarName]: stokNow
    };

    allNames.forEach(n => {
      if (context[n] === undefined) context[n] = 0;
    });

    order.forEach(name => {
      let rawFormula = formulaMap[name] || "0";
      const varId = vars.find(v => v.name === name)?.id;
      
      if (year >= 2026) {
        if (varId === 'v_pemerintah' && interventions.intervensiPeranPemerintah !== undefined) {
          rawFormula = `(${rawFormula}) + ${interventions.intervensiPeranPemerintah}`;
        }
        if (varId === 'v_musim' && interventions.intervensiFaktorMusim !== undefined) {
          rawFormula = `(${rawFormula}) + ${interventions.intervensiFaktorMusim}`;
        }
        if (varId === 'v_hujan' && interventions.intervensiCurahHujan !== undefined) {
          rawFormula = `(${rawFormula}) + ${interventions.intervensiCurahHujan}`;
        }
        if (varId === 'v_lahan' && interventions.intervensiLuasLahan !== undefined) {
          rawFormula = `(${rawFormula}) + ${interventions.intervensiLuasLahan}`;
        }
        if (varId === 'v_impor' && interventions.intervensiImpor !== undefined) {
          rawFormula = `(${rawFormula}) + ${interventions.intervensiImpor}`;
        }
        if (varId === 'v_permintaan' && interventions.intervensiPermintaan !== undefined) {
          rawFormula = `(${rawFormula}) + ${interventions.intervensiPermintaan}`;
        }
        if (varId === 'v_hargaref' && interventions.intervensiHargaReferensi !== undefined) {
          rawFormula = `(${rawFormula}) + ${interventions.intervensiHargaReferensi}`;
        }
        if (varId === 'v_hargaimpor' && interventions.intervensiHargaImpor !== undefined) {
          rawFormula = `(${rawFormula}) + ${interventions.intervensiHargaImpor}`;
        }
      }

      const parsed = parseFormula(rawFormula);
      const evaluator = createEvaluator(parsed, context);
      
      const args = [year, ...Object.keys(context).map(k => context[k])];
      let val = 0;
      try {
        val = evaluator(...args);
      } catch (e) {
        console.error(`Error executing formula for ${name}:`, e);
      }
      context[name] = val;
    });

    const flowInName = vars.find(v => v.id === "v_produksi")?.name || "Produksi Garam";
    const flowOutName = vars.find(v => v.id === "v_distribusi")?.name || "Distribusi";
    const priceName = vars.find(v => v.id === "v_harga")?.name || "Harga";
    const incomeName = vars.find(v => v.id === "v_pendapatan")?.name || "Pendapatan Petani";

    rows.push({
      tahun: year,
      stokGaram: stokNow, 
      produksiGaram: context[flowInName] || 0,
      distribusi: context[flowOutName] || 0,
      harga: context[priceName] || 0,
      pendapatanPetani: context[incomeName] || 0,
    });

    debug.push({
      tahun: year,
      ...context
    });

    stokNow = stokNow + (context[flowInName] || 0) - (context[flowOutName] || 0);
  }

  return { rows, debug };
};

export const getUnrecognizedIdentifiers = (formula, activeVariables) => {
  if (!formula) return [];
  
  let temp = formula;
  
  // Sort active variables by length desc and replace them with space
  const sortedActive = [...activeVariables].sort((a, b) => b.name.length - a.name.length);
  for (const v of sortedActive) {
    const escapedName = v.name.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    const regex = new RegExp(`(?<![a-zA-Z0-9_])${escapedName}(?![a-zA-Z0-9_])`, 'g');
    temp = temp.replace(regex, ' ');
  }
  
  // Replace standard Vensim/JS functions and variables
  const reserved = ['INTEG', 'STEP', 'MIN', 'MAX', 'Math', 'max', 'min', 'year'];
  for (const word of reserved) {
    const regex = new RegExp(`(?<![a-zA-Z0-9_])${word}(?![a-zA-Z0-9_])`, 'g');
    temp = temp.replace(regex, ' ');
  }
  
  // Replace all non-alphanumeric characters (excluding spaces and underscores)
  temp = temp.replace(/[^a-zA-Z0-9_ ]/g, ' ');
  
  // Split by whitespace
  const words = temp.split(/\s+/).map(w => w.trim()).filter(w => w.length > 0);
  
  // Filter out pure numbers
  const identifiers = words.filter(w => isNaN(w));
  
  // Remove duplicates
  return [...new Set(identifiers)];
};

export const validateModel = (modelData) => {
  if (!modelData || !modelData.variables) {
    return { isValid: true, errors: [] };
  }
  
  const activeVars = modelData.variables.filter(v => v.type !== 'Loop');
  const errors = [];
  
  activeVars.forEach(v => {
    if (!v.formula) return;
    
    const unrecognized = getUnrecognizedIdentifiers(v.formula, activeVars);
    if (unrecognized.length > 0) {
      errors.push({
        variableId: v.id,
        variableName: v.name,
        formula: v.formula,
        missingVariables: unrecognized
      });
    }
  });
  
  return {
    isValid: errors.length === 0,
    errors
  };
};
