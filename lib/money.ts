const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

/** Money is stored in cents everywhere; this turns 1450 into "$14.50". */
export function formatMoney(cents: number): string {
  return usd.format(cents / 100);
}
