// ──────────────────────────────────────────────────────────────
// OdaxAI Studio
// Copyright © 2026 OdaxAI SRL. All rights reserved.
// Licensed under the PolyForm Noncommercial License 1.0.0
// ──────────────────────────────────────────────────────────────

'use client';

import { useState, useEffect } from 'react';
import {
  Search,
  Key,
  AlertCircle,
  Check,
  Trash2,
  ExternalLink,
} from 'lucide-react';

export default function SearchSettingsPage(): JSX.Element {
  const [apiKey, setApiKey] = useState('');
  const [cx, setCx] = useState('');
  const [enabled, setEnabled] = useState(false);
  const [configured, setConfigured] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const res = await fetch('/api/search-config');
      const data = await res.json();
      setConfigured(data.configured);
      setEnabled(data.enabled);
    } catch (e) {
      console.error('Failed to load config:', e);
    } finally {
      setLoading(false);
    }
  };

  const saveConfig = async () => {
    setSaving(true);
    setMessage('');
    try {
      const res = await fetch('/api/search-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          googleApiKey: apiKey || undefined,
          googleCx: cx || undefined,
          enabled,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setConfigured(data.configured);
        setMessage('Settings saved successfully!');
        setApiKey('');
        setCx('');
      } else {
        setMessage('Failed to save settings');
      }
    } catch {
      setMessage('Error saving settings');
    } finally {
      setSaving(false);
    }
  };

  const clearKeys = async () => {
    if (!confirm('Are you sure you want to clear your API keys?')) return;
    try {
      await fetch('/api/search-config', { method: 'DELETE' });
      setConfigured(false);
      setEnabled(false);
      setMessage('API keys cleared');
    } catch {
      setMessage('Failed to clear keys');
    }
  };

  if (loading) {
    return <div className="p-8 text-white/50">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] p-8">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <Search size={28} className="text-indigo-400" />
          <h1 className="text-2xl font-semibold text-white">Search Settings</h1>
        </div>

        {/* Info Box */}
        <div className="bg-indigo-500/10 border border-indigo-500/30 rounded-xl p-4 mb-6">
          <div className="flex gap-3">
            <AlertCircle
              size={20}
              className="text-indigo-400 flex-shrink-0 mt-0.5"
            />
            <div>
              <p className="text-white/90 font-medium mb-1">About Web Search</p>
              <p className="text-white/60 text-sm">
                Web Search and Deep Research use your own Google Programmable
                Search API key (BYO key).
                <strong className="text-white/80">
                  {' '}
                  No web scraping is performed
                </strong>{' '}
                - we use only the official Google API.
              </p>
            </div>
          </div>
        </div>

        {/* Status */}
        <div
          className={`rounded-xl p-4 mb-6 ${configured ? 'bg-green-500/10 border border-green-500/30' : 'bg-yellow-500/10 border border-yellow-500/30'}`}
        >
          <div className="flex items-center gap-3">
            {configured ? (
              <>
                <Check size={20} className="text-green-400" />
                <span className="text-green-400">
                  Search is configured and {enabled ? 'enabled' : 'disabled'}
                </span>
              </>
            ) : (
              <>
                <AlertCircle size={20} className="text-yellow-400" />
                <span className="text-yellow-400">
                  Search is disabled until you add your Google API Key + CX
                </span>
              </>
            )}
          </div>
        </div>

        {/* Configuration Form */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-6 mb-6">
          <h2 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
            <Key size={18} />
            Google Custom Search API
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block text-white/70 text-sm mb-2">
                API Key
                <a
                  href="https://console.cloud.google.com/apis/credentials"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-indigo-400 ml-2 hover:underline inline-flex items-center gap-1"
                >
                  Get key <ExternalLink size={12} />
                </a>
              </label>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={
                  configured ? '••••••••••••••••' : 'Enter your Google API Key'
                }
                className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-white/70 text-sm mb-2">
                Search Engine ID (CX)
                <a
                  href="https://programmablesearchengine.google.com/controlpanel/all"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-indigo-400 ml-2 hover:underline inline-flex items-center gap-1"
                >
                  Create engine <ExternalLink size={12} />
                </a>
              </label>
              <input
                type="text"
                value={cx}
                onChange={(e) => setCx(e.target.value)}
                placeholder={
                  configured
                    ? '••••••••••••••••'
                    : 'Enter your Search Engine ID'
                }
                className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setEnabled(!enabled)}
                className={`w-12 h-6 rounded-full transition-colors ${enabled ? 'bg-indigo-500' : 'bg-white/20'}`}
              >
                <div
                  className={`w-5 h-5 bg-white rounded-full transition-transform ${enabled ? 'translate-x-6' : 'translate-x-0.5'}`}
                />
              </button>
              <span className="text-white/70">Enable Web Search</span>
            </div>

            {message && (
              <p
                className={`text-sm ${message.includes('success') ? 'text-green-400' : 'text-yellow-400'}`}
              >
                {message}
              </p>
            )}

            <div className="flex gap-3 pt-2">
              <button
                onClick={saveConfig}
                disabled={saving}
                className="flex-1 bg-indigo-500 hover:bg-indigo-600 text-white font-medium py-3 rounded-lg transition-colors disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Settings'}
              </button>

              {configured && (
                <button
                  onClick={clearKeys}
                  className="px-4 py-3 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-colors flex items-center gap-2"
                >
                  <Trash2 size={16} />
                  Clear
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-6">
          <h3 className="text-white font-medium mb-3">How to set up:</h3>
          <ol className="text-white/60 text-sm space-y-2 list-decimal list-inside">
            <li>
              Go to{' '}
              <a
                href="https://console.cloud.google.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-indigo-400 hover:underline"
              >
                Google Cloud Console
              </a>
            </li>
            <li>
              Create a project and enable the &quot;Custom Search API&quot;
            </li>
            <li>Create an API key in Credentials</li>
            <li>
              Go to{' '}
              <a
                href="https://programmablesearchengine.google.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-indigo-400 hover:underline"
              >
                Programmable Search Engine
              </a>
            </li>
            <li>
              Create a new search engine (choose &quot;Search the entire
              web&quot;)
            </li>
            <li>Copy the Search Engine ID (CX)</li>
            <li>Enter both values above and save</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
