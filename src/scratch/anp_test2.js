import { 
  computeConsistency, 
  buildUnweightedSupermatrix, 
  normalizeColumns 
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
  ]
};

const run = () => {
  const criteriaCons = computeConsistency(defaultCriteria);
  const subCons = computeConsistency(defaultSC.K1);

  const criteriaW = criteriaCons.eigenvector;
  const subW_K1 = subCons.eigenvector;

  console.log("Criteria Eigenvector (criteriaW):", criteriaW);
  console.log("Subcriteria K1 Eigenvector (subW_K1):", subW_K1);

  console.log("\nProducts (criteriaW[0] * subW_K1):");
  subW_K1.forEach((w, i) => {
    console.log(`Product K1.${i+1}:`, criteriaW[0] * w);
  });

  console.log("\nWeighted Products (criteriaW[0] * subW_K1 / 3) — as cluster weight is 1/3:");
  subW_K1.forEach((w, i) => {
    console.log(`Weighted K1.${i+1}:`, (criteriaW[0] * w) / 3);
  });
};

run();
