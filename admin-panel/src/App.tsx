import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Navbar } from './components/Navbar';
import { DashboardOverview } from './pages/DashboardOverview';
import { IncidentMapPage } from './pages/IncidentMapPage';
import { IncidentReviewQueue } from './pages/IncidentReviewQueue';
import { IncidentDetail } from './pages/IncidentDetail';
import { SilentZoneAnalysis } from './pages/SilentZoneAnalysis';
import { DuplicateGroups } from './pages/DuplicateGroups';
import { ExternalEvidence } from './pages/ExternalEvidence';
import { ReviewHistory } from './pages/ReviewHistory';
import { RescueAssignmentPage as RescueTeamManagementPage } from './pages/RescueAssignmentPage';
import { SettingsPage } from './pages/SettingsPage';
import { LoginPage } from './pages/LoginPage';
import { AccessDeniedPage } from './pages/AccessDeniedPage';
import { useTheme } from './context/ThemeContext';
import { AlertTriangle, X, ExternalLink } from 'lucide-react';
import { API_BASE } from './services/api';

// ─── Notification Types ──────────────────────────────────────────────────────
interface SosNotification {
  id: string;
  incidentId: string;
  title: string;
  category: string;
  severity: string;
  location: string | null;
  createdAt: string;
  read: boolean;
}

