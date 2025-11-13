const GREGORIAN_MONTH_DAYS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
const JALALI_MONTH_DAYS = [31, 31, 31, 31, 31, 31, 30, 30, 30, 30, 30, 29];

type JalaliDateParts = {
  year: number;
  month: number;
  day: number;
};

export function formatJalaliDate(date: Date): string {
  const { year, month, day } = gregorianToJalali(date);
  const yearStr = toPersianNumber(year, 4);
  const monthStr = toPersianNumber(month, 2);
  const dayStr = toPersianNumber(day, 2);
  return `${yearStr}/${monthStr}/${dayStr}`;
}

function gregorianToJalali(date: Date): JalaliDateParts {
  let gy = date.getFullYear();
  let gm = date.getMonth() + 1;
  let gd = date.getDate();

  let gDayNo =
    365 * (gy - 1600) +
    Math.floor((gy - 1600 + 3) / 4) -
    Math.floor((gy - 1600 + 99) / 100) +
    Math.floor((gy - 1600 + 399) / 400);

  for (let i = 0; i < gm - 1; i++) {
    gDayNo += GREGORIAN_MONTH_DAYS[i];
  }

  if (gm > 2 && isGregorianLeapYear(gy)) {
    gDayNo += 1;
  }

  gDayNo += gd - 1;

  let jDayNo = gDayNo - 79;

  const jNp = Math.floor(jDayNo / 12053);
  jDayNo %= 12053;

  let jy = 979 + 33 * jNp + 4 * Math.floor(jDayNo / 1461);
  jDayNo %= 1461;

  if (jDayNo >= 366) {
    jy += Math.floor((jDayNo - 366) / 365);
    jDayNo = (jDayNo - 366) % 365;
  }

  let jm = 0;
  for (; jm < 11 && jDayNo >= JALALI_MONTH_DAYS[jm]; jm += 1) {
    jDayNo -= JALALI_MONTH_DAYS[jm];
  }

  const jd = jDayNo + 1;

  return { year: jy, month: jm + 1, day: jd };
}

function isGregorianLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

function toPersianNumber(value: number, minLength: number): string {
  const persianDigits = value.toLocaleString('fa-IR', { useGrouping: false });
  if (persianDigits.length >= minLength) {
    return persianDigits;
  }
  return '۰'.repeat(minLength - persianDigits.length) + persianDigits;
}

