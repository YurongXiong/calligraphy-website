import type { BrushStyle } from '../../types';

export const BRUSH_STYLES = {
  natural: { id: 'natural', name: '自然', smoothing: 0.5, widthRange: [3, 12], opacity: 0.85, textureType: 'none' },
  heavy_ink: { id: 'heavy_ink', name: '浓墨', smoothing: 0.7, widthRange: [5, 18], opacity: 1.0, textureType: 'heavy' },
  flying_white: { id: 'flying_white', name: '飞白', smoothing: 0.3, widthRange: [2, 14], opacity: 0.6, textureType: 'dry-brush' },
} as const;

export type BrushStyleId = keyof typeof BRUSH_STYLES;

export function getBrushStyle(id: BrushStyleId): BrushStyle {
  const style = BRUSH_STYLES[id];
  return {
    ...style,
    widthRange: style.widthRange as [number, number],
  };
}
