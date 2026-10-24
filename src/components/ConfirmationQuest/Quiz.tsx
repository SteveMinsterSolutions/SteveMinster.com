// Daily quiz: daily_quiz(3), one question at a time. The answer goes to answer_question,
// which grades it on the server; the client never learns the right option. A wrong answer
// shows only the player's own choice as wrong, and the explanation does the teaching.
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { getSupabase } from './supabase';
import book from './book.module.css';
import styles from './Quiz.module.css';

const COUNT = 3;

export interface QuizQuestion {
  id: number;
  category: string;
  difficulty: number;
  prompt: string;
  options: string[];
  answered_today: boolean;
}

export interface Graded {
  correct: boolean;
  explanation: string;
  source_ref: string | null;
  points: number;
}

export type Answer = { graded: Graded } | { error: string; done?: boolean };

const QUESTION_KEYS = ['id', 'category', 'difficulty', 'prompt', 'options', 'answered_today'];
const GRADED_KEYS = ['correct', 'explanation', 'source_ref', 'points'];
const mismatch = (what: string) => `${what} This doesn’t match the backend contract; tell the game admin.`;

async function loadQuiz(): Promise<QuizQuestion[]> {
  const { data, error } = await getSupabase().rpc('daily_quiz', { p_count: COUNT });
  if (error) throw new Error(error.message);
  if (!Array.isArray(data)) throw new Error(mismatch('daily_quiz didn’t return a list.'));
  for (const q of data) {
    const missing = QUESTION_KEYS.filter((k) => !(k in q));
    if (missing.length) throw new Error(mismatch(`daily_quiz returned a question without ${missing.join(', ')}.`));
    if (!Array.isArray(q.options) || !q.options.every((o: unknown) => typeof o === 'string')) {
      throw new Error(mismatch('daily_quiz returned options that aren’t a list of text.'));
    }
  }
  return data as QuizQuestion[];
}

async function answer(q: QuizQuestion, chosen: number): Promise<Answer> {
  const { data, error } = await getSupabase().rpc('answer_question', { p_question: q.id, p_chosen: chosen });
  if (error) {
    const m = error.message;
    if (m.includes('already answered today')) {
      return { error: 'You’ve answered this one today. New questions tomorrow.', done: true };
    }
    if (m.includes('question not available')) {
      return { error: 'This question was taken out of the quiz, so it doesn’t count. Go on to the next one.', done: true };
    }
    if (m.includes('invalid choice')) return { error: 'That choice wasn’t accepted. Choose one of the answers and try again.' };
    if (m.includes('not a player')) return { error: 'Your account isn’t set up as a player yet. Tell the game admin.' };
    return { error: `Your answer wasn’t sent. The server said: ${m}. Try again; if it keeps happening, tell the game admin.` };
  }
  const row = Array.isArray(data) ? data[0] : data;
  if (!row || GRADED_KEYS.some((k) => !(k in row))) {
    return { error: mismatch('answer_question didn’t return correct, explanation, source_ref and points.') };
  }
  return { graded: row as Graded };
}

export default function Quiz() {
  const [load, setLoad] = useState<
    { kind: 'loading' } | { kind: 'ready'; questions: QuizQuestion[] } | { kind: 'error'; message: string }
  >({ kind: 'loading' });

  useEffect(() => {
    let cancelled = false;
    loadQuiz().then(
      (questions) => !cancelled && setLoad({ kind: 'ready', questions }),
      (err: Error) => !cancelled && setLoad({ kind: 'error', message: err.message }),
    );
    return () => {
      cancelled = true;
    };
  }, []);

  if (load.kind === 'loading') return <p className={book.fine}>Opening today’s quiz…</p>;
  if (load.kind === 'error') {
    return (
      <>
        <h1 className={book.heading}>Daily quiz</h1>
        <p className={book.error} role="alert">
          Today’s questions didn’t load. The server said: {load.message}
        </p>
        <p className={book.prose}>Reload the page. If this keeps happening, tell the game admin.</p>
      </>
    );
  }
  return <QuizLeaf questions={load.questions} onAnswer={answer} />;
}

const countWords = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];
const sentenceCase = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1).replace(/[-_]/g, ' ') : s);

interface LeafProps {
  questions: QuizQuestion[];
  onAnswer: (q: QuizQuestion, chosen: number) => Promise<Answer>;
  /** Dev-only screenshots: a choice made, or an answer already graded. */
  preview?: { chosen?: number; graded?: Graded; error?: string };
}

