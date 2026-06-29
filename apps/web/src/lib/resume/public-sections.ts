/**
 * Single source of truth for which recruiter_content sections may appear in the
 * PUBLIC /resume.pdf. `salary` and `references` are gated and MUST never be
 * here. Imported by both the route and the leak regression test so the test
 * guards the REAL value (not a copy).
 */
export const PUBLIC_RESUME_SECTIONS = new Set(['cv', 'availability']);
