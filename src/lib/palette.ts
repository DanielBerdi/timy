// Customer colors: dark enough for white text, distinct from each other. New customers get the next one.
export const PALETTE = ["#4f46e5", "#0d9488", "#c2410c", "#be185d", "#15803d", "#7e22ce", "#0369a1", "#b45309", "#b91c1c", "#475569"];

export function paletteColor(index: number): string {
  return PALETTE[((index % PALETTE.length) + PALETTE.length) % PALETTE.length];
}
