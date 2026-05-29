import { useState } from 'react';
import { useTheme } from './context/ThemeContext.jsx';
import { useAuth } from './context/AuthContext.jsx';
import { applyTextSize } from './screens/SettingsScreen.jsx';
import AuthScreen       from './screens/AuthScreen.jsx';
import CharacterList    from './screens/CharacterList.jsx';
import CharacterSheet   from './screens/CharacterSheet.jsx';
import CharacterCreator from './screens/CharacterCreator.jsx';
import SphereReference  from './screens/SphereReference.jsx';
import SpellsRituals    from './screens/SpellsRituals.jsx';
import OracleScreen     from './screens/OracleScreen.jsx';
import CassandraScreen  from './screens/CassandraScreen.jsx';
import SettingsScreen   from './screens/SettingsScreen.jsx';

// Apply stored text size immediately on load
applyTextSize(localStorage.getItem('mage_text_size') || 'normal');

const TABS = [
  { id: 'chars',     label: 'Characters', icon: '⬟' },
  { id: 'spells',    label: 'Spells',     icon: '✦'  },
  { id: 'spheres',   label: 'Spheres',    icon: '⬡' },
  { id: 'oracle',    label: 'Oracle',     icon: '⚗' },
  { id: 'cassandra', label: 'Cassandra',  icon: '⚜' },
  { id: 'settings',  label: 'Settings',   icon: '⚙' },
];

function BottomNav({ active, onChange }) {
  const G = useTheme();
  return (
    <div id="mage-nav" style={{
      position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 100,
      background: 'rgba(8,8,8,0.97)',
      backdropFilter: 'blur(12px)',
      borderTop: `1px solid ${G.goldFaint}`,
      display: 'flex',
      paddingBottom: 'env(safe-area-inset-bottom)',
    }}>
      {TABS.map((tab) => {
        const isActive = active === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            style={{
              flex: 1, background: 'transparent', border: 'none',
              padding: '8px 2px 10px',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
              cursor: 'pointer',
              borderTop: `2px solid ${isActive ? G.gold : 'transparent'}`,
            }}
          >
            <span style={{
              fontSize: 16, color: isActive ? G.gold : G.goldDim,
              filter: isActive ? `drop-shadow(0 0 6px ${G.gold}88)` : 'none',
              lineHeight: 1,
            }}>
              {tab.icon}
            </span>
            <span style={{
              fontFamily: 'Cinzel,serif', fontSize: 6, letterSpacing: '.06em',
              color: isActive ? G.gold : G.muted, textTransform: 'uppercase',
            }}>
              {tab.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function MainApp() {
  const G = useTheme();
  const [activeTab,   setActiveTab]   = useState('chars');
  const [openCharId,  setOpenCharId]  = useState(null);
  const [showCreator, setShowCreator] = useState(false);

  const handleOpenChar     = (id) => setOpenCharId(id);
  const handleCloseSheet   = ()   => setOpenCharId(null);
  const handleTabChange    = (tab) => setActiveTab(tab);
  const handleStartCreate  = ()   => setShowCreator(true);
  const handleCreatorDone  = (id) => { setShowCreator(false); setOpenCharId(id); };
  const handleCreatorCancel = ()  => setShowCreator(false);

  if (showCreator) {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', background: G.bg }}>
        <CharacterCreator onDone={handleCreatorDone} onCancel={handleCreatorCancel} />
      </div>
    );
  }

  if (openCharId) {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', background: G.bg }}>
        <CharacterSheet charId={openCharId} onBack={handleCloseSheet} />
      </div>
    );
  }

  return (
    <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', background: G.bg, overflow: 'hidden' }}>
      <div style={{ flex: 1, overflow: 'hidden', position: 'relative', minHeight: 0 }}>
        <div style={{ position: 'absolute', inset: 0, display: activeTab === 'chars'     ? 'flex' : 'none', flexDirection: 'column', overflowY: 'auto' }}>
          <CharacterList onOpen={handleOpenChar} onStartCreate={handleStartCreate} />
        </div>
        <div style={{ position: 'absolute', inset: 0, display: activeTab === 'spells'    ? 'flex' : 'none', flexDirection: 'column' }}>
          <SpellsRituals />
        </div>
        <div style={{ position: 'absolute', inset: 0, display: activeTab === 'spheres'   ? 'flex' : 'none', flexDirection: 'column' }}>
          <SphereReference />
        </div>
        <div style={{ position: 'absolute', inset: 0, display: activeTab === 'oracle'    ? 'flex' : 'none', flexDirection: 'column' }}>
          <OracleScreen />
        </div>
        <div style={{ position: 'absolute', inset: 0, display: activeTab === 'cassandra' ? 'flex' : 'none', flexDirection: 'column' }}>
          <CassandraScreen />
        </div>
        <div style={{ position: 'absolute', inset: 0, display: activeTab === 'settings'  ? 'flex' : 'none', flexDirection: 'column' }}>
          <SettingsScreen />
        </div>
      </div>
      <BottomNav active={activeTab} onChange={handleTabChange} />
    </div>
  );
}

export default function App() {
  const G = useTheme();
  const { user, skipped } = useAuth();

  if (user === undefined) {
    return <div style={{ height: '100dvh', background: G.bg }} />;
  }

  if (!user && !skipped) {
    return <AuthScreen />;
  }

  return <MainApp />;
}
