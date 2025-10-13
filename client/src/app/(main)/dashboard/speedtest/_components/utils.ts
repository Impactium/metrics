export const formatPrecision = (value: number) => Math.round(value * 10) / 10;
export const formatBytesToMbps = (value: number) => formatPrecision(value * 8 / 1_000_000);