export const App: React.FC = () => {
  const location = useLocation();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [currentRole, setCurrentRole] = useState<'admin' | 'coordinator' | 'viewer'>(() => {
    const saved = localStorage.getItem('avertiq_role');
    return (saved as any) || 'coordinator';
  });

  // ─── Notification State ────────────────────────────────────────────────────
  const [notifications, setNotifications] = useState<SosNotification[]>([]);
  const [visibleNotif, setVisibleNotif] = useState<SosNotification | null>(null);
  const knownIncidentIds = useRef<Set<string>>(new Set());
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const notifTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isAuthenticated = useCallback(() => {
    const token = localStorage.getItem('avertiq_token');
    const role = localStorage.getItem('avertiq_role');
    return Boolean(token && (role === 'admin' || role === 'coordinator'));
  }, []);

  const handleRoleChange = (role: 'admin' | 'coordinator' | 'viewer') => {
    setCurrentRole(role);
    localStorage.setItem('avertiq_role', role);
  };

  const handleLogout = () => {
    localStorage.removeItem('avertiq_token');
    localStorage.removeItem('avertiq_role');
    localStorage.removeItem('avertiq_user');
    window.location.href = '/login';
  };

  const dismissNotification = () => {
    setVisibleNotif(null);
    if (notifTimerRef.current) clearTimeout(notifTimerRef.current);
  };

  // ─── Poll for New Incidents ────────────────────────────────────────────────
  const pollNewIncidents = useCallback(async () => {
    if (!isAuthenticated()) return;
    try {
      const token = localStorage.getItem('avertiq_token');
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const res = await fetch(`${API_BASE}/incidents?limit=20&sort=created_at_desc`, { headers });
      if (!res.ok) return;
      const incidents: any[] = await res.json();

      const newOnes = incidents.filter(
        (inc) =>
          !knownIncidentIds.current.has(inc.id) &&
          !inc.is_demo &&
          inc.source_channel !== 'demo'
      );

      // On first load, just populate known set without showing notifications
      if (knownIncidentIds.current.size === 0) {
        incidents.forEach((inc) => knownIncidentIds.current.add(inc.id));
        return;
      }

      newOnes.forEach((inc) => {
        knownIncidentIds.current.add(inc.id);
        const notif: SosNotification = {
          id: inc.id,
          incidentId: inc.id,
          title: inc.canonical_title || 'Emergency Report',
          category: inc.incident_type || 'other',
          severity: inc.priority_level || 'unknown',
          location: inc.location_name || null,
          createdAt: inc.created_at,
          read: false,
        };
        setNotifications((prev) => [notif, ...prev.slice(0, 49)]);
        // Show popup (most recent only)
        setVisibleNotif(notif);
        if (notifTimerRef.current) clearTimeout(notifTimerRef.current);
        notifTimerRef.current = setTimeout(() => setVisibleNotif(null), 8000);

        // Browser notification
        if (Notification.permission === 'granted') {
          new Notification(`🚨 NEW EMERGENCY: ${notif.category.toUpperCase()}`, {
            body: notif.title + (notif.location ? `\n📍 ${notif.location}` : ''),
            icon: '/branding/avertiq-emblem.png',
          });
        }
      });
    } catch (_) {}
  }, [isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated()) {
      // Request browser notification permission once
      if (Notification.permission === 'default') {
        Notification.requestPermission();
      }
      pollNewIncidents();
      pollIntervalRef.current = setInterval(pollNewIncidents, 8000);
    }
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      if (notifTimerRef.current) clearTimeout(notifTimerRef.current);
    };
  }, [isAuthenticated, pollNewIncidents]);

  const isLoginPage = location.pathname === '/login';
  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div
      className="min-h-screen flex flex-col antialiased selection:bg-[#2B6777] selection:text-white"
      style={{ background: 'var(--color-bg)', color: 'var(--color-text)' }}
    >
      {/* ── Navigation ─────────────────────────────────────────────────────── */}
      {!isLoginPage && (
        <Navbar
          currentRole={currentRole}
          onRoleChange={handleRoleChange}
          onLogout={handleLogout}
          notificationCount={unreadCount}
        />
      )}

      {/* ── New Incident Popup Notification ────────────────────────────────── */}
      {visibleNotif && (
        <div
          className="fixed bottom-6 right-6 z-[100] w-80 rounded-2xl shadow-2xl p-4 notif-enter"
          style={{ background: 'var(--color-surface)', border: '2px solid #EF3038' }}
        >
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-red-100 flex items-center justify-center shrink-0 critical-pulse">
              <AlertTriangle className="w-4 h-4 text-red-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-black uppercase tracking-widest text-red-600 mb-0.5">
                🚨 New Emergency Report
              </p>
              <p className="text-sm font-bold truncate" style={{ color: 'var(--color-text)' }}>
                {visibleNotif.title}
              </p>
              <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                  visibleNotif.severity === 'critical' ? 'bg-red-100 text-red-700' :
                  visibleNotif.severity === 'high' ? 'bg-orange-100 text-orange-700' :
                  'bg-amber-100 text-amber-700'
                }`}>
                  {visibleNotif.severity}
                </span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-sky-100 text-sky-700">
                  {visibleNotif.category}
                </span>
                {visibleNotif.location && (
                  <span className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
                    📍 {visibleNotif.location}
                  </span>
                )}
              </div>
              <a
                href={`/incidents/${visibleNotif.incidentId}`}
                className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-[#2B6777] hover:underline"
                onClick={dismissNotification}
              >
                View Incident <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <button
              onClick={dismissNotification}
              className="p-0.5 rounded-lg transition-all"
              style={{ color: 'var(--color-text-muted)' }}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ── Main Content ─────────────────────────────────────────────────────── */}
      <main className="flex-1 max-w-[1400px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Routes>
          <Route
            path="/"
            element={isAuthenticated() ? <DashboardOverview /> : <Navigate to="/login" replace />}
          />
          <Route
            path="/map"
            element={isAuthenticated() ? <IncidentMapPage /> : <Navigate to="/login" replace />}
          />
          <Route
            path="/queue"
            element={isAuthenticated() ? <IncidentReviewQueue /> : <Navigate to="/login" replace />}
          />
          <Route
            path="/incidents/:id"
            element={isAuthenticated() ? <IncidentDetail /> : <Navigate to="/login" replace />}
          />
          <Route
            path="/rescue-assignment"
            element={isAuthenticated() ? <RescueTeamManagementPage /> : <Navigate to="/login" replace />}
          />
          <Route
            path="/rescue-teams"
            element={isAuthenticated() ? <RescueTeamManagementPage /> : <Navigate to="/login" replace />}
          />
          <Route
            path="/silent-zones"
            element={isAuthenticated() ? <SilentZoneAnalysis /> : <Navigate to="/login" replace />}
          />
          <Route
            path="/duplicates"
            element={isAuthenticated() ? <DuplicateGroups /> : <Navigate to="/login" replace />}
          />
          <Route
            path="/evidence"
            element={isAuthenticated() ? <ExternalEvidence /> : <Navigate to="/login" replace />}
          />
          <Route
            path="/history"
            element={isAuthenticated() ? <ReviewHistory /> : <Navigate to="/login" replace />}
          />
          <Route path="/submit" element={<Navigate to="/rescue-assignment" replace />} />
          <Route
            path="/settings"
            element={isAuthenticated() ? <SettingsPage /> : <Navigate to="/login" replace />}
          />
          <Route
            path="/login"
            element={
              <LoginPage
                onLoginSuccess={(user) => {
                  if (user?.role) handleRoleChange(user.role);
                }}
              />
            }
          />
          <Route path="/access-denied" element={<AccessDeniedPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      {/* ── Footer ─────────────────────────────────────────────────────────── */}
      {!isLoginPage && (
        <footer
          className="py-3 text-xs"
          style={{ borderTop: '1px solid var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text-muted)' }}
        >
          <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#52AB98] animate-pulse" />
              <span className="font-semibold" style={{ color: 'var(--color-primary)' }}>AVERTIQ Emergency Command Center</span>
              <span style={{ color: 'var(--color-border)' }}>|</span>
              <span>Authorized Disaster Response & Rescue Operations</span>
            </div>
            <div className="flex items-center gap-3">
              <span>Punjab Operational Division</span>
              <span>•</span>
              <span>Integrated NDRF & SDRF Feeds</span>
            </div>
          </div>
        </footer>
      )}
    </div>
  );
};

export default App;
