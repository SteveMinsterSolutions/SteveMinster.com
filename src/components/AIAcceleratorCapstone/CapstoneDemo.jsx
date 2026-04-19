import { useState, useEffect } from 'react';
import styles from './CapstoneDemo.module.css';

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

// ─── Capstone Demo (newspaper aesthetic) ─────────────────────────────────────
function CapstonePage() {
  useFonts();
  const [approvals, setApprovals] = useState([false, false, false]);

  const handleApprove = (index) => {
    setApprovals(prev => {
      const next = [...prev];
      next[index] = true;
      return next;
    });
  };

  const actions = [
    {
      label: 'Greenlight BDX \u00B7 Escalation to data team',
      text: '\u201CTeam \u2014 the Greenlight BDX bordereau report is overdue and needs to go out before I leave for Charlotte this morning. I\u2019m available for 30 minutes right now to unblock whatever is holding this. Who needs me and what do you need to close it?\u201D',
    },
    {
      label: 'LexisNexis \u00B7 Network team escalation',
      text: '\u201CFollowing up on the PGP public key request for the LexisNexis file encryption. This is blocking an EOS Rock and the team has been waiting. Who is the right person to escalate this to get it resolved this week? I need a name and a timeline.\u201D',
    },
    {
      label: 'Family \u00B7 Kids logistics + Everett paperwork reminder',
      text: 'Message Lauren: \u201CQuick heads up \u2014 I\u2019m wheels-up to Charlotte early this morning, back Tuesday evening. Can you confirm coverage for Everett\u2019s Wednesday 6:45 AM drop and Thursday 5 PM pickup? Also \u2014 the Final Forms football paperwork for Everett needs to be in before the 27th. Do you want me to handle that when I\u2019m back Tuesday night or do you want to take it?\u201D',
    },
  ];

  return (
    <div style={{ background: 'var(--paper)', minHeight: '100vh', color: 'var(--ink)', fontFamily: "'DM Sans', sans-serif", fontWeight: 300 }}>
      <div className={styles.masthead}>
        <div className={styles['masthead-title']}>AI Chief of Staff</div>
        <div className={styles['masthead-meta']}>
          Steve Minster &middot; Morning Brief<br />
          Monday, April 27, 2026 &middot; 7:45 AM CT
        </div>
      </div>

      <div className={styles.dateline}>
        <span className={styles['dateline-live']}>Live</span>
        <span>vQuip &middot; Minster Solutions &middot; Family &middot; Community</span>
        <span>Week 17 of 2026</span>
      </div>

      <div className={styles.container}>
        <div className={styles.opening}>
          Good morning, Steve. You&rsquo;re wheels-up to Charlotte before most people hit snooze &mdash; which means this week&rsquo;s leakage risk started at 5:14 AM. The Greenlight BDX report is overdue, LexisNexis is stuck waiting on a key that hasn&rsquo;t arrived, and Everett&rsquo;s football paperwork has a hard deadline that won&rsquo;t move. Let&rsquo;s make sure the week catches up to you before you land.
        </div>

        <div className={styles.situation}>
          <div className={styles['section-label']}>Today&rsquo;s picture</div>
          <p>You&rsquo;re traveling to vQuip&rsquo;s Charlotte office today through Tuesday &mdash; departing BNA at 5:14 AM, back by Tuesday evening. The Greenlight BDX bordereau report is contractually overdue and needs to ship before you leave. Tuesday&rsquo;s data summit is the week&rsquo;s most important deliverable: it must resolve the monthly BDX report pipeline for Greenlight Re. LexisNexis is blocked on the network team&rsquo;s PGP key and won&rsquo;t move until someone escalates. On the family side, Everett&rsquo;s football physical paperwork for Final Forms must be submitted before tryouts on April 27 &mdash; that deadline is real and immovable. Minster Solutions has the Entegra quarterly loss triangles due by EOD today in the new format. It&rsquo;s a heavy week on a compressed schedule.</p>
        </div>

        <div className={styles.dashboard}>
          <div className={styles['section-label']}>
            Priority dashboard &mdash; Eisenhower 2&times;2
            <span className={styles['escalation-badge']}><span className={styles['escalation-dot']}></span>2 escalating</span>
          </div>

          <div style={{ display: 'flex', gap: 12, marginTop: 14 }}>
            <div style={{
              writingMode: 'vertical-rl', transform: 'rotate(180deg)',
              fontFamily: "'DM Mono', monospace", fontSize: 10, letterSpacing: '0.1em',
              color: 'var(--muted)', textAlign: 'center', flexShrink: 0,
            }}>
              &larr; not important &middot; important &rarr;
            </div>

            <div style={{ flex: 1 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>

                {/* Q1: Act Now */}
                <div className={`${styles.quadrant} ${styles['q-act-now']}`}>
                  <div className={styles['quadrant-header']}>Act now &mdash; important + urgent</div>
                  <div className={`${styles['item-card']} ${styles.escalating}`}>
                    <div className={styles['item-name']}>Greenlight BDX bordereau report</div>
                    <div className={styles['item-why']}>Contractual deadline was April 15. Must ship before you board.</div>
                    <span className={`${styles['item-tag']} ${styles['tag-escalating']}`}>Escalating</span>
                    <span className={`${styles['item-tag']} ${styles['tag-overdue']}`}>Overdue</span>
                  </div>
                  <div className={`${styles['item-card']} ${styles.escalating}`}>
                    <div className={styles['item-name']}>Entegra General quarterly loss triangles</div>
                    <div className={styles['item-why']}>Due EOD today. New format required. Not started.</div>
                    <span className={`${styles['item-tag']} ${styles['tag-escalating']}`}>Escalating</span>
                    <span className={`${styles['item-tag']} ${styles['tag-deadline']}`}>Due Today</span>
                  </div>
                  <div className={styles['item-card']}>
                    <div className={styles['item-name']}>Everett &mdash; Final Forms football paperwork</div>
                    <div className={styles['item-why']}>Physical + health insurance info due before April 27 tryouts. Physical must be post-April 15.</div>
                    <span className={`${styles['item-tag']} ${styles['tag-kids']}`}>Kids</span>
                  </div>
                </div>

                {/* Q2: Schedule */}
                <div className={`${styles.quadrant} ${styles['q-schedule']}`}>
                  <div className={styles['quadrant-header']}>Schedule it &mdash; important + not urgent</div>
                  <div className={styles['item-card']}>
                    <div className={styles['item-name']}>Tuesday data summit &mdash; BDX pipeline resolution</div>
                    <div className={styles['item-why']}>Week&rsquo;s most important meeting. Must leave with a solved path for the monthly bordereau.</div>
                    <span className={`${styles['item-tag']} ${styles['tag-rock']}`}>vQuip</span>
                  </div>
                  <div className={styles['item-card']}>
                    <div className={styles['item-name']}>LexisNexis PGP key escalation</div>
                    <div className={styles['item-why']}>Network team unresponsive. Rock won&rsquo;t move until someone pushes. This needs an escalation path named today.</div>
                    <span className={`${styles['item-tag']} ${styles['tag-rock']}`}>EOS Rock</span>
                  </div>
                  <div className={styles['item-card']}>
                    <div className={styles['item-name']}>Complexes / Facilities / Studios &mdash; IT working session</div>
                    <div className={styles['item-why']}>April 24 deadline. IT made structural guesses that need correcting before it compounds.</div>
                    <span className={`${styles['item-tag']} ${styles['tag-rock']}`}>EOS Rock</span>
                  </div>
                  <div className={styles['item-card']}>
                    <div className={styles['item-name']}>GC meeting &mdash; renovation reset</div>
                    <div className={styles['item-why']}>Electrical work not executed as needed. Thursday or Friday this week.</div>
                    <span className={`${styles['item-tag']} ${styles['tag-family']}`}>Home</span>
                  </div>
                </div>

                {/* Q3: Batch */}
                <div className={`${styles.quadrant} ${styles['q-batch']}`}>
                  <div className={styles['quadrant-header']}>Batch it &mdash; not important + urgent</div>
                  <div className={styles['item-card']}>
                    <div className={styles['item-name']}>Astros &mdash; Monday night game (7:45 PM)</div>
                    <div className={styles['item-why']}>At Dodgers. You&rsquo;re traveling &mdash; confirm coverage or attendance with GroupMe.</div>
                    <span className={`${styles['item-tag']} ${styles['tag-kids']}`}>Community</span>
                  </div>
                  <div className={styles['item-card']}>
                    <div className={styles['item-name']}>Everett logistics &mdash; Wed 6:45 AM drop / Thu 5 PM pickup</div>
                    <div className={styles['item-why']}>Football conditioning Wednesday AM, pickup + track + baseball Thursday. Confirm coverage with Lauren.</div>
                    <span className={`${styles['item-tag']} ${styles['tag-kids']}`}>Kids</span>
                  </div>
                  <div className={styles['item-card']}>
                    <div className={styles['item-name']}>Dagny &mdash; Rally Cats Tennis Thursday 6:30 PM</div>
                    <div className={styles['item-why']}>Charlie Daniels Park. Confirm pickup logistics.</div>
                    <span className={`${styles['item-tag']} ${styles['tag-kids']}`}>Kids</span>
                  </div>
                  <div className={styles['item-card']}>
                    <div className={styles['item-name']}>Bowling &mdash; Wednesday 7 PM</div>
                    <div className={styles['item-why']}>Work on extending grip. Leave the 10 pin in the past.</div>
                  </div>
                </div>

                {/* Q4: Defer */}
                <div className={`${styles.quadrant} ${styles['q-defer']}`}>
                  <div className={styles['quadrant-header']}>Defer &mdash; not important + not urgent</div>
                  <div className={styles['item-card']}>
                    <div className={styles['item-name']}>LexisNexis state letters</div>
                    <div className={styles['item-why']}>Fourth priority this week per your own ranking. Hold until BDX and summit are resolved.</div>
                  </div>
                  <div className={styles['item-card']}>
                    <div className={styles['item-name']}>Magnolia and Maverick</div>
                    <div className={styles['item-why']}>Dogs are in a good spot. Nothing to action.</div>
                  </div>
                </div>

              </div>

              <div style={{
                display: 'grid', gridTemplateColumns: '1fr 1fr',
                fontFamily: "'DM Mono', monospace", fontSize: 9,
                color: 'var(--muted)', letterSpacing: '0.08em', textAlign: 'center', marginTop: 4,
              }}>
                <div>&larr; not urgent</div>
                <div>urgent &rarr;</div>
              </div>
            </div>
          </div>
        </div>

        <div className={styles.watchouts}>
          <div className={styles['section-label']}>Watch-outs &mdash; most likely to slip today</div>

          <div className={styles['watchout-item']}>
            <div className={styles['watchout-number']}>1</div>
            <div className={styles['watchout-content']}>
              <div className={styles['watchout-title']}>Greenlight BDX report &mdash; the overdue one that&rsquo;s still sitting there</div>
              <div className={styles['watchout-detail']}>The contractual deadline was the 15th. It&rsquo;s the 20th. This doesn&rsquo;t get better on the road. If it doesn&rsquo;t ship before you board, it becomes a Tuesday problem on top of a summit day &mdash; and that&rsquo;s a bad trade. The data team is waiting on you. Give them a runway before wheels-up.</div>
            </div>
          </div>

          <div className={styles['watchout-item']}>
            <div className={styles['watchout-number']}>2</div>
            <div className={styles['watchout-content']}>
              <div className={styles['watchout-title']}>Everett&rsquo;s Final Forms deadline &mdash; the one with a hard wall</div>
              <div className={styles['watchout-detail']}>Tryouts are April 27. The physical must be dated after April 15. The paperwork &mdash; physical form plus health insurance info &mdash; needs to be in Final Forms before that date. This is the kind of item that feels like it has runway until it doesn&rsquo;t. It needs an owner and a completion date today, not Thursday.</div>
            </div>
          </div>

          <div className={styles['watchout-item']}>
            <div className={styles['watchout-number']}>3</div>
            <div className={styles['watchout-content']}>
              <div className={styles['watchout-title']}>LexisNexis escalation &mdash; someone has to name the escalation path</div>
              <div className={styles['watchout-detail']}>The network team has been unresponsive on the PGP key. The Rock doesn&rsquo;t move until the key arrives. Waiting is not a strategy &mdash; someone with authority needs to be named and contacted today. If that person isn&rsquo;t you, identify who it is before you board.</div>
            </div>
          </div>
        </div>

        <div className={styles.actions}>
          <div className={styles['section-label']}>Actions ready &mdash; approve to send</div>

          {actions.map((action, i) => (
            <div className={styles['action-card']} key={i}>
              <div className={styles['action-content']}>
                <div className={styles['action-label']}>{action.label}</div>
                <div className={styles['action-text']}>{action.text}</div>
              </div>
              <button
                className={`${styles['action-btn']}${approvals[i] ? ` ${styles.approved}` : ''}`}
                onClick={() => handleApprove(i)}
              >
                {approvals[i] ? 'Approved' : 'Approve'}
              </button>
            </div>
          ))}
        </div>

        <div className={styles['closing-question']}>
          <div className={styles['closing-q-text']}>&ldquo;The data summit is Tuesday &mdash; what&rsquo;s the one outcome that would make it a success, and what would a failure look like?&rdquo;</div>
          <div className={styles['closing-q-meta']}>Learning loop &middot; Question 1 of 1</div>
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
