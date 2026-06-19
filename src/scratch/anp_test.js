import { 
  computeConsistency, 
  buildUnweightedSupermatrix, 
  normalizeColumns, 
  computeLimitSupermatrix, 
  extractRanking 
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

  const unweighted = buildUnweightedSupermatrix({ criteriaW, subW, altW });
  const weighted = normalizeColumns(unweighted);
  const limit = computeLimitSupermatrix(weighted);

  console.log("=== SUB-CRITERIA GLOBAL WEIGHTS (From Limit Matrix, column 0) ===");
  // Indices 5-7 are K1 subcriteria
  console.log("Index 5 (K1.1 Lahan):", limit[5][0]);
  console.log("Index 6 (K1.2 Produktivitas):", limit[6][0]);
  console.log("Index 7 (K1.3 Teknologi):", limit[7][0]);

  console.log("\n=== SUB-CRITERIA LOCAL WEIGHTS (Eigenvectors) ===");
  console.log("K1:", subW["K1"]);
  console.log("K2:", subW["K2"]);
  console.log("K3:", subW["K3"]);
  console.log("K4:", subW["K4"]);
  console.log("K5:", subW["K5"]);

  console.log("\n=== RANKING ALTERNATIF ===");
  const ranking = extractRanking(limit);
  console.log(JSON.stringify(ranking, null, 2));
};

run();
