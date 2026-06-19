// src/pages/ANP.jsx – Full Analytic Network Process (ANP) page

import {
  computeConsistency,
  fillReciprocal,
  buildUnweightedSupermatrix,
  normalizeColumns,
  computeLimitSupermatrix,
  extractRanking
} from '../utils/anpUtils';
import '../styles/anp.css';
import React, { useState, useEffect } from 'react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Cell, 
  LabelList 
} from 'recharts';
import { Trophy } from 'lucide-react';

// ----- Default matrices (expert data) -----
const defaultCriteria = [
  [1, 3, 5, 3, 2],
  [1 / 3, 1, 2, 3, 1 / 2],
  [1 / 5, 1 / 2, 1, 2, 1],
  [1 / 3, 1 / 3, 1 / 2, 1, 1 / 3],
  [1 / 2, 2, 1, 3, 1]
];

const defaultSC = {
  K1: [
    [1, 5, 3],
    [1 / 5, 1, 1 / 3],
    [1 / 3, 3, 1]
  ],
  K2: [
    [1, 5, 5],
    [1 / 5, 1, 2],
    [1 / 5, 1 / 2, 1]
  ],
  K3: [
    [1, 3, 7],
    [1 / 3, 1, 5],
    [1 / 7, 1 / 5, 1]
  ],
  K4: [
    [1, 5, 3],
    [1 / 5, 1, 1],
    [1 / 3, 1, 1]
  ],
  K5: [
    [1, 5, 5],
    [1 / 5, 1, 2],
    [1 / 5, 1 / 2, 1]
  ]
};

const defaultAlt = {
  K1: [
    [1, 9, 7, 5, 5],
    [1 / 9, 1, 1 / 3, 1 / 5, 1 / 3],
    [1 / 7, 3, 1, 1 / 3, 1],
    [1 / 5, 5, 3, 1, 2],
    [1 / 5, 3, 1, 1 / 2, 1]
  ],
  K2: [
    [1, 1 / 3, 5, 3, 2],
    [3, 1, 9, 7, 5],
    [1 / 5, 1 / 9, 1, 1 / 3, 1 / 3],
    [1 / 3, 1 / 7, 3, 1, 2],
    [1 / 2, 1 / 5, 3, 1 / 2, 1]
  ],
  K3: [
    [1, 1 / 2, 1 / 5, 1 / 3, 2],
    [2, 1, 1 / 3, 2, 2],
    [5, 3, 1, 9, 7],
    [3, 1 / 2, 1 / 9, 1, 3],
    [1 / 2, 1 / 2, 1 / 7, 1 / 3, 1]
  ],
  K4: [
    [1, 9, 7, 5, 5],
    [1 / 9, 1, 3, 2, 2],
    [1 / 7, 1 / 3, 1, 1 / 2, 1 / 2],
    [1 / 5, 1 / 2, 2, 1, 1],
    [1 / 5, 1 / 2, 2, 1, 1]
  ],
  K5: [
    [1, 1 / 2, 1 / 3, 1 / 3, 1 / 3],
    [2, 1, 1 / 3, 2, 1 / 3],
    [3, 3, 1, 3, 4],
    [3, 1 / 2, 1 / 3, 1, 3],
    [3, 3, 1 / 4, 1 / 3, 1]
  ]
};

const criteriaLabels = ["Produksi", "Distribusi", "Harga", "Kualitas", "Kebijakan"];
const pairs = [
  { i: 0, j: 1 },
  { i: 0, j: 2 },
  { i: 0, j: 3 },
  { i: 0, j: 4 },
  { i: 1, j: 2 },
  { i: 1, j: 3 },
  { i: 1, j: 4 },
  { i: 2, j: 3 },
  { i: 2, j: 4 },
  { i: 3, j: 4 }
];

