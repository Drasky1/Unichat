import React, { useState } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  MessagesSquare,
  Users2,
  FolderKanban,
  GraduationCap,
  User,
  ShieldCheck,
  Search,
  Bell,
  Sun,
  Moon,
  LogOut,
  Flame,
  CheckCircle2,
  Menu,
  X,
  Building2,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import Avatar from './Avatar';
import UnichatLogo from './UnichatLogo';
import CommandPalette from './CommandPalette';

const NAV_ITEMS = [
  { to: '/',            icon: LayoutDashboard, label: 'Campus Feed' },
  { to: '/communities', icon: MessagesSquare,  label: 'Communities', badge: 3 },
  { to: '/friends',     icon: Users2,          label: 'Directory' },
  { to: '/projects',    icon: FolderKanban,    label: 'Projects', badge: 2 },
  { to: '/grades',      icon: GraduationCap,   label: 'Grade Simulator' },
  { to: '/profile',     icon: User,            label: 'Profile & Settings' },
];

export default function Layout({ children }) {
  const { user, logout, theme, setTheme } = useApp();
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const isDarkMode = theme === 'dark';

  const navigation = user.role === 'moderator'
    ? [...NAV_ITEMS, { to: '/moderation', icon: ShieldCheck, label: 'Moderation Queue' }]
    : NAV_ITEMS;

  const handleLogout = () => {
    logout();
    navigate('/auth');
  };

  const getPageTitle = () => {
    const p = location.pathname;
    if (p === '/') return 'Campus Feed';
    if (p.startsWith('/communities')) return 'Channels & Communities';
    if (p.startsWith('/friends')) return 'Student Directory';
    if (p.startsWith('/projects')) return 'Group Workspaces';
    if (p.startsWith('/grades')) return 'Grade Simulator & GPA';
    if (p.startsWith('/profile')) return 'Profile & Settings';
    if (p.startsWith('/moderation')) return 'Moderation Queue';
    return 'Unichat';
  };

  const notifications = [
    { id: 1, title: 'New project ticket', time: '10m ago', desc: 'Priya assigned you to "Raft Consensus Simulation"', unread: true },
    { id: 2, title: 'RSU Official Notice', time: '1h ago', desc: 'Midterm timetable published in #announcements', unread: true },
    { id: 3, title: 'Grade Forecaster', time: '3h ago', desc: 'Database Systems score logged: 91/100', unread: false },
  ];

  return (
    <div className="app-shell">
      <CommandPalette isOpen={commandPaletteOpen} onClose={setCommandPaletteOpen} />

      {/* Mobile Drawer Backdrop */}
      {mobileMenuOpen && (
        <div className="mobile-drawer-backdrop" onClick={() => setMobileMenuOpen(false)} />
      )}

      {/* Modern Sidebar */}
      <aside className={`sidebar ${mobileMenuOpen ? 'mobile-open' : ''}`}>
        {/* Brand Header with Unichat Custom Logo */}
        <div className="sidebar-brand">
          <UnichatLogo size="md" />
          <button
            className="mobile-close-btn"
            onClick={() => setMobileMenuOpen(false)}
            aria-label="Close menu"
          >
            <X size={18} />
          </button>
        </div>

        {/* Campus Context Pill */}
        <div className="campus-context-pill" onClick={() => navigate('/profile')}>
          <Building2 size={15} className="campus-pill-icon" />
          <div className="campus-pill-text">
            <span className="campus-pill-name">{user.university || 'Rangsit University'}</span>
            <span className="campus-pill-sub">{user.faculty || 'College of IT'}</span>
          </div>
        </div>

        {/* Search Bar Shortcut */}
        <button
          type="button"
          className="sidebar-search-trigger"
          onClick={() => setCommandPaletteOpen(true)}
        >
          <Search size={14} />
          <span>Search campus...</span>
          <kbd className="sidebar-kbd">⌘K</kbd>
        </button>

        {/* Navigation Section */}
        <div className="sidebar-nav-section">
          <div className="sidebar-section-header">ACADEMIC WORKSPACE</div>
          <nav className="sidebar-nav">
            {navigation.map(({ to, icon: Icon, label, badge }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                onClick={() => setMobileMenuOpen(false)}
                className={({ isActive }) => `sidebar-nav-link ${isActive ? 'active' : ''}`}
              >
                <Icon size={18} className="sidebar-nav-icon" />
                <span className="sidebar-nav-label">{label}</span>
                {badge && <span className="sidebar-nav-badge">{badge}</span>}
              </NavLink>
            ))}
          </nav>
        </div>

        {/* Study Streak Widget */}
        <div className="sidebar-streak-card">
          <div className="streak-header">
            <div className="streak-icon-wrap">
              <Flame size={14} className="streak-flame" />
            </div>
            <div className="streak-title">{user.streak ?? 0} Day Study Streak</div>
          </div>
          <div className="streak-progress-bar">
            <div
              className="streak-progress-fill"
              style={{ width: `${Math.min(100, (((user.streak ?? 0) / (user.streakGoal ?? 30)) * 100) || 0)}%` }}
            />
          </div>
          <div className="streak-footer-text">
            <span>Goal: {user.streakGoal ?? 30} days</span>
            <span className="streak-freeze-tag">Active</span>
          </div>
        </div>

        {/* User Footer Profile */}
        <div className="sidebar-footer">
          <div className="sidebar-user-block" onClick={() => navigate('/profile')}>
            <Avatar avatar={user.avatar} name={user.name} size="sm" online />
            <div className="sidebar-user-details">
              <div className="sidebar-user-name-row">
                <span className="sidebar-user-name">{user.name}</span>
                {user.verified && <CheckCircle2 size={12} className="verified-check-icon" />}
              </div>
              <span className="sidebar-user-handle">@{user.username}</span>
            </div>
          </div>

          <div className="sidebar-user-actions">
            <button
              type="button"
              className="btn-icon-subtle"
              onClick={() => setTheme(isDarkMode ? 'light' : 'dark')}
              title={isDarkMode ? 'Light mode' : 'Dark mode'}
            >
              {isDarkMode ? <Sun size={15} /> : <Moon size={15} />}
            </button>
            <button
              type="button"
              className="btn-icon-subtle"
              onClick={handleLogout}
              title="Sign Out"
            >
              <LogOut size={15} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Container */}
      <div className="app-main-wrapper">
        {/* Top Header Bar */}
        <header className="top-app-bar">
          <div className="top-bar-left">
            <button
              className="mobile-menu-trigger"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open menu"
            >
              <Menu size={18} />
            </button>
            <div className="breadcrumb-trail">
              <span className="breadcrumb-root">Unichat</span>
              <span className="breadcrumb-separator">/</span>
              <span className="breadcrumb-current">{getPageTitle()}</span>
            </div>
          </div>

          <div className="top-bar-right">
            {/* Quick Search */}
            <button
              className="top-bar-search-btn"
              onClick={() => setCommandPaletteOpen(true)}
            >
              <Search size={13} />
              <span>Search campus...</span>
              <kbd className="top-kbd">⌘K</kbd>
            </button>

            {/* Live Campus Presence */}
            <div className="live-campus-pill">
              <span className="live-dot-pulse" />
              <span className="live-text">412 online</span>
            </div>

            {/* Notifications Popover */}
            <div className="notification-wrapper">
              <button
                className="btn-icon-subtle notification-btn"
                onClick={() => setNotificationsOpen(!notificationsOpen)}
                aria-label="Notifications"
              >
                <Bell size={17} />
                <span className="notification-badge-dot" />
              </button>

              {notificationsOpen && (
                <>
                  <div className="popover-backdrop" onClick={() => setNotificationsOpen(false)} />
                  <div className="notifications-dropdown fade-in">
                    <div className="notifications-dropdown-header">
                      <span className="dropdown-title">Notifications</span>
                      <span className="dropdown-badge">2 new</span>
                    </div>
                    <div className="notifications-list">
                      {notifications.map(n => (
                        <div key={n.id} className={`notification-item ${n.unread ? 'unread' : ''}`}>
                          <div className="notification-dot" />
                          <div className="notification-body">
                            <div className="notification-item-title-row">
                              <span className="notification-item-title">{n.title}</span>
                              <span className="notification-item-time">{n.time}</span>
                            </div>
                            <p className="notification-item-desc">{n.desc}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Profile Avatar */}
            <div className="top-avatar-btn" onClick={() => navigate('/profile')}>
              <Avatar avatar={user.avatar} name={user.name} size="sm" />
            </div>
          </div>
        </header>

        {/* Content Container */}
        <main className="main-content-scroll">
          {children}
        </main>

        {/* Mobile Navigation */}
        <nav className="mobile-bottom-nav">
          {navigation.slice(0, 5).map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) => `mobile-nav-item ${isActive ? 'active' : ''}`}
            >
              <Icon size={17} />
              <span>{label.split(' ')[0]}</span>
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  );
}
