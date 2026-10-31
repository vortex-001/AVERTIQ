import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';
import {
  Settings,
  MapPin,
  Database,
  RefreshCw,
  Trash2,
  CheckCircle,
  Globe,
  Shield,
} from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [defaultLat, setDefaultLat] = useState('30.9010');
  const [defaultLon, setDefaultLon] = useState('75.8573');
  const [defaultRadius, setDefaultRadius] = useState('5.0');
  const [saveSuccess, setSaveSuccess] = useState(false);

  const { data: sources = [], isLoading: loadingSources } = useQuery({
    queryKey: ['sourceStatuses'],
    queryFn: () => api.getSourceStatuses(),
  });

  const seedMutation = useMutation({
    mutationFn: () => api.seedDemoData(),
    onSuccess: () => {
      queryClient.invalidateQueries();
      alert('Demo disaster scenario seeded successfully! Incidents and silent zones populated.');
    },
    onError: (err: any) => {
      alert(`Failed to seed demo data: ${err.message}`);
    },
  });

  const resetMutation = useMutation({
    mutationFn: () => api.resetDemoData(),
    onSuccess: () => {
      queryClient.invalidateQueries();
      alert('Demo data reset. Database cleared and re-initialized.');
    },
    onError: (err: any) => {
      alert(`Failed to reset demo data: ${err.message}`);
    },
  });

  const handleSaveMapSettings = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('avertiq_map_lat', defaultLat);
    localStorage.setItem('avertiq_map_lon', defaultLon);
    localStorage.setItem('avertiq_map_radius', defaultRadius);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const inputStyle = {
    background: 'var(--color-surface)',
    color: 'var(--color-text)',
    borderColor: 'var(--color-border)',
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      {/* Title */}
      <div className="flex items-center justify-between pb-4" style={{ borderBottom: '1px solid var(--color-border)' }}>
        <div>
          <h1 className="text-2xl font-black tracking-tight flex items-center space-x-2" style={{ color: 'var(--color-text)' }}>
            <Settings className="w-6 h-6" style={{ color: 'var(--color-primary)' }} />
            <span>Platform Configuration &amp; System Settings</span>
          </h1>
          <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
            Configure map boundaries, operational radius, provider integrations, and demo scenarios
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Map & Geospatial Defaults */}
        <div className="glass-panel p-5 rounded-xl space-y-4" style={{ border: '1px solid var(--color-border)' }}>
          <h2 className="text-sm font-bold uppercase tracking-wider flex items-center space-x-2" style={{ color: 'var(--color-text)' }}>
            <MapPin className="w-4 h-4" style={{ color: 'var(--color-primary)' }} />
            <span>Geospatial Defaults (Ludhiana Demonstration)</span>
          </h2>
          <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
            Initial viewing coordinates for dashboard maps. Incoming reports are never automatically assigned these coordinates.
          </p>

          <form onSubmit={handleSaveMapSettings} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-muted)' }}>
                  Default Latitude
                </label>
                <input
                  type="text"
                  value={defaultLat}
                  onChange={(e) => setDefaultLat(e.target.value)}
                  style={inputStyle}
                  className="w-full border rounded-lg px-3 py-2 text-xs font-mono focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-muted)' }}>
                  Default Longitude
                </label>
                <input
                  type="text"
                  value={defaultLon}
                  onChange={(e) => setDefaultLon(e.target.value)}
                  style={inputStyle}
                  className="w-full border rounded-lg px-3 py-2 text-xs font-mono focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-muted)' }}>
                Default Radius Filter (km)
              </label>
              <select
                value={defaultRadius}
                onChange={(e) => setDefaultRadius(e.target.value)}
                style={inputStyle}
                className="w-full border rounded-lg px-3 py-2 text-xs focus:outline-none"
              >
                <option value="1.0">1.0 km (Immediate Neighborhood)</option>
                <option value="2.0">2.0 km (Ward Level)</option>
                <option value="5.0">5.0 km (District Sub-sector)</option>
                <option value="10.0">10.0 km (Metropolitan Area)</option>
              </select>
            </div>

            <div className="pt-2 flex items-center justify-between">
              {saveSuccess && (
                <span className="text-xs text-emerald-500 flex items-center space-x-1">
                  <CheckCircle className="w-3.5 h-3.5" />
                  <span>Preferences saved</span>
                </span>
              )}
              <button
                type="submit"
                className="ml-auto px-4 py-2 text-white rounded-lg text-xs font-bold transition-all"
                style={{ background: 'var(--color-primary)' }}
              >
                Save Map Defaults
              </button>
            </div>
          </form>
        </div>

        {/* Demo Mode & Scenario Controller */}
        <div className="glass-panel p-5 rounded-xl space-y-4" style={{ border: '1px solid var(--color-border)' }}>
          <h2 className="text-sm font-bold uppercase tracking-wider flex items-center space-x-2" style={{ color: 'var(--color-text)' }}>
            <Database className="w-4 h-4 text-purple-500" />
            <span>Scenario &amp; Demo Data Control</span>
          </h2>
          <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
            Avertiq distinguishes synthetic demo data from real operational emergency feeds. Use these controls to seed or clean test data.
          </p>

          <div className="space-y-3 pt-2">
            <div
              className="p-3 rounded-lg flex items-center justify-between"
              style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
            >
              <div>
                <h4 className="text-xs font-semibold" style={{ color: 'var(--color-text)' }}>Deterministic Demo Scenario</h4>
                <p className="text-[11px] mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                  Loads Sutlej River inundation, multilingual reports (Hindi/Punjabi/Hinglish), warehouse fire, and critical silent-zones.
                </p>
              </div>
              <button
                onClick={() => seedMutation.mutate()}
                disabled={seedMutation.isPending}
                className="ml-3 px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold rounded-lg flex items-center space-x-1 transition-all disabled:opacity-50 shrink-0"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${seedMutation.isPending ? 'animate-spin' : ''}`} />
                <span>Seed Scenario</span>
              </button>
            </div>

            <div
              className="p-3 rounded-lg flex items-center justify-between"
              style={{ background: 'var(--color-surface)', border: '1px solid rgba(239,68,68,0.25)' }}
            >
              <div>
                <h4 className="text-xs font-semibold text-rose-500">Reset Demo Data</h4>
                <p className="text-[11px] mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                  Clears synthetic incidents, reports, silent-zone flags, and review audit records safely.
                </p>
              </div>
              <button
                onClick={() => {
                  if (confirm('Are you sure you want to reset all demo scenario records?')) {
                    resetMutation.mutate();
                  }
                }}
                disabled={resetMutation.isPending}
                className="ml-3 px-3 py-1.5 bg-rose-600/80 hover:bg-rose-500 text-white text-xs font-semibold rounded-lg flex items-center space-x-1 transition-all disabled:opacity-50 shrink-0"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Reset Data</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* External Integration & Feeds Status */}
      <div className="glass-panel p-5 rounded-xl space-y-4" style={{ border: '1px solid var(--color-border)' }}>
        <h2 className="text-sm font-bold uppercase tracking-wider flex items-center space-x-2" style={{ color: 'var(--color-text)' }}>
          <Globe className="w-4 h-4 text-emerald-500" />
          <span>Active Environmental Telemetry &amp; Provider Status</span>
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Weather API', name: 'Open-Meteo', status: 'Connected', statusClass: 'bg-emerald-500/20 text-emerald-600', note: 'Surface precipitation & wind telemetry' },
            { label: 'Seismic Feeds', name: 'USGS Earthquake', status: 'Connected', statusClass: 'bg-emerald-500/20 text-emerald-600', note: 'Global real-time seismic GeoJSON' },
            { label: 'NLP Intelligence', name: 'Gemini 1.5 Flash', status: 'Fallback Active', statusClass: 'bg-cyan-500/20 text-cyan-600', note: 'Deterministic fallback if key absent' },
            { label: 'Citizen Ingestion', name: 'Telegram Bot API', status: 'Webhook Ready', statusClass: 'bg-amber-500/20 text-amber-600', note: 'Secret-token verified webhook endpoint' },
          ].map((item) => (
            <div key={item.label} className="p-3 rounded-lg space-y-1" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
              <span className="text-[10px] uppercase font-bold" style={{ color: 'var(--color-text-muted)' }}>{item.label}</span>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold" style={{ color: 'var(--color-text)' }}>{item.name}</span>
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${item.statusClass}`}>{item.status}</span>
              </div>
              <p className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>{item.note}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Decision-Support Philosophy Notice */}
      <div
        className="p-4 rounded-xl text-xs space-y-2"
        style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
      >
        <h4 className="font-bold flex items-center space-x-1.5" style={{ color: 'var(--color-text)' }}>
          <Shield className="w-4 h-4" style={{ color: 'var(--color-primary)' }} />
          <span>Decision-Support &amp; Governance Charter</span>
        </h4>
        <p className="leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
          Avertiq is strictly designed for human coordinator decision-support. It never autonomously dispatches emergency teams,
          never converts uncertain landmark descriptions into pinpoint coordinates, and never presents unverified synthetic claims as verified danger.
          All consequential incident status transitions and deduplication merges require logged human authorization.
        </p>
      </div>
    </div>
  );
};
