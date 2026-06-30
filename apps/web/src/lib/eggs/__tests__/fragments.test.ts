/**
 * Scavenger-hunt completion is all-or-nothing. This test pins that contract:
 * the full set completes, and dropping ANY single fragment must NOT. If someone
 * adds a fragment to FRAGMENT_IDS but forgets to wire a surface, the count
 * assertion flags it; if someone weakens isComplete(), the subset cases flag it.
 */
import { test, expect } from 'bun:test';
import { FRAGMENT_IDS, FRAGMENT_COUNT, isComplete, CLAIM_TOKENS } from '@/lib/eggs/fragments';

test('full set completes the hunt', () => {
  expect(isComplete(FRAGMENT_IDS)).toBe(true);
  expect(FRAGMENT_COUNT).toBe(FRAGMENT_IDS.length);
});

test('any missing fragment leaves it incomplete (non-vacuous)', () => {
  for (const omit of FRAGMENT_IDS) {
    const subset = FRAGMENT_IDS.filter((id) => id !== omit);
    expect(isComplete(subset)).toBe(false);
  }
});

test('empty / partial progress is incomplete', () => {
  expect(isComplete([])).toBe(false);
  expect(isComplete(['console'])).toBe(false);
});

test('claim tokens map to real fragment ids', () => {
  for (const id of Object.values(CLAIM_TOKENS)) {
    expect(FRAGMENT_IDS).toContain(id);
  }
});
