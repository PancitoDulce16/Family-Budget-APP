// Utility functions module

/**
 * Formats a number as currency according to the group's settings.
 * @param {number} amount The number to format.
 * @param {string} currency The currency code (e.g., 'CRC', 'USD').
 * @param {boolean} withSymbol Whether to include the currency symbol.
 * @returns {string} The formatted currency string.
 */
export function formatCurrency(amount, currency = 'USD', withSymbol = true) {
  const symbols = {
    USD: '$',
    CRC: '₡',
  };
  const symbol = symbols[currency] || '$';
  // Ensure amount is a number and format to 2 decimal places
  const formattedAmount = (Number(amount) || 0).toFixed(2);

  return withSymbol ? `${symbol}${formattedAmount}` : formattedAmount;
}