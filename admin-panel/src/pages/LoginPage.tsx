import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { useTheme } from '../context/ThemeContext';
import {
  Lock,
  Mail,
  ArrowRight,
  AlertCircle,
  Sun,
  Moon,
  Shield,
} from 'lucide-react';

interface LoginPageProps {
  onLoginSuccess: (user: any) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  const [email, setEmail] = useState('coordinator@avertiq.org');
  const [password, setPassword] = useState('Coordinator123!');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);
    try {
      const data = await api.login(email, password);
      onLoginSuccess(data);
      navigate('/');
    } catch (err: any) {
      setErrorMsg(err.message || 'Invalid email or password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = (roleEmail: string, rolePwd: string) => {
    setEmail(roleEmail);
    setPassword(rolePwd);
  };

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: 'var(--color-bg)' }}
    >
      {/* Minimal top bar */}
      <div
        className="flex items-center justify-between px-6 py-3 border-b"
        style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
      >
        <div className="flex items-center gap-2.5">
          <img
            src="/branding/avertiq-emblem.png"
            alt="AVERTIQ"
            className="h-8 w-8 object-contain"
          />
          <span
            className="font-black text-lg tracking-wider"
            style={{ color: 'var(--color-primary)' }}
          >
            AVERTIQ
          </span>
        </div>
        <button
          onClick={toggleTheme}
          className="p-2 rounded-lg transition-all"
          style={{ color: 'var(--color-text-muted)' }}
          title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>
      </div>

      {/* Login content */}
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md space-y-6">

          {/* Brand header */}
          <div className="text-center space-y-3">
            <div
              className="inline-flex p-3 rounded-2xl"
              style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-panel)' }}
            >
              <img
                src="/branding/avertiq-emblem.png"
                alt="AVERTIQ"
                className="h-14 w-14 object-contain"
              />
            </div>
            <div>
              <h1 className="text-xl font-black tracking-widest" style={{ color: 'var(--color-primary)' }}>
                COMMAND DESK
              </h1>
              <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
                Secure portal for emergency incident coordinators & responders
              </p>
            </div>
          </div>

          {/* Login Card */}
          <div
            className="rounded-2xl p-6 sm:p-8 space-y-5"
            style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-panel)' }}
          >
            {errorMsg && (
              <div
                className="p-3 rounded-xl text-xs flex items-center gap-2"
                style={{ background: '#FEF2F2', border: '1px solid #FCA5A5', color: '#DC2626' }}
              >
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--color-text-muted)' }}>
                  Authorized Email
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3 top-2.5" style={{ color: 'var(--color-text-muted)' }} />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@avertiq.org"
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2B6777] transition-all"
                    style={{
                      background: 'var(--color-input-bg)',
                      border: '1px solid var(--color-border)',
                      color: 'var(--color-text)',
                    }}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--color-text-muted)' }}>
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3 top-2.5" style={{ color: 'var(--color-text-muted)' }} />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2B6777] transition-all"
                    style={{
                      background: 'var(--color-input-bg)',
                      border: '1px solid var(--color-border)',
                      color: 'var(--color-text)',
                    }}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 rounded-xl text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ background: '#2B6777' }}
                onMouseEnter={(e) => !loading && (e.currentTarget.style.background = '#1E4B57')}
                onMouseLeave={(e) => !loading && (e.currentTarget.style.background = '#2B6777')}
              >
                {loading ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Authenticating...</span>
                  </>
                ) : (
                  <>
                    <Shield className="w-3.5 h-3.5" />
                    <span>Sign In to Operations Console</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </form>

            {/* Quick Demo Credentials */}
            <div
              className="pt-4 space-y-2"
              style={{ borderTop: '1px solid var(--color-border)' }}
            >
              <span className="text-[10px] uppercase font-bold tracking-wider block text-center" style={{ color: 'var(--color-text-muted)' }}>
                Quick Demo Access
              </span>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: 'Coordinator', sublabel: 'Review & Triage', email: 'coordinator@avertiq.org', pwd: 'Coordinator123!', accent: '#2B6777' },
                  { label: 'Admin',       sublabel: 'Full Control',    email: 'admin@avertiq.org',       pwd: 'AdminPassword123!', accent: '#7C3AED' },
                  { label: 'Viewer',      sublabel: 'Read-Only',       email: 'viewer@avertiq.org',      pwd: 'Viewer123!', accent: '#718096' },
                ].map((role) => (
                  <button
                    key={role.label}
                    type="button"
                    onClick={() => handleQuickLogin(role.email, role.pwd)}
                    className="p-2 rounded-xl text-center transition-all"
                    style={{
                      background: 'var(--color-input-bg)',
                      border: `1px solid ${role.accent}40`,
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.borderColor = role.accent)}
                    onMouseLeave={(e) => (e.currentTarget.style.borderColor = `${role.accent}40`)}
                  >
                    <span className="block text-[11px] font-bold" style={{ color: role.accent }}>{role.label}</span>
                    <span className="text-[9px]" style={{ color: 'var(--color-text-muted)' }}>{role.sublabel}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <p className="text-center text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
            AVERTIQ Emergency Response Platform · Punjab Operational Division
          </p>
        </div>
      </div>
    </div>
  );
};
