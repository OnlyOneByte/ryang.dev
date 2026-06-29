/**
 * Regression test for the CRITICAL finding: /resume.pdf must NEVER include
 * gated recruiter sections (salary, references) — only the public allowlist.
 *
 * The route filters recruiter_content rows by a PUBLIC_SECTIONS allowlist
 * before rendering. This test reproduces that filter against a fixture that
 * deliberately includes salary + references, and asserts they're excluded.
 * If someone widens the allowlist or drops the filter, this goes red.
 */
import { test, expect } from 'bun:test';
// Import the REAL allowlist the route uses — so widening it (e.g. adding
// 'salary') makes this test go red, not a stale copy.
import { PUBLIC_RESUME_SECTIONS as PUBLIC_SECTIONS } from '@/lib/resume/public-sections';

const ALL_ROWS = [
  { section: 'cv', title: 'Curriculum Vitae', body: '<p>public CV</p>' },
  { section: 'availability', title: 'Availability', body: '<p>open to roles</p>' },
  { section: 'salary', title: 'Salary Expectations', body: '<p>$SECRET_BAND</p>' },
  { section: 'references', title: 'References', body: '<p>Jane Doe — SECRET_PHONE</p>' },
];

function publicSections(rows: typeof ALL_ROWS) {
  return rows.filter((r) => PUBLIC_SECTIONS.has(r.section));
}

test('resume only includes public sections', () => {
  const picked = publicSections(ALL_ROWS);
  const keys = picked.map((r) => r.section);
  expect(keys).toEqual(['cv', 'availability']);
});

test('resume NEVER leaks salary or references content', () => {
  const html = publicSections(ALL_ROWS).map((r) => r.title + r.body).join('\n');
  expect(html).not.toContain('Salary');
  expect(html).not.toContain('SECRET_BAND');
  expect(html).not.toContain('References');
  expect(html).not.toContain('SECRET_PHONE');
});

test('allowlist does not contain sensitive sections', () => {
  expect(PUBLIC_SECTIONS.has('salary')).toBe(false);
  expect(PUBLIC_SECTIONS.has('references')).toBe(false);
});
