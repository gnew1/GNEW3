
export function toMinor(amount: number, decimals = 2) {
  const mul = 10 ** decimals;
  return Math.round(amount * mul);
}


