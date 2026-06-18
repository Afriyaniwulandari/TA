import {
  computeConsistency,
  fillReciprocal,
  buildUnweightedSupermatrix,
  normalizeColumns,
  computeLimitSupermatrix,
  extractRanking
} from '../src/utils/anpUtils.js';

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

// Modified unweighted builder with self-loop diagonal for alternatives
function buildUnweightedSupermatrixDiag({ criteriaW, subW, altW }) {
  const size = 25;
  const SM = Array.from({ length: size }, () => new Array(size).fill(0));
  for (let i = 0; i < 5; i++) {
    for (let j = 0; j < 5; j++) {
      SM[i][j] = criteriaW[j];
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
  
  // ADD DIAG self-loop for alternatives columns
  for (let i = 20; i < 25; i++) {
    SM[i][i] = 1;
  }
  
  return SM;
}

function checkDiag() {
  const criteriaCons = computeConsistency(defaultCriteria);
  const subW = {};
  Object.entries(defaultSC).forEach(([k, mat]) => {
    subW[k] = computeConsistency(mat).eigenvector;
  });
  const altW = {};
  Object.entries(defaultAlt).forEach(([k, mat]) => {
    altW[`K${k.slice(1)}`] = computeConsistency(mat).eigenvector;
  });
  
  const unweighted = buildUnweightedSupermatrixDiag({ criteriaW: criteriaCons.eigenvector, subW, altW });
  const weighted = normalizeColumns(unweighted);
  const limit = computeLimitSupermatrix(weighted);
  const ranking = extractRanking(limit);
  
  console.log("=== With Alternative Self-loops ===");
  console.log("Sum of alternatives in col 0 of limit:", limit.slice(20,25).map(row => row[0]).reduce((a,b)=>a+b, 0));
  console.log("Ranking results:", JSON.stringify(ranking, null, 2));
}

checkDiag();
