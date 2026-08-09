// @ts-check
import { CORRIDORS } from './corridors.js';

/**
 * @typedef {import('./corridors.js').CorridorConfig} CorridorConfig
 */

/**
 * @typedef {Object} Quote
 * @property {string} corridor
 * @property {number} sendAmount
 * @property {number} fee
 * @property {number} amountAfterFee
 * @property {number} marketRate
 * @property {number} customerRate
 * @property {number} spread
 * @property {number} recipientAmount - rounded to the corridor's displayDecimals.
 * @property {number} marketReceivedAmount - what sendAmount would buy at marketRate with no fee, rounded to displayDecimals.
 * @property {number} totalCost - implied cost of the operation, in EUR, rounded to 2 decimals.
 * @property {string} currency
 */

/**
 * Looks up an enabled corridor config by code.
 * @param {string} code
 * @returns {CorridorConfig}
 */
export function getCorridor(code) {
  const corridor = CORRIDORS[code];
  if (!corridor || !corridor.enabled) {
    throw new Error(`Unknown or disabled corridor: ${code}`);
  }
  return corridor;
}

/**
 * Rounds a value to a fixed number of decimals using a decimal-string
 * technique instead of raw `value * 10**decimals`, which avoids the classic
 * binary floating-point drift (e.g. `1.005 * 100` -> `100.49999999999999`
 * in native JS, which would wrongly round down to 1.00 instead of 1.01).
 * @param {number} value
 * @param {number} [decimals]
 * @returns {number}
 */
export function roundMoney(value, decimals = 2) {
  if (!Number.isFinite(value)) return 0;
  const rounded = Math.round(Number(`${value}e${decimals}`));
  return Number(`${rounded}e-${decimals}`);
}

/**
 * Formats a number as a pt-PT locale string with a fixed decimal count.
 * Presentation-only helper; does not perform any monetary rounding itself.
 * @param {number} value
 * @param {number} [decimals]
 * @returns {string}
 */
export function formatMoney(value, decimals = 2) {
  return Number(value).toLocaleString('pt-PT', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/**
 * Human-readable label describing how a corridor charges (spread vs flat fee).
 * @param {CorridorConfig} corridor
 * @returns {string}
 */
export function getFeeLabel(corridor) {
  if (corridor.spreadType === 'percentage' && corridor.spreadValue > 0) {
    return `${(corridor.spreadValue * 100).toFixed(1)}% spread`;
  }
  if (corridor.feeType === 'flat') {
    return `€${corridor.feeValue} fixo`;
  }
  return '—';
}

/**
 * Computes a remittance quote for a corridor.
 *
 * Pipeline: sendAmount -> fee -> amountAfterFee -> FX rate (fixed or
 * marketRate*spread) -> recipientAmount -> totalCost.
 *
 * Guarantees: never negative, never NaN/Infinity, and when
 * sendAmount <= fee the recipient gets 0 and the customer's total cost is
 * capped at whatever they sent (they can't lose more than they sent).
 *
 * @param {Object} params
 * @param {string} params.corridorCode
 * @param {number|string} params.sendAmount
 * @param {number|string} [params.marketRate] - required for variable-rate corridors (e.g. AO); ignored for fixed ones.
 * @returns {Quote}
 */
export function computeQuote({ corridorCode, sendAmount, marketRate }) {
  const corridor = getCorridor(corridorCode);

  const amt = Math.max(Number(sendAmount) || 0, 0);
  const fee = corridor.feeType === 'flat' ? Math.max(corridor.feeValue, 0) : 0;

  const resolvedMarketRate =
    corridor.fxType === 'variable'
      ? Math.max(Number(marketRate) || 0, 0)
      : /** @type {number} */ (corridor.baseRate);

  const spread = corridor.spreadType === 'percentage' ? corridor.spreadValue : 0;
  const customerRate = resolvedMarketRate * (1 - spread);

  const base = {
    corridor: corridor.code,
    sendAmount: amt,
    fee,
    marketRate: resolvedMarketRate,
    customerRate,
    spread,
    currency: corridor.destinationCurrency,
  };

  // Guard: can't take a fee larger than what was sent — recipient gets
  // nothing, and the customer's loss is capped at the amount they sent.
  if (amt <= fee) {
    return {
      ...base,
      amountAfterFee: 0,
      recipientAmount: 0,
      marketReceivedAmount: roundMoney(amt * resolvedMarketRate, corridor.displayDecimals),
      totalCost: roundMoney(amt, 2),
    };
  }

  const amountAfterFee = amt - fee;
  const recipientAmountRaw = amountAfterFee * customerRate;
  const marketReceivedRaw = amt * resolvedMarketRate;
  const costRaw = marketReceivedRaw - recipientAmountRaw;
  // customerRate can legitimately be 0 (e.g. AO with marketRate=0) — guard
  // against 0/0 instead of letting it produce NaN.
  const totalCostRaw = customerRate ? costRaw / customerRate : 0;

  return {
    ...base,
    amountAfterFee,
    recipientAmount: roundMoney(Math.max(recipientAmountRaw, 0), corridor.displayDecimals),
    marketReceivedAmount: roundMoney(Math.max(marketReceivedRaw, 0), corridor.displayDecimals),
    totalCost: roundMoney(Math.max(totalCostRaw, 0), 2),
  };
}
