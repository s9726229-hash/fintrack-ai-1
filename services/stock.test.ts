import { describe, expect, it } from 'vitest';
import { parseStockTransactionCSV } from './stock';

describe('parseStockTransactionCSV', () => {
  it('uses a safe explicit label when the broker CSV has no trade-type column', () => {
    const result = parseStockTransactionCSV([
      '成交日期,股票代號,買賣別,成交數量,成交價,應收付帳款',
      '2026/08/01,0000,買,1,100,-100',
    ].join('\n'));

    expect(result.error).toBeNull();
    expect(result.transactions).toHaveLength(1);
    expect(result.transactions[0].tradeType).toBe('未提供');
  });

  it('preserves the broker trade type when the optional column is present', () => {
    const result = parseStockTransactionCSV([
      '成交日期,股票代號,買賣別,交易種類,成交數量,成交價,應收付帳款',
      '2026/08/01,0000,買,盤中零股,1,100,-100',
    ].join('\n'));

    expect(result.error).toBeNull();
    expect(result.transactions).toHaveLength(1);
    expect(result.transactions[0].tradeType).toBe('盤中零股');
  });
});
