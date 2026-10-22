// Jersey-number suggestions for the coach dashboard (README §9.3).
// Walk rostered players in sign-up order; each gets their first free choice
// (1st, then 2nd, then 3rd). Anyone already assigned keeps their number, and it
// counts as taken — as does any number held by a waitlisted player, since the DB
// index forbids duplicates among all non-withdrawn rows. Suggestions only:
// staff review them and click Apply; nothing is written automatically.

export type NumberPlayer = {
  id: string;
  signup_seq: number;
  status: string;
  assigned_number: number | null;
  number_choice_1: number;
  number_choice_2: number;
  number_choice_3: number;
};

/** number is null when all three choices are taken ("needs a number"). */
export type Suggestion = { id: string; number: number | null; choice: 1 | 2 | 3 | null };

export function suggestNumbers(players: NumberPlayer[]): Suggestion[] {
  const taken = new Set(
    players.filter((p) => p.status !== 'withdrawn' && p.assigned_number != null).map((p) => p.assigned_number as number),
  );
  return players
    .filter((p) => p.status === 'rostered' && p.assigned_number == null)
    .sort((a, b) => a.signup_seq - b.signup_seq)
    .map((p) => {
      const choices = [p.number_choice_1, p.number_choice_2, p.number_choice_3];
      const i = choices.findIndex((n) => !taken.has(n));
      if (i < 0) return { id: p.id, number: null, choice: null };
      taken.add(choices[i]);
      return { id: p.id, number: choices[i], choice: (i + 1) as 1 | 2 | 3 };
    });
}
