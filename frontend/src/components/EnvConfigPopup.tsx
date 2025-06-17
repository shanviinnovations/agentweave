import React, { useState, useEffect } from 'react';
import { fetchLLMProviderConfig, saveLLMProviderConfig } from './llmProviderApi';

interface EnvConfigPopupProps {
  open: boolean;
  onClose: () => void;
  onSave: (env: Record<string, string>) => void;
}

const PROVIDERS = [
  { label: 'OpenAI', value: 'openai' },
  { label: 'Google', value: 'google' },
  { label: 'Azure', value: 'azure' },
];

function EnvConfigPopup({ open, onClose, onSave }: EnvConfigPopupProps) {
  const [provider, setProvider] = useState('openai');
  const [openaiKey, setOpenaiKey] = useState('');
  const [googleKey, setGoogleKey] = useState('');
  const [azureEndpoint, setAzureEndpoint] = useState('');
  const [azureKey, setAzureKey] = useState('');
  const [azureVersion, setAzureVersion] = useState('');

  useEffect(() => {
    if (open) {
      fetchLLMProviderConfig().then(cfg => {
        if (cfg.LLM_PROVIDER) setProvider(cfg.LLM_PROVIDER); // Use LLM_PROVIDER from server
        if (cfg.OPENAI_API_KEY) setOpenaiKey(cfg.OPENAI_API_KEY);
        if (cfg.GOOGLE_API_KEY) setGoogleKey(cfg.GOOGLE_API_KEY);
        if (cfg.AZURE_OPENAI_ENDPOINT) setAzureEndpoint(cfg.AZURE_OPENAI_ENDPOINT);
        if (cfg.AZURE_OPENAI_API_KEY) setAzureKey(cfg.AZURE_OPENAI_API_KEY);
        if (cfg.AZURE_OPENAI_API_VERSION) setAzureVersion(cfg.AZURE_OPENAI_API_VERSION);
      }).catch(() => {});
    }
  }, [open]);

  const handleSave = async () => {
    const env: Record<string, string> = {
      LLM_PROVIDER: provider,
    };
    if (provider === 'openai') env.OPENAI_API_KEY = openaiKey;
    if (provider === 'google') env.GOOGLE_API_KEY = googleKey;
    if (provider === 'azure') {
      env.AZURE_OPENAI_ENDPOINT = azureEndpoint;
      env.AZURE_OPENAI_API_KEY = azureKey;
      env.AZURE_OPENAI_API_VERSION = azureVersion;
    }
    await saveLLMProviderConfig(env);
    onSave(env);
    onClose();
  };

  const isSaveDisabled =
    (provider === 'openai' && !openaiKey) ||
    (provider === 'google' && !googleKey) ||
    (provider === 'azure' && (!azureEndpoint || !azureKey || !azureVersion));

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-surface rounded-xl shadow-card p-8 min-w-[400px] relative">
        <button onClick={onClose} className="absolute top-3 right-3 text-textSecondary hover:text-accent">✕</button>
        <h2 className="text-xl font-bold text-primary mb-4">Environment Configuration</h2>
        <div className="mb-4">
          <label className="block mb-1 font-semibold" htmlFor="llm-provider-select">LLM Provider</label>
          <select
            id="llm-provider-select"
            className="w-full border rounded p-2"
            value={provider}
            onChange={e => setProvider(e.target.value)}
            aria-label="LLM Provider"
          >
            {PROVIDERS.map(p => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </select>
        </div>
        {provider === 'openai' && (
          <div className="mb-4">
            <label className="block mb-1 font-semibold">OpenAI API Key</label>
            <input
              className="w-full border rounded p-2"
              type="password"
              value={openaiKey}
              onChange={e => setOpenaiKey(e.target.value)}
              placeholder="Enter your OpenAI API key"
            />
          </div>
        )}
        {provider === 'google' && (
          <div className="mb-4">
            <label className="block mb-1 font-semibold">Google API Key</label>
            <input
              className="w-full border rounded p-2"
              type="password"
              value={googleKey}
              onChange={e => setGoogleKey(e.target.value)}
              placeholder="Enter your Google API key"
            />
          </div>
        )}
        {provider === 'azure' && (
          <>
            <div className="mb-4">
              <label className="block mb-1 font-semibold">Azure OpenAI Endpoint</label>
              <input
                className="w-full border rounded p-2"
                type="text"
                value={azureEndpoint}
                onChange={e => setAzureEndpoint(e.target.value)}
                placeholder="Enter Azure OpenAI endpoint"
              />
            </div>
            <div className="mb-4">
              <label className="block mb-1 font-semibold">Azure OpenAI API Key</label>
              <input
                className="w-full border rounded p-2"
                type="password"
                value={azureKey}
                onChange={e => setAzureKey(e.target.value)}
                placeholder="Enter Azure OpenAI API key"
              />
            </div>
            <div className="mb-4">
              <label className="block mb-1 font-semibold">Azure OpenAI API Version</label>
              <input
                className="w-full border rounded p-2"
                type="text"
                value={azureVersion}
                onChange={e => setAzureVersion(e.target.value)}
                placeholder="Enter Azure OpenAI API version"
              />
            </div>
          </>
        )}
        <button
          className="w-full bg-primary text-white font-bold py-2 rounded hover:bg-primary-dark transition btn-primary"
          onClick={handleSave}
          disabled={isSaveDisabled}
        >
          Save
        </button>
      </div>
    </div>
  );
}

export default EnvConfigPopup;
