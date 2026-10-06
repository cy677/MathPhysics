import {createHash} from 'node:crypto';

export class ApiError extends Error {
  constructor(status, code, details = {}) { super(code); this.status = status; this.code = code; this.details = details; }
}
export function fail(status, code, details) { throw new ApiError(status, code, details); }
export function plainObject(value) { return value !== null && typeof value === 'object' && !Array.isArray(value); }
export function exactKeys(value, allowed) {
  if (!plainObject(value) || Object.keys(value).some(key => !allowed.includes(key))) fail(400, 'invalid_request_fields');
}
export function string(value, name, min = 1, max = 128) {
  if (typeof value !== 'string' || value.length < min || value.length > max || /[\x00-\x1f]/u.test(value)) fail(400, `invalid_${name}`);
  return value;
}
export function key(value) { return string(value, 'idempotency_key', 8, 128); }
export function integer(value, name, min = 0, max = Number.MAX_SAFE_INTEGER) {
  if (!Number.isSafeInteger(value) || value < min || value > max) fail(400, `invalid_${name}`);
  return value;
}
export function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (plainObject(value)) return `{${Object.keys(value).sort().map(k => `${JSON.stringify(k)}:${canonical(value[k])}`).join(',')}}`;
  const json = JSON.stringify(value);
  if (json === undefined) throw new Error('Unsupported JSON value');
  return json;
}
export function digest(value) { return createHash('sha256').update(typeof value === 'string' ? value : canonical(value)).digest('hex'); }
export function normalizeScore(raw, max) {
  integer(raw, 'raw_score'); integer(max, 'max_score', 1);
  if (raw > max) throw new Error('Grader raw score exceeds maximum');
  return Number((BigInt(raw) * 10000n * 2n + BigInt(max)) / (BigInt(max) * 2n));
}
export function largestRemainder(total, weighted) {
  integer(total, 'credit_delta');
  const sum = weighted.reduce((value, item) => value + BigInt(integer(item.weight, 'weight')), 0n);
  if (total === 0) return weighted.map(item => ({...item, allocation: 0}));
  if (sum === 0n) throw new Error('Positive credit requires positive earned score');
  const parts = weighted.map((item, index) => {
    const numerator = BigInt(total) * BigInt(item.weight);
    return {...item, index, allocation: Number(numerator / sum), remainder: numerator % sum};
  });
  let extra = total - parts.reduce((sum, part) => sum + part.allocation, 0);
  const sorted = [...parts].sort((a, b) => a.remainder === b.remainder ? a.index - b.index : a.remainder > b.remainder ? -1 : 1);
  for (const part of sorted) { if (extra <= 0) break; if (part.weight > 0) { part.allocation++; extra--; } }
  return parts.map(({index, remainder, ...part}) => part);
}
