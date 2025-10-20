// Utility functions module

const EXCHANGE_RATE_API_KEY = 'a9b02159c01b0c7c132f1a65';
const EXCHANGE_RATE_CACHE_KEY = 'exchangeRateData';

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

/**
 * Fetches the latest USD to CRC exchange rate.
 * It uses sessionStorage to cache the rate for 1 hour to avoid excessive API calls.
 * @returns {Promise<number>} The exchange rate for 1 USD in CRC.
 */
export async function getExchangeRate() {
  const cachedData = sessionStorage.getItem(EXCHANGE_RATE_CACHE_KEY);
  const now = new Date().getTime();

  if (cachedData) {
    const { rate, timestamp } = JSON.parse(cachedData);
    // Check if cache is less than 1 hour old
    if (now - timestamp < 3600 * 1000) {
      return rate;
    }
  }

  // Fallback rate in case API fails
  const fallbackRate = 500;

  try {
    const response = await fetch(`https://v6.exchangerate-api.com/v6/${EXCHANGE_RATE_API_KEY}/latest/USD`);
    if (!response.ok) {
      console.warn('Exchange rate API failed, using fallback rate.');
      return fallbackRate;
    }
    const data = await response.json();
    const rate = data.conversion_rates.CRC;

    // Cache the new rate and timestamp
    sessionStorage.setItem(EXCHANGE_RATE_CACHE_KEY, JSON.stringify({ rate, timestamp: now }));

    return rate;
  } catch (error) {
    console.error('Error fetching exchange rate:', error);
    return fallbackRate; // Return fallback on network error
  }
}