import API from '../utils/api';

// Utility to fetch LLM provider config from backend
export async function fetchLLMProviderConfig() {
  const res = await fetch(API.LLM_PROVIDER_CONFIG);
  console.log('Response from LLM provider config:', res);
  if (!res.ok) throw new Error('Failed to fetch LLM provider config');
  return res.json();
}

// Utility to save LLM provider config to backend
export async function saveLLMProviderConfig(config: Record<string, string>) {
  const res = await fetch(API.LLM_PROVIDER_CONFIG, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(config),
  });
  if (!res.ok) throw new Error('Failed to save LLM provider config');
  return res.json();
}
