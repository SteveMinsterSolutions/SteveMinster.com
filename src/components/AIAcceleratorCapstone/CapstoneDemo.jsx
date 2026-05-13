import { useState, useEffect } from 'react';
import styles from './CapstoneDemo.module.css';

const WEBHOOK_URL = 'https://hook.us2.make.com/x23cyf4relpj14j5mu72gf8mkqp7aoj5';
const FETCH_RECENT_URL = '/api/recent-events';
const POLL_INTERVAL_MS = 5000;

// Load Google Fonts for the newspaper aesthetic
function useFonts() {
  useEffect(() => {
    if (document.querySelector('link[data-capstone-fonts]')) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600&family=DM+Mono:wght@300;400&family=DM+Sans:wght@300;400;500&display=swap';
    link.dataset.capstoneFonts = '';
    document.head.appendChild(link);
  }, []);
}

const PASSCODE = 'Font@n!n1';
const SESSION_KEY = 'capstone_cos_auth';

// ─── Auth Gate (SM brand: navy/lime/logo) ────────────────────────────────────
function AuthGate({ onSuccess }) {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = () => {
    if (code === PASSCODE) {
      try { sessionStorage.setItem(SESSION_KEY, '1'); } catch (e) {}
      onSuccess();
    } else {
      setError('Incorrect code. Try again.');
      setCode('');
      setTimeout(() => setError(''), 3000);
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: '#1B2A4A',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999,
      fontFamily: "'Space Grotesk', sans-serif",
    }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: 24 }}>
        {/* SM Logo */}
        <div style={{ marginBottom: 28 }}>
          <svg xmlns="http://www.w3.org/2000/svg" width="56" height="64" viewBox="0 0 56 64" fill="none">
            <rect x="0" y="8" width="48" height="48" rx="10" fill="#1B2A4A" stroke="rgba(255,255,255,0.15)" strokeWidth="1"/>
            <defs>
              <clipPath id="box-clip"><rect x="0" y="8" width="48" height="48" rx="10"/></clipPath>
              <clipPath id="outside-clip"><rect x="48" y="0" width="20" height="80"/><rect x="0" y="0" width="80" height="8"/><rect x="0" y="56" width="80" height="20"/></clipPath>
            </defs>
            <polyline points="35,16 21,16 14,32 28,32 21,48 35,48" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" clipPath="url(#box-clip)"/>
            <polyline points="35,16 21,16 14,32 28,32 21,48 35,48" fill="none" stroke="#97D700" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" clipPath="url(#outside-clip)"/>
          </svg>
        </div>

        <div style={{ fontSize: 22, fontWeight: 600, color: 'white', marginBottom: 20, letterSpacing: '0.01em' }}>
          AI Accelerator Capstone
        </div>
        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', marginBottom: 24, letterSpacing: '0.04em' }}>
          Enter the access code to continue
        </div>

        <input
          type="password"
          value={code}
          onChange={e => { setCode(e.target.value); setError(''); }}
          onKeyDown={e => e.key === 'Enter' && handleSubmit()}
          placeholder="CODE"
          maxLength={20}
          autoComplete="off"
          spellCheck={false}
          autoFocus
          style={{
            width: 200, background: 'rgba(255,255,255,0.07)',
            border: '1px solid rgba(255,255,255,0.15)', borderRadius: 10,
            padding: '16px 20px', fontFamily: "'Space Grotesk', monospace",
            fontSize: 14, letterSpacing: '0.18em', color: 'white',
            textAlign: 'center', outline: 'none', caretColor: '#97D700',
            marginBottom: 16,
          }}
        />

        <div style={{ fontSize: 12, color: '#ff6b6b', marginBottom: 12, minHeight: 18, letterSpacing: '0.04em' }}>
          {error}
        </div>

        <button
          onClick={handleSubmit}
          style={{
            background: '#97D700', color: '#111',
            fontFamily: "'Space Grotesk', sans-serif", fontSize: 15, fontWeight: 600,
            padding: '14px 48px', border: 'none', borderRadius: 100,
            cursor: 'pointer', letterSpacing: '0.03em',
            transition: 'transform 0.15s ease, box-shadow 0.15s ease',
          }}
          onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(151,215,0,0.3)'; }}
          onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
        >
          Enter
        </button>
      </div>
    </div>
  );
}

