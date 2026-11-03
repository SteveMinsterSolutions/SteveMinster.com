// Warriors wrestling: plain-language text for the public follow page.
// Short result labels only; no rule text.
import type { PublicBout } from './snapshot.ts';

export const TEAM = 'Warriors';

const SHORT: Record<string, string> = {
  FALL: 'Fall', TF: 'TF', MD: 'MD', DEC: 'Dec', FOR: 'Forfeit', DEF: 'Default', DQ: 'DQ', DFF: 'Double forfeit',
};

/**
 * One line per finished bout, e.g.
 *   "122 · Everett def. Sam · MD 11–3 · +4 Warriors"
 *   "106 · Sam def. Everett · Fall 1:38 · +6 Blackman"
 *   "90 · Everett by forfeit · +6 Warriors"
 * JV bouts end with "Exhibition" instead of team points.
 */
export function resultLine(b: PublicBout, opponent: string): string {
  const parts: string[] = [String(b.weight)];
  if (b.status === 'skipped') return `${b.weight} · Not wrestled`;
  if (!b.result_type) return parts.join(' · ');
  if (b.result_type === 'DFF') return `${b.weight} · Double forfeit`;

  const usWon = b.winner === 'us';
  const ours = b.our_name ?? TEAM;
  const theirs = b.opp_name ?? opponent;
  const winner = usWon ? ours : theirs;
  const loser = usWon ? theirs : ours;

  if (b.result_type === 'FOR') {
    parts.push(`${winner} by forfeit`);
  } else {
    parts.push(loser ? `${winner} def. ${loser}` : `${winner} wins`);
    const hi = Math.max(b.score.us, b.score.them);
    const lo = Math.min(b.score.us, b.score.them);
    if (b.result_type === 'FALL') parts.push(b.result_time ? `Fall ${b.result_time}` : 'Fall');
    else if (b.result_type === 'TF' || b.result_type === 'MD' || b.result_type === 'DEC') parts.push(`${SHORT[b.result_type]} ${hi}–${lo}`);
    else parts.push(SHORT[b.result_type]);
  }

  if (b.level === 'JV') parts.push('Exhibition');
  else {
    const pts = usWon ? b.team_pts_us : b.team_pts_them;
    if (pts > 0) parts.push(`+${pts} ${usWon ? TEAM : opponent}`);
  }
  return parts.join(' · ');
}

/** "Warriors lead by 6" / "Blackman leads by 6" / "Tied". */
export function leadLine(us: number, them: number, opponent: string): string {
  if (us === them) return 'Tied';
  return us > them ? `${TEAM} lead by ${us - them}` : `${opponent} leads by ${them - us}`;
}

/** "0:03" style elapsed time. */
export function agoClock(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
