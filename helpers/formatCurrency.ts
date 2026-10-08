const CURRENCY_SYMBOLS: Record<string, string> = {
  GBP: "£",
  USD: "$",
  EUR: "€",
};

export const formatCurrency = (
  amount: number,
  currencyType: string,
): string => {
  const symbol = CURRENCY_SYMBOLS[currencyType] ?? "";
  const fixed = Number.isInteger(amount) ? `${amount}` : amount.toFixed(2);
  const value = fixed.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return symbol ? `${symbol}${value}` : `${value} ${currencyType}`;
};
