/**
 * Resend API full audit script
 * Run: node scripts/audit-resend.mjs
 * (loads env from .env.local automatically)
 */
import { readFileSync } from 'fs';
import { resolve } from 'path';

// ── Load .env.local manually ──────────────────────────────────────────────────
try {
  const envPath = resolve(process.cwd(), '.env.local');
  const lines = readFileSync(envPath, 'utf8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx === -1) continue;
    const k = trimmed.slice(0, idx).trim();
    const v = trimmed.slice(idx + 1).trim();
    if (!process.env[k]) process.env[k] = v;
  }
} catch {
  // .env.local may not exist locally — env vars may come from shell
}

const key  = process.env.RESEND_API_KEY;
const from = process.env.RESEND_FROM_EMAIL;

console.log('\n══════════════════════════════════════════════════════');
console.log('  RESEND API FULL AUDIT');
console.log('══════════════════════════════════════════════════════\n');

// ── Check 1: env vars ─────────────────────────────────────────────────────────
const keyOk   = key  && key  !== 'your_resend_api_key_here'  && key.startsWith('re_');
const fromSet = from && from !== 'noreply@yourdomain.com'    && from !== 'onboarding@resend.dev';

console.log('ENV VAR CHECK');
console.log('─────────────');
console.log('RESEND_API_KEY   :', !key                         ? '❌  NOT SET'
  : key === 'your_resend_api_key_here'                         ? '❌  Still a placeholder'
  : !key.startsWith('re_')                                     ? '⚠️   Set but unexpected format (should start with re_)'
  :                                                              '✅  Set (' + key.slice(0,10) + '...)');

console.log('RESEND_FROM_EMAIL:', !from                        ? '❌  NOT SET — add noreply@yourdomain.com'
  : from === 'onboarding@resend.dev'                           ? '❌  Default sender — 403s for non-owner recipients'
  : from === 'noreply@yourdomain.com'                          ? '❌  Still a placeholder — set your real domain'
  :                                                              '✅  Set to: ' + from);

if (!keyOk) {
  console.log('\n❌  FATAL: RESEND_API_KEY is missing or invalid.');
  console.log('   → Go to https://resend.com/api-keys → Create key → paste it as RESEND_API_KEY');
  process.exit(1);
}
if (!fromSet) {
  console.log('\n❌  FATAL: RESEND_FROM_EMAIL is missing or a placeholder.');
  console.log('   → Set it to noreply@yourdomain.com (after verifying at https://resend.com/domains)');
  process.exit(1);
}

const fromDomain = from.split('@')[1];
console.log('\nFrom-domain to verify:', fromDomain);

// ── Check 2: API key valid? ───────────────────────────────────────────────────
console.log('\n─────────────────────────────────────────');
console.log('API KEY VALIDATION (GET /domains)');
console.log('─────────────────────────────────────────');

let domains = [];
try {
  const res = await fetch('https://api.resend.com/domains', {
    headers: { Authorization: `Bearer ${key}` },
  });
  const body = await res.json();

  if (res.status === 401) {
    console.log('❌  API KEY INVALID — 401 Unauthorized');
    console.log('   → Create a new key at https://resend.com/api-keys');
    process.exit(1);
  }
  if (res.status === 403) {
    console.log('❌  API KEY lacks permission — 403 Forbidden');
    console.log('   → Make sure your key has "Full access" or at least "Sending access"');
    process.exit(1);
  }
  if (res.status !== 200) {
    console.log(`❌  Unexpected HTTP ${res.status}:`, JSON.stringify(body));
    process.exit(1);
  }

  domains = body.data || [];
  console.log('✅  API key is VALID');
} catch (err) {
  console.log('❌  Network error contacting Resend API:', err.message);
  process.exit(1);
}

// ── Check 3: Domain list ──────────────────────────────────────────────────────
console.log('\n─────────────────────────────────────────');
console.log('DOMAINS ON THIS RESEND ACCOUNT');
console.log('─────────────────────────────────────────');

if (domains.length === 0) {
  console.log('⚠️   No domains found.');
  console.log('   → Add your domain at https://resend.com/domains');
  console.log('   → Add the DNS records Resend shows you (SPF, DKIM, DMARC)');
  console.log('   → Wait for status to change to "verified"');
} else {
  for (const d of domains) {
    const icon = d.status === 'verified' ? '✅' : '⚠️ ';
    console.log(`${icon}  ${d.name}  [${d.status}]`);
  }
}

// ── Check 4: RESEND_FROM_EMAIL domain match ───────────────────────────────────
console.log('\n─────────────────────────────────────────');
console.log('RESEND_FROM_EMAIL DOMAIN CHECK');
console.log('─────────────────────────────────────────');

const matched = domains.find(d => d.name === fromDomain);

if (!matched) {
  console.log(`❌  "${fromDomain}" is NOT in your Resend account`);
  console.log('   → Either add it at https://resend.com/domains');
  console.log('   → Or update RESEND_FROM_EMAIL to match a domain listed above');
} else if (matched.status !== 'verified') {
  console.log(`⚠️   "${fromDomain}" exists but is NOT verified yet (status: ${matched.status})`);
  console.log('   → Add the DNS records shown in Resend → wait a few minutes → re-run this script');
} else {
  console.log(`✅  "${fromDomain}" is VERIFIED`);
}

// ── Check 5: Live send test ───────────────────────────────────────────────────
if (matched?.status === 'verified') {
  const testTo = process.argv[2]; // optional: node audit-resend.mjs you@email.com
  if (testTo) {
    console.log('\n─────────────────────────────────────────');
    console.log(`LIVE SEND TEST → ${testTo}`);
    console.log('─────────────────────────────────────────');
    try {
      const { Resend } = await import('resend');
      const resend = new Resend(key);
      const { data, error } = await resend.emails.send({
        from: `CLW Marketplace <${from}>`,
        to: [testTo],
        subject: '[Audit] CLW Marketplace email delivery test',
        text: 'If you received this, Resend is configured correctly and emails will deliver.',
        html: '<p>If you received this, <strong>Resend is configured correctly</strong> and OTP emails will deliver.</p>',
      });
      if (error) {
        console.log('❌  Send failed:', (error).message || JSON.stringify(error));
      } else {
        console.log('✅  Email sent successfully! Message ID:', data?.id);
        console.log('   → Check inbox for', testTo);
      }
    } catch (e) {
      console.log('❌  SDK error during send:', e.message);
    }
  } else {
    console.log('\n💡  To also run a live send test:');
    console.log('   node scripts/audit-resend.mjs you@youremail.com');
  }
}

// ── Summary ───────────────────────────────────────────────────────────────────
console.log('\n══════════════════════════════════════════════════════');
const allGood = keyOk && fromSet && matched?.status === 'verified';
if (allGood) {
  console.log('  ✅  ALL CHECKS PASSED — Resend is ready to deliver OTP emails');
} else {
  console.log('  ❌  ISSUES FOUND — follow the steps above, then re-run this script');
}
console.log('══════════════════════════════════════════════════════\n');
