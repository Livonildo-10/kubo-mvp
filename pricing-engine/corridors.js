// @ts-check

/**
 * @typedef {Object} CorridorConfig
 * @property {string} code
 * @property {string} country
 * @property {string} sourceCurrency
 * @property {string} destinationCurrency
 * @property {'fixed'|'variable'} fxType - 'fixed': baseRate is the pegged rate. 'variable': rate must be supplied per quote.
 * @property {number|null} baseRate - EUR -> destination rate for fixed corridors; null for variable corridors.
 * @property {'flat'|'none'} feeType
 * @property {number} feeValue - absolute EUR amount when feeType is 'flat'.
 * @property {'percentage'|'none'} spreadType
 * @property {number} spreadValue - fraction (0.025 = 2.5%) when spreadType is 'percentage'.
 * @property {number} displayDecimals - decimals used when showing destination-currency amounts.
 * @property {number} rateDisplayDecimals - decimals used when showing the applied rate.
 * @property {boolean} enabled
 */

/**
 * Single source of truth for corridor pricing rules. Both index.html and
 * kubo-simulador-corredores.jsx read from here — do not duplicate these
 * values anywhere else.
 * @type {Record<string, CorridorConfig>}
 */
export const CORRIDORS = {
  AO: {
    code: 'AO',
    country: 'Angola',
    sourceCurrency: 'EUR',
    destinationCurrency: 'AOA',
    fxType: 'variable',
    baseRate: null,
    feeType: 'none',
    feeValue: 0,
    spreadType: 'percentage',
    spreadValue: 0.025,
    displayDecimals: 0,
    rateDisplayDecimals: 2,
    enabled: true,
  },
  CV: {
    code: 'CV',
    country: 'Cabo Verde',
    sourceCurrency: 'EUR',
    destinationCurrency: 'CVE',
    fxType: 'fixed',
    baseRate: 110.265,
    feeType: 'flat',
    feeValue: 1,
    spreadType: 'none',
    spreadValue: 0,
    displayDecimals: 2,
    rateDisplayDecimals: 3,
    enabled: true,
  },
  GW: {
    code: 'GW',
    country: 'Guiné-Bissau',
    sourceCurrency: 'EUR',
    destinationCurrency: 'XOF',
    fxType: 'fixed',
    baseRate: 655.957,
    feeType: 'flat',
    feeValue: 1,
    spreadType: 'none',
    spreadValue: 0,
    displayDecimals: 2,
    rateDisplayDecimals: 3,
    enabled: true,
  },
};
