// 全站統一的金額顯示格式：負號放在 $ 前面（-$909,403），一律取整數，
// 避免同一畫面出現 $-909,403 / -$978,403 / $12,157,325.4 三種寫法。
export const formatMoney = (n: number, options?: { showPlus?: boolean }): string => {
  const rounded = Math.round(n);
  const abs = Math.abs(rounded).toLocaleString();
  if (rounded < 0) return `-$${abs}`;
  if (options?.showPlus && rounded > 0) return `+$${abs}`;
  return `$${abs}`;
};

// 窄版小卡用的簡短格式（百萬以上取整數萬、十萬以下顯示到小數第一位），
// 供手機版 KPI 卡片避免數字被 truncate 截斷看不全。
export const formatMoneyCompact = (n: number, options?: { showPlus?: boolean }): string => {
  const rounded = Math.round(n);
  const abs = Math.abs(rounded);
  const sign = rounded < 0 ? '-' : (options?.showPlus && rounded > 0) ? '+' : '';
  let body: string;
  if (abs >= 100000000) {
    body = `${(abs / 100000000).toLocaleString(undefined, { maximumFractionDigits: 1 })}億`;
  } else if (abs >= 1000000) {
    body = `${Math.round(abs / 10000).toLocaleString()}萬`;
  } else if (abs >= 10000) {
    body = `${(abs / 10000).toLocaleString(undefined, { maximumFractionDigits: 1 })}萬`;
  } else {
    body = abs.toLocaleString();
  }
  return `${sign}$${body}`;
};
