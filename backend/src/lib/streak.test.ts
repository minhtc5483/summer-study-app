import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeStreak } from './streak';

const daysAgo = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
};

test('no previous activity -> starts a new streak at 1', () => {
  assert.equal(computeStreak({ lastActive: null, currentStreak: 0 }), 1);
});

test('active yesterday -> streak increments by 1', () => {
  assert.equal(computeStreak({ lastActive: daysAgo(1), currentStreak: 4 }), 5);
});

test('active today already, streak was 0 -> starts at 1', () => {
  assert.equal(computeStreak({ lastActive: daysAgo(0), currentStreak: 0 }), 1);
});

test('active today already, streak already counted -> unchanged', () => {
  assert.equal(computeStreak({ lastActive: daysAgo(0), currentStreak: 3 }), 3);
});

test('missed 2+ days -> streak resets to 1', () => {
  assert.equal(computeStreak({ lastActive: daysAgo(3), currentStreak: 10 }), 1);
});

test('lastActive in the future (clock skew / backward clock) -> streak unchanged, not incremented or reset', () => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 2);
  assert.equal(computeStreak({ lastActive: tomorrow, currentStreak: 7 }), 7);
});