export function QuizLeaf({ questions, onAnswer, preview }: LeafProps) {
  const [done, setDone] = useState<Set<number>>(() => {
    const d = new Set(questions.filter((q) => q.answered_today).map((q) => q.id));
    // A preview that starts graded (or refused as already answered) has answered the first open question.
    const first = questions.find((q) => !q.answered_today);
    if (first && (preview?.graded || preview?.error)) d.add(first.id);
    return d;
  });
  const [activeId, setActiveId] = useState<number | null>(() => questions.find((q) => !q.answered_today)?.id ?? null);
  const [chosen, setChosen] = useState<number | null>(preview?.chosen ?? null);
  const [graded, setGraded] = useState<Graded | null>(preview?.graded ?? null);
  const [error, setError] = useState<string | null>(preview?.error ?? null);
  const [busy, setBusy] = useState(false);
  const feedbackRef = useRef<HTMLHeadingElement>(null);
  const questionRef = useRef<HTMLHeadingElement>(null);
  const moved = useRef(false);

  const active = questions.find((q) => q.id === activeId) ?? null;
  const position = active ? questions.indexOf(active) + 1 : 0;
  const earlier = questions.filter((q) => q.answered_today).length;
  const nextUp = questions.find((q) => !done.has(q.id) && q.id !== activeId) ?? null;

  useEffect(() => {
    if (graded) feedbackRef.current?.focus();
  }, [graded]);
  useEffect(() => {
    // Only after "Next question", not on first load.
    if (moved.current) questionRef.current?.focus();
  }, [activeId]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!active) return;
    if (chosen === null) {
      setError('Choose an answer first.');
      return;
    }
    setBusy(true);
    setError(null);
    const result = await onAnswer(active, chosen);
    setBusy(false);
    if ('error' in result) {
      setError(result.error);
      if (result.done) setDone((d) => new Set(d).add(active.id));
      return;
    }
    setDone((d) => new Set(d).add(active.id));
    setGraded(result.graded);
  }

  function next() {
    moved.current = true;
    setActiveId(nextUp?.id ?? null);
    setChosen(null);
    setGraded(null);
    setError(null);
  }

  if (!questions.length) {
    return (
      <>
        <h1 className={book.heading}>Daily quiz</h1>
        <p className={book.prose}>There are no questions in the quiz yet. Check back tomorrow.</p>
      </>
    );
  }

  if (!active) {
    return (
      <>
        <h1 className={book.heading} ref={questionRef} tabIndex={-1}>
          Daily quiz
        </h1>
        <p className={book.prose}>
          {questions.length === COUNT
            ? 'That’s today’s three. New questions tomorrow.'
            : 'That’s today’s questions. New ones tomorrow.'}
        </p>
        <Tally questions={questions} done={done} activeId={null} />
      </>
    );
  }

  const ids = { legend: `cq-q-${active.id}`, err: `cq-q-err-${active.id}` };
  const answeredHere = done.has(active.id);

  return (
    <>
      <h1 className={book.heading}>Daily quiz</h1>
      <Tally questions={questions} done={done} activeId={active.id} />
      <p className={book.fine}>
        Question {position} of {questions.length}
        {earlier > 0 && position === questions.findIndex((q) => !q.answered_today) + 1 && !graded
          ? `. You answered ${countWords[earlier] ?? earlier} earlier today.`
          : '.'}
      </p>

      <form onSubmit={submit} noValidate className={styles.form}>
        <fieldset className={styles.question} aria-describedby={error ? ids.err : undefined}>
          <legend className={styles.legend}>
            <span className={styles.meta}>
              {sentenceCase(active.category)}, worth {active.difficulty * 5} points
            </span>
            <h2 id={ids.legend} className={styles.prompt} ref={questionRef} tabIndex={-1}>
              {active.prompt}
            </h2>
          </legend>

          <ol className={styles.options}>
            {active.options.map((text, i) => {
              const mine = chosen === i;
              const verdict = graded && mine ? (graded.correct ? styles.right : styles.wrong) : '';
              return (
                <li key={i}>
                  <label className={`${styles.option} ${mine ? styles.chosen : ''} ${verdict}`}>
                    <input
                      type="radio"
                      name={`q-${active.id}`}
                      value={i}
                      checked={mine}
                      disabled={busy || answeredHere}
                      onChange={() => {
                        setChosen(i);
                        setError(null);
                      }}
                    />
                    <span className={styles.letter} aria-hidden="true">
                      {String.fromCharCode(65 + i)}
                    </span>
                    <span className={styles.text}>{text}</span>
                    {graded && mine && (
                      <span className={styles.mark}>{graded.correct ? 'Your answer, right' : 'Your answer, not right'}</span>
                    )}
                  </label>
                </li>
              );
            })}
          </ol>
        </fieldset>

        {error && (
          <p id={ids.err} className={book.error} role="alert">
            {error}
          </p>
        )}

        {!answeredHere && (
          <button type="submit" className={book.button} disabled={busy}>
            {busy ? 'Checking…' : 'Answer'}
          </button>
        )}
      </form>

      {graded && (
        <section className={styles.feedback} aria-labelledby="cq-feedback">
          <h2 id="cq-feedback" ref={feedbackRef} tabIndex={-1} className={styles.verdict}>
            {graded.correct ? 'Right.' : 'Not quite.'}
          </h2>
          <p className={styles.explanation}>{graded.explanation}</p>
          {graded.source_ref && <p className={styles.source}>Source: {graded.source_ref}</p>}
          <p className={styles.points}>
            {graded.correct
              ? graded.points > 0
                ? `+${graded.points} points`
                : '0 points. Today’s 30 quiz points are already earned.'
              : 'No points for this one.'}
          </p>
        </section>
      )}

      {answeredHere && (
        <button type="button" className={`${book.button} ${styles.next}`} onClick={next}>
          {nextUp ? 'Next question' : 'Finish'}
        </button>
      )}
    </>
  );
}

/** Today's questions as a row of rings: filled once answered, ringed in rubric for the current one. */
function Tally({ questions, done, activeId }: { questions: QuizQuestion[]; done: Set<number>; activeId: number | null }) {
  return (
    <ol className={styles.tally} aria-label="Today’s questions">
      {questions.map((q, i) => {
        const state = done.has(q.id) ? 'answered' : q.id === activeId ? 'current' : 'to come';
        return (
          <li key={q.id} className={`${styles.dot} ${styles[state.replace(' ', '')] ?? ''}`}>
            <span className={book.srOnly}>
              Question {i + 1}: {state}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
