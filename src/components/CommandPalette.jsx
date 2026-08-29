import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Hash, FolderKanban, Users, GraduationCap, ArrowRight, CornerDownLeft } from 'lucide-react';
import { COMMUNITIES, PROJECTS, STUDENTS } from '../data/mockData';

export default function CommandPalette({ isOpen, onClose }) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setQuery('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  // Global keybind ⌘K or Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        onClose(!isOpen);
      }
      if (e.key === 'Escape' && isOpen) {
        onClose(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const q = query.toLowerCase().trim();

  const navigationItems = [
    { type: 'Page', title: 'Home Dashboard', subtitle: 'Campus pulse & daily highlights', path: '/', icon: GraduationCap },
    { type: 'Page', title: 'Communities & Chat', subtitle: 'Official channels & study pods', path: '/communities', icon: Hash },
    { type: 'Page', title: 'Student Directory', subtitle: 'Find peers, study partners & faculty', path: '/friends', icon: Users },
    { type: 'Page', title: 'Group Projects', subtitle: 'Task tracking & team workspaces', path: '/projects', icon: FolderKanban },
    { type: 'Page', title: 'Grade Simulator', subtitle: 'GPA calculator & assessment forecaster', path: '/grades', icon: GraduationCap },
  ];

  const communityItems = COMMUNITIES.map(c => ({
    type: 'Community',
    title: c.name,
    subtitle: `${c.online} online · ${c.university || 'Campus-wide'}`,
    path: '/communities',
    icon: Hash,
  }));

  const projectItems = PROJECTS.map(p => ({
    type: 'Project',
    title: p.name,
    subtitle: `${p.code} · ${p.progress}% completed`,
    path: '/projects',
    icon: FolderKanban,
  }));

  const studentItems = STUDENTS.map(s => ({
    type: 'Student',
    title: s.name,
    subtitle: `${s.major} · ${s.university}`,
    path: '/friends',
    icon: Users,
  }));

  const allItems = [...navigationItems, ...communityItems, ...projectItems, ...studentItems];

  const filtered = !q
    ? navigationItems
    : allItems.filter(item =>
        item.title.toLowerCase().includes(q) ||
        item.subtitle.toLowerCase().includes(q) ||
        item.type.toLowerCase().includes(q)
      ).slice(0, 8);

  const handleSelect = (item) => {
    navigate(item.path);
    onClose(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % (filtered.length || 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + (filtered.length || 1)) % (filtered.length || 1));
    } else if (e.key === 'Enter' && filtered[selectedIndex]) {
      e.preventDefault();
      handleSelect(filtered[selectedIndex]);
    }
  };

  return (
    <div className="command-palette-backdrop" onClick={() => onClose(false)}>
      <div className="command-palette-modal" onClick={e => e.stopPropagation()}>
        <div className="command-palette-input-row">
          <Search className="command-search-icon" size={18} />
          <input
            ref={inputRef}
            type="text"
            className="command-palette-input"
            placeholder="Search channels, peers, projects, or jump to page..."
            value={query}
            onChange={e => { setQuery(e.target.value); setSelectedIndex(0); }}
            onKeyDown={handleKeyDown}
          />
          <kbd className="command-kbd">ESC</kbd>
        </div>

        <div className="command-palette-results">
          {filtered.length === 0 ? (
            <div className="command-empty-state">
              No results found for &ldquo;{query}&rdquo;
            </div>
          ) : (
            filtered.map((item, index) => {
              const Icon = item.icon;
              const isSelected = index === selectedIndex;
              return (
                <div
                  key={`${item.type}-${item.title}-${index}`}
                  className={`command-palette-item ${isSelected ? 'selected' : ''}`}
                  onClick={() => handleSelect(item)}
                  onMouseEnter={() => setSelectedIndex(index)}
                >
                  <div className="command-item-icon-wrapper">
                    <Icon size={16} />
                  </div>
                  <div className="command-item-content">
                    <div className="command-item-title-row">
                      <span className="command-item-title">{item.title}</span>
                      <span className="command-item-badge">{item.type}</span>
                    </div>
                    <div className="command-item-subtitle">{item.subtitle}</div>
                  </div>
                  {isSelected && <CornerDownLeft size={14} className="command-item-enter" />}
                </div>
              );
            })
          )}
        </div>

        <div className="command-palette-footer">
          <div className="command-palette-hints">
            <span><kbd>↑</kbd> <kbd>↓</kbd> Navigate</span>
            <span><kbd>↵</kbd> Select</span>
            <span><kbd>ESC</kbd> Close</span>
          </div>
          <span className="command-footer-brand">Unichat Spotlight</span>
        </div>
      </div>
    </div>
  );
}
