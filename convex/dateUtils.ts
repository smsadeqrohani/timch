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

/** Parse Jalali date string (e.g. "1404/11/23" or with Persian digits) to { year, month, day }. */
export function parseJalaliDateString(str: string): { year: number; month: number; day: number } | null {
  if (!str || typeof str !== "string") return null;
  const normalized = str.replace(/[\u06F0-\u06F9]/g, (c) =>
    String("۰۱۲۳۴۵۶۷۸۹".indexOf(c))
  ).replace(/-/g, "/");
  const parts = normalized.split("/").map((p) => parseInt(p.trim(), 10));
  if (parts.length !== 3) return null;
  const [year, month, day] = parts;
  if (isNaN(year) || isNaN(month) || isNaN(day)) return null;
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  return { year, month, day };
}

/** Add months to a Jalali date (in place); returns formatted "YYYY/MM/DD" with Persian digits. */
export function addMonthsToJalaliString(
  jalaliStr: string,
  monthsToAdd: number
): string {
  const parts = parseJalaliDateString(jalaliStr);
  if (!parts) return jalaliStr;
  let { year, month, day } = parts;
  month += monthsToAdd;
  while (month > 12) {
    month -= 12;
    year += 1;
  }
  while (month < 1) {
    month += 12;
    year -= 1;
  }
  const maxDay = month <= 6 ? 31 : month <= 11 ? 30 : (isJalaliLeapYear(year) ? 30 : 29);
  if (day > maxDay) day = maxDay;
  const yearStr = toPersianNumber(year, 4);
  const monthStr = toPersianNumber(month, 2);
  const dayStr = toPersianNumber(day, 2);
  return `${yearStr}/${monthStr}/${dayStr}`;
}

/** Same as addMonthsToJalaliString but returns ASCII digits for consistent DB storage. */
export function addMonthsToJalaliStringAscii(
  jalaliStr: string,
  monthsToAdd: number
): string {
  const parts = parseJalaliDateString(jalaliStr);
  if (!parts) return jalaliStr;
  let { year, month, day } = parts;
  month += monthsToAdd;
  while (month > 12) {
    month -= 12;
    year += 1;
  }
  while (month < 1) {
    month += 12;
    year -= 1;
  }
  const maxDay = month <= 6 ? 31 : month <= 11 ? 30 : (isJalaliLeapYear(year) ? 30 : 29);
  if (day > maxDay) day = maxDay;
  const y = String(year).padStart(4, "0");
  const m = String(month).padStart(2, "0");
  const d = String(day).padStart(2, "0");
  return `${y}/${m}/${d}`;
}

function isJalaliLeapYear(jy: number): boolean {
  const r = jy % 33;
  return [1, 5, 9, 13, 17, 22, 26, 30].indexOf(r) >= 0;
}

/** Get installment due date: agreementDate + installmentNumber months (Jalali string, ASCII for DB). */
export function getInstallmentDueDateFromAgreement(
  agreementDateStr: string,
  installmentNumber: number
): string {
  return addMonthsToJalaliStringAscii(agreementDateStr, installmentNumber);
}

