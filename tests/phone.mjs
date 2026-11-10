import { strict as assert } from 'node:assert';
import { normalizePhone } from '../src/lib/phone.ts';

assert.equal(normalizePhone('064 123 4567', 'RS'), '+381641234567');
assert.equal(normalizePhone('+381 64 123 4567', 'RS'), '+381641234567');
assert.equal(normalizePhone('123', 'RS'), null);
console.log('PASS: local/international E.164 normalization and invalid phone rejection');
