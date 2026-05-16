// Shared AI provider abstraction for Oracle & Cassandra screens.

export const PROVIDERS = [
  { id: 'claude', label: 'Claude',  hint: 'Anthropic key  sk-ant-…' },
  { id: 'gemini', label: 'Gemini',  hint: 'Google AI key  AIza…'    },
  { id: 'grok',   label: 'Grok',    hint: 'xAI key  xai-…'          },
  { id: 'openai', label: 'OpenAI',  hint: 'OpenAI key  sk-…'         },
];

// ── Web / browser mode ─────────────────────────────────────────────────────
export const WEB_PROVIDERS = [
  { id: 'claude',  label: 'Claude',  url: 'https://claude.ai/new'           },
  { id: 'chatgpt', label: 'ChatGPT', url: 'https://chatgpt.com/'            },
  { id: 'gemini',  label: 'Gemini',  url: 'https://gemini.google.com/app'   },
  { id: 'grok',    label: 'Grok',    url: 'https://x.com/i/grok'            },
];

export function getStoredMode()        { return localStorage.getItem('mage_ai_mode') || 'api'; }
export function storeMode(mode)        { localStorage.setItem('mage_ai_mode', mode); }
export function getStoredWebProvider() { return localStorage.getItem('mage_web_provider') || 'claude'; }
export function storeWebProvider(id)   { localStorage.setItem('mage_web_provider', id); }

// Copy prompt to clipboard and open the chosen AI's web chat.
// Returns { copied: boolean } so callers can surface appropriate feedback.
export async function openInWeb(webProviderId, promptText) {
  const prov = WEB_PROVIDERS.find(p => p.id === webProviderId) || WEB_PROVIDERS[0];
  let copied = false;
  try {
    await navigator.clipboard.writeText(promptText);
    copied = true;
  } catch { /* clipboard blocked — user can still copy manually */ }
  window.open(prov.url, '_blank', 'noopener,noreferrer');
  return { copied, label: prov.label };
}

export function getStoredProvider() {
  return localStorage.getItem('mage_ai_provider') || 'claude';
}

export function getStoredKey(provider) {
  // Migrate legacy single key to per-provider key on first read
  if (provider === 'claude') {
    const legacy = localStorage.getItem('mage_api_key');
    const keyed  = localStorage.getItem('mage_api_key_claude');
    if (!keyed && legacy) {
      localStorage.setItem('mage_api_key_claude', legacy);
      return legacy;
    }
  }
  return localStorage.getItem(`mage_api_key_${provider}`) || '';
}

export function storeProvider(provider) {
  localStorage.setItem('mage_ai_provider', provider);
}

export function storeKey(provider, key) {
  localStorage.setItem(`mage_api_key_${provider}`, key);
}

// ── API call normalised to return raw text ─────────────────────────────────
export async function callAI({ provider, apiKey, system, userMessage, maxTokens = 4096 }) {
  switch (provider) {
    case 'claude':  return _claude ({ apiKey, system, userMessage, maxTokens });
    case 'gemini':  return _gemini ({ apiKey, system, userMessage, maxTokens });
    case 'grok':    return _grok   ({ apiKey, system, userMessage, maxTokens });
    case 'openai':  return _openai ({ apiKey, system, userMessage, maxTokens });
    default: throw new Error('Unknown provider: ' + provider);
  }
}

async function _claude({ apiKey, system, userMessage, maxTokens }) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: maxTokens,
      system,
      messages: [{ role: 'user', content: userMessage }],
    }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data.content.map(b => b.text || '').join('').trim();
}

async function _gemini({ apiKey, system, userMessage, maxTokens }) {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${encodeURIComponent(apiKey)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: [{ role: 'user', parts: [{ text: userMessage }] }],
        generationConfig: { maxOutputTokens: maxTokens, temperature: 0.7 },
      }),
    }
  );
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('Empty response from Gemini');
  return text.trim();
}

async function _grok({ apiKey, system, userMessage, maxTokens }) {
  const res = await fetch('https://api.x.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'grok-2-latest',
      max_tokens: maxTokens,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: userMessage },
      ],
    }),
  });
  const data = await res.json();
  if (data.error) throw new Error(typeof data.error === 'string' ? data.error : data.error.message || JSON.stringify(data.error));
  const text = data.choices?.[0]?.message?.content;
  if (!text) throw new Error('Empty response from Grok');
  return text.trim();
}

async function _openai({ apiKey, system, userMessage, maxTokens }) {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      max_tokens: maxTokens,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: userMessage },
      ],
    }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  const text = data.choices?.[0]?.message?.content;
  if (!text) throw new Error('Empty response from OpenAI');
  return text.trim();
}
