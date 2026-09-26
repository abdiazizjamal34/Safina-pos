export const CURRENCY_CODE = 'ETB';

export const formatCurrency = (value, options = {}) => {
  const amount = Number(value || 0);
  return `${CURRENCY_CODE} ${amount.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    ...options,
  })}`;
};
