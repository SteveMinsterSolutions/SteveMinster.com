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
      label: 'LexisNexis \u00B7 Calendar block',
      text: 'Block 2:00\u20133:30 PM today on the vQuip calendar: \u201CLexisNexis Rock \u2014 next deliverable.\u201D Description: Review current project status, identify single next deliverable, send update to team.',
    },
    {
      label: 'LexisNexis \u00B7 Team message draft',
      text: '\u201CHey team \u2014 checking in on LexisNexis status. I\u2019m blocking time this afternoon to review where we are. Can everyone send me their current status on their piece before 1:30 PM? Want to make sure we\u2019re aligned on what\u2019s next before EOD.\u201D',
    },
    {
      label: 'Family \u00B7 Pickup confirmation',
      text: 'Message Lauren: \u201CQuick check \u2014 what time are Everett and Dagny\u2019s pickups today? Want to make sure I\u2019ve got it locked.\u201D',
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
          Good morning, Steve. It&rsquo;s Monday &mdash; the fresh start you&rsquo;ve been building toward all weekend, or so we&rsquo;ll choose to believe. The LexisNexis situation has a heartbeat this morning, and it&rsquo;s racing. Let&rsquo;s not let it flatline on us.
        </div>

        <div className={styles.situation}>
          <div className={styles['section-label']}>Today&rsquo;s picture</div>
          <p>You&rsquo;re heading into a week where your vQuip Rock is visibly at risk &mdash; the LexisNexis connection project has missed deliverables and the quarter isn&rsquo;t getting longer. On the family side, Everett and Dagny both have afternoon activities that need pickups, and Lauren sent a message Sunday evening that may need a response before noon. Minster Solutions is lighter this week, which is the one good news item. The Astros have a game Thursday evening &mdash; no prep flagged, but worth confirming with the GroupMe.</p>
        </div>

        <div className={styles.dashboard}>
          <div className={styles['section-label']}>
            Priority dashboard &mdash; Eisenhower 2&times;2
            <span className={styles['escalation-badge']}><span className={styles['escalation-dot']}></span>1 escalating</span>
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
                    <div className={styles['item-name']}>LexisNexis connection project</div>
                    <div className={styles['item-why']}>Quarterly Rock. Deliverables missed. Quarter closing.</div>
                    <span className={`${styles['item-tag']} ${styles['tag-escalating']}`}>Escalating</span>
                    <span className={`${styles['item-tag']} ${styles['tag-rock']}`}>EOS Rock</span>
                  </div>
                  <div className={styles['item-card']}>
                    <div className={styles['item-name']}>Lauren&rsquo;s Sunday message</div>
                    <div className={styles['item-why']}>Respond before noon &mdash; may need action today.</div>
                    <span className={`${styles['item-tag']} ${styles['tag-new']}`}>Family</span>
                  </div>
                </div>

                {/* Q2: Schedule */}
                <div className={`${styles.quadrant} ${styles['q-schedule']}`}>
                  <div className={styles['quadrant-header']}>Schedule it &mdash; important + not urgent</div>
                  <div className={styles['item-card']}>
                    <div className={styles['item-name']}>vQuip open task backlog</div>
                    <div className={styles['item-why']}>At risk of drifting into Act Now by Wednesday.</div>
                  </div>
                  <div className={styles['item-card']}>
                    <div className={styles['item-name']}>Minster Solutions pipeline review</div>
                    <div className={styles['item-why']}>Lighter week &mdash; good time to advance this.</div>
                  </div>
                </div>

                {/* Q3: Batch */}
                <div className={`${styles.quadrant} ${styles['q-batch']}`}>
                  <div className={styles['quadrant-header']}>Batch it &mdash; not important + urgent</div>
                  <div className={styles['item-card']}>
                    <div className={styles['item-name']}>Astros GroupMe &mdash; Thursday game confirm</div>
                    <div className={styles['item-why']}>Quick check. 2 minutes.</div>
                    <span className={`${styles['item-tag']} ${styles['tag-kids']}`}>Community</span>
                  </div>
                  <div className={styles['item-card']}>
                    <div className={styles['item-name']}>ClassDojo / ParentSquare scan</div>
                    <div className={styles['item-why']}>Check for any school notices requiring action.</div>
                  </div>
                </div>

                {/* Q4: Defer */}
                <div className={`${styles.quadrant} ${styles['q-defer']}`}>
                  <div className={styles['quadrant-header']}>Defer &mdash; not important + not urgent</div>
                  <div className={styles['item-card']}>
                    <div className={styles['item-name']}>Bowling league scheduling</div>
                    <div className={styles['item-why']}>Nothing urgent this week.</div>
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
              <div className={styles['watchout-title']}>LexisNexis project &mdash; the Rock that&rsquo;s rolling the wrong way</div>
              <div className={styles['watchout-detail']}>This one has your name on it in the EOS accountability chart. Missed deliverables are already on the record. Without a specific next action logged today, this week ends the same way last week did. The quarter doesn&rsquo;t have runway left for another slide.</div>
            </div>
          </div>

          <div className={styles['watchout-item']}>
            <div className={styles['watchout-number']}>2</div>
            <div className={styles['watchout-content']}>
              <div className={styles['watchout-title']}>vQuip task backlog &mdash; the slow leak you don&rsquo;t notice until Friday</div>
              <div className={styles['watchout-detail']}>Nothing here is on fire today. That&rsquo;s exactly when it slips. Monday afternoons are historically your highest-capacity window. Protect 90 minutes this afternoon before the day fragments.</div>
            </div>
          </div>

          <div className={styles['watchout-item']}>
            <div className={styles['watchout-number']}>3</div>
            <div className={styles['watchout-content']}>
              <div className={styles['watchout-title']}>Kids&rsquo; afternoon pickups &mdash; confirm the logistics now</div>
              <div className={styles['watchout-detail']}>Everett and Dagny both have afternoon activities. Confirm pickup times now so there are no surprises when your 4 PM meeting runs long.</div>
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
          <div className={styles['closing-q-text']}>&ldquo;Last week you mentioned the LexisNexis vendor call was scheduled for Friday. Did that happen &mdash; and if so, what moved?&rdquo;</div>
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
