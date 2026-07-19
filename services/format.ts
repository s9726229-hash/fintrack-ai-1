// 全站統一的金額顯示格式：負號放在 $ 前面（-$909,403），一律取整數，
// 避免同一畫面出現 $-909,403 / -$978,403 / $12,157,325.4 三種寫法。
export const formatMoney = (n: number, options?: { showPlus?: boolean }): string => {
  const rounded = Math.round(n);
  const abs = Math.abs(rounded).toLocaleString();
  if (rounded < 0) return `-$${abs}`;
  if (options?.showPlus && rounded > 0) return `+$${abs}`;
  return `$${abs}`;
};
