import { describe, it, expect } from 'vitest';

function summarize(optionMap: Record<string, string>, answers: (string | string[])[]) {
  // Equivalent simplified counting logic after fix: ignore placeholder ' ' and empty
  const counts: Record<string, number> = Object.fromEntries(Object.keys(optionMap).map(k => [k, 0]));
  const custom: Record<string, number> = {};
  answers.forEach(a => {
    const arr = Array.isArray(a) ? a : [a];
    let customProvided = false;
    arr.forEach(raw => {
      if (typeof raw !== 'string') return;
      const trimmed = raw.trim();
      if (!trimmed) return; // ignore placeholder
      if (optionMap[raw]) counts[raw]++; else { custom[trimmed] = (custom[trimmed] || 0) + 1; customProvided = true; }
    });
    if (customProvided && counts.hasOwnProperty('other')) counts['other']++;
  });
  return { counts, custom };
}

describe('custom answer normalization', () => {
  it('ignores placeholder single space', () => {
    const res = summarize({ other: 'Other', a: 'A' }, [[' '], ['a']]);
    expect(res.counts.a).toBe(1);
    expect(res.counts.other).toBe(0); // no custom text so other count not incremented
  });
  it('counts real custom text and increments other bucket', () => {
    const res = summarize({ other: 'Other', a: 'A' }, [['cool'], ['a']]);
    expect(res.custom.cool).toBe(1);
    expect(res.counts.other).toBe(1);
  });
});
