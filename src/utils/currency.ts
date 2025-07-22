/**
 * Currency formatting utilities for Madagascar Ariary (MGA)
 */

/**
 * Format amount as Madagascar Ariary currency
 * @param amount - The amount to format
 * @param showSymbol - Whether to show the currency symbol (default: true)
 * @returns Formatted currency string
 */
export function formatCurrency(amount: number | string, showSymbol: boolean = true): string {
  const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  
  if (isNaN(numericAmount)) {
    return showSymbol ? 'Ar 0.00' : '0.00';
  }

  // Format with commas for thousands
  const formatted = numericAmount.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });

  return showSymbol ? `Ar ${formatted}` : formatted;
}

/**
 * Format amount as compact currency (e.g., "Ar 1.2K", "Ar 1.5M")
 * @param amount - The amount to format
 * @returns Compact formatted currency string
 */
export function formatCompactCurrency(amount: number | string): string {
  const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  
  if (isNaN(numericAmount)) {
    return 'Ar 0';
  }

  if (numericAmount >= 1000000) {
    return `Ar ${(numericAmount / 1000000).toFixed(1)}M`;
  } else if (numericAmount >= 1000) {
    return `Ar ${(numericAmount / 1000).toFixed(1)}K`;
  } else {
    return `Ar ${numericAmount.toFixed(0)}`;
  }
}

/**
 * Parse currency string to number
 * @param currencyString - String like "Ar 1,234.56" or "1,234.56"
 * @returns Numeric value
 */
export function parseCurrency(currencyString: string): number {
  if (!currencyString) return 0;
  
  // Remove currency symbol and whitespace, then parse
  const cleanString = currencyString
    .replace(/Ar\s*/i, '')
    .replace(/,/g, '')
    .trim();
  
  const parsed = parseFloat(cleanString);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Validate if a string is a valid currency amount
 * @param value - The value to validate
 * @returns True if valid currency format
 */
export function isValidCurrency(value: string): boolean {
  if (!value || value.trim() === '') return false;
  
  const cleanValue = value.replace(/Ar\s*/i, '').replace(/,/g, '').trim();
  const parsed = parseFloat(cleanValue);
  
  return !isNaN(parsed) && parsed >= 0;
}

/**
 * Get currency symbol for Madagascar
 */
export function getCurrencySymbol(): string {
  return 'Ar';
}

/**
 * Get currency code for Madagascar
 */
export function getCurrencyCode(): string {
  return 'MGA';
}

/**
 * Format amount for input fields (without currency symbol)
 * @param amount - The amount to format
 * @returns Formatted string for input
 */
export function formatCurrencyForInput(amount: number | string): string {
  return formatCurrency(amount, false);
}

/**
 * Calculate percentage of total
 * @param amount - The amount
 * @param total - The total amount
 * @returns Percentage string
 */
export function calculatePercentage(amount: number, total: number): string {
  if (total === 0) return '0%';
  const percentage = (amount / total) * 100;
  return `${percentage.toFixed(1)}%`;
} 