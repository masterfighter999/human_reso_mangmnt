import React, { useState, useRef, useEffect } from 'react';

/* ─────────────────────────────────────────────────────────────
   Password strength engine
   Returns: { score 0-4, label, color, checks }
   ───────────────────────────────────────────────────────────── */
export function analyzePassword(pwd) {
  const checks = {
    length:    pwd.length >= 8,
    length12:  pwd.length >= 12,
    upper:     /[A-Z]/.test(pwd),
    lower:     /[a-z]/.test(pwd),
    number:    /[0-9]/.test(pwd),
    special:   /[^A-Za-z0-9]/.test(pwd),
  };

  let score = 0;
  if (checks.length)   score++;
  if (checks.upper && checks.lower) score++;
  if (checks.number)   score++;
  if (checks.special)  score++;
  if (checks.length12) score = Math.min(4, score + 0.5); // bonus for 12+ chars

  // Normalise to 0-4 integer
  score = Math.min(4, Math.floor(score));

  const levels = [
    { label: 'Too Weak',   color: '#B04A4A' },   // score 0
    { label: 'Weak',       color: '#C1793B' },   // score 1
    { label: 'Fair',       color: '#C9A227' },   // score 2
    { label: 'Strong',     color: '#3E8060' },   // score 3
    { label: 'Very Strong',color: '#2A6644' },   // score 4
  ];

  return { score, ...levels[score], checks };
}

/* ─────────────────────────────────────────────────────────────
   PasswordField component
   Props:
     id          – input id (for label)
     label       – field label text
     value       – controlled value
     onChange    – (e) => void
     placeholder
     required
     showStrength – whether to display strength meter (default true)
     style       – wrapper div style overrides
   ───────────────────────────────────────────────────────────── */
export default function PasswordField({
  id,
  label,
  value = '',
  onChange,
  placeholder = '••••••••',
  required = false,
  showStrength = true,
  style = {},
}) {
  const [visible, setVisible] = useState(false);
  const [focused, setFocused] = useState(false);
  const tooltipRef = useRef(null);

  const analysis = analyzePassword(value);
  const showMeter = showStrength && value.length > 0;

  /* Criteria items for the tooltip checklist */
  const criteria = [
    { key: 'length',  label: 'At least 8 characters',          met: analysis.checks.length },
    { key: 'upper',   label: 'Uppercase letter (A-Z)',          met: analysis.checks.upper },
    { key: 'lower',   label: 'Lowercase letter (a-z)',          met: analysis.checks.lower },
    { key: 'number',  label: 'Number (0-9)',                    met: analysis.checks.number },
    { key: 'special', label: 'Special character (!@#$%…)',      met: analysis.checks.special },
    { key: 'length12',label: '12+ characters (recommended)',    met: analysis.checks.length12 },
  ];

  /* Strength bar segments: 4 segments for scores 1-4 */
  const segments = 4;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', position: 'relative', ...style }}>
      {label && (
        <label
          htmlFor={id}
          style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--ink-soft)' }}
        >
          {label}
        </label>
      )}

      {/* Input row */}
      <div style={{ position: 'relative' }}>
        <input
          id={id}
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={onChange}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={placeholder}
          required={required}
          autoComplete="new-password"
          style={{
            width: '100%',
            paddingRight: '44px',
            borderColor: showMeter
              ? analysis.score < 2 ? 'var(--rose)' : analysis.score < 3 ? 'var(--amber)' : 'var(--accent)'
              : undefined,
            transition: 'border-color 0.25s',
          }}
        />
        {/* Show / hide toggle */}
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          tabIndex={-1}
          aria-label={visible ? 'Hide password' : 'Show password'}
          style={{
            position: 'absolute',
            right: '10px',
            top: '50%',
            transform: 'translateY(-50%)',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '4px',
            color: 'var(--muted)',
            lineHeight: 1,
            fontSize: '1rem',
          }}
        >
          {visible ? (
            /* Eye-off icon */
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
              <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
              <line x1="1" y1="1" x2="23" y2="23" />
            </svg>
          ) : (
            /* Eye icon */
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          )}
        </button>
      </div>

      {/* ── Strength Meter ── */}
      {showStrength && showMeter && (
        <div>
          {/* Segmented bar */}
          <div style={{ display: 'flex', gap: '4px', height: '4px', marginTop: '2px' }}>
            {Array.from({ length: segments }).map((_, i) => (
              <div
                key={i}
                style={{
                  flex: 1,
                  borderRadius: '99px',
                  background: i < analysis.score ? analysis.color : 'var(--line)',
                  transition: 'background 0.3s ease',
                }}
              />
            ))}
          </div>

          {/* Label row */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '5px' }}>
            <span
              style={{
                fontSize: '0.75rem',
                fontWeight: 700,
                color: analysis.color,
                transition: 'color 0.3s',
              }}
            >
              {analysis.label}
            </span>
            <span style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>
              {analysis.score < 3 ? 'Must be at least Strong to continue' : '✓ Acceptable strength'}
            </span>
          </div>
        </div>
      )}

      {/* ── Tooltip / Suggestion Panel ── */}
      {showStrength && focused && value.length > 0 && (
        <div
          ref={tooltipRef}
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            left: 0,
            right: 0,
            zIndex: 200,
            background: 'var(--ink)',
            border: '1px solid var(--ink-soft)',
            borderRadius: '10px',
            padding: '14px 16px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.24)',
            animation: 'fadeInDown 0.15s ease',
          }}
        >
          <p style={{ fontSize: '0.75rem', color: '#a5b4fc', fontWeight: 700, marginBottom: '10px', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
            💡 Tips for a secure password
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {criteria.map((c) => (
              <div key={c.key} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{
                  width: '16px',
                  height: '16px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  fontSize: '0.65rem',
                  fontWeight: 700,
                  background: c.met ? '#3E8060' : 'rgba(255,255,255,0.08)',
                  color: c.met ? '#fff' : '#6B7280',
                  transition: 'background 0.2s, color 0.2s',
                }}>
                  {c.met ? '✓' : '·'}
                </span>
                <span style={{ fontSize: '0.78rem', color: c.met ? '#d1fae5' : '#9ca3af', transition: 'color 0.2s' }}>
                  {c.label}
                </span>
              </div>
            ))}
          </div>

          {/* Suggestions when strength is low */}
          {analysis.score < 3 && (
            <div style={{
              marginTop: '12px',
              padding: '8px 10px',
              background: 'rgba(193,121,59,0.15)',
              border: '1px solid rgba(193,121,59,0.3)',
              borderRadius: '6px',
            }}>
              <p style={{ fontSize: '0.74rem', color: '#fbbf24', lineHeight: 1.5 }}>
                <strong>Suggestion:</strong>{' '}
                {!analysis.checks.special
                  ? 'Add symbols like !, @, #, $ to significantly boost strength.'
                  : !analysis.checks.length12
                  ? 'Use 12 or more characters for a stronger password.'
                  : !analysis.checks.number
                  ? 'Mix in some numbers to harden your password.'
                  : 'Combine uppercase + lowercase + numbers + symbols.'}
              </p>
            </div>
          )}

          {/* Arrow pointer */}
          <div style={{
            position: 'absolute',
            top: '-6px',
            left: '20px',
            width: '10px',
            height: '10px',
            background: 'var(--ink)',
            border: '1px solid var(--ink-soft)',
            transform: 'rotate(45deg)',
            borderRight: 'none',
            borderBottom: 'none',
          }} />
        </div>
      )}
    </div>
  );
}
