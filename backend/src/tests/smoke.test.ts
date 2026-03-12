/**
 * Smoke tests.
 * Run with: npm test
 */
import assert from 'node:assert/strict';
import { sanitizeHTML, sanitizeString, validateIPAddress } from '../middleware/validation';

let passed = 0;
let failed = 0;

function test(name: string, fn: () => void): void {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (err: any) {
    console.error(`  ✗ ${name}: ${err.message}`);
    failed++;
  }
}

// ── sanitizeHTML ────────────────────────────────────────────────────────────
console.log('\nsanitizeHTML');

test('strips <script> tags', () => {
  const out = sanitizeHTML('<p>Hello</p><script>alert(1)</script>');
  assert.ok(!out.includes('<script>'), 'script tag must be removed');
  assert.ok(out.includes('<p>Hello</p>'), 'p tag must survive');
});

test('strips inline event handlers', () => {
  const out = sanitizeHTML('<p onclick="alert(1)">click me</p>');
  assert.ok(!out.includes('onclick'), 'onclick attribute must be removed');
  assert.ok(out.includes('click me'), 'text content must survive');
});

test('strips javascript: hrefs', () => {
  const out = sanitizeHTML('<a href="javascript:alert(1)">link</a>');
  assert.ok(!out.includes('javascript:'), 'javascript: scheme must be removed');
});

test('preserves allowed formatting tags', () => {
  const out = sanitizeHTML('<strong>bold</strong> <em>italic</em>');
  assert.ok(out.includes('<strong>bold</strong>'));
  assert.ok(out.includes('<em>italic</em>'));
});

test('adds rel="noopener noreferrer" to links', () => {
  const out = sanitizeHTML('<a href="https://example.com">link</a>');
  assert.ok(out.includes('noopener'), 'rel must include noopener');
  assert.ok(out.includes('noreferrer'), 'rel must include noreferrer');
});

test('returns empty string for non-string input', () => {
  assert.equal(sanitizeHTML(null), '');
  assert.equal(sanitizeHTML(undefined), '');
  assert.equal(sanitizeHTML(42 as any), '');
});

// ── sanitizeString ──────────────────────────────────────────────────────────
console.log('\nsanitizeString');

test('trims leading and trailing whitespace', () => {
  assert.equal(sanitizeString('  hello  '), 'hello');
});

test('collapses internal whitespace', () => {
  assert.equal(sanitizeString('hello   world'), 'hello world');
});

test('returns empty string for non-string input', () => {
  assert.equal(sanitizeString(null), '');
  assert.equal(sanitizeString(undefined), '');
  assert.equal(sanitizeString(0 as any), '');
});

// ── validateIPAddress ───────────────────────────────────────────────────────
console.log('\nvalidateIPAddress');

test('accepts valid IPv4 addresses', () => {
  assert.ok(validateIPAddress('192.168.1.1'));
  assert.ok(validateIPAddress('0.0.0.0'));
  assert.ok(validateIPAddress('255.255.255.255'));
});

test('rejects out-of-range octets', () => {
  assert.ok(!validateIPAddress('256.0.0.1'));
  assert.ok(!validateIPAddress('999.999.999.999'));
});

test('rejects non-IP strings', () => {
  assert.ok(!validateIPAddress('not-an-ip'));
  assert.ok(!validateIPAddress(''));
  assert.ok(!validateIPAddress('localhost'));
});

// ── summary ─────────────────────────────────────────────────────────────────
console.log(`\n${passed} passed, ${failed} failed\n`);
if (failed > 0) process.exit(1);
