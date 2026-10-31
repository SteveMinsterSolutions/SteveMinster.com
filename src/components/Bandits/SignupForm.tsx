import { createContext, useContext, useEffect, useRef, useState, type ChangeEvent, type FormEvent, type ReactNode } from 'react';
import bandits from '../../data/bandits.json';
import {
  validateSignup, GRADES, YEARS_PLAYED, JERSEY_SIZES, HELMET, AVAILABILITY, TDC_ID_TYPES,
  RELATIONSHIPS, CONTACT_PREFS, NUMBER_FIELDS, type FieldErrors, type Option,
} from '../../lib/bandits/validate';
import { OK_FROM } from '../../lib/bandits/eligibility';
import { fill } from '../../lib/bandits/copy';
import { dayShort, dayLong, dayMonthLong, monthDayRange, fullDate, formatDobInput, usDateToIso } from '../../lib/bandits/dates';
import { downloadWaivers } from '../../lib/bandits/download';
import type { WaiverPerson } from '../../lib/bandits/waiver';
import './signup.css';

/**
 * SignupForm — Wilson County Bandits player sign-up (README §8).
 * Fields, order and wording follow Signup.dc.html. Validation is shared with the
 * API (lib/bandits/validate.ts). Posts to /api/bandits/register; the browser
 * never talks to Supabase.
 */

type Values = Record<string, string | boolean>;
type Result = { status: 'rostered' | 'waitlist'; position: number | null; followUp: boolean; first: string; waiver: WaiverPerson };

const PLAYER_FIELDS: Values = {
  player_first: '', player_last: '', dob: '', grade: '', school: '', weight_lbs: '', years_played: '', positions: '',
  jersey_scale: 'youth', jersey_size: '', number_choice_1: '', number_choice_2: '', number_choice_3: '',
  helmet: '', ack_gear: false,
  avail_bbtl: '', avail_tdc: '', tdc_id_type: '',
  health_notes: '',
  ack_fee: false, ack_waiver: false, ack_docs: false, ack_accurate: false, photo_consent: false,
};
const FAMILY_FIELDS: Values = {
  guardian_name: '', guardian_relationship: '', guardian_phone: '', guardian_email: '',
  guardian2_name: '', guardian2_phone: '', contact_pref: '',
  emergency_name: '', emergency_phone: '', emergency_relationship: '',
};
const EMPTY: Values = { ...PLAYER_FIELDS, ...FAMILY_FIELDS };

// Order + short names for the error summary.
const SUMMARY_LABELS: [string, string][] = [
  ['player_first', 'First name'], ['player_last', 'Last name'], ['dob', 'Date of birth'], ['grade', 'Grade'],
  ['school', 'School'], ['weight_lbs', 'Weight'], ['years_played', 'Years of tackle football'], ['positions', 'Positions played'],
  ['jersey_scale', 'Jersey size scale'], ['jersey_size', 'Jersey size'],
  ['number_choice_1', '1st number choice'], ['number_choice_2', '2nd number choice'], ['number_choice_3', '3rd number choice'],
  ['helmet', 'Helmet'], ['ack_gear', 'Gear acknowledgment'],
  ['avail_bbtl', 'Battle Between the Lakes availability'], ['avail_tdc', 'Turkey Day Classic availability'], ['tdc_id_type', 'Turkey Day ID'],
  ['guardian_name', 'Parent or guardian name'], ['guardian_relationship', 'Relationship to player'],
  ['guardian_phone', 'Mobile phone'], ['guardian_email', 'Email'], ['guardian2_name', 'Second guardian name'],
  ['guardian2_phone', 'Second guardian phone'], ['contact_pref', 'Best way to reach you'],
  ['emergency_name', 'Emergency contact name'], ['emergency_phone', 'Emergency contact phone'],
  ['emergency_relationship', 'Emergency contact relationship'], ['health_notes', 'Notes for the coaches'],
  ['ack_fee', 'Fee acknowledgment'], ['ack_waiver', 'Waiver acknowledgment'], ['ack_docs', 'Documents acknowledgment'],
  ['ack_accurate', 'Accuracy acknowledgment'],
];

