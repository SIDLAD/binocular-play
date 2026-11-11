// Checks every URL in the in-app evidence content. Run: npm run check-links
// Sends only a plain GET with a generic user agent. No personal data.
import { readFileSync } from 'node:fs';

const file = new URL('../src/core/content/evidence.ts', import.meta.url);
const text = readFileSync(file, 'utf8');
const urls = [...new Set([...text.matchAll(/https:\/\/[^'"\s)]+/g)].map((m) => m[0]))];

const headers = {
  'user-agent': 'Mozilla/5.0 (compatible; link-checker)',
  accept: 'text/html,application/xhtml+xml,application/pdf;q=0.9,*/*;q=0.8',
};

async function check(url) {
  try {
    const res = await fetch(url, { headers, redirect: 'follow', signal: AbortSignal.timeout(25000) });
    // Drain a little so the connection closes cleanly.
    await res.body?.cancel();
    return { url, status: res.status, final: res.url };
  } catch (err) {
    return { url, status: 0, error: String(err?.cause?.code ?? err?.name ?? err) };
  }
}

const results = [];
for (const url of urls) results.push(await check(url));

let failed = 0;
for (const r of results) {
  let verdict = 'ok';
  if (r.status === 0) verdict = `NO RESPONSE (${r.error})`;
  else if (r.status === 401 || r.status === 403 || r.status === 429) verdict = `check by hand (HTTP ${r.status}: the site refuses scripts)`;
  else if (r.status >= 400) verdict = `BROKEN (HTTP ${r.status})`;
  if (verdict.startsWith('BROKEN') || verdict.startsWith('NO RESPONSE')) failed++;
  console.log(`${verdict.padEnd(60)} ${r.url}`);
}
console.log(`\n${urls.length} links, ${failed} failed.`);
process.exit(failed > 0 ? 1 : 0);
