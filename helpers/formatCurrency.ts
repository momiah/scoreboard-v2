const CURRENCY_SYMBOLS: Record<string, string> = {
  GBP: "£",
  USD: "$",
  EUR: "€",
};

export const formatCurrency = (amount: number, currencyType: string): string => {
  const symbol = CURRENCY_SYMBOLS[currencyType] ?? "";
  const value = Number.isInteger(amount) ? `${amount}` : amount.toFixed(2);
  return symbol ? `${symbol}${value}` : `${value} ${currencyType}`;
};
