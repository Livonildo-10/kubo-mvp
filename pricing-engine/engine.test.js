import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeQuote, roundMoney, getCorridor, getFeeLabel } from './engine.js';
import { CORRIDORS } from './corridors.js';

test('roundMoney avoids classic binary float drift', () => {
  assert.equal(roundMoney(1.005, 2), 1.01);
  assert.equal(roundMoney(55022.235, 2), 55022.24);
});

test('roundMoney never returns NaN/Infinity for non-finite input', () => {
  assert.equal(roundMoney(NaN, 2), 0);
  assert.equal(roundMoney(Infinity, 2), 0);
});

test('GW: 1000 EUR, fee 1, rate 655.957 -> recipient 655301.04 XOF', () => {
  const quote = computeQuote({ corridorCode: 'GW', sendAmount: 1000 });
  assert.equal(quote.amountAfterFee, 999);
  assert.equal(quote.recipientAmount, 655301.04);
  assert.equal(quote.currency, 'XOF');
  assert.equal(quote.totalCost, 1); // flat-fee corridors always cost exactly the fee, in EUR
});

test('CV: 500 EUR, fee 1, rate 110.265 -> recipient 55022.24 CVE', () => {
  const quote = computeQuote({ corridorCode: 'CV', sendAmount: 500 });
  assert.equal(quote.amountAfterFee, 499);
  assert.equal(quote.recipientAmount, 55022.24);
  assert.equal(quote.currency, 'CVE');
  assert.equal(quote.totalCost, 1);
});

test('GW: 500 EUR -> recipient equals (sendAmount - fee) * baseRate rounded to 2dp', () => {
  const quote = computeQuote({ corridorCode: 'GW', sendAmount: 500 });
  const { baseRate, feeValue } = CORRIDORS.GW;
  assert.ok(baseRate !== null);
  assert.equal(quote.recipientAmount, roundMoney((500 - feeValue) * baseRate, 2));
  assert.equal(quote.recipientAmount, 327322.54);
});

test('CV: 0.50 EUR (below the flat fee) -> recipient 0, totalCost capped at sendAmount', () => {
  const quote = computeQuote({ corridorCode: 'CV', sendAmount: 0.5 });
  assert.equal(quote.recipientAmount, 0);
  assert.equal(quote.totalCost, 0.5);
});

test('CV: sendAmount exactly equal to fee -> recipient 0, totalCost = sendAmount', () => {
  const quote = computeQuote({ corridorCode: 'CV', sendAmount: 1 });
  assert.equal(quote.recipientAmount, 0);
  assert.equal(quote.totalCost, 1);
});

test('AO: 500 EUR, marketRate 1050, spread 2.5% -> matches current implementation exactly', () => {
  const quote = computeQuote({ corridorCode: 'AO', sendAmount: 500, marketRate: 1050 });
  assert.equal(quote.customerRate, 1023.75);
  assert.equal(quote.recipientAmount, 511875); // 500 * 1023.75, displayDecimals=0 for AOA
  assert.equal(quote.totalCost, 12.82); // (500*1050 - 500*1023.75) / 1023.75
});

test('AO edge case: marketRate = 0 never produces NaN/Infinity', () => {
  const quote = computeQuote({ corridorCode: 'AO', sendAmount: 500, marketRate: 0 });
  assert.equal(quote.recipientAmount, 0);
  assert.equal(quote.totalCost, 0);
  assert.ok(Number.isFinite(quote.recipientAmount));
  assert.ok(Number.isFinite(quote.totalCost));
});

test('AO edge case: sendAmount = 0 never produces NaN/Infinity', () => {
  const quote = computeQuote({ corridorCode: 'AO', sendAmount: 0, marketRate: 1050 });
  assert.equal(quote.recipientAmount, 0);
  assert.equal(quote.totalCost, 0);
});

test('negative sendAmount is clamped to 0, never negative output', () => {
  const quote = computeQuote({ corridorCode: 'AO', sendAmount: -100, marketRate: 1050 });
  assert.equal(quote.sendAmount, 0);
  assert.equal(quote.recipientAmount, 0);
  assert.ok(quote.recipientAmount >= 0);
  assert.ok(quote.totalCost >= 0);
});

test('negative marketRate is clamped to 0', () => {
  const quote = computeQuote({ corridorCode: 'AO', sendAmount: 500, marketRate: -1050 });
  assert.equal(quote.marketRate, 0);
  assert.equal(quote.customerRate, 0);
});

test('unknown corridor code throws instead of silently returning garbage', () => {
  assert.throws(() => computeQuote({ corridorCode: 'XX', sendAmount: 100 }));
  assert.throws(() => getCorridor('XX'));
});

test('getFeeLabel matches each corridor pricing model', () => {
  assert.equal(getFeeLabel(getCorridor('AO')), '2.5% spread');
  assert.equal(getFeeLabel(getCorridor('CV')), '€1 fixo');
  assert.equal(getFeeLabel(getCorridor('GW')), '€1 fixo');
});
