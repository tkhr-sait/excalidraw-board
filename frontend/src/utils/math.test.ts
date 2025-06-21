import { describe, it, expect } from 'vitest';

function add(a: number, b: number): number {
  return a + b;
}

describe('Math utilities', () => {
  it('should add two numbers correctly', () => {
    expect(add(2, 3)).toBe(5);
  });
});
