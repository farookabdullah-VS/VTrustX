import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Search, Command } from 'lucide-react';
import {
  LayoutDashboard, Globe, Bot, ClipboardList, PieChart, Megaphone,
  Smartphone, Library, PhoneCall, Video, Ticket, Contact, Target,
  Settings, Share2, Star, Map, BarChart3, UserCog, Wrench, UserCircle,
  Fingerprint, Plug, Shield, Users, CreditCard, Palette, HelpCircle,
  BookOpen, Database
} from 'lucide-react';

const ICON_MAP = {
  'dashboard': LayoutDashboard,
  'xm-center': Globe,
  'textiq': Bot,
  'form-viewer': ClipboardList,
  'survey-results': PieChart,
  'distributions': Megaphone,
  'mobile-app': Smartphone,
  'templates': Library,
  'ai-surveyor': PhoneCall,
  'ai-video-agent': Video,
  'tickets': Ticket,
  'xm-directory': Contact,
  'actions': Target,
  'ticket-settings': Settings,
  'social-media': Share2,
  'reputation': Star,
  'cjm': Map,
  'cjm-analytics': BarChart3,
  'journeys': Share2,
  'personas': UserCog,
  'persona-templates': Library,
  'persona-engine': Wrench,
  'cx-ratings': BarChart3,
  'survey-reports': PieChart,
  'analytics-builder': BarChart3,
  'analytics-studio': Database,
  'analytics-dashboard': BarChart3,
  'customer360': UserCircle,
  'contact-master': Contact,
  'identity': Fingerprint,
  'workflows': Bot,
  'ai-settings': Settings,
  'integrations': Plug,
  'role-master': Shield,
  'user-management': Users,
  'subscription': CreditCard,
  'theme-settings': Palette,
  'system-settings': Settings,
  'interactive-manual': BookOpen,
  'support': HelpCircle,
};

// All navigable items — labels are i18n keys or plain text
const ALL_ITEMS = [
  { id: 'dashboard', label: 'sidebar.item.dashboard', fallback: 'Dashboard', group: 'Home' },
  { id: 'xm-center', label: 'XM Center', fallback: 'XM Center', group: 'Home' },
  { id: 'textiq', label: 'CogniVue', fallback: 'CogniVue', group: 'Home' },
  { id: 'form-viewer', label: 'sidebar.item.surveys', fallback: 'Surveys', group: 'Surveys' },
  { id: 'survey-results', label: 'Survey Results', fallback: 'Survey Results', group: 'Surveys' },
  { id: 'distributions', label: 'SmartReach', fallback: 'SmartReach', group: 'Surveys' },
  { id: 'templates', label: 'sidebar.item.templates', fallback: 'Templates', group: 'Surveys' },
  { id: 'ai-surveyor', label: 'Rayi Voice Agent', fallback: 'Voice Agent', group: 'AI Agents' },
  { id: 'ai-video-agent', label: 'Rayi Video Agent', fallback: 'Video Agent', group: 'AI Agents' },
  { id: 'tickets', label: 'sidebar.item.tickets', fallback: 'Tickets', group: 'Engagement' },
  { id: 'xm-directory', label: 'XM Directory', fallback: 'XM Directory', group: 'Engagement' },
  { id: 'actions', label: 'Action Planning', fallback: 'Action Planning', group: 'Engagement' },
  { id: 'social-media', label: 'sidebar.item.smm', fallback: 'Social Media', group: 'Marketing' },
  { id: 'reputation', label: 'Reputation', fallback: 'Reputation', group: 'Marketing' },
  { id: 'cjm', label: 'sidebar.item.cjm', fallback: 'Journey Mapping', group: 'Journey' },
  { id: 'cjm-analytics', label: 'Journey Analytics', fallback: 'Journey Analytics', group: 'Journey' },
  { id: 'personas', label: 'sidebar.item.personas', fallback: 'Personas', group: 'Personas' },
  { id: 'persona-engine', label: 'sidebar.item.persona_engine', fallback: 'Persona Engine', group: 'Personas' },
  { id: 'cx-ratings', label: 'sidebar.item.cx_dashboards', fallback: 'CX Dashboards', group: 'Analytics' },
  { id: 'analytics-studio', label: 'Analytics Studio', fallback: 'Analytics Studio', group: 'Analytics' },
  { id: 'analytics-dashboard', label: 'Dynamic Dashboard', fallback: 'Dynamic Dashboard', group: 'Analytics' },
  { id: 'customer360', label: 'sidebar.item.unified_profile', fallback: 'Customer 360', group: 'C360' },
  { id: 'contact-master', label: 'sidebar.item.contacts', fallback: 'Contacts', group: 'C360' },
  { id: 'integrations', label: 'sidebar.item.integrations', fallback: 'Integrations', group: 'Integrations' },
  { id: 'workflows', label: 'sidebar.item.rules', fallback: 'Workflows', group: 'AI Decisioning' },
  { id: 'user-management', label: 'sidebar.item.user_management', fallback: 'User Management', group: 'Admin' },
  { id: 'theme-settings', label: 'sidebar.item.theme', fallback: 'Theme Settings', group: 'Admin' },
  { id: 'system-settings', label: 'sidebar.item.settings', fallback: 'System Settings', group: 'Admin' },
  { id: 'support', label: 'sidebar.item.support', fallback: 'Support', group: 'Help' },
];