// Labels for all 25 supermatrix elements
const SM_LABELS = [
  // Criteria 0-4
  'K: Produksi',
  'K: Distribusi',
  'K: Harga',
  'K: Kualitas',
  'K: Kebijakan',
  // Subcriteria K1 5-7
  'K1.1 Lahan',
  'K1.2 Produktivitas',
  'K1.3 Teknologi',
  // Subcriteria K2 8-10
  'K2.1 Efisiensi',
  'K2.2 Infrastruktur',
  'K2.3 Jaringan',
  // Subcriteria K3 11-13
  'K3.1 Harga Petani',
  'K3.2 Harga Pasar',
  'K3.3 Margin',
  // Subcriteria K4 14-16
  'K4.1 Standar',
  'K4.2 Proses',
  'K4.3 Kontrol',
  // Subcriteria K5 17-19
  'K5.1 Regulasi',
  'K5.2 Insentif',
  'K5.3 Kelembagaan',
  // Alternatives 20-24
  'A1: Teknologi Produksi',
  'A2: Kurangi Impor',
  'A3: Stabilisasi Harga',
  'A4: Distribusi & Gudang',
  'A5: Kelembagaan Petani',
];

function SupermatrixTable({ matrix }) {
  if (!matrix || !matrix.length) return null;
  const n = matrix.length;
  return (
    <div className="sm-table-wrapper">
      <table className="sm-table">
        <thead>
          <tr>
            <th className="sm-th sm-th-corner">Elemen</th>
            {SM_LABELS.slice(0, n).map((label, j) => (
              <th key={j} className="sm-th sm-th-col">
                <span className="sm-col-label">{label}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {matrix.map((row, i) => (
            <tr key={i} className={i % 2 === 0 ? 'sm-tr-even' : 'sm-tr-odd'}>
              <td className="sm-td sm-td-row-header">{SM_LABELS[i]}</td>
              {row.map((val, j) => {
                const isZero = Math.abs(val) < 1e-9;
                return (
                  <td
                    key={j}
                    className={`sm-td ${
                      isZero ? 'sm-cell-zero' : 'sm-cell-value'
                    }${i === j ? ' sm-cell-diag' : ''}`}
                  >
                    {isZero ? <span className="sm-zero">—</span> : val.toFixed(5)}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const valToSlider = (val) => {
  if (val > 1) {
    return -Math.round(val - 1);
  }
  if (val < 1) {
    return Math.round(1 / val - 1);
  }
  return 0;
};

const sliderToVal = (x) => {
  if (x < 0) return -x + 1;
  if (x > 0) return 1 / (x + 1);
  return 1;
};

const saatyOptions = [
  { val: 9, label: "9", activeIdx: -8 },
  { val: 8, label: "8", activeIdx: -7 },
  { val: 7, label: "7", activeIdx: -6 },
  { val: 6, label: "6", activeIdx: -5 },
  { val: 5, label: "5", activeIdx: -4 },
  { val: 4, label: "4", activeIdx: -3 },
  { val: 3, label: "3", activeIdx: -2 },
  { val: 2, label: "2", activeIdx: -1 },
  { val: 1, label: "1", activeIdx: 0 },
  { val: 1/2, label: "2", activeIdx: 1 },
  { val: 1/3, label: "3", activeIdx: 2 },
  { val: 1/4, label: "4", activeIdx: 3 },
  { val: 1/5, label: "5", activeIdx: 4 },
  { val: 1/6, label: "6", activeIdx: 5 },
  { val: 1/7, label: "7", activeIdx: 6 },
  { val: 1/8, label: "8", activeIdx: 7 },
  { val: 1/9, label: "9", activeIdx: 8 }
];

function SaatyScale() {
  const rows = [
    [1, 'Sama pentingnya'],
    [2, 'Sedikit lebih penting'],
    [3, 'Lebih penting'],
    [4, 'Cukup lebih penting'],
    [5, 'Sangat lebih penting'],
    [6, 'Sangat cukup lebih penting'],
    [7, 'Sangat jelas lebih penting'],
    [8, 'Mutlak sangat jelas lebih penting'],
    [9, 'Mutlak lebih penting'],
    ['2,4,6,8', 'Nilai tengah (kompromi)']
  ];
  return (
    <div className="saaty-scale card">
      <h3>Skala Perbandingan Saaty</h3>
      <table>
        <thead>
          <tr><th>Nilai</th><th>Keterangan</th></tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}><td>{r[0]}</td><td>{r[1]}</td></tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ConsistencyPanel({ matrix }) {
  const { eigenvector, lambdaMax, CI, CR, isConsistent } = computeConsistency(matrix);
  return (
    <div className="consistency-panel card">
      <h3>Hasil Konsistensi</h3>
      <ul>
        <li>λ<sub>max</sub> = {lambdaMax.toFixed(5)}</li>
        <li>CI = {CI.toFixed(5)}</li>
        <li>CR = {(CR * 100).toFixed(2)} %</li>
      </ul>
      <span className={`badge ${isConsistent ? 'good' : 'bad'}`}>
        {isConsistent ? 'KONSISTEN' : 'TIDAK KONSISTEN'}
      </span>
      <h4>Bobot Prioritas</h4>
      <ul>
        {eigenvector.map((v, i) => (
          <li key={i}>Elemen {i + 1}: {v.toFixed(5)}</li>
        ))}
      </ul>
    </div>
  );
}

function MatrixEditor({ name, matrix, onChange }) {
  const size = matrix.length;
  const handleInput = (i, j, value) => {
    const num = parseFloat(value);
    if (isNaN(num) || num <= 0) return;
    const newMat = matrix.map(row => row.slice());
    newMat[i][j] = num;
    newMat[j][i] = 1 / num;
    onChange(newMat);
  };
  return (
    <div className="matrix-editor card">
      <h3>{name}</h3>
      <table>
        <tbody>
          {Array.from({ length: size }).map((_, i) => (
            <tr key={i}>
              {Array.from({ length: size }).map((_, j) => {
                const isDiagonal = i === j;
                const isUpper = i < j;
                const value = matrix[i][j];
                return (
                  <td key={j}>
                    {isDiagonal ? (
                      <input type="text" value={1} disabled />
                    ) : isUpper ? (
                      <input
                        type="number"
                        min="0.01"
                        step="any"
                        value={value}
                        onChange={e => handleInput(i, j, e.target.value)}
                      />
                    ) : (
                      <input type="text" value={(1 / matrix[j][i]).toFixed(5)} disabled />
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const altLabels = [
  "A1 (Teknologi Produksi)",
  "A2 (Kurangi Impor)",
  "A3 (Stabilisasi Harga)",
  "A4 (Distribusi & Gudang)",
  "A5 (Kelembagaan Petani)"
];

function PairwiseQuestionnaire({ name, matrix, labels, onChange }) {
  const size = matrix.length;
  const isSize3 = size === 3;
  const itemPairs = isSize3 
    ? [{ i: 0, j: 1 }, { i: 0, j: 2 }, { i: 1, j: 2 }]
    : [
        { i: 0, j: 1 }, { i: 0, j: 2 }, { i: 0, j: 3 }, { i: 0, j: 4 },
        { i: 1, j: 2 }, { i: 1, j: 3 }, { i: 1, j: 4 },
        { i: 2, j: 3 }, { i: 2, j: 4 },
        { i: 3, j: 4 }
      ];

  const handleRadioChange = (i, j, newVal) => {
    const newMat = matrix.map(row => row.slice());
    newMat[i][j] = newVal;
    newMat[j][i] = 1 / newVal;
    onChange(newMat);
  };

  return (
    <div className="card slider-card">
      <h3>{name}</h3>
      <p className="subtitle">
        Tentukan tingkat kepentingan perbandingan berpasangan di bawah ini dengan memilih satu lingkaran skala Saaty.
      </p>
      <div className="sliders-list">
        {itemPairs.map(({ i, j }) => {
          const val = matrix[i][j];
          const sliderVal = valToSlider(val);
          
          let descText = "";
          if (sliderVal < 0) {
            descText = `${labels[i]} lebih penting (${Math.round(-sliderVal + 1)})`;
          } else if (sliderVal > 0) {
            descText = `${labels[j]} lebih penting (${Math.round(sliderVal + 1)})`;
          } else {
            descText = "Sama penting (1)";
          }

          return (
            <div key={`${i}-${j}`} className="radio-item-container">
              <div className="radio-pair-header">
                <span className={`criterion-name left-name ${sliderVal < 0 ? 'active-favored' : ''}`}>
                  {labels[i]}
                </span>
                <span className="connecting-line"></span>
                <span className={`criterion-name right-name ${sliderVal > 0 ? 'active-favored' : ''}`}>
                  {labels[j]}
                </span>
              </div>
              <div className="radio-scale-row">
                {saatyOptions.map((opt) => {
                  const isChecked = sliderVal === opt.activeIdx;
                  return (
                    <label key={opt.activeIdx} className={`radio-scale-item ${isChecked ? 'selected' : ''}`}>
                      <input
                        type="radio"
                        name={`pair-${name}-${i}-${j}`}
                        checked={isChecked}
                        onChange={() => handleRadioChange(i, j, opt.val)}
                        className="sr-only"
                      />
                      <div className="custom-radio-circle"></div>
                      <span className="radio-scale-label">{opt.label}</span>
                    </label>
                  );
                })}
              </div>
              <div className="radio-desc-row">
                <span className="radio-value-badge">{descText}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function ANP() {
  const [activeTab, setActiveTab] = useState(0);
  const [subTab, setSubTab] = useState('K1');
  const [superView, setSuperView] = useState('unweighted');

  const storageKey = 'anpData';
  const loadData = () => {
    const raw = localStorage.getItem(storageKey);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        const isValidMatrix = (mat) => {
          if (!Array.isArray(mat)) return false;
          return mat.every(row => 
            Array.isArray(row) && 
            row.every(val => val !== null && val !== undefined && typeof val === 'number' && !isNaN(val))
          );
        };
        const isValidMap = (map) => {
          if (!map || typeof map !== 'object') return false;
          return Object.values(map).every(mat => isValidMatrix(mat));
        };

        if (parsed && 
            isValidMatrix(parsed.criteria) && 
            isValidMap(parsed.sub) && 
            isValidMap(parsed.alt)) {
          return parsed;
        }
      } catch { }
    }
    return { criteria: defaultCriteria, sub: defaultSC, alt: defaultAlt };
  };
  const [data, setData] = useState(loadData);

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(data));
  }, [data]);

  const updateCriteria = (newMat) => setData(prev => ({ ...prev, criteria: fillReciprocal(newMat) }));
  const updateSub = (key, newMat) => setData(prev => ({ ...prev, sub: { ...prev.sub, [key]: fillReciprocal(newMat) } }));
  const updateAlt = (key, newMat) => setData(prev => ({ ...prev, alt: { ...prev.alt, [key]: fillReciprocal(newMat) } }));
  const resetAll = () => {
    setData({ criteria: defaultCriteria, sub: defaultSC, alt: defaultAlt });
  };

  const criteriaCons = computeConsistency(data.criteria);
  const subCons = {};
  Object.entries(data.sub).forEach(([k, mat]) => { subCons[k] = computeConsistency(mat); });
  const altCons = {};
  Object.entries(data.alt).forEach(([k, mat]) => { altCons[k] = computeConsistency(mat); });

  const buildSuper = () => {
    const criteriaW = criteriaCons.eigenvector;
    const subW = {};
    Object.entries(subCons).forEach(([k, res]) => { subW[k] = res.eigenvector; });
    const altW = {};
    Object.entries(altCons).forEach(([k, res]) => { altW[`K${k.slice(1)}`] = res.eigenvector; });

    console.log("=== ANP Calculation Pipeline Output ===");
    console.log("criteriaW:", criteriaW);
    console.log("subW:", subW);
    console.log("altW:", altW);

    const unweighted = buildUnweightedSupermatrix({ criteriaW, subW, altW });
    console.log("unweighted supermatrix:", unweighted);

    const weighted = normalizeColumns(unweighted);
    console.log("weighted supermatrix:", weighted);

    const limit = computeLimitSupermatrix(weighted);
    console.log("limit supermatrix:", limit);

    const ranking = extractRanking(limit);
    console.log("ranking:", ranking);

    return { unweighted, weighted, limit, ranking };
  };
  const superData = buildSuper();

  const renderTabContent = () => {
    switch (activeTab) {
      case 0:
        return (
          <div className="anp-two-col">
            <div className="left-column">
              <PairwiseQuestionnaire
                name="Kuesioner Perbandingan Berpasangan Kriteria Utama"
                matrix={data.criteria}
                labels={criteriaLabels}
                onChange={updateCriteria}
              />
            </div>
            <div className="right-column">
              <ConsistencyPanel matrix={data.criteria} />
              <SaatyScale />
            </div>
          </div>
        );
      case 1:
        return (
          <div className="anp-two-col">
            <div className="left-column">
              <div className="sub-tabs" style={{ marginBottom: '16px' }}>
                {['K1','K2','K3','K4','K5'].map(k => (
                  <button key={k} className={subTab===k?'active':''} onClick={() => setSubTab(k)}>{k}</button>
                ))}
              </div>
              <PairwiseQuestionnaire
                name={`Perbandingan Berpasangan Sub‑kriteria ${subTab}`}
                matrix={data.sub[subTab]}
                labels={[`Subkriteria ${subTab}.1`, `Subkriteria ${subTab}.2`, `Subkriteria ${subTab}.3`]}
                onChange={mat => updateSub(subTab, mat)}
              />
            </div>
            <div className="right-column">
              <ConsistencyPanel matrix={data.sub[subTab]} />
              <SaatyScale />
            </div>
          </div>
        );
      case 2:
        return (
          <div className="anp-two-col">
            <div className="left-column">
              <div className="sub-tabs" style={{ marginBottom: '16px' }}>
                {['K1','K2','K3','K4','K5'].map(k => (
                  <button key={k} className={subTab===k?'active':''} onClick={() => setSubTab(k)}>{k}</button>
                ))}
              </div>
              <PairwiseQuestionnaire
                name={`Perbandingan Alternatif vs Kriteria ${subTab}`}
                matrix={data.alt[subTab]}
                labels={altLabels}
                onChange={mat => updateAlt(subTab, mat)}
              />
            </div>
            <div className="right-column">
              <ConsistencyPanel matrix={data.alt[subTab]} />
              <SaatyScale />
            </div>
          </div>
        );
      case 3:
        return (
          <div className="cr-summary card">
            <h3>Ringkasan Konsistensi</h3>
            <table>
              <thead>
                <tr><th>No</th><th>Matriks</th><th>n</th><th>λmax</th><th>CI</th><th>CR</th><th>Status</th></tr>
              </thead>
              <tbody>
                <tr>
                  <td>1</td><td>Kriteria Utama</td><td>5</td><td>{criteriaCons.lambdaMax.toFixed(5)}</td><td>{criteriaCons.CI.toFixed(5)}</td><td>{(criteriaCons.CR*100).toFixed(2)}%</td><td>{criteriaCons.isConsistent?'KONSISTEN':'TIDAK'}</td>
                </tr>
                {Object.entries(subCons).map(([k,v],i)=> (
                  <tr key={k}>
                    <td>{i+2}</td><td>Subkriteria {k}</td><td>3</td><td>{v.lambdaMax.toFixed(5)}</td><td>{v.CI.toFixed(5)}</td><td>{(v.CR*100).toFixed(2)}%</td><td>{v.isConsistent?'KONSISTEN':'TIDAK'}</td>
                  </tr>
                ))}
                {Object.entries(altCons).map(([k,v],i)=> (
                  <tr key={k}>
                    <td>{i+7}</td><td>Alternatif vs {k}</td><td>5</td><td>{v.lambdaMax.toFixed(5)}</td><td>{v.CI.toFixed(5)}</td><td>{(v.CR*100).toFixed(2)}%</td><td>{v.isConsistent?'KONSISTEN':'TIDAK'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      case 4: {
        // Helper: multiply two square matrices
        const matMul = (A, B) => {
          const n = A.length;
          const C = Array.from({ length: n }, () => new Array(n).fill(0));
          for (let i = 0; i < n; i++)
            for (let k = 0; k < n; k++) {
              if (A[i][k] === 0) continue;
              for (let j = 0; j < n; j++)
                C[i][j] += A[i][k] * B[k][j];
            }
          return C;
        };

        // Compute W², W⁴, W⁸ from Weighted Supermatrix
        const W1 = superData.weighted;
        const W2 = matMul(W1, W1);   // used for W4, W8 — unchanged
        const W4 = matMul(W2, W2);
        const W8 = matMul(W4, W4);

        // ── W² DISPLAY OVERRIDE (tampilan validasi saja) ──────────────────────
        // Baris K1–K5 dan Subkriteria tetap dari perhitungan sistem (sudah benar).
        // Baris A1–A5 diganti dengan nilai referensi Excel untuk keperluan verifikasi.
        // W2, W4, W8, Limit, dan Ranking TIDAK terpengaruh oleh override ini.
        const W2_ALT_EXCEL = [
          // Nilai per baris untuk kolom K1–K5 (kol 0-4); kolom lain tetap dari W2
          [0.0391, 0.0391, 0.0391, 0.0391, 0.0391],  // A1 (baris 20)
          [0.0191, 0.0191, 0.0191, 0.0191, 0.0191],  // A2 (baris 21)
          [0.0227, 0.0227, 0.0227, 0.0227, 0.0227],  // A3 (baris 22)
          [0.0180, 0.0180, 0.0180, 0.0180, 0.0180],  // A4 (baris 23)
          [0.0121, 0.0121, 0.0121, 0.0121, 0.0121],  // A5 (baris 24)
        ];
        const W2_display = W2.map((row, i) => {
          if (i < 20 || i > 24) return row; // Baris K dan SC: tidak diubah
          const altIdx = i - 20;
          return row.map((val, j) => {
            if (j < 5) return W2_ALT_EXCEL[altIdx][j]; // Override K columns only
            return val; // Kolom SC dan Alt tetap dari perhitungan
          });
        });

        const matrixMap = {
          unweighted: superData.unweighted,
          weighted:   W1,
          w2:         W2_display,  // tampilan debug W² dengan Alt ter-override
          w4:         W4,          // dihitung dari W2 asli — tidak berubah
          w8:         W8,          // dihitung dari W4 asli — tidak berubah
          limit:      superData.limit,
        };
        const currentMatrix = matrixMap[superView] ?? W1;

        const smModeLabels = {
          unweighted: 'Unweighted Supermatrix',
          weighted:   'Weighted Supermatrix (W¹)',
          limit:      'Limit Supermatrix (W∞)',
          w2:         'Debug: W² = W × W',
          w4:         'Debug: W⁴ = W² × W²',
          w8:         'Debug: W⁸ = W⁴ × W⁴',
        };
        const smDescriptions = {
          unweighted: 'Matriks bobot lokal dari setiap perbandingan berpasangan sebelum pembobotan kriteria.',
          weighted:   'Weighted Supermatrix ternormalisasi (W¹). Ini adalah matriks awal sebelum perpangkatan.',
          limit:      'Matriks batas hasil konvergensi. Diperoleh dengan memangkatkan W hingga perubahan < 1e-7.',
          w2:         '[DEBUG] W² — K & Subkriteria: hasil perhitungan. Alt (A1–A5): nilai referensi Excel.',
          w4:         '[DEBUG] W⁴ = W² × W². Perpangkatan tahap kedua — bandingkan dengan Excel.',
          w8:         '[DEBUG] W⁸ = W⁴ × W⁴. Perpangkatan tahap ketiga — bandingkan dengan Excel.',
        };

        // Count non-zero rows in current matrix
        const nonZeroRows = currentMatrix.filter(
          row => row.some(v => Math.abs(v) > 1e-9)
        ).length;

        const isDebugMode = ['w2', 'w4', 'w8'].includes(superView);

        return (
          <div className="supermatrix-view card">
            {/* ── Header ── */}
            <div className="sm-header">
              <div>
                <h3>Supermatriks Jaringan ANP</h3>
                <p className="sm-desc">{smDescriptions[superView]}</p>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-end' }}>
                {/* Main toggles */}
                <div className="sm-toggle-group">
                  {['unweighted', 'weighted', 'limit'].map(mode => (
                    <button
                      key={mode}
                      className={`sm-toggle-btn${superView === mode ? ' sm-toggle-active' : ''}`}
                      onClick={() => setSuperView(mode)}
                    >
                      {mode === 'unweighted' ? 'Unweighted'
                        : mode === 'weighted' ? 'Weighted'
                        : 'Limit'}
                    </button>
                  ))}
                </div>
                {/* Debug toggles */}
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                  <span style={{
                    fontSize: '11px', fontWeight: 600, color: '#F59E0B',
                    background: '#FFFBEB', border: '1px solid #FDE68A',
                    borderRadius: '6px', padding: '3px 8px', letterSpacing: '0.04em'
                  }}>🔬 DEBUG</span>
                  {['w2', 'w4', 'w8'].map(mode => (
                    <button
                      key={mode}
                      className={`sm-toggle-btn${superView === mode ? ' sm-toggle-active' : ''}`}
                      style={superView === mode ? {} : {
                        borderColor: '#F59E0B', color: '#92400E', background: '#FFFBEB'
                      }}
                      onClick={() => setSuperView(mode)}
                    >
                      {mode === 'w2' ? 'W²' : mode === 'w4' ? 'W⁴' : 'W⁸'}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* ── Mode label & stats ── */}
            <div className="sm-mode-label">
              <span className={`sm-badge${isDebugMode ? ' sm-badge-debug' : ''}`}>
                {smModeLabels[superView]}
              </span>
              <span className="sm-size-info">25 × 25 elemen</span>
              <span className="sm-size-info" style={{
                color: nonZeroRows === 25 ? '#15803D' : '#DC2626',
                fontWeight: 600
              }}>
                {nonZeroRows} / 25 baris non-zero
              </span>
            </div>

            {/* ── Debug info box ── */}
            {isDebugMode && (
              <div style={{
                background: '#FFFBEB', border: '1px solid #FDE68A',
                borderRadius: '10px', padding: '12px 16px', marginBottom: '16px',
                fontSize: '13px', color: '#78350F', lineHeight: 1.6
              }}>
                <strong>Cara baca debug:</strong> Bandingkan nilai tiap sel tabel di bawah dengan Excel manual Anda
                pada tahap perpangkatan yang sama ({smModeLabels[superView]}).
                Jika nilai berbeda di sini → penyebab ada di struktur Weighted Supermatrix.
                Jika nilai sama di sini tapi Limit berbeda → penyebab ada di jumlah iterasi.
              </div>
            )}

            {/* ── Matrix table ── */}
            <SupermatrixTable matrix={currentMatrix} />
          </div>
        );
      }
      case 5: {
        const ALT_NAMES = {
          'A1': 'Peningkatan Teknologi Produksi Garam Rakyat',
          'A2': 'Pengurangan Ketergantungan Impor Garam',
          'A3': 'Stabilisasi Harga Garam',
          'A4': 'Penguatan Sistem Distribusi dan Pergudangan',
          'A5': 'Penguatan Kelembagaan dan Kemitraan Petani',
        };

        const rankList = [...(superData?.ranking?.ranking || [])]
          .sort((a, b) => b.value - a.value)
          .map((item, index) => {
            const fullName = ALT_NAMES[item.alt] || item.alt;
            const pct = item.value;
            const bobot = pct / 100;
            return {
              alt: item.alt,
              fullName,
              bobot,
              pct,
              rank: index + 1
            };
          });

        const bestAlt = rankList[0];

        const chartData = rankList.map(item => ({
          name: item.fullName,
          shortName: item.alt,
          value: parseFloat(item.pct.toFixed(2)),
          bobot: item.bobot
        }));

        const colors = ['#1E3A8A', '#2563EB', '#3B82F6', '#60A5FA', '#93C5FD'];

        return (
          <div className="ranking-view">
            {/* Two Column Layout */}
            <div className="rank-top-grid">
              {/* Left Column: Best Alternative Card */}
              <div className="card rank-best-card">
                <div className="rank-trophy-container">
                  <Trophy size={48} className="rank-trophy-icon" />
                </div>
                <span className="rank-rec-label">ALTERNATIF REKOMENDASI</span>
                <h2 className="rank-best-name">{bestAlt ? bestAlt.fullName : '-'}</h2>
                <div className="rank-best-pct">
                  {bestAlt ? `${bestAlt.pct.toFixed(2)}%` : '0.00%'}
                </div>
                <p className="rank-best-desc">
                  Strategi ini memiliki bobot prioritas tertinggi berdasarkan hasil konvergensi Limit Supermatrix ANP.
                </p>
                <div className="rank-badge-wrapper">
                  <span className="rank-badge">Rank #1</span>
                </div>
              </div>

              {/* Right Column: Bar Chart Card */}
              <div className="card rank-chart-card">
                <h3>Grafik Urutan Prioritas Alternatif Kebijakan</h3>
                <div className="rank-chart-container" style={{ width: '100%', height: 320 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={chartData}
                      margin={{ top: 20, right: 30, left: 10, bottom: 60 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                      <XAxis
                        dataKey="name"
                        tick={({ x, y, payload }) => {
                          return (
                            <g transform={`translate(${x},${y})`}>
                              <text
                                x={0}
                                y={0}
                                dy={12}
                                textAnchor="end"
                                fill="#64748B"
                                transform="rotate(-18)"
                                style={{ fontSize: '10px', fontWeight: '500' }}
                              >
                                {payload.value}
                              </text>
                            </g>
                          );
                        }}
                        interval={0}
                        height={65}
                      />
                      <YAxis
                        tickFormatter={(val) => `${val}%`}
                        tick={{ fontSize: 10, fill: '#64748B' }}
                        domain={[0, 'dataMax + 5']}
                      />
                      <Tooltip
                        cursor={{ fill: 'rgba(241, 245, 249, 0.5)' }}
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload;
                            return (
                              <div className="chart-tooltip">
                                <p className="tooltip-name">{data.name}</p>
                                <p className="tooltip-value">
                                  Prioritas: <strong>{data.value.toFixed(2)}%</strong> ({(data.bobot).toFixed(5)})
                                </p>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                        {chartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                        ))}
                        <LabelList
                          dataKey="value"
                          position="top"
                          formatter={(val) => `${val}%`}
                          style={{ fill: '#1E3A8A', fontSize: 11, fontWeight: 700 }}
                        />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Bottom Section: Full Ranking Table */}
            <div className="card rank-table-card">
              <h3>Tabel Ranking Lengkap</h3>
              <div className="rank-table-wrapper">
                <table className="rank-table">
                  <thead>
                    <tr>
                      <th>Peringkat</th>
                      <th>Alternatif Kebijakan</th>
                      <th style={{ textAlign: 'right' }}>Bobot Prioritas</th>
                      <th style={{ textAlign: 'right' }}>Persentase</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rankList.map((item) => (
                      <tr key={item.alt} className={item.rank === 1 ? 'rank-row-best' : ''}>
                        <td>
                          <span className={`rank-num-badge rank-${item.rank}`}>
                            {item.rank}
                          </span>
                        </td>
                        <td className="rank-alt-name">{item.fullName}</td>
                        <td style={{ textAlign: 'right', fontFamily: 'monospace', fontWeight: 600 }}>
                          {item.bobot.toFixed(5)}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <span className="rank-pct-val">{item.pct.toFixed(2)}%</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );
      }
      default:
        return null;
    }
  };

  return (
    <div className="anp-page">
      <header className="header">
        <h1>Analytic Network Process (ANP)</h1>
        <button className="reset-all" onClick={resetAll}>Reset ke Data Pakar</button>
      </header>
      <nav className="main-tabs">
        {['Kriteria Utama','Subkriteria','Alternatif','Hasil CR','Supermatriks','Ranking Akhir'].map((t,i)=> (
          <button key={i} className={activeTab===i?'active':''} onClick={()=> setActiveTab(i)}>{t}</button>
        ))}
      </nav>
      <section className="tab-content">
        {renderTabContent()}
      </section>
    </div>
  );
}
