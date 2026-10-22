// Fills {placeholders} in copy from bandits.json. Unknown keys are left as-is.
import bandits from '../../data/bandits.json';
import { monthDay } from './dates';

const BASE: Record<string, string | number> = {
  fee: bandits.fee,
  payment: bandits.payment,
  cap: bandits.rosterCap,
  confirmBy: monthDay(bandits.rosterConfirmBy), // "Nov 8"
};

export const fill = (s: string, vars: Record<string, string | number> = {}) =>
  s.replace(/\{(\w+)\}/g, (m, k: string) => String({ ...BASE, ...vars }[k] ?? m));