export function CommandPalette({ isOpen, onClose, onNavigate }) {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  // Translate all labels once
  const translatedItems = useMemo(() =>
    ALL_ITEMS.map(item => ({
      ...item,
      displayLabel: t(item.label) !== item.label ? t(item.label) : item.fallback,
    })),
    [t]
  );

  // Filter items by query (fuzzy: includes check on label, fallback, group)
  const filtered = useMemo(() => {
    if (!query.trim()) return translatedItems;
    const q = query.toLowerCase();
    return translatedItems.filter(item =>
      item.displayLabel.toLowerCase().includes(q) ||
      item.fallback.toLowerCase().includes(q) ||
      item.group.toLowerCase().includes(q) ||
      item.id.toLowerCase().includes(q)
    );
  }, [query, translatedItems]);

  // Reset selection when query changes
  useEffect(() => { setSelectedIndex(0); }, [query]);

  // Focus input when opening
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Scroll active item into view
  useEffect(() => {
    if (!listRef.current) return;
    const activeEl = listRef.current.querySelector('[data-active="true"]');
    activeEl?.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex]);

  const handleSelect = useCallback((item) => {
    onNavigate(item.id);
    onClose();
  }, [onNavigate, onClose]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(i => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filtered[selectedIndex]) handleSelect(filtered[selectedIndex]);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  }, [filtered, selectedIndex, handleSelect, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.12 }}
          style={{
            position: 'fixed', inset: 0, zIndex: 110000,
            display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
            paddingTop: '15vh',
            background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
          }}
          onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: -4 }}
            transition={{ duration: 0.15, ease: [0.25, 0.1, 0.25, 1] }}
            style={{
              width: '100%',
              maxWidth: 'min(560px, calc(100vw - 32px))',
              background: 'var(--card-bg)',
              borderRadius: '16px',
              border: '1px solid var(--glass-border)',
              boxShadow: '0 25px 60px rgba(0,0,0,0.25)',
              overflow: 'hidden',
            }}
            onKeyDown={handleKeyDown}
          >
            {/* Search input */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: '12px',
              padding: '16px 20px',
              borderBottom: '1px solid var(--glass-border)',
            }}>
              <Search size={18} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t('command_palette.placeholder') !== 'command_palette.placeholder' ? t('command_palette.placeholder') : 'Search pages...'}
                style={{
                  flex: 1,
                  border: 'none',
                  background: 'transparent',
                  color: 'var(--text-color)',
                  fontSize: '1rem',
                  outline: 'none',
                  padding: 0,
                }}
              />
              <kbd style={{
                fontSize: '0.7rem',
                padding: '2px 6px',
                borderRadius: '4px',
                background: 'var(--input-bg)',
                color: 'var(--text-muted)',
                border: '1px solid var(--glass-border)',
                fontFamily: 'monospace',
              }}>ESC</kbd>
            </div>

            {/* Results list */}
            <div
              ref={listRef}
              role="listbox"
              aria-label="Command options"
              style={{
                maxHeight: '360px',
                overflowY: 'auto',
                padding: '8px',
              }}
            >
              {filtered.length === 0 && (
                <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                  {t('command_palette.no_results') !== 'command_palette.no_results' ? t('command_palette.no_results') : 'No pages found'}
                </div>
              )}
              {filtered.map((item, idx) => {
                const Icon = ICON_MAP[item.id] || LayoutDashboard;
                const isActive = idx === selectedIndex;
                return (
                  <div
                    key={item.id}
                    role="option"
                    aria-selected={isActive}
                    tabIndex={isActive ? 0 : -1}
                    data-active={isActive}
                    onClick={() => handleSelect(item)}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '10px 14px',
                      borderRadius: '10px',
                      cursor: 'pointer',
                      background: isActive ? 'var(--sidebar-hover-bg, rgba(0,0,0,0.05))' : 'transparent',
                      transition: 'background 0.1s',
                    }}
                  >
                    <Icon size={16} style={{ color: isActive ? 'var(--primary-color)' : 'var(--text-muted)', flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize: '0.9rem',
                        fontWeight: isActive ? '600' : '500',
                        color: 'var(--text-color)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}>
                        {item.displayLabel}
                      </div>
                    </div>
                    <span style={{
                      fontSize: '0.7rem',
                      color: 'var(--text-muted)',
                      background: 'var(--input-bg)',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      flexShrink: 0,
                    }}>
                      {item.group}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Footer hint */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              gap: '16px', padding: '10px 20px',
              borderTop: '1px solid var(--glass-border)',
              fontSize: '0.7rem', color: 'var(--text-muted)',
            }}>
              <span><kbd style={{ fontFamily: 'monospace', padding: '1px 4px', borderRadius: '3px', background: 'var(--input-bg)', border: '1px solid var(--glass-border)' }}>↑↓</kbd> navigate</span>
              <span><kbd style={{ fontFamily: 'monospace', padding: '1px 4px', borderRadius: '3px', background: 'var(--input-bg)', border: '1px solid var(--glass-border)' }}>↵</kbd> open</span>
              <span><kbd style={{ fontFamily: 'monospace', padding: '1px 4px', borderRadius: '3px', background: 'var(--input-bg)', border: '1px solid var(--glass-border)' }}>esc</kbd> close</span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
