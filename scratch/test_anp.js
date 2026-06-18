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

function runTest() {
  console.log("=== Running ANP Calculation Pipeline ===");
  
  const criteriaCons = computeConsistency(defaultCriteria);
  console.log("criteriaW:", criteriaCons.eigenvector);
  
  const subW = {};
  Object.entries(defaultSC).forEach(([k, mat]) => {
    subW[k] = computeConsistency(mat).eigenvector;
  });
  console.log("subW keys:", Object.keys(subW));
  Object.entries(subW).forEach(([k, ev]) => {
    console.log(`subW[${k}]:`, ev);
  });
  
  const altW = {};
  Object.entries(defaultAlt).forEach(([k, mat]) => {
    altW[`K${k.slice(1)}`] = computeConsistency(mat).eigenvector;
  });
  console.log("altW keys:", Object.keys(altW));
  Object.entries(altW).forEach(([k, ev]) => {
    console.log(`altW[${k}]:`, ev);
  });
  
  const unweighted = buildUnweightedSupermatrix({ criteriaW: criteriaCons.eigenvector, subW, altW });
  console.log("Unweighted size:", unweighted.length, "x", unweighted[0].length);
  
  // Check for any NaN, undefined, null, Infinity in unweighted
  let unweightedHasErrors = false;
  for (let i = 0; i < unweighted.length; i++) {
    for (let j = 0; j < unweighted[i].length; j++) {
      const val = unweighted[i][j];
      if (val === undefined || val === null || isNaN(val) || !isFinite(val)) {
        console.error(`Unweighted error at [${i}][${j}]:`, val);
        unweightedHasErrors = true;
      }
    }
  }
  if (!unweightedHasErrors) {
    console.log("Unweighted is valid (no NaN/undefined/null/Infinity).");
  }
  
  const weighted = normalizeColumns(unweighted);
  console.log("Weighted size:", weighted.length, "x", weighted[0].length);
  
  // Check column sums of weighted
  console.log("Weighted column sums (should be 1 or 0):");
  for (let j = 0; j < weighted[0].length; j++) {
    let sum = 0;
    for (let i = 0; i < weighted.length; i++) {
      sum += weighted[i][j];
    }
    if (sum !== 0 && Math.abs(sum - 1) > 1e-9) {
      console.warn(`Column ${j} sum is not 1 or 0:`, sum);
    }
  }
  
  let weightedHasErrors = false;
  for (let i = 0; i < weighted.length; i++) {
    for (let j = 0; j < weighted[i].length; j++) {
      const val = weighted[i][j];
      if (val === undefined || val === null || isNaN(val) || !isFinite(val)) {
        console.error(`Weighted error at [${i}][${j}]:`, val);
        weightedHasErrors = true;
      }
    }
  }
  if (!weightedHasErrors) {
    console.log("Weighted is valid.");
  }
  
  const limit = computeLimitSupermatrix(weighted);
  console.log("Limit size:", limit.length, "x", limit[0].length);
  
  let limitHasErrors = false;
  for (let i = 0; i < limit.length; i++) {
    for (let j = 0; j < limit[i].length; j++) {
      const val = limit[i][j];
      if (val === undefined || val === null || isNaN(val) || !isFinite(val)) {
        console.error(`Limit error at [${i}][${j}]:`, val);
        limitHasErrors = true;
      }
    }
  }
  if (!limitHasErrors) {
    console.log("Limit matrix is valid (contains valid numbers).");
    // Print sum of rows 20-24 in column 0 of limit matrix
    let sumLimitCol0 = 0;
    for (let i = 20; i < 25; i++) {
      sumLimitCol0 += limit[i][0];
    }
    console.log("Sum of alternatives in col 0 of limit:", sumLimitCol0);
  }
  
  const ranking = extractRanking(limit);
  console.log("Ranking results:", JSON.stringify(ranking, null, 2));
}

runTest();
