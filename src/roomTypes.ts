export interface RoomTypeDef {
  key: string;
  name: string;
  emoji: string;
  /** 默认宽度（米） */
  w: number;
  /** 默认进深（米） */
  d: number;
  hint: string;
}

export const ROOM_TYPES: RoomTypeDef[] = [
  { key: 'living', name: '客厅', emoji: '🛋️', w: 4.6, d: 4.2, hint: '沙发 · 电视墙' },
  { key: 'master', name: '主卧', emoji: '🛏️', w: 3.8, d: 4.2, hint: '双人床 · 衣柜' },
  { key: 'bedroom', name: '次卧', emoji: '🛌', w: 3.2, d: 3.6, hint: '单人床 · 书桌' },
  { key: 'kids', name: '儿童房', emoji: '🧸', w: 3.2, d: 3.4, hint: '儿童床 · 玩具' },
  { key: 'study', name: '书房', emoji: '📚', w: 3.0, d: 3.2, hint: '书桌 · 书架' },
  { key: 'kitchen', name: '厨房', emoji: '🍳', w: 2.8, d: 3.0, hint: '橱柜 · 灶台' },
  { key: 'dining', name: '餐厅', emoji: '🍽️', w: 3.4, d: 3.2, hint: '餐桌 · 餐边柜' },
  { key: 'bathroom', name: '卫生间', emoji: '🚿', w: 2.0, d: 2.2, hint: '淋浴 · 洗手台' },
  { key: 'balcony', name: '阳台', emoji: '🌿', w: 3.0, d: 1.5, hint: '洗衣 · 绿植' },
  { key: 'entry', name: '玄关', emoji: '👟', w: 2.4, d: 1.6, hint: '鞋柜 · 换鞋区' },
  { key: 'closet', name: '衣帽间', emoji: '👔', w: 2.4, d: 2.2, hint: '衣柜 · 梳妆台' },
  { key: 'guest', name: '客房', emoji: '🛎️', w: 3.0, d: 3.4, hint: '临时住宿' },
];
