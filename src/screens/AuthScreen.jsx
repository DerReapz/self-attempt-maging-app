import { useState } from 'react';
import { useTheme } from '../context/ThemeContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';

export default function AuthScreen() {
  const G = useTheme();
  const { login, register, skipLogin } = useAuth();
  const [mode,    setMode]    = useState('login');
  const [email,   setEmail]   = useState('');
  const [pass,    setPass]    = useState('');
  const [error,   setError]   = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (mode === 'login') await login(email, pass);
      else                   await register(email, pass);
    } catch (err) {
      setError(friendlyError(err.code));
      setLoading(false);
    }
  };

  const inputStyle = {
    width: '100%', background: '#0e0e0e',
    border: `1px solid ${G.border}`, borderRadius: 2,
    padding: '12px 14px', color: G.text,
    fontFamily: 'EB Garamond,serif', fontSize: 15,
    outline: 'none', boxSizing: 'border-box',
  };

  return (
    <div style={{
      height: '100dvh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: G.bg,
      backgroundImage: 'radial-gradient(ellipse at 50% 0%,#1a1208 0%,transparent 60%)',
      padding: '0 28px',
    }}>
      <div style={{ marginBottom: 40, textAlign: 'center' }}>
        <div style={{
          fontFamily: 'Cinzel Decorative,serif', fontSize: 22,
          color: G.gold, textShadow: `0 0 40px ${G.gold}55`, marginBottom: 8,
        }}>
          MAGE
        </div>
        <div style={{
          fontFamily: 'Cinzel,serif', fontSize: 9, letterSpacing: '.4em',
          color: G.muted, textTransform: 'uppercase',
        }}>
          The Ascension
        </div>
        <div style={{
          marginTop: 16, fontFamily: 'EB Garamond,serif', fontSize: 13,
          color: G.textDim, lineHeight: 1.7,
        }}>
          Sign in to back up your characters to the cloud<br />and access them from any device.
        </div>
      </div>

      {/* Mode toggle */}
      <div style={{
        display: 'flex', width: '100%', maxWidth: 340,
        border: `1px solid ${G.border}`, borderRadius: 2, overflow: 'hidden',
        marginBottom: 20,
      }}>
        {[['login', 'Sign In'], ['register', 'Register']].map(([m, lbl]) => (
          <button key={m} onClick={() => { setMode(m); setError(''); }} style={{
            flex: 1, padding: '10px',
            fontFamily: 'Cinzel,serif', fontSize: 10, letterSpacing: '.15em',
            cursor: 'pointer', border: 'none',
            borderRight: m === 'login' ? `1px solid ${G.border}` : 'none',
            background: mode === m ? G.goldFaint : 'transparent',
            color: mode === m ? G.gold : G.muted,
          }}>
            {lbl}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} style={{
        width: '100%', maxWidth: 340,
        display: 'flex', flexDirection: 'column', gap: 12,
      }}>
        <input
          type="email" placeholder="Email" value={email}
          onChange={e => setEmail(e.target.value)}
          style={inputStyle} required autoComplete="email"
        />
        <input
          type="password" placeholder="Password (min. 6 characters)" value={pass}
          onChange={e => setPass(e.target.value)}
          style={inputStyle} required minLength={6}
          autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
        />

        {error && (
          <div style={{
            fontSize: 12, color: G.red,
            fontFamily: 'Cinzel,serif', letterSpacing: '.05em', textAlign: 'center',
          }}>
            {error}
          </div>
        )}

        <button type="submit" disabled={loading} style={{
          marginTop: 4, width: '100%', padding: '13px',
          fontFamily: 'Cinzel,serif', fontSize: 11, letterSpacing: '.2em',
          cursor: loading ? 'default' : 'pointer',
          background: G.goldFaint, border: `1px solid ${G.gold}`,
          color: G.gold, borderRadius: 2, opacity: loading ? 0.6 : 1,
        }}>
          {loading ? '···' : mode === 'login' ? 'ENTER THE ASCENSION' : 'CREATE ACCOUNT'}
        </button>
      </form>

      <button onClick={skipLogin} style={{
        marginTop: 28, background: 'transparent', border: 'none',
        color: G.muted, fontFamily: 'Cinzel,serif', fontSize: 10,
        letterSpacing: '.1em', cursor: 'pointer', padding: '4px 8px',
        textDecoration: 'underline',
      }}>
        continue without account
      </button>
    </div>
  );
}

function friendlyError(code) {
  switch (code) {
    case 'auth/invalid-email':          return 'Invalid email address.';
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':     return 'Incorrect email or password.';
    case 'auth/email-already-in-use':   return 'An account with this email already exists.';
    case 'auth/weak-password':          return 'Password must be at least 6 characters.';
    case 'auth/too-many-requests':      return 'Too many attempts. Try again later.';
    case 'auth/network-request-failed': return 'No network connection.';
    default:                            return 'Something went wrong. Please try again.';
  }
}
