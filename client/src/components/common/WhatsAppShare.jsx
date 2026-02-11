import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useToast } from './Toast';

/**
 * WhatsApp brand icon (inline SVG to avoid external dependency)
 */
function WhatsAppIcon({ size = 20, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
    </svg>
  );
}

/**
 * Reusable WhatsApp share button.
 *
 * Usage:
 *   <WhatsAppShareButton url="https://..." title="My Survey" />
 *   <WhatsAppShareButton url={surveyUrl} title={surveyTitle} variant="fab" />
 */
export function WhatsAppShareButton({
  url,
  title = '',
  variant = 'button', // 'button' | 'icon' | 'fab'
  style = {},
}) {
  const { t } = useTranslation();
  const label = t('share.whatsapp') !== 'share.whatsapp' ? t('share.whatsapp') : 'Share via WhatsApp';

  const shareUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(
    title ? `${title}\n${url}` : url
  )}`;

  if (variant === 'icon') {
    return (
      <a
        href={shareUrl}
        target="_blank"
        rel="noopener noreferrer"
        title={label}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '36px',
          height: '36px',
          borderRadius: '50%',
          background: '#25D366',
          color: 'white',
          textDecoration: 'none',
          transition: 'transform 0.15s, box-shadow 0.15s',
          ...style,
        }}
        onMouseOver={(e) => { e.currentTarget.style.transform = 'scale(1.1)'; }}
        onMouseOut={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
      >
        <WhatsAppIcon size={18} color="white" />
      </a>
    );
  }

  if (variant === 'fab') {
    return (
      <motion.a
        href={shareUrl}
        target="_blank"
        rel="noopener noreferrer"
        title={label}
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 20, delay: 0.5 }}
        whileHover={{ scale: 1.1, boxShadow: '0 8px 25px rgba(37, 211, 102, 0.4)' }}
        whileTap={{ scale: 0.95 }}
        style={{
          position: 'fixed',
          bottom: '90px',
          right: '24px',
          zIndex: 9000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          background: '#25D366',
          color: 'white',
          textDecoration: 'none',
          boxShadow: '0 4px 15px rgba(37, 211, 102, 0.35)',
          border: 'none',
          cursor: 'pointer',
          ...style,
        }}
      >
        <WhatsAppIcon size={28} color="white" />
      </motion.a>
    );
  }

  // Default: full button
  return (
    <a
      href={shareUrl}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '10px',
        padding: '12px 24px',
        borderRadius: '12px',
        background: '#25D366',
        color: 'white',
        textDecoration: 'none',
        fontWeight: '600',
        fontSize: '0.95rem',
        transition: 'transform 0.15s, box-shadow 0.15s',
        boxShadow: '0 2px 8px rgba(37, 211, 102, 0.25)',
        ...style,
      }}
      onMouseOver={(e) => {
        e.currentTarget.style.transform = 'translateY(-1px)';
        e.currentTarget.style.boxShadow = '0 6px 20px rgba(37, 211, 102, 0.35)';
      }}
      onMouseOut={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = '0 2px 8px rgba(37, 211, 102, 0.25)';
      }}
    >
      <WhatsAppIcon size={20} color="white" />
      {label}
    </a>
  );
}

/**
 * Quick-share panel with WhatsApp + Copy Link.
 * Designed to appear in survey distribution, form viewer, results pages.
 *
 * Usage:
 *   <SharePanel url={surveyUrl} title={surveyTitle} />
 */
export function SharePanel({ url, title = '', style = {} }) {
  const { t } = useTranslation();
  const toast = useToast();
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      toast.success(t('share.copied') !== 'share.copied' ? t('share.copied') : 'Link copied!');
      setTimeout(() => setCopied(false), 2000);
    });
  }, [url, toast, t]);

  const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(
    title ? `${title}\n${url}` : url
  )}`;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        padding: '20px',
        background: 'var(--card-bg)',
        borderRadius: '16px',
        border: '1px solid var(--glass-border)',
        ...style,
      }}
    >
      <div style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-color)', marginBottom: '4px' }}>
        {t('share.quick_share') !== 'share.quick_share' ? t('share.quick_share') : 'Quick Share'}
      </div>

      {/* Link row */}
      <div style={{ display: 'flex', gap: '8px' }}>
        <input
          readOnly
          value={url}
          style={{
            flex: 1,
            padding: '10px 14px',
            borderRadius: '10px',
            border: '1px solid var(--input-border)',
            background: 'var(--input-bg)',
            color: 'var(--text-color)',
            fontSize: '0.85rem',
            fontFamily: 'monospace',
            outline: 'none',
          }}
        />
        <button
          onClick={handleCopy}
          style={{
            padding: '10px 18px',
            borderRadius: '10px',
            border: '1px solid var(--input-border)',
            background: copied ? 'var(--status-success)' : 'var(--input-bg)',
            color: copied ? 'white' : 'var(--text-color)',
            fontWeight: '600',
            fontSize: '0.85rem',
            cursor: 'pointer',
            transition: 'all 0.2s',
            backgroundImage: 'none',
            textTransform: 'none',
            letterSpacing: 'normal',
            boxShadow: 'none',
          }}
        >
          {copied ? '✓' : t('share.copy') !== 'share.copy' ? t('share.copy') : 'Copy'}
        </button>
      </div>

      {/* Share buttons */}
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 20px',
            borderRadius: '10px',
            background: '#25D366',
            color: 'white',
            textDecoration: 'none',
            fontWeight: '600',
            fontSize: '0.85rem',
            transition: 'transform 0.15s',
          }}
          onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-1px)'; }}
          onMouseOut={(e) => { e.currentTarget.style.transform = 'translateY(0)'; }}
        >
          <WhatsAppIcon size={18} color="white" />
          WhatsApp
        </a>
      </div>
    </div>
  );
}
