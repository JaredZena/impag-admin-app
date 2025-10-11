/**
 * Currency formatting utilities
 */

export const formatCurrency = (amount: number | null, currency: string = 'MXN'): string => {
  if (amount === null || amount === undefined) return 'N/A';
  
  const formatter = new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  
  return formatter.format(amount);
};

export const getCurrencySymbol = (currency: string): string => {
  switch (currency.toUpperCase()) {
    case 'USD':
      return '$';
    case 'MXN':
      return '$';
    case 'EUR':
      return '€';
    default:
      return '$';
  }
};

export const getCurrencyCode = (currency: string): string => {
  return currency.toUpperCase();
};

export const formatPriceWithCurrency = (amount: number | null, currency: string = 'MXN'): string => {
  if (amount === null || amount === undefined) return 'N/A';
  
  const symbol = getCurrencySymbol(currency);
  const code = getCurrencyCode(currency);
  
  return `${symbol}${amount.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${code}`;
};

export const isUSD = (currency: string): boolean => {
  return currency.toUpperCase() === 'USD';
};

export const isMXN = (currency: string): boolean => {
  return currency.toUpperCase() === 'MXN';
};