// ─── Capstone Demo (newspaper aesthetic, mobile-first v2) ────────────────────
const cx = (...classes) => classes.filter(Boolean).join(' ');

const watchouts = [
  {
    summary: 'LexisNexis still stuck',
    detail: "The network team hasn't delivered the PGP key. Without it, the Rock doesn't move. This needs an escalation path named today \u2014 waiting is not a strategy. If that person isn't you, identify who it is before you board for Charlotte.",
    sourceAlert: 'In Phase 2, this links to the vQuip calendar or project tracker.',
  },
  {
    summary: 'BDX still not shipped',
    detail: "Contractual deadline was April 15. The data team is waiting. This doesn't get better on the road \u2014 if it doesn't go before you board, it becomes a Tuesday problem on top of a summit day.",
    sourceAlert: 'In Phase 2, this links to the Notion task or vQuip calendar.',
  },
  {
    summary: "Everett's paperwork wall",
    detail: "Final Forms football paperwork must be submitted before April 27 tryouts. Physical must be dated after April 15. Feels like it has runway until it doesn't \u2014 needs an owner and a completion date today.",
    sourceAlert: 'In Phase 2, this links to the Final Forms portal or family calendar.',
  },
];

const actions = [
  {
    summary: 'Escalate BDX to data team',
    label: 'Greenlight BDX \u00B7 Team message',
    text: '\u201CTeam \u2014 the Greenlight BDX report is overdue and needs to go out before I leave for Charlotte. I\u2019m available 30 minutes right now to unblock whatever is holding this. Who needs me and what do you need to close it?\u201D',
  },
  {
    summary: 'Push LexisNexis escalation',
    label: 'LexisNexis \u00B7 Network team',
    text: '\u201CFollowing up on the PGP public key request. This is blocking an EOS Rock. Who is the right person to escalate this to get it resolved this week? I need a name and a timeline.\u201D',
  },
  {
    summary: 'Message Lauren \u2014 kids + travel',
    label: 'Family \u00B7 Lauren message',
    text: '\u201CHeads up \u2014 wheels-up to Charlotte early this morning, back Tuesday evening. Can you confirm coverage for Everett\u2019s Wednesday 6:45 AM drop and Thursday 5 PM pickup? Also \u2014 Final Forms football paperwork for Everett, do you want me to handle Tuesday night or do you want to take it?\u201D',
  },
];

const feedbackItems = [
  'LexisNexis connection project',
  'Greenlight BDX report',
  'Everett Final Forms',
  'Family logistics',
];

