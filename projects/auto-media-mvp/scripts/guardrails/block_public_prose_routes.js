#!/usr/bin/env node

const blocked = process.env.ALLOW_PROSE_ROUTES === '1';

if (blocked) {
  console.log('[guardrails] prose / summary routes explicitly enabled via ALLOW_PROSE_ROUTES=1');
  process.exit(0);
}

console.error([
  '[guardrails] This route is intentionally blocked in the current observatory phase.',
  '[guardrails] Summary / article / xpost / image-prompt / publish flows are not part of the public path.',
  '[guardrails] Primary path: collect -> rank -> site:build -> static deploy.',
  '[guardrails] If you really need this route for controlled internal testing, rerun with ALLOW_PROSE_ROUTES=1.'
].join('\n'));
process.exit(1);
