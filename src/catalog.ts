import type { FurnitureType } from './types';

export type Category = '起居' | '卧室' | '餐厨' | '卫浴';

export interface FurnitureDef {
  type: FurnitureType;
  name: string;
  category: Category;
  w: number;
  d: number;
  h: number;
  color: string;
  emoji: string;
  round?: boolean;
}

export const CATEGORIES: Category[] = ['起居', '卧室', '餐厨', '卫浴'];

export const FURNITURE: Record<FurnitureType, FurnitureDef> = {
  sofa: { type: 'sofa', name: '双人沙发', category: '起居', w: 2.1, d: 0.9, h: 0.82, color: '#8f9b84', emoji: '🛋️' },
  armchair: { type: 'armchair', name: '单人沙发', category: '起居', w: 0.86, d: 0.85, h: 0.8, color: '#a8ad93', emoji: '🪑' },
  coffeeTable: { type: 'coffeeTable', name: '茶几', category: '起居', w: 1.1, d: 0.6, h: 0.42, color: '#b08a63', emoji: '🫖' },
  tvStand: { type: 'tvStand', name: '电视柜', category: '起居', w: 1.7, d: 0.4, h: 0.5, color: '#8e7156', emoji: '📺' },
  rug: { type: 'rug', name: '地毯', category: '起居', w: 3.0, d: 2.2, h: 0.03, color: '#c7ab94', emoji: '🧶' },
  plant: { type: 'plant', name: '绿植', category: '起居', w: 0.55, d: 0.55, h: 1.15, color: '#6f8f68', emoji: '🪴', round: true },
  floorLamp: { type: 'floorLamp', name: '落地灯', category: '起居', w: 0.4, d: 0.4, h: 1.6, color: '#d8c18d', emoji: '💡', round: true },
  bookshelf: { type: 'bookshelf', name: '书架', category: '起居', w: 0.9, d: 0.35, h: 1.85, color: '#98714e', emoji: '📚' },
  bed: { type: 'bed', name: '双人床', category: '卧室', w: 1.6, d: 2.05, h: 1.0, color: '#b7c3c6', emoji: '🛏️' },
  nightstand: { type: 'nightstand', name: '床头柜', category: '卧室', w: 0.45, d: 0.4, h: 0.55, color: '#a57e5c', emoji: '🕯️' },
  wardrobe: { type: 'wardrobe', name: '衣柜', category: '卧室', w: 1.8, d: 0.6, h: 2.1, color: '#a37a5a', emoji: '🗄️' },
  desk: { type: 'desk', name: '书桌', category: '卧室', w: 1.2, d: 0.6, h: 0.75, color: '#a8805b', emoji: '🖥️' },
  chair: { type: 'chair', name: '餐椅', category: '餐厨', w: 0.46, d: 0.5, h: 0.84, color: '#a07a55', emoji: '🪑' },
  diningTable: { type: 'diningTable', name: '餐桌', category: '餐厨', w: 1.4, d: 0.85, h: 0.75, color: '#b08a63', emoji: '🍽️' },
  sideboard: { type: 'sideboard', name: '餐边柜', category: '餐厨', w: 1.2, d: 0.42, h: 0.8, color: '#997151', emoji: '🍶' },
  fridge: { type: 'fridge', name: '冰箱', category: '餐厨', w: 0.7, d: 0.7, h: 1.85, color: '#c8ced0', emoji: '🧊' },
  stove: { type: 'stove', name: '灶台', category: '餐厨', w: 0.6, d: 0.6, h: 0.9, color: '#b9bec0', emoji: '🍳' },
  counter: { type: 'counter', name: '橱柜水槽', category: '餐厨', w: 1.8, d: 0.62, h: 0.9, color: '#d6d0c2', emoji: '🚰' },
  toilet: { type: 'toilet', name: '马桶', category: '卫浴', w: 0.42, d: 0.66, h: 0.78, color: '#ecebe6', emoji: '🚽' },
  bathtub: { type: 'bathtub', name: '浴缸', category: '卫浴', w: 1.65, d: 0.8, h: 0.56, color: '#ecebe6', emoji: '🛁' },
  shower: { type: 'shower', name: '淋浴房', category: '卫浴', w: 0.95, d: 0.95, h: 2.0, color: '#dfe7e7', emoji: '🚿' },
  washer: { type: 'washer', name: '洗衣机', category: '卫浴', w: 0.6, d: 0.62, h: 0.85, color: '#d3d8d8', emoji: '🧺' },
};

export const FLOOR_COLORS = [
  '#e8ddca',
  '#e4d8cd',
  '#dedbd0',
  '#dbe2d8',
  '#e8e0d2',
  '#ddd5c8',
  '#e6dbd2',
  '#d9d4c3',
];

export const WALL_COLORS = [
  '#f2ede4',
  '#ece7dc',
  '#e9eee7',
  '#f0e9df',
  '#e7e8e3',
  '#f3efe9',
];

export const FURNITURE_COLORS = [
  '#8f9b84',
  '#a8ad93',
  '#b08a63',
  '#a37a5a',
  '#b7c3c6',
  '#c7ab94',
  '#6f8f68',
  '#c8ced0',
  '#d8c18d',
  '#9a8f82',
];

export function getDef(type: FurnitureType): FurnitureDef {
  return FURNITURE[type];
}

/** 简单的十六进制明暗调整 */
export function shade(hex: string, amount: number): string {
  const clean = hex.replace('#', '');
  const n = clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean;
  const num = parseInt(n, 16);
  if (Number.isNaN(num)) return hex;
  const r = Math.max(0, Math.min(255, ((num >> 16) & 255) + Math.round(255 * amount)));
  const g = Math.max(0, Math.min(255, ((num >> 8) & 255) + Math.round(255 * amount)));
  const b = Math.max(0, Math.min(255, (num & 255) + Math.round(255 * amount)));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

export function withAlpha(hex: string, alpha: number): string {
  const clean = hex.replace('#', '');
  const n = clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean;
  const num = parseInt(n, 16);
  if (Number.isNaN(num)) return hex;
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