const id = (name: string) => `bf-${name}`;
const errId = (name: string) => `bf-${name}-err`;
/** The form keeps the date of birth as typed (MM/DD/YYYY); validation and the API use ISO. */
const forApi = (v: Values): Values => ({ ...v, dob: usDateToIso(String(v.dob)) });

const bbtl = bandits.tournaments.find((t) => t.id === 'bbtl')!;
const tdc = bandits.tournaments.find((t) => t.id === 'tdc')!;
const mailto = `mailto:${bandits.contactEmail}`;

// ── Field components. Module-level (stable identity) so inputs keep focus across
// renders; they read form state from context.
type Ctx = {
  values: Values;
  errors: FieldErrors;
  onText: (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
  onCheck: (e: ChangeEvent<HTMLInputElement>) => void;
};
const FormCtx = createContext<Ctx>(null as unknown as Ctx);

const errProps = (errors: FieldErrors, name: string) => ({
  'aria-invalid': errors[name] ? true : undefined,
  'aria-describedby': errors[name] ? errId(name) : undefined,
});

function Err({ name }: { name: string }) {
  const { errors } = useContext(FormCtx);
  return errors[name] ? <p className="sf-err" id={errId(name)}>{errors[name]}</p> : null;
}

function Text({ name, label, required, type = 'text', ...rest }: {
  name: string; label: string; required?: boolean; type?: string;
  autoComplete?: string; inputMode?: 'numeric' | 'tel' | 'email' | 'text'; placeholder?: string; maxLength?: number;
}) {
  const { values, errors, onText } = useContext(FormCtx);
  return (
    <div className="sf-field">
      <label htmlFor={id(name)}>{label}{required && ' *'}</label>
      <input id={id(name)} name={name} type={type} value={String(values[name])} onChange={onText}
        required={required} {...rest} {...errProps(errors, name)} />
      <Err name={name} />
    </div>
  );
}

function Select({ name, label, options, required }: { name: string; label: string; options: Option[]; required?: boolean }) {
  const { values, errors, onText } = useContext(FormCtx);
  return (
    <div className="sf-field">
      <label htmlFor={id(name)}>{label}{required && ' *'}</label>
      <select id={id(name)} name={name} value={String(values[name])} onChange={onText} required={required} {...errProps(errors, name)}>
        <option value="">Choose…</option>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <Err name={name} />
    </div>
  );
}

/** Full-row label so the whole line is the touch target (min 44px). */
function Check({ name, children, required }: { name: string; children: ReactNode; required?: boolean }) {
  const { values, errors, onCheck } = useContext(FormCtx);
  return (
    <div>
      <label className="sf-check" htmlFor={id(name)}>
        <input id={id(name)} name={name} type="checkbox" checked={!!values[name]} onChange={onCheck} required={required} {...errProps(errors, name)} />
        <span>{children}{required && ' *'}</span>
      </label>
      <Err name={name} />
    </div>
  );
}

export default function SignupForm({ initiallyClosed = false }: { initiallyClosed?: boolean }) {
  const [values, setValues] = useState<Values>(EMPTY);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [attempted, setAttempted] = useState(false);
  const [pending, setPending] = useState(false);
  const [formError, setFormError] = useState<ReactNode>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [closed, setClosed] = useState(initiallyClosed);
  const pendingRef = useRef(false);
  const summaryRef = useRef<HTMLDivElement>(null);
  const honeypotRef = useRef<HTMLInputElement>(null);
  const topRef = useRef<HTMLDivElement>(null);

  // After the first submit attempt, re-check as the parent fixes things so stale errors clear.
  useEffect(() => {
    if (!attempted) return;
    const v = validateSignup(forApi(values));
    setErrors(v.ok ? {} : v.errors);
  }, [values, attempted]);

  const set = (name: string, value: string | boolean) => setValues((v) => ({ ...v, [name]: value }));
  const onText = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    set(e.target.name, e.target.name === 'dob' ? formatDobInput(e.target.value) : e.target.value);
  const onCheck = (e: ChangeEvent<HTMLInputElement>) => set(e.target.name, e.target.checked);
  const pickScale = (scale: 'youth' | 'adult') => setValues((v) => (v.jersey_scale === scale ? v : { ...v, jersey_scale: scale, jersey_size: '' }));

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (pendingRef.current) return;
    setAttempted(true);
    setFormError(null);
    const v = validateSignup(forApi(values));
    if (!v.ok) {
      setErrors(v.errors);
      requestAnimationFrame(() => summaryRef.current?.focus());
      return;
    }

    pendingRef.current = true;
    setPending(true);
    try {
      const res = await fetch('/api/bandits/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...forApi(values), website: honeypotRef.current?.value ?? '' }),
      });
      const body = await res.json().catch(() => ({}));
      if (res.ok && body.ok) {
        const waiver = Object.fromEntries(
          (['player_first', 'player_last', 'guardian_name', 'guardian_phone', 'guardian_relationship'] as const).map((k) => [k, String(values[k])]),
        ) as WaiverPerson;
        setResult({ status: body.status, position: body.position, followUp: !!body.eligibilityFollowUp, first: String(values.player_first).trim(), waiver });
        topRef.current?.scrollIntoView();
        return;
      }
      if (res.status === 400 && body.errors) {
        setErrors(body.errors);
      } else if (res.status === 403) {
        setClosed(true);
        topRef.current?.scrollIntoView();
        return;
      } else if (res.status === 409) {
        setFormError(<>This player is already signed up. <a href={mailto}>Email us</a> to make changes.</>);
      } else if (res.status === 429) {
        setFormError(<>We've received several sign-ups from this email in the last few minutes. Please wait 10 minutes and try again, or <a href={mailto}>email us</a>.</>);
      } else {
        setFormError(<>Something went wrong and the sign-up wasn't saved. Please try again in a minute, or <a href={mailto}>email us</a>.</>);
      }
      requestAnimationFrame(() => summaryRef.current?.focus());
    } catch {
      setFormError(<>We couldn't reach the server, so the sign-up wasn't saved. Check your connection and try again.</>);
      requestAnimationFrame(() => summaryRef.current?.focus());
    } finally {
      pendingRef.current = false;
      setPending(false);
    }
  }

  function signUpAnother() {
    // Keep the parent/guardian and emergency contact for a sibling; clear the player.
    setValues((v) => ({ ...PLAYER_FIELDS, ...Object.fromEntries(Object.keys(FAMILY_FIELDS).map((k) => [k, v[k]])) }));
    setErrors({});
    setAttempted(false);
    setFormError(null);
    setResult(null);
    topRef.current?.scrollIntoView();
  }

  if (closed) return <div ref={topRef}><ClosedPanel /></div>;
  if (result) return <div ref={topRef}><SuccessPanel result={result} onAnother={signUpAnother} /></div>;

  const errorKeys = SUMMARY_LABELS.filter(([k]) => errors[k]);
  const youth = values.jersey_scale !== 'adult';
  const dob = usDateToIso(String(values.dob));
  const dobOlder = /^\d{4}-\d{2}-\d{2}$/.test(dob) && dob < OK_FROM;

  return (
    <div ref={topRef}>
      <FormCtx.Provider value={{ values, errors, onText, onCheck }}>
      <form className="sf-form" onSubmit={onSubmit} noValidate>
        <div>
          <h1 className="sf-title">Sign up a player</h1>
          <p className="sf-lede">
            Sign-ups close {dayMonthLong(bandits.signupDeadline)}.
            {' '}About 5 minutes, one form per player. Fields marked * are required. We use this information only to run the team and fill out tournament rosters.
          </p>
        </div>

        <div ref={summaryRef} tabIndex={-1} className="sf-summary-wrap" aria-live="polite">
          {(errorKeys.length > 0 || formError) && (
            <div className="sf-summary" role="group" aria-labelledby="bf-summary-title">
              <p id="bf-summary-title" className="sf-summary-title">
                {formError ? 'The sign-up was not submitted.' : `Please fix ${errorKeys.length === 1 ? 'this field' : `these ${errorKeys.length} fields`}:`}
              </p>
              {formError && <p className="sf-summary-msg">{formError}</p>}
              {errorKeys.length > 0 && (
                <ul>
                  {errorKeys.map(([k, label]) => (
                    <li key={k}><a href={`#${k === 'helmet' ? id('helmet-own') : k === 'jersey_scale' ? id('scale-youth') : id(k)}`}>{label}: {errors[k]}</a></li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        {/* Honeypot — invisible to people, tempting to bots. */}
        <div className="sf-hp" aria-hidden="true">
          <label htmlFor="bf-website">Website</label>
          <input id="bf-website" name="website" type="text" tabIndex={-1} autoComplete="off" ref={honeypotRef} defaultValue="" />
        </div>

        <fieldset className="sf-section">
          <legend>Player</legend>
          <div className="sf-grid">
            <Text name="player_first" label="First name" required autoComplete="off" maxLength={60} />
            <Text name="player_last" label="Last name" required autoComplete="off" maxLength={60} />
            <Text name="dob" label="Date of birth" required inputMode="numeric" placeholder="MM/DD/YYYY" maxLength={10} autoComplete="off" />
            <Select name="grade" label="Grade this year" options={GRADES} required />
            <Text name="school" label="School" maxLength={100} />
            <Text name="weight_lbs" label="Weight (lbs)" required inputMode="numeric" maxLength={3} />
            <Select name="years_played" label="Years of tackle football" options={YEARS_PLAYED} />
            <Text name="positions" label="Positions played" placeholder="e.g. RB, LB" maxLength={60} />
          </div>
          <div aria-live="polite">
            {dobOlder && (
              <p className="sf-warn">
                Players must be 13 or younger on {fullDate(bandits.eligibility.cutoff)}. A 14-year-old can play only if in 8th grade. You can still submit; we'll follow up.
              </p>
            )}
          </div>
          <p className="sf-note">
            Players must be 13 or younger on {fullDate(bandits.eligibility.cutoff)} (born on or after {fullDate(bandits.eligibility.bornOnOrAfter)}). A 14-year-old can play only if in 8th grade. If your player is near the cutoff, email us before signing up.
          </p>
        </fieldset>

        <fieldset className="sf-section">
          <legend>Uniform</legend>
          <div className="sf-field">
            <span className="sf-label" id="bf-scale-label">Jersey size scale *</span>
            <div className="sf-toggle" role="group" aria-labelledby="bf-scale-label">
              <button type="button" id={id('scale-youth')} aria-pressed={youth} onClick={() => pickScale('youth')}>Youth</button>
              <button type="button" id={id('scale-adult')} aria-pressed={!youth} onClick={() => pickScale('adult')}>Adult</button>
            </div>
            <Err name="jersey_scale" />
          </div>
          <div className="sf-narrow">
            <Select key={youth ? 'youth' : 'adult'} name="jersey_size" label="Jersey size" options={youth ? JERSEY_SIZES.youth : JERSEY_SIZES.adult} required />
          </div>
          <div className="sf-field">
            <span className="sf-label" id="bf-numbers-label">
              Jersey number choices * <span className="sf-hint">(0–99, three different numbers; none are guaranteed)</span>
            </span>
            <div className="sf-numbers" role="group" aria-labelledby="bf-numbers-label">
              {NUMBER_FIELDS.map((k, i) => (
                <div className="sf-field sf-num" key={k}>
                  <label htmlFor={id(k)}>{['1st', '2nd', '3rd'][i]} choice</label>
                  <input id={id(k)} name={k} type="text" inputMode="numeric" pattern="[0-9]*" maxLength={2}
                    value={String(values[k])} onChange={onText} required {...errProps(errors, k)} />
                  <Err name={k} />
                </div>
              ))}
            </div>
          </div>
        </fieldset>

        <fieldset className="sf-section">
          <legend>Helmet &amp; gear</legend>
          <fieldset className="sf-radios" aria-describedby={errors.helmet ? errId('helmet') : undefined}>
            <legend className="sf-label">Helmet *</legend>
            {HELMET.map((o) => (
              <label className="sf-check" key={o.value} htmlFor={id(`helmet-${o.value}`)}>
                <input id={id(`helmet-${o.value}`)} type="radio" name="helmet" value={o.value}
                  checked={values.helmet === o.value} onChange={onText} required aria-invalid={errors.helmet ? true : undefined} />
                <span>{o.label}</span>
              </label>
            ))}
            <Err name="helmet" />
          </fieldset>
          <Check name="ack_gear" required>We'll provide our own black football pants, shoulder pads, mouthguard, socks, and cleats.</Check>
        </fieldset>

        <fieldset className="sf-section">
          <legend>Availability</legend>
          <div className="sf-grid sf-grid-wide">
            <Select name="avail_bbtl" label={`${bbtl.name}, ${monthDayRange(bbtl.start, bbtl.end)}`} options={AVAILABILITY} required />
            <Select name="avail_tdc" label={`${tdc.name}, ${monthDayRange(tdc.start, tdc.end)}`} options={AVAILABILITY} required />
            <Select name="tdc_id_type" label="Turkey Day ID the player will use" options={TDC_ID_TYPES} required />
          </div>
        </fieldset>

        <fieldset className="sf-section">
          <legend>Parent or guardian</legend>
          <div className="sf-grid">
            <Text name="guardian_name" label="Full name" required autoComplete="name" maxLength={100} />
            <Select name="guardian_relationship" label="Relationship to player" options={RELATIONSHIPS} required />
            <Text name="guardian_phone" label="Mobile phone" required type="tel" autoComplete="tel" />
            <Text name="guardian_email" label="Email" required type="email" autoComplete="email" />
            <Text name="guardian2_name" label="Second guardian name" maxLength={100} />
            <Text name="guardian2_phone" label="Second guardian phone" type="tel" />
          </div>
          <div className="sf-narrow">
            <Select name="contact_pref" label="Best way to reach you" options={CONTACT_PREFS} />
          </div>
        </fieldset>

        <fieldset className="sf-section">
          <legend>Emergency contact</legend>
          <p className="sf-muted">Another adult we can call if we can't reach a parent. We'll always try the parents first.</p>
          <div className="sf-grid">
            <Text name="emergency_name" label="Name" required maxLength={100} />
            <Text name="emergency_phone" label="Phone" required type="tel" />
            <Text name="emergency_relationship" label="Relationship" maxLength={60} />
          </div>
          <div className="sf-field">
            <label htmlFor={id('health_notes')}>
              Anything the coaches should know? <span className="sf-hint">Optional, e.g. allergies or an inhaler. Seen only by the coaching staff.</span>
            </label>
            <textarea id={id('health_notes')} name="health_notes" rows={3} maxLength={1000} value={String(values.health_notes)} onChange={onText} {...errProps(errors, 'health_notes')} />
            <Err name="health_notes" />
          </div>
        </fieldset>

        <fieldset className="sf-section sf-section-gold">
          <legend>Before you submit</legend>
          <Check name="ack_fee" required>I understand the fee is ${bandits.fee} per player.</Check>
          <Check name="ack_waiver" required>I'll print the tournament waiver, sign it in ink, and bring the original.</Check>
          <Check name="ack_docs" required>I'll bring a copy of my player's birth certificate, and the Turkey Day ID.</Check>
          <Check name="ack_accurate" required>The information above is accurate. False age or eligibility information can disqualify the whole team.</Check>
          <Check name="photo_consent">It's OK to include my player in team photos shared with families.</Check>
        </fieldset>

        <button type="submit" className="sf-submit" disabled={pending} aria-disabled={pending}>
          {pending ? 'Submitting…' : 'Submit sign-up'}
        </button>
        <p className="sf-questions">Questions? <a href={mailto}>{bandits.contactEmail}</a></p>
      </form>
      </FormCtx.Provider>
    </div>
  );
}

function Checklist({ heading }: { heading: string }) {
  return (
    <div className="sf-card">
      <h2 className="sf-card-title">{heading}</h2>
      <ul className="sf-list">
        <li>${bandits.fee} fee. {bandits.payment}</li>
        <li>Waiver, printed and signed in ink. <a href={bandits.waiverUrl}>Download it here</a></li>
        <li>Copy of your player's birth certificate</li>
        <li>
          Turkey Day ID:{' '}
          <a href={bandits.tdcIdLinks.nsid} target="_blank" rel="noopener noreferrer">NSID<span className="b-sr"> (opens in new tab)</span></a>,{' '}
          <a href={bandits.tdcIdLinks.stateId} target="_blank" rel="noopener noreferrer">state ID<span className="b-sr"> (opens in new tab)</span></a>, or passport
        </li>
        <li>Black pants, shoulder pads, mouthguard, socks, cleats, and a helmet if you have one</li>
      </ul>
    </div>
  );
}

/** Pre-filled waiver built in the browser from what was just submitted; nothing is sent anywhere. */
function WaiverDownload({ person }: { person: WaiverPerson }) {
  const [state, setState] = useState<'idle' | 'busy' | 'error'>('idle');
  async function go() {
    setState('busy');
    try {
      await downloadWaivers([person]);
      setState('idle');
    } catch {
      setState('error');
    }
  }
  return (
    <div className="sf-card">
      <h2 className="sf-card-title">Your waiver</h2>
      <p className="sf-waiver-note">We filled in your player's name and your details. Print it, then sign and date it in ink.</p>
      <button type="button" className="sf-btn sf-btn-gold" onClick={go} disabled={state === 'busy'} aria-disabled={state === 'busy'}>
        {state === 'busy' ? 'Preparing…' : 'Download your pre-filled waiver'}
      </button>
      <div aria-live="polite">
        {state === 'error' && <p className="sf-err">Couldn't build the waiver. <a href={bandits.waiverUrl}>Download the blank one</a> and fill it in by hand.</p>}
      </div>
    </div>
  );
}

function SuccessPanel({ result, onAnother }: { result: Result; onAnother: () => void }) {
  const rostered = result.status === 'rostered';
  return (
    <section className="sf-done" aria-labelledby="bf-done-title">
      <div className="sf-done-hero on-dark">
        <p className="sf-eyebrow">{bandits.team.name} {bandits.team.division}</p>
        <h1 id="bf-done-title" className="sf-done-title">{bandits.rosterCopy.headline}</h1>
        <p className="sf-done-lede">
          {rostered
            ? fill(bandits.rosterCopy.rostered)
            : result.position != null
              ? fill(bandits.rosterCopy.waitlist, { position: result.position })
              : fill(bandits.rosterCopy.waitlist).replace('#{position} ', '')}
        </p>
        {result.followUp && <p className="sf-done-lede"><strong>We'll be in touch about eligibility.</strong></p>}
      </div>
      <Checklist heading={rostered ? `Bring to practice by ${dayShort(bandits.paperworkDue)}` : "If a spot opens, here's what you'll need"} />
      <WaiverDownload person={result.waiver} />
      <div className="sf-actions">
        <a className="sf-btn sf-btn-gold" href="/sandbox/bandits">Back to team info</a>
        <button type="button" className="sf-btn sf-btn-outline" onClick={onAnother}>Sign up another player</button>
      </div>
    </section>
  );
}

function ClosedPanel() {
  return (
    <section className="sf-done" aria-labelledby="bf-closed-title">
      <div className="sf-done-hero on-dark">
        <p className="sf-eyebrow">Sign-ups are closed</p>
        <h1 id="bf-closed-title" className="sf-done-title">Sign-ups are closed</h1>
        <p className="sf-done-lede">
          Sign-ups for the {bandits.team.name} closed {dayLong(bandits.signupDeadline)}. If you have questions about the roster or the waitlist, email us at{' '}
          <a href={mailto}>{bandits.contactEmail}</a>.
        </p>
      </div>
      <div className="sf-actions">
        <a className="sf-btn sf-btn-gold" href="/sandbox/bandits">Back to team info</a>
      </div>
    </section>
  );
}
