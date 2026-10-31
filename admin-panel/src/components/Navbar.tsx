import React, { useState, useRef, useEffect } from 'react';
import { NavLink, Link } from 'react-router-dom';
import {
  Activity,
  MapPin,
  ClipboardList,
  Users,
  Radio,
  Copy,
  ShieldAlert,
  History,
  Settings,
  LogOut,
  ChevronDown,
  Sun,
  Moon,
  Bell,
  MoreHorizontal,
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

interface NavbarProps {
  currentRole: string;
  onRoleChange: (role: 'admin' | 'coordinator' | 'viewer') => void;
  onLogout?: () => void;
  notificationCount?: number;
}

const PRIMARY_NAV = [
  { name: 'Dashboard', path: '/', icon: Activity },
  { name: 'Live Map', path: '/map', icon: MapPin },
  { name: 'Review Queue', path: '/queue', icon: ClipboardList },
  { name: 'Rescue Teams', path: '/rescue-assignment', icon: Users },
];

const SECONDARY_NAV = [
  { name: 'Silent Zones', path: '/silent-zones', icon: Radio },
  { name: 'Duplicates', path: '/duplicates', icon: Copy },
  { name: 'Evidence', path: '/evidence', icon: ShieldAlert },
  { name: 'Audit Log', path: '/history', icon: History },
];

export const Navbar: React.FC<NavbarProps> = ({
  currentRole,
  onRoleChange,
  onLogout,
  notificationCount = 0,
}) => {
  const { theme, toggleTheme } = useTheme();
  const [moreOpen, setMoreOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);

  // Close "More" dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) {
        setMoreOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const isDark = theme === 'dark';

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${isActive
      ? isDark
        ? 'bg-sky-500/20 text-sky-300 font-semibold'
        : 'bg-[#2B6777] text-white font-semibold shadow-sm'
      : isDark
        ? 'text-slate-400 hover:text-slate-100 hover:bg-slate-800'
        : 'text-[#4A5568] hover:text-[#2B6777] hover:bg-[#F2F2F2]'
    }`;

  const dropdownItemClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg transition-all ${isActive
      ? isDark
        ? 'bg-sky-500/20 text-sky-300'
        : 'bg-[#EBF4F6] text-[#2B6777] font-semibold'
      : isDark
        ? 'text-slate-300 hover:bg-slate-800 hover:text-white'
        : 'text-[#4A5568] hover:bg-[#F2F2F2] hover:text-[#2B6777]'
    }`;

  return (
    <header
      className="sticky top-0 z-50 shadow-sm"
      style={{ background: 'var(--color-nav-bg)', borderBottom: '1px solid var(--color-border)' }}
    >
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-14 gap-4">

          {/* ── Logo ─────────────────────────────────── */}
          <Link to="/" className="flex items-center gap-2.5 shrink-0">
            <img
              src="/branding/avertiq-emblem.png"
              alt="AVERTIQ"
              className="h-9 w-9 object-contain"
            />
            <span
              className="font-black text-lg tracking-wider"
              style={{ color: 'var(--color-primary)' }}
            >
              AVERTIQ
            </span>
          </Link>

          {/* ── Primary Nav (desktop) ─────────────────── */}
          <nav className="hidden lg:flex items-center gap-0.5 flex-1">
            {PRIMARY_NAV.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink key={item.path} to={item.path} end={item.path === '/'} className={navLinkClass}>
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                  <span>{item.name}</span>
                </NavLink>
              );
            })}

            {/* More Dropdown */}
            <div className="relative" ref={moreRef}>
              <button
                onClick={() => setMoreOpen((o) => !o)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${isDark
                  ? 'text-slate-400 hover:text-slate-100 hover:bg-slate-800'
                  : 'text-[#4A5568] hover:text-[#2B6777] hover:bg-[#F2F2F2]'
                  }`}
              >
                <MoreHorizontal className="w-3.5 h-3.5" />
                <span>More</span>
                <ChevronDown className={`w-3 h-3 transition-transform ${moreOpen ? 'rotate-180' : ''}`} />
              </button>

              {moreOpen && (
                <div
                  className="absolute top-full left-0 mt-1.5 w-48 rounded-xl shadow-xl p-1.5 z-50"
                  style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
                >
                  {SECONDARY_NAV.map((item) => {
                    const Icon = item.icon;
                    return (
                      <NavLink
                        key={item.path}
                        to={item.path}
                        className={dropdownItemClass}
                        onClick={() => setMoreOpen(false)}
                      >
                        <Icon className="w-3.5 h-3.5 shrink-0" />
                        <span>{item.name}</span>
                      </NavLink>
                    );
                  })}
                  <div className="my-1.5" style={{ borderTop: '1px solid var(--color-border)' }} />
                  <NavLink to="/settings" className={dropdownItemClass} onClick={() => setMoreOpen(false)}>
                    <Settings className="w-3.5 h-3.5 shrink-0" />
                    <span>Settings</span>
                  </NavLink>
                </div>
              )}
            </div>
          </nav>

          {/* ── Right Actions ─────────────────────────── */}
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Live badge */}


            {/* Notification bell */}
            {notificationCount > 0 && (
              <div className="relative">
                <button
                  title="New emergency alerts"
                  className="relative p-2 rounded-lg transition-all"
                  style={{ color: 'var(--color-text-muted)' }}
                >
                  <Bell className="w-4 h-4" />
                  <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                    {notificationCount > 9 ? '9+' : notificationCount}
                  </span>
                </button>
              </div>
            )}

            {/* Theme toggle */}
            <button
              onClick={toggleTheme}
              title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              className="p-2 rounded-lg transition-all"
              style={{ color: 'var(--color-text-muted)' }}
              onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--color-primary)')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--color-text-muted)')}
            >
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            {/* Settings (desktop, standalone) */}
            <Link
              to="/settings"
              title="Settings"
              className="hidden lg:flex p-2 rounded-lg transition-all"
              style={{ color: 'var(--color-text-muted)' }}
              onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--color-primary)')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--color-text-muted)')}
            >
              <Settings className="w-4 h-4" />
            </Link>

            {/* Logout */}
            {onLogout && (
              <button
                onClick={onLogout}
                title="Sign Out"
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all"
                style={{ color: '#EF3038', border: '1px solid transparent' }}
                onMouseEnter={(e) => { (e.currentTarget.style.background = '#FEF2F2'); (e.currentTarget.style.borderColor = '#FCA5A5'); }}
                onMouseLeave={(e) => { (e.currentTarget.style.background = 'transparent'); (e.currentTarget.style.borderColor = 'transparent'); }}
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            )}

            {/* Mobile hamburger */}
            <button
              className="lg:hidden p-2 rounded-lg transition-all"
              style={{ color: 'var(--color-text-muted)' }}
              onClick={() => setMobileOpen((o) => !o)}
              aria-label="Toggle navigation"
            >
              <div className="flex flex-col gap-1 w-4">
                <span className={`h-0.5 rounded transition-all ${mobileOpen ? 'rotate-45 translate-y-1.5' : ''}`} style={{ background: 'currentColor' }} />
                <span className={`h-0.5 rounded transition-all ${mobileOpen ? 'opacity-0' : ''}`} style={{ background: 'currentColor' }} />
                <span className={`h-0.5 rounded transition-all ${mobileOpen ? '-rotate-45 -translate-y-1.5' : ''}`} style={{ background: 'currentColor' }} />
              </div>
            </button>
          </div>
        </div>

        {/* ── Mobile Nav Drawer ─────────────────────── */}
        {mobileOpen && (
          <div
            className="lg:hidden pb-3 border-t"
            style={{ borderColor: 'var(--color-border)' }}
          >
            <div className="pt-3 space-y-0.5">
              {[...PRIMARY_NAV, ...SECONDARY_NAV, { name: 'Settings', path: '/settings', icon: Settings }].map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    end={item.path === '/'}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${isActive
                        ? isDark
                          ? 'bg-sky-500/20 text-sky-300'
                          : 'bg-[#EBF4F6] text-[#2B6777] font-semibold'
                        : isDark
                          ? 'text-slate-300 hover:bg-slate-800'
                          : 'text-[#4A5568] hover:bg-[#F2F2F2]'
                      }`
                    }
                    onClick={() => setMobileOpen(false)}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{item.name}</span>
                  </NavLink>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </header>
  );
};
