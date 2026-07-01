import React from 'react';

// Render-time safety net. Without this, a single uncaught render error
// unmounts the whole tree and the user sees only the body's #080808
// background — the "black screen, no error" the player has been hitting
// after the app sat in the background long enough for a stale state path
// to surface on cold start. Shows the actual error and offers two
// escape hatches: a soft reload, and a hard "wipe local app data"
// option for the rare case where corrupted localStorage is the cause.

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null, info: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    this.setState({ info });
    // eslint-disable-next-line no-console
    console.error('[mage] render error', error, info);
  }

  reload = () => {
    try { window.location.reload(); } catch { /* ignore */ }
  };

  resetAppData = () => {
    if (!window.confirm(
      'This will clear ALL locally-stored Mage app data, including characters, ' +
      'preferences, and any cached cloud session. Your cloud-vault characters ' +
      'remain in the cloud and can be restored after you sign back in. Continue?'
    )) return;
    try {
      const toKeep = ['mage_theme_mode', 'mage_custom_bg', 'mage_custom_acc'];
      const preserved = {};
      for (const k of toKeep) {
        const v = localStorage.getItem(k);
        if (v != null) preserved[k] = v;
      }
      localStorage.clear();
      for (const [k, v] of Object.entries(preserved)) localStorage.setItem(k, v);
      try { sessionStorage.clear(); } catch { /* ignore */ }
    } catch { /* ignore */ }
    this.reload();
  };

  render() {
    const { error, info } = this.state;
    if (!error) return this.props.children;

    const msg = (error && (error.message || String(error))) || 'Unknown error';
    const stack = (error && error.stack) || '';
    const compStack = (info && info.componentStack) || '';

    return (
      <div style={{
        minHeight: '100dvh', background: '#080808', color: '#e8d9b0',
        fontFamily: 'EB Garamond, Georgia, serif',
        padding: '24px 18px 40px', overflowY: 'auto', boxSizing: 'border-box',
      }}>
        <div style={{
          maxWidth: 720, margin: '0 auto',
        }}>
          <div style={{
            fontFamily: 'Cinzel Decorative, Cinzel, serif', fontSize: 22, color: '#c8a84b',
            letterSpacing: '.1em', textAlign: 'center', marginBottom: 6,
          }}>The Tellurian Falters</div>
          <div style={{
            fontStyle: 'italic', fontSize: 14, color: '#8a7a60', textAlign: 'center', marginBottom: 18,
          }}>
            The app hit an error it could not recover from. Details are below.
          </div>

          <div style={{
            background: 'rgba(192,48,48,0.08)', border: '1px solid #c0303088',
            borderRadius: 4, padding: '12px 14px', marginBottom: 16,
            wordBreak: 'break-word', fontSize: 13, color: '#c03030',
            fontFamily: 'ui-monospace, monospace',
          }}>{msg}</div>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 22 }}>
            <button onClick={this.reload} style={btn('#c8a84b')}>↻ RELOAD</button>
            <button onClick={this.resetAppData} style={btn('#c03030')}>⚠ RESET APP DATA</button>
          </div>

          {(stack || compStack) && (
            <details style={{ fontSize: 12, color: '#b8a880' }}>
              <summary style={{ cursor: 'pointer', color: '#c8a84b' }}>Stack trace</summary>
              <pre style={{
                whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                marginTop: 10, padding: '10px 12px',
                background: '#0e0e0e', border: '1px solid #c8a84b33', borderRadius: 3,
                color: '#b8a880', fontFamily: 'ui-monospace, monospace', fontSize: 11,
              }}>
                {stack}
                {compStack ? '\n\nComponent stack:' + compStack : ''}
              </pre>
            </details>
          )}
        </div>
      </div>
    );
  }
}

function btn(color) {
  return {
    fontFamily: 'Cinzel, serif', fontSize: 11, letterSpacing: '.18em',
    border: `1px solid ${color}`, borderRadius: 3, background: 'transparent',
    color, padding: '10px 18px', cursor: 'pointer',
  };
}
