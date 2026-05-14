import { useState } from 'react';
import { G } from './palette.js';
import CharacterList  from './screens/CharacterList.jsx';
import CharacterSheet from './screens/CharacterSheet.jsx';
import SphereReference from './screens/SphereReference.jsx';
import OracleScreen   from './screens/OracleScreen.jsx';
import CassandraScreen from './screens/CassandraScreen.jsx';

const TABS = [
  { id: 'chars',     label: 'Characters', icon: '⬟' },
  { id: 'spheres',   label: 'Spheres',    icon: '⬡' },
  { id: 'oracle',    label: 'Oracle',     icon: '⚗' },
  { id: 'cassandra', label: 'Cassandra',  icon: '⚜' },
];

function BottomNav({ active, onChange }) {
  return (
    <div style={{
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
              padding: '10px 4px 12px',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
              cursor: 'pointer',
              borderTop: `2px solid ${isActive ? G.gold : 'transparent'}`,
            }}
          >
            <span style={{ fontSize: 18, color: isActive ? G.gold : G.goldDim, filter: isActive ? `drop-shadow(0 0 6px ${G.gold}88)` : 'none', lineHeight: 1 }}>
              {tab.icon}
            </span>
            <span style={{ fontFamily: 'Cinzel,serif', fontSize: 8, letterSpacing: '.1em', color: isActive ? G.gold : G.muted, textTransform: 'uppercase' }}>
              {tab.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export default function App() {
  const [activeTab,   setActiveTab]   = useState('chars');
  const [openCharId,  setOpenCharId]  = useState(null);

  const handleOpenChar = (id) => setOpenCharId(id);
  const handleCloseSheet = () => setOpenCharId(null);

  const handleTabChange = (tab) => {
    if (openCharId && tab === 'chars') {
      // Going back to list from sheet
    }
    setActiveTab(tab);
  };

  // If a character is open, show the sheet overlay
  if (openCharId) {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', background: G.bg }}>
        <CharacterSheet charId={openCharId} onBack={handleCloseSheet} />
      </div>
    );
  }

  return (
    <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', background: G.bg, overflow: 'hidden' }}>
      {/* Main content area */}
      <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
        {/* Keep all screens mounted but hide inactive ones to preserve scroll state */}
        <div style={{ position: 'absolute', inset: 0, display: activeTab === 'chars'     ? 'flex' : 'none', flexDirection: 'column' }}>
          <CharacterList onOpen={handleOpenChar} />
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
      </div>

      <BottomNav active={activeTab} onChange={handleTabChange} />
    </div>
  );
}
