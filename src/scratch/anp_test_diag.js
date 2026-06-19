import { 
  computeConsistency, 
  normalizeColumns, 
  computeLimitSupermatrix 
} from '../utils/anpUtils.js';

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

// Build unweighted supermatrix with Identity Alt×Alt block (SM[i][i] = 1 for i=20..24)
const buildUnweightedSupermatrixDiag = ({ criteriaW, subW, altW }) => {
  const size = 25;
  const SM = Array.from({ length: size }, () => new Array(size).fill(0));
  for (let i = 0; i < 5; i++) {
    for (let j = 0; j < 5; j++) {
      SM[i][j] = criteriaW[i];
    }
  }
  const subRows = {
    K1: [5, 6, 7],
    K2: [8, 9, 10],
    K3: [11, 12, 13],
    K4: [14, 15, 16],
    K5: [17, 18, 19]
  };
  Object.entries(subRows).forEach(([k, rows]) => {
    const w = subW[k];
    const c = parseInt(k.slice(1)) - 1;
    rows.forEach((rowIdx, idx) => {
      SM[rowIdx][c] = w[idx];
    });
  });
  for (let a = 0; a < 5; a++) {
    const rowIdx = 20 + a;
    for (let c = 0; c < 5; c++) {
      SM[rowIdx][c] = altW[`K${c + 1}`][a];
    }
  }
  for (let a = 0; a < 5; a++) {
    const rowIdx = 20 + a;
    Object.entries(subRows).forEach(([k, rows]) => {
      const critIdx = parseInt(k.slice(1)) - 1;
      const altWeight = altW[`K${critIdx + 1}`][a];
      rows.forEach(colIdx => {
        SM[rowIdx][colIdx] = altWeight;
      });
    });
  }
  for (let i = 20; i < 25; i++) {
    SM[i][i] = 1;
  }
  return SM;
};

const run = () => {
  const criteriaCons = computeConsistency(defaultCriteria);
  const subCons = {};
  Object.entries(defaultSC).forEach(([k, mat]) => { subCons[k] = computeConsistency(mat); });
  const altCons = {};
  Object.entries(defaultAlt).forEach(([k, mat]) => { altCons[k] = computeConsistency(mat); });

  const criteriaW = criteriaCons.eigenvector;
  const subW = {};
  Object.entries(subCons).forEach(([k, res]) => { subW[k] = res.eigenvector; });
  const altW = {};
  Object.entries(altCons).forEach(([k, res]) => { altW[`K${k.slice(1)}`] = res.eigenvector; });

  const unweighted = buildUnweightedSupermatrixDiag({ criteriaW, subW, altW });
  const weighted = normalizeColumns(unweighted);
  const limit = computeLimitSupermatrix(weighted);

  console.log("=== SUB-CRITERIA GLOBAL WEIGHTS (From Diag Limit Matrix, column 0) ===");
  console.log("Index 5 (K1.1 Lahan):", limit[5][0]);
  console.log("Index 6 (K1.2 Produktivitas):", limit[6][0]);
  console.log("Index 7 (K1.3 Teknologi):", limit[7][0]);
};

run();
