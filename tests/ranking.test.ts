import { describe, it, expect } from 'vitest';

// Simple pure reorder util mirroring logic used in QuestionDisplay (simplified)
function reorder(list: string[], from: number, to: number) {
  const next = [...list];
  const [m] = next.splice(from, 1);
  next.splice(to, 0, m);
  return next;
}

describe('ranking reorder', () => {
  it('moves an item forward', () => {
    const res = reorder(['a', 'b', 'c'], 0, 2);
    expect(res).toEqual(['b', 'c', 'a']);
  });
  it('no change if same index', () => {
    const res = reorder(['a', 'b'], 1, 1);
    expect(res).toEqual(['a', 'b']);
  });
});