function CapstonePage() {
  useFonts();

  const [glanceOpen, setGlanceOpen] = useState(false);
  const [watchoutOpen, setWatchoutOpen] = useState([false, false, false]);
  const [actionOpen, setActionOpen] = useState([false, false, false]);
  const [actionApproved, setActionApproved] = useState([false, false, false]);
  const [quickAddText, setQuickAddText] = useState('');
  const [importance, setImportance] = useState(null);
  const [quickAddStatus, setQuickAddStatus] = useState(null);
  // values: null | 'sending' | 'sent' | 'error'
  const [votes, setVotes] = useState([null, null, null, null]);
  const [justInEvents, setJustInEvents] = useState([]);
  const [seenEventIds, setSeenEventIds] = useState(new Set());

  useEffect(() => {
    let cancelled = false;
    let timeoutId;

    const poll = async () => {
      try {
        const res = await fetch(FETCH_RECENT_URL);
        if (!res.ok) throw new Error(`Status ${res.status}`);
        const events = await res.json();
        if (cancelled || !Array.isArray(events)) return;

        setSeenEventIds(prevSeen => {
          const incoming = events.filter(e => e.id && !prevSeen.has(e.id));
          if (incoming.length > 0) {
            setJustInEvents(prev => [...incoming, ...prev].slice(0, 10));
            const next = new Set(prevSeen);
            incoming.forEach(e => next.add(e.id));
            return next;
          }
          return prevSeen;
        });
      } catch (err) {
        console.warn('[Just In] poll failed:', err.message);
      } finally {
        if (!cancelled) timeoutId = setTimeout(poll, POLL_INTERVAL_MS);
      }
    };

    poll();
    return () => {
      cancelled = true;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, []);

  const toggleAt = (setter) => (i) => setter(prev => {
    const next = [...prev];
    next[i] = !next[i];
    return next;
  });

  const toggleWatchout = toggleAt(setWatchoutOpen);
  const toggleAction = toggleAt(setActionOpen);

  const handleApprove = (i) => setActionApproved(prev => {
    const next = [...prev];
    next[i] = true;
    return next;
  });

  const handleQuickAdd = async () => {
    const text = quickAddText.trim();
    if (!text) {
      alert('What came up?');
      return;
    }

    let timestamp = new Date().toISOString();
    try {
      const chrono = await import('chrono-node');
      const parsedDate = chrono.parseDate(text, new Date(), { forwardDate: true });
      if (parsedDate) timestamp = parsedDate.toISOString();
    } catch (err) {
      console.warn('chrono-node failed to load, using current time:', err);
    }

    const submission = {
      text,
      importance: importance || 'medium',
      timestamp
    };

    // Optimistic UI: clear the form immediately so the demo feels snappy
    setQuickAddText('');
    setImportance(null);
    setQuickAddStatus('sending');

    try {
      await fetch(WEBHOOK_URL, {
        method: 'POST',
        mode: 'no-cors', // Make.com doesn't return CORS headers; opaque response is fine
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams(submission)
      });
      // With mode: 'no-cors' we can't read the response, so we assume success.
      // The Make.com scenario logs will show actual failures.
      setQuickAddStatus('sent');
      setTimeout(() => setQuickAddStatus(null), 3000);
    } catch (err) {
      // Network failure (offline, DNS, etc.) — graceful fallback so the demo never breaks
      console.error('Quick Add webhook failed:', err);
      setQuickAddStatus('error');
      alert(
        `Added: "${submission.text}" (${submission.importance} importance)\n\n` +
        `Note: live calendar integration unavailable — falling back to local demo mode.`
      );
      setTimeout(() => setQuickAddStatus(null), 3000);
    }
  };

  const castVote = (itemIndex, type) => setVotes(prev => {
    const next = [...prev];
    next[itemIndex] = type;
    return next;
  });

  return (
    <div className={styles.page}>
      <div className={styles.masthead}>
        <div className={styles['masthead-title']}>AI Chief of Staff</div>
        <div className={styles['masthead-meta']}>
          Steve Minster &middot; Morning Brief<br />
          Monday, April 27, 2026 &middot; 7:45 AM
        </div>
      </div>

      <div className={styles.dateline}>
        <span className={styles['dateline-live']}>Live</span>
        <span>vQuip &middot; Minster Solutions &middot; Family &middot; Community</span>
        <span>Week 17</span>
      </div>

      <div className={styles.container}>

        <div className={styles.opening}>
          Good morning, Steve. The LexisNexis situation has a heartbeat this morning, and it&rsquo;s racing. Let&rsquo;s not let it flatline on us.
        </div>

        {/* AT A GLANCE */}
        <div className={styles['glance-section']}>
          <div className={styles['glance-toggle']} onClick={() => setGlanceOpen(o => !o)}>
            <span className={styles['glance-toggle-label']}>At a Glance</span>
            <span className={cx(styles['glance-chevron'], glanceOpen && styles.open)}>&#9660;</span>
          </div>
          <div className={cx(styles['glance-body'], glanceOpen && styles.open)}>
            <ul>
              <li>vQuip Rock at risk &mdash; LexisNexis deliverables missed</li>
              <li>Greenlight BDX report overdue since April 15</li>
              <li>Everett Final Forms due before April 27 tryouts</li>
              <li>Data summit Tuesday &mdash; BDX pipeline must be solved</li>
              <li>Entegra loss triangles due EOD today</li>
              <li>GC meeting needed Thu or Fri &mdash; renovation reset</li>
              <li>Astros game Monday 7:45 PM &mdash; confirm coverage</li>
            </ul>
          </div>
        </div>

        {/* JUST IN — live calendar feed */}
        {justInEvents.length > 0 && (
          <section className={styles.justInSection}>
            <h2 className={styles.justInHeader}>📥 Just In</h2>
            <ul className={styles.justInList}>
              {justInEvents.map((event, idx) => (
                <li
                  key={event.id}
                  className={cx(
                    styles.justInItem,
                    styles[`importance-${event.importance || 'medium'}`],
                    idx === 0 && styles.justInNew
                  )}
                >
                  <div className={styles.justInTitle}>{event.title}</div>
                  <div className={styles.justInTime}>
                    {new Date(event.start).toLocaleString('en-US', {
                      timeZone: 'America/Chicago',
                      weekday: 'short',
                      hour: 'numeric',
                      minute: '2-digit'
                    })}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* EISENHOWER 2x2 */}
        <div className={styles.dashboard}>
          <div className={styles['section-label']}>
            Priority Dashboard
            <span className={styles['escalation-badge']}>
              <span className={styles['escalation-dot']}></span>2 escalating
            </span>
          </div>

          <div className={styles['quadrant-grid']}>

            <div className={cx(styles.quadrant, styles['q-act-now'])}>
              <div className={styles['quadrant-header']}>Act Now</div>
              <div className={cx(styles['q-item'], styles.escalating)}>
                <div className={styles['q-item-name']}>LexisNexis project</div>
                <span className={cx(styles['q-item-tag'], styles['tag-escalating'])}>Escalating</span>
                <span className={cx(styles['q-item-tag'], styles['tag-rock'])}>Rock</span>
              </div>
              <div className={cx(styles['q-item'], styles.escalating)}>
                <div className={styles['q-item-name']}>Greenlight BDX</div>
                <span className={cx(styles['q-item-tag'], styles['tag-overdue'])}>Overdue</span>
              </div>
              <div className={styles['q-item']}>
                <div className={styles['q-item-name']}>Everett Final Forms</div>
                <span className={cx(styles['q-item-tag'], styles['tag-deadline'])}>April 27</span>
              </div>
            </div>

            <div className={cx(styles.quadrant, styles['q-schedule'])}>
              <div className={styles['quadrant-header']}>Schedule It</div>
              <div className={styles['q-item']}><div className={styles['q-item-name']}>Tuesday data summit</div></div>
              <div className={styles['q-item']}><div className={styles['q-item-name']}>LexisNexis escalation</div></div>
              <div className={styles['q-item']}><div className={styles['q-item-name']}>IT working session</div></div>
              <div className={styles['q-item']}><div className={styles['q-item-name']}>GC renovation reset</div></div>
            </div>

            <div className={cx(styles.quadrant, styles['q-batch'])}>
              <div className={styles['quadrant-header']}>Batch It</div>
              <div className={styles['q-item']}><div className={styles['q-item-name']}>Astros &mdash; Mon 7:45</div></div>
              <div className={styles['q-item']}><div className={styles['q-item-name']}>Everett Wed / Thu</div></div>
              <div className={styles['q-item']}><div className={styles['q-item-name']}>Dagny Tennis Thu</div></div>
            </div>

            <div className={cx(styles.quadrant, styles['q-defer'])}>
              <div className={styles['quadrant-header']}>Defer</div>
              <div className={styles['q-item']}><div className={styles['q-item-name']}>State letters</div></div>
              <div className={styles['q-item']}><div className={styles['q-item-name']}>Bowling Wed 7 PM</div></div>
            </div>

          </div>

          <div className={styles['axis-x']}>
            <div>&larr; urgent</div>
            <div>not urgent &rarr;</div>
          </div>
        </div>

        {/* WATCH-OUTS */}
        <div className={styles.watchouts}>
          <div className={styles['section-label']}>Watch-Outs</div>
          {watchouts.map((w, i) => (
            <div className={styles['watchout-item']} key={i}>
              <div className={styles['watchout-toggle']} onClick={() => toggleWatchout(i)}>
                <div className={styles['watchout-number']}>{i + 1}</div>
                <div className={styles['watchout-summary']}>{w.summary}</div>
                <div className={cx(styles['watchout-chevron'], watchoutOpen[i] && styles.open)}>&#9660;</div>
              </div>
              <div className={cx(styles['watchout-detail-body'], watchoutOpen[i] && styles.open)}>
                <div className={styles['watchout-detail-text']}>{w.detail}</div>
                <button className={styles['watchout-source-btn']} onClick={() => alert(w.sourceAlert)}>
                  View Source &#x2197;
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* ACTIONS READY */}
        <div className={styles.actions}>
          <div className={styles['section-label']}>Actions Ready</div>
          {actions.map((a, i) => (
            <div className={styles['action-item']} key={i}>
              <div className={styles['action-toggle']} onClick={() => toggleAction(i)}>
                <div className={styles['action-summary']}>{a.summary}</div>
                <div className={cx(styles['action-chevron'], actionOpen[i] && styles.open)}>&#9660;</div>
              </div>
              <div className={cx(styles['action-detail-body'], actionOpen[i] && styles.open)}>
                <div className={styles['action-label']}>{a.label}</div>
                <div className={styles['action-text']}>{a.text}</div>
                <button
                  className={cx(styles['action-btn'], actionApproved[i] && styles.approved)}
                  onClick={() => handleApprove(i)}
                >
                  {actionApproved[i] ? 'Approved \u2713' : 'Approve'}
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* QUICK ADD */}
        <div className={styles['quick-add']}>
          <div className={styles['section-label']}>Quick Add</div>
          <div className={styles['quick-add-form']}>
            <input
              className={styles['quick-add-input']}
              type="text"
              placeholder="e.g., Coffee with Lu at 3pm tomorrow"
              value={quickAddText}
              onChange={e => setQuickAddText(e.target.value)}
            />
            <div className={styles['importance-row']}>
              {['high', 'medium', 'low'].map(level => (
                <button
                  key={level}
                  className={cx(styles['importance-btn'], importance === level && styles.selected)}
                  onClick={() => setImportance(level)}
                >
                  {level.charAt(0).toUpperCase() + level.slice(1)}
                </button>
              ))}
            </div>
            <button className={styles['quick-add-submit']} onClick={handleQuickAdd}>
              Add to Calendar &rarr;
            </button>
            {quickAddStatus === 'sending' && (
              <div className={styles['quick-add-status']}>Sending to calendar&hellip;</div>
            )}
            {quickAddStatus === 'sent' && (
              <div className={cx(styles['quick-add-status'], styles['quick-add-status-sent'])}>
                &#10003; Added to your calendar
              </div>
            )}
          </div>
        </div>

        {/* FEEDBACK LOOP */}
        <div className={styles['feedback-loop']}>
          <div className={styles['section-label']}>How Did I Do?</div>
          <div className={styles['feedback-intro']}>
            Help your Chief of Staff get sharper. Rate how well each item was prioritized this week.
          </div>

          {feedbackItems.map((name, i) => (
            <div className={styles['feedback-item']} key={i}>
              <div className={styles['feedback-item-name']}>{name}</div>
              <div className={styles['feedback-votes']}>
                <button
                  className={cx(styles['vote-btn'], votes[i] === 'accurate' && styles['voted-accurate'])}
                  onClick={() => castVote(i, 'accurate')}
                >
                  &#10003; Accurate
                </button>
                <button
                  className={cx(styles['vote-btn'], votes[i] === 'more' && styles['voted-more'])}
                  onClick={() => castVote(i, 'more')}
                >
                  &uarr; More important
                </button>
                <button
                  className={cx(styles['vote-btn'], votes[i] === 'less' && styles['voted-less'])}
                  onClick={() => castVote(i, 'less')}
                >
                  &darr; Less important
                </button>
              </div>
            </div>
          ))}

          <div className={styles['feedback-note']}>
            Your ratings train the system. Next Monday&rsquo;s brief will reflect your preferences.
          </div>
        </div>

      </div>

      <div className={styles.footer}>
        <span>AI Chief of Staff &middot; steveminster.com</span>
        <span>One place to carry your mental load.</span>
      </div>
    </div>
  );
}

// ─── App Shell ───────────────────────────────────────────────────────────────
export default function CapstoneDemo() {
  const [authed, setAuthed] = useState(
    typeof sessionStorage !== 'undefined' && sessionStorage.getItem(SESSION_KEY) === '1'
  );

  if (!authed) {
    return <AuthGate onSuccess={() => setAuthed(true)} />;
  }

  return <CapstonePage />;
}
