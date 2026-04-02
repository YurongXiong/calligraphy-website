// 点数据
export interface Point {
  x: number;
  y: number;
  t: number;
  pressure?: number;
}

// 笔画数据
export interface Stroke {
  id: string;
  points: Point[];
  smoothedPath: BezierPath[];
}

// 贝塞尔路径
export interface BezierPath {
  p0: Point;
  p1: Point;
  p2: Point;
  p3: Point;
}

// 单字笔迹
export interface CharacterStrokes {
  charId: string;
  character: string;
  strokes: Stroke[];
  canvas?: HTMLCanvasElement;
}

// 风格定义
export interface BrushStyle {
  id: 'natural' | 'heavy_ink' | 'flying_white';
  name: string;
  smoothing: number;
  widthRange: [number, number];
  opacity: number;
  textureType: 'none' | 'heavy' | 'dry-brush' | 'fog';
}

// 春联文本
export interface CoupletText {
  upper: string;
  lower: string;
  banner?: string;
}

// 作品形式
export type CategoryId = 'couplet' | 'hanging' | 'plaque' | 'single';

export interface Category {
  id: CategoryId;
  name: string;
  description: string;
  maxChars: number;
  hasBanner?: boolean;
}

// 模板
export interface Template {
  id: string;
  name: string;
  categoryId: CategoryId;
  bgColor: string;
  bgImage?: string;
  borderStyle: string;
  textColor: string;
  textScale?: number;
  textSpacingScale?: number;
  textOffsetY?: number;
  textOffsetX?: number;
  bgScaleX?: number;
}

// 字位布局
export interface CharPosition {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  positionType: 'upper' | 'lower' | 'banner' | 'single';
}

// 项目状态
export interface ProjectStore {
  projectId: string;
  categoryId: CategoryId | null;
  text: string | CoupletText | null;
  characters: CharacterStrokes[];
  currentCharIndex: number;
  styleId: BrushStyle['id'];
  templateId: string;
  // Actions
  setCategory: (id: CategoryId) => void;
  setText: (text: string | CoupletText) => void;
  updateCharacterStrokes: (index: number, strokes: Stroke[]) => void;
  setCurrentChar: (index: number) => void;
  clearCurrentChar: () => void;
  setStyle: (id: BrushStyle['id']) => void;
  setTemplate: (id: string) => void;
}
