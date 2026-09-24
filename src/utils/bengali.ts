export function toBengaliNumber(num: number | string): string {
  const bengaliDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
  return String(num).replace(/[0-9]/g, (digit) => bengaliDigits[Number(digit)] || digit);
}

export function formatTaka(amount: number): string {
  const formatted = Number(amount).toLocaleString('en-US');
  return `${toBengaliNumber(formatted)}.০০৳`;
}

export function formatTakaSimple(amount: number): string {
  const formatted = Number(amount).toLocaleString('en-US');
  return `${toBengaliNumber(formatted)}/- টাকা`;
}
