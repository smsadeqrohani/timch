import { toPersianNumbers } from "../lib/utils";

export type RawSizeType = "mostatil" | "morabba" | "dayere" | "gerd" | "beyzi";
export type NormalizedSizeType = "mostatil" | "morabba" | "gerd" | "beyzi";

const typeLabels: Record<NormalizedSizeType, string> = {
  mostatil: "مستطیل",
  morabba: "مربع",
  gerd: "گرد",
  beyzi: "بیضی",
};

const trimTrailingZeros = (value: number) => {
  const raw = value.toString();
  // Remove trailing zeros after decimal point
  return raw.includes(".") ? raw.replace(/\.?0+$/, "") : raw;
};

const formatDimension = (value: number) => toPersianNumbers(trimTrailingZeros(value));

export const normalizeSizeType = (type: RawSizeType | NormalizedSizeType): NormalizedSizeType =>
  type === "dayere" ? "gerd" : type;

export const formatSizeDimensions = (x: number, y: number) =>
  `${formatDimension(y)}*${formatDimension(x)}`;

export type SizeLike = {
  x: number;
  y: number;
  type?: RawSizeType | NormalizedSizeType | null;
};

export const formatSizeLabel = (size: SizeLike) => {
  const dimensions = formatSizeDimensions(size.x, size.y);
  if (!size.type) {
    return dimensions;
  }

  const normalizedType = normalizeSizeType(size.type);
  if (normalizedType === "mostatil" || normalizedType === "morabba") {
    return dimensions;
  }

  return `${dimensions} ${typeLabels[normalizedType]}`;
};

export const formatSizeFromValues = (
  x: number,
  y: number,
  type?: RawSizeType | NormalizedSizeType | null,
) => formatSizeLabel({ x, y, type });

export const findSizeByDimensions = <T extends { x: number; y: number }>(
  sizes: T[] | undefined,
  x: number,
  y: number,
) =>
  sizes?.find(
    (size) => Math.abs(size.x - x) < 1e-6 && Math.abs(size.y - y) < 1e-6,
  );


