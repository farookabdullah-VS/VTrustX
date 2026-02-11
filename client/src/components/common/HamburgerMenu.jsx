import React from 'react';
import { Menu, X } from 'lucide-react';

/**
 * Hamburger Menu Button
 * Shows on mobile to toggle sidebar
 */
export function HamburgerMenu({ isOpen, onClick, className = '' }) {
  return (
    <button
      onClick={onClick}
      className={`hamburger-menu ${className}`}
      aria-label={isOpen ? 'Close menu' : 'Open menu'}
      aria-expanded={isOpen}
      style={{
        display: 'none', // Hidden by default, shown on mobile via CSS
        position: 'relative',
        width: '44px',
        height: '44px',
        padding: '0',
        background: 'transparent',
        border: 'none',
        cursor: 'pointer',
        color: 'var(--text-color)',
        transition: 'all 0.3s ease',
      }}
    >
      {isOpen ? (
        <X size={24} strokeWidth={2} />
      ) : (
        <Menu size={24} strokeWidth={2} />
      )}
    </button>
  );
}

/**
 * Mobile Sidebar Overlay
 * Darkens background when sidebar is open on mobile
 */
export function SidebarOverlay({ isActive, onClick }) {
  return (
    <div
      className={`sidebar-overlay ${isActive ? 'active' : ''}`}
      onClick={onClick}
      aria-hidden="true"
      style={{
        display: 'none', // Hidden by default, shown on mobile via CSS
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.5)',
        zIndex: 999,
        opacity: isActive ? 1 : 0,
        transition: 'opacity 0.3s ease',
        pointerEvents: isActive ? 'auto' : 'none',
      }}
    />
  );
}
