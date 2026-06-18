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

function checkSums() {
  const criteriaCons = computeConsistency(defaultCriteria);
  const subW = {};
  Object.entries(defaultSC).forEach(([k, mat]) => {
    subW[k] = computeConsistency(mat).eigenvector;
  });
  const altW = {};
  Object.entries(defaultAlt).forEach(([k, mat]) => {
    altW[`K${k.slice(1)}`] = computeConsistency(mat).eigenvector;
  });
  
  const unweighted = buildUnweightedSupermatrix({ criteriaW: criteriaCons.eigenvector, subW, altW });
  const weighted = normalizeColumns(unweighted);
  
  console.log("Column sums of unweighted:");
  for (let j = 0; j < unweighted[0].length; j++) {
    let sum = 0;
    for (let i = 0; i < unweighted.length; i++) {
      sum += unweighted[i][j];
    }
    console.log(`Col ${j}: ${sum}`);
  }

  console.log("\nColumn sums of weighted:");
  for (let j = 0; j < weighted[0].length; j++) {
    let sum = 0;
    for (let i = 0; i < weighted.length; i++) {
      sum += weighted[i][j];
    }
    console.log(`Col ${j}: ${sum}`);
  }
}

checkSums();
