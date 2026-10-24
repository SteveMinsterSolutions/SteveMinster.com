// The Seven Gifts. Thresholds are lifetime points, multiplied by the player's level_scale.

export const GIFTS = [
  { name: 'Fear of the Lord', at: 0 },
  { name: 'Piety', at: 250 },
  { name: 'Knowledge', at: 600 },
  { name: 'Fortitude', at: 1000 },
  { name: 'Counsel', at: 1600 },
  { name: 'Understanding', at: 2400 },
  { name: 'Wisdom', at: 3300 },
] as const;

export const ORDINALS = ['first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh'] as const;

export interface Level {
  /** 0-based index into GIFTS. */
  index: number;
  name: string;
  /** The next gift, or null once Wisdom is reached. */
  next: { name: string; at: number; toGo: number } | null;
  /** 0..1 progress from this gift's threshold to the next one's. */
  progress: number;
}

export function levelFor(lifetimePoints: number, scale: number): Level {
  const thresholds = GIFTS.map((g) => Math.round(g.at * scale));
  let index = 0;
  for (let i = 0; i < thresholds.length; i++) if (lifetimePoints >= thresholds[i]) index = i;
  if (index === GIFTS.length - 1) {
    return { index, name: GIFTS[index].name, next: null, progress: 1 };
  }
  const from = thresholds[index];
  const to = thresholds[index + 1];
  return {
    index,
    name: GIFTS[index].name,
    next: { name: GIFTS[index + 1].name, at: to, toGo: to - lifetimePoints },
    progress: (lifetimePoints - from) / (to - from),
  };
}
