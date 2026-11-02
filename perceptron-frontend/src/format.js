const SUBSCRIPTS = '₀₁₂₃₄₅₆₇₈₉';

/** 12 → "₁₂" */
export const sub = (n) => String(n).replace(/\d/g, (d) => SUBSCRIPTS[d]);

/** Fixed decimals with a real minus sign; never prints "−0.000". */
export function fmt(v, digits = 3) {
  const s = Math.abs(v).toFixed(digits);
  return (v < 0 && Number(s) !== 0 ? '−' : '') + s;
}

/** Decimals for an input value: "0" and "1" at the corners, two decimals for a point picked in between. */
export const inputDigits = (v) => (Number.isInteger(v) ? 0 : 2);

/** Like fmt, but negative values get parentheses so they read well inside a formula. */
export function term(v, digits = 3) {
  const s = fmt(v, digits);
  return s.startsWith('−') ? `(${s})` : s;
}

/** " + 0.412" or " − 0.412", for chaining terms in a formula. */
export const signed = (v, digits = 3) => (v < 0 ? ' − ' : ' + ') + fmt(Math.abs(v), digits);
