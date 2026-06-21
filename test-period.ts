function parsePeriod(periodStr: string): { start: Date; end: Date } | null {
  try {
    if (periodStr.includes('Q')) {
      const match = periodStr.match(/(\d+)年Q(\d)/);
      if (!match) return null;
      const year = parseInt(match[1], 10);
      const quarter = parseInt(match[2], 10);
      const startMonth = (quarter - 1) * 3;
      const endMonth = startMonth + 3;
      return {
        start: new Date(year, startMonth, 1),
        end: new Date(year, endMonth, 0, 23, 59, 59, 999),
      };
    } else {
      const match = periodStr.match(/(\d+)年(\d+)月/);
      if (!match) return null;
      const year = parseInt(match[1], 10);
      const month = parseInt(match[2], 10) - 1;
      const lastDay = new Date(year, month + 1, 0).getDate();
      return {
        start: new Date(year, month, 1),
        end: new Date(year, month, lastDay, 23, 59, 59, 999),
      };
    }
  } catch {
    return null;
  }
}

function parseCreatedAt(createdAtStr: string): Date | null {
  try {
    const parts = createdAtStr.split(/[\/\s年日月]/g).filter(Boolean);
    if (parts.length < 3) return null;
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    return new Date(year, month, day);
  } catch {
    return null;
  }
}

interface Rectification {
  createdAt: string;
}

function isRectInPeriod(rect: Rectification, period: string): boolean {
  const range = parsePeriod(period);
  if (!range) return true;
  const created = parseCreatedAt(rect.createdAt);
  if (!created) return true;
  return created >= range.start && created <= range.end;
}

// 测试数据
const testRects = [
  { createdAt: '2025年6月10日 14:30:00' },
  { createdAt: '2025年6月18日 09:15:00' },
  { createdAt: '2025年6月15日 16:45:00' },
  { createdAt: '2025年5月20日 11:00:00' },
  { createdAt: '2025年6月20日 10:30:00' },
];

console.log('=== 测试 parsePeriod ===');
console.log('2025年5月:', parsePeriod('2025年5月'));
console.log('2025年6月:', parsePeriod('2025年6月'));
console.log('2025年Q2:', parsePeriod('2025年Q2'));

console.log('\n=== 测试 parseCreatedAt ===');
testRects.forEach((r, i) => {
  console.log(`r${i + 1}:`, r.createdAt, '->', parseCreatedAt(r.createdAt));
});

console.log('\n=== 测试 isRectInPeriod ===');
console.log('--- 2025年5月 ---');
testRects.forEach((r, i) => {
  console.log(`r${i + 1}:`, isRectInPeriod(r, '2025年5月'));
});
console.log('--- 2025年6月 ---');
testRects.forEach((r, i) => {
  console.log(`r${i + 1}:`, isRectInPeriod(r, '2025年6月'));
});

console.log('\n=== 预期结果 ===');
console.log('2025年5月 应该有 1 条: r004');
console.log('2025年6月 应该有 4 条: r001, r002, r003, r005');

console.log('\n=== 实际结果 ===');
const mayCount = testRects.filter((r) => isRectInPeriod(r, '2025年5月')).length;
const junCount = testRects.filter((r) => isRectInPeriod(r, '2025年6月')).length;
console.log('2025年5月:', mayCount, '条');
console.log('2025年6月:', junCount, '条');
