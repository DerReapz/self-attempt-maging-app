import { supabase } from './supabase.js';

export const pushToVault = async (uid, char) => {
  if (!supabase) return;
  await supabase
    .from('vault_characters')
    .upsert(
      {
        player_id: uid,
        local_id:  char.id,
        name:      char.sheet?.identity?.name || '',
        sheet:     char,
      },
      { onConflict: 'player_id,local_id' }
    );
};

export const fetchFromVault = async (uid) => {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('vault_characters')
    .select('*')
    .eq('player_id', uid);
  if (error) throw error;
  return data ?? [];
};

let _timer = null;
let _prevIds = new Set();

export const debouncedSync = (uid, data, ms = 2000) => {
  clearTimeout(_timer);
  _timer = setTimeout(async () => {
    if (!supabase) return;
    const currentIds = new Set(Object.keys(data));

    // Delete vault rows for locally-deleted characters
    const deletedIds = [..._prevIds].filter(id => !currentIds.has(id));
    for (const id of deletedIds) {
      await supabase
        .from('vault_characters')
        .delete()
        .eq('player_id', uid)
        .eq('local_id', id);
    }

    // Upsert all current characters
    if (currentIds.size > 0) {
      const rows = Object.values(data).map(char => ({
        player_id: uid,
        local_id:  char.id,
        name:      char.sheet?.identity?.name || '',
        sheet:     char,
      }));
      await supabase
        .from('vault_characters')
        .upsert(rows, { onConflict: 'player_id,local_id' });
    }

    _prevIds = currentIds;
  }, ms);
};
