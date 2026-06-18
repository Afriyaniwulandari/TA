// anpUtils.js – Core calculation helpers for the ANP page

/**
 * Power Method to compute principal eigenvector of a square matrix.
 * Returns an object { eigenvector: number[], lambdaMax: number }
 */
export function powerMethod(matrix, tolerance = 1e-10, maxIter = 2000) {
  const n = matrix.length;
  // start with uniform vector
  let v = new Array(n).fill(1 / n);
  let lambdaPrev = 0;
  for (let iter = 0; iter < maxIter; iter++) {
    // multiply matrix * v
    const mv = new Array(n).fill(0);
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        mv[i] += matrix[i][j] * v[j];
      }
    }
    // normalize
    const sum = mv.reduce((a, b) => a + b, 0);
    const vNew = mv.map(x => x / sum);
    // Rayleigh quotient for lambda estimate
    const Av = new Array(n).fill(0);
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        Av[i] += matrix[i][j] * vNew[j];
      }
    }
    const lambda = Av.reduce((acc, val, idx) => acc + val / vNew[idx], 0) / n;
    // convergence check
    const diff = Math.max(...vNew.map((x, i) => Math.abs(x - v[i])));
    if (diff < tolerance && Math.abs(lambda - lambdaPrev) < tolerance) {
      return { eigenvector: vNew, lambdaMax: lambda };
    }
    v = vNew;
    lambdaPrev = lambda;
  }
  return { eigenvector: v, lambdaMax: lambdaPrev };
}

/** Compute Consistency Index (CI) and Consistency Ratio (CR) */
export function computeConsistency(matrix) {
  const n = matrix.length;
  const { eigenvector, lambdaMax } = powerMethod(matrix);
  const CI = (lambdaMax - n) / (n - 1);
  const RI_TABLE = { 1: 0.0, 2: 0.0, 3: 0.58, 4: 0.90, 5: 1.12, 6: 1.24, 7: 1.32, 8: 1.41, 9: 1.45, 10: 1.49 };
  const RI = RI_TABLE[n] ?? 1.49;
  const CR = RI === 0 ? 0 : CI / RI;
  return { eigenvector, lambdaMax, CI, CR, isConsistent: CR <= 0.1 };
}

/** Fill lower‑triangular part of a pairwise matrix with reciprocals */
export function fillReciprocal(matrix) {
  const n = matrix.length;
  const result = matrix.map(row => row.slice());
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      if (result[i][j] !== undefined && result[i][j] !== null) {
        result[j][i] = 1 / result[i][j];
      }
    }
    result[i][i] = 1;
  }
  return result;
}

/** Normalize columns of a matrix (column‑stochastic) */
export function normalizeColumns(matrix) {
  const rows = matrix.length;
  const cols = matrix[0].length;
  const colSums = new Array(cols).fill(0);
  for (let j = 0; j < cols; j++) {
    for (let i = 0; i < rows; i++) {
      colSums[j] += matrix[i][j];
    }
  }
  const norm = matrix.map(row => row.map((val, idx) => {
    const sum = colSums[idx];
    return sum === 0 ? 0 : val / sum;
  }));
  return norm;
}

/** Build unweighted supermatrix (25x25) from priority vectors */
export function buildUnweightedSupermatrix({ criteriaW, subW, altW }) {
  const size = 25;
  const SM = Array.from({ length: size }, () => new Array(size).fill(0));
  // Criteria×Criteria (0‑4 rows, 0‑4 cols) – each column gets criteria weight
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
  // Subcriteria×Criteria
  Object.entries(subRows).forEach(([k, rows]) => {
    const w = subW[k]; // length 3
    const c = parseInt(k.slice(1)) - 1; // Parent criterion column
    rows.forEach((rowIdx, idx) => {
      SM[rowIdx][c] = w[idx];
    });
  });
  // Alternatives×Criteria (rows 20‑24)
  for (let a = 0; a < 5; a++) {
    const rowIdx = 20 + a;
    for (let c = 0; c < 5; c++) {
      SM[rowIdx][c] = altW[`K${c + 1}`][a];
    }
  }
  // Alternatives×Subcriteria – copy alternative weight to each subcriterion of its parent criterion
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
  
  // Set identity diagonal for alternative columns (sinks)
  for (let i = 20; i < 25; i++) {
    SM[i][i] = 1;
  }

  return SM;
}

/** Iterate to limit supermatrix */
export function computeLimitSupermatrix(weighted, tolerance = 1e-7, maxIter = 1000) {
  const size = weighted.length;
  let W = weighted.map(row => row.slice());
  for (let iter = 0; iter < maxIter; iter++) {
    const next = Array.from({ length: size }, () => new Array(size).fill(0));
    for (let i = 0; i < size; i++) {
      for (let k = 0; k < size; k++) {
        if (W[i][k] === 0) continue;
        for (let j = 0; j < size; j++) {
          next[i][j] += W[i][k] * W[k][j];
        }
      }
    }
    let maxDiff = 0;
    for (let i = 0; i < size; i++) {
      for (let j = 0; j < size; j++) {
        const diff = Math.abs(next[i][j] - W[i][j]);
        if (diff > maxDiff) maxDiff = diff;
      }
    }
    W = next;
    if (maxDiff < tolerance) break;
  }
  return W;
}

/** Extract final alternative ranking from limit supermatrix */
export function extractRanking(limitMatrix) {
  const altRows = limitMatrix.slice(20, 25);
  const sums = altRows.map(row => row.reduce((a, b) => a + b, 0));
  const total = sums.reduce((a, b) => a + b, 0);
  const percentages = sums.map(v => (v / total) * 100);
  const ranking = percentages
    .map((p, idx) => ({ alt: `A${idx + 1}`, value: p }))
    .sort((a, b) => b.value - a.value);
  return { percentages, ranking };
}
