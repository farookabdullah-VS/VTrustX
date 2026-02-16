/**
 * ScheduleModal - Modal for scheduling automated report delivery
 *
 * Features:
 * - Schedule configuration (daily, weekly, monthly)
 * - Recipient management
 * - Format selection
 * - Schedule preview
 */

import React, { useState } from 'react';
import axios from 'axios';
import { X, Clock, Mail, Plus, Trash2, Check } from 'lucide-react';
import styles from '../styles/Analytics.module.css';

export function ScheduleModal({ report, onClose, onScheduleCreated }) {
  const [scheduleType, setScheduleType] = useState('weekly');
  const [scheduleConfig, setScheduleConfig] = useState({
    time: '09:00',
    dayOfWeek: 1, // Monday
    dayOfMonth: 1
  });
  const [format, setFormat] = useState('pdf');
  const [recipients, setRecipients] = useState(['']);
  const [title, setTitle] = useState(`${report.title} - Scheduled Report`);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const handleAddRecipient = () => {
    setRecipients([...recipients, '']);
  };

  const handleRemoveRecipient = (index) => {
    setRecipients(recipients.filter((_, i) => i !== index));
  };

  const handleRecipientChange = (index, value) => {
    const updated = [...recipients];
    updated[index] = value;
    setRecipients(updated);
  };

  const getScheduleDescription = () => {
    const time = scheduleConfig.time || '09:00';
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    switch (scheduleType) {
      case 'daily':
        return `Every day at ${time}`;
      case 'weekly':
        const dayName = days[scheduleConfig.dayOfWeek || 1];
        return `Every ${dayName} at ${time}`;
      case 'monthly':
        return `Every month on day ${scheduleConfig.dayOfMonth || 1} at ${time}`;
      default:
        return 'Custom schedule';
    }
  };

  const handleSchedule = async () => {
    // Validate recipients
    const validRecipients = recipients.filter(email => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return email && emailRegex.test(email);
    });

    if (validRecipients.length === 0) {
      setError('Please add at least one valid email recipient');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await axios.post('/api/analytics/schedules', {
        reportId: report.id,
        title,
        scheduleType,
        scheduleConfig,
        format,
        recipients: validRecipients
      });

      setSuccess(true);

      // Call callback after a brief delay to show success message
      setTimeout(() => {
        if (onScheduleCreated) {
          onScheduleCreated(response.data.schedule);
        }
        onClose();
      }, 1500);
    } catch (err) {
      console.error('Failed to create schedule:', err);
      setError(err.response?.data?.error || 'Failed to create schedule. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div
        className={styles.modalOverlay}
        onClick={onClose}
        role="dialog"
        aria-modal="true"
      >
        <div
          className={styles.modalContent}
          onClick={(e) => e.stopPropagation()}
          style={{ maxWidth: '400px', textAlign: 'center' }}
        >
          <div style={{ padding: '40px 24px' }}>
            <div style={{
              width: '64px',
              height: '64px',
              background: '#dcfce7',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px'
            }}>
              <Check size={32} color="#16a34a" />
            </div>

            <h3 style={{
              fontSize: '1.25rem',
              fontWeight: '600',
              color: '#1e293b',
              marginBottom: '8px'
            }}>
              Schedule Created!
            </h3>

            <p style={{ fontSize: '0.875rem', color: '#64748b' }}>
              Your report will be delivered automatically.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={styles.modalOverlay}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="schedule-modal-title"
    >
      <div
        className={styles.modalContent}
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '600px' }}
      >
        {/* Header */}
        <div className={styles.modalHeader}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Clock size={24} color="#2563eb" />
            <h2 id="schedule-modal-title" className={styles.modalTitle}>
              Schedule Report Delivery
            </h2>
          </div>
          <button
            onClick={onClose}
            className={styles.iconButton}
            aria-label="Close schedule dialog"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className={styles.modalBody}>
          {/* Schedule Title */}
          <div style={{ marginBottom: '24px' }}>
            <label style={{
              display: 'block',
              fontSize: '0.875rem',
              fontWeight: '600',
              color: '#334155',
              marginBottom: '8px'
            }}>
              Schedule Name
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={styles.input}
              placeholder="Enter schedule name"
            />
          </div>

          {/* Schedule Type */}
          <div style={{ marginBottom: '24px' }}>
            <label style={{
              display: 'block',
              fontSize: '0.875rem',
              fontWeight: '600',
              color: '#334155',
              marginBottom: '8px'
            }}>
              Frequency
            </label>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
              {['daily', 'weekly', 'monthly'].map(type => (
                <button
                  key={type}
                  onClick={() => setScheduleType(type)}
                  style={{
                    padding: '12px',
                    border: `2px solid ${scheduleType === type ? '#2563eb' : '#e2e8f0'}`,
                    borderRadius: '8px',
                    background: scheduleType === type ? '#eff6ff' : 'white',
                    cursor: 'pointer',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    color: scheduleType === type ? '#2563eb' : '#64748b',
                    textTransform: 'capitalize',
                    transition: 'all 0.2s'
                  }}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          {/* Schedule Configuration */}
          <div style={{ marginBottom: '24px' }}>
            <label style={{
              display: 'block',
              fontSize: '0.875rem',
              fontWeight: '600',
              color: '#334155',
              marginBottom: '8px'
            }}>
              Schedule Details
            </label>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              {/* Time */}
              <div>
                <label style={{ fontSize: '0.75rem', color: '#64748b', display: 'block', marginBottom: '4px' }}>
                  Time
                </label>
                <input
                  type="time"
                  value={scheduleConfig.time}
                  onChange={(e) => setScheduleConfig({ ...scheduleConfig, time: e.target.value })}
                  className={styles.input}
                />
              </div>

              {/* Day Selection */}
              {scheduleType === 'weekly' && (
                <div>
                  <label style={{ fontSize: '0.75rem', color: '#64748b', display: 'block', marginBottom: '4px' }}>
                    Day of Week
                  </label>
                  <select
                    value={scheduleConfig.dayOfWeek}
                    onChange={(e) => setScheduleConfig({ ...scheduleConfig, dayOfWeek: parseInt(e.target.value) })}
                    className={styles.input}
                  >
                    <option value={0}>Sunday</option>
                    <option value={1}>Monday</option>
                    <option value={2}>Tuesday</option>
                    <option value={3}>Wednesday</option>
                    <option value={4}>Thursday</option>
                    <option value={5}>Friday</option>
                    <option value={6}>Saturday</option>
                  </select>
                </div>
              )}

              {scheduleType === 'monthly' && (
                <div>
                  <label style={{ fontSize: '0.75rem', color: '#64748b', display: 'block', marginBottom: '4px' }}>
                    Day of Month
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    value={scheduleConfig.dayOfMonth}
                    onChange={(e) => setScheduleConfig({ ...scheduleConfig, dayOfMonth: parseInt(e.target.value) })}
                    className={styles.input}
                  />
                </div>
              )}
            </div>

            {/* Schedule Preview */}
            <div style={{
              marginTop: '12px',
              padding: '12px',
              background: '#f1f5f9',
              borderRadius: '6px',
              fontSize: '0.875rem',
              color: '#475569'
            }}>
              <strong>Schedule:</strong> {getScheduleDescription()}
            </div>
          </div>

          {/* Format Selection */}
          <div style={{ marginBottom: '24px' }}>
            <label style={{
              display: 'block',
              fontSize: '0.875rem',
              fontWeight: '600',
              color: '#334155',
              marginBottom: '8px'
            }}>
              Export Format
            </label>

            <select
              value={format}
              onChange={(e) => setFormat(e.target.value)}
              className={styles.input}
            >
              <option value="pdf">PDF Document</option>
              <option value="pptx">PowerPoint Presentation</option>
            </select>
          </div>

          {/* Recipients */}
          <div style={{ marginBottom: '24px' }}>
            <label style={{
              display: 'block',
              fontSize: '0.875rem',
              fontWeight: '600',
              color: '#334155',
              marginBottom: '8px'
            }}>
              <Mail size={14} style={{ display: 'inline', marginRight: '4px' }} />
              Recipients
            </label>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {recipients.map((email, index) => (
                <div key={index} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => handleRecipientChange(index, e.target.value)}
                    placeholder="email@example.com"
                    className={styles.input}
                    style={{ flex: 1 }}
                  />
                  {recipients.length > 1 && (
                    <button
                      onClick={() => handleRemoveRecipient(index)}
                      className={styles.iconButton}
                      aria-label="Remove recipient"
                    >
                      <Trash2 size={16} color="#ef4444" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            <button
              onClick={handleAddRecipient}
              style={{
                marginTop: '8px',
                padding: '8px 12px',
                background: 'transparent',
                border: '1px dashed #cbd5e1',
                borderRadius: '6px',
                color: '#2563eb',
                fontSize: '0.875rem',
                fontWeight: '500',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#2563eb';
                e.currentTarget.style.background = '#eff6ff';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#cbd5e1';
                e.currentTarget.style.background = 'transparent';
              }}
            >
              <Plus size={14} />
              Add Recipient
            </button>
          </div>

          {/* Error Message */}
          {error && (
            <div style={{
              padding: '12px',
              background: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: '8px',
              color: '#dc2626',
              fontSize: '0.875rem',
              marginBottom: '16px'
            }}>
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={styles.modalFooter}>
          <button
            onClick={onClose}
            className={`${styles.button} ${styles.buttonSecondary}`}
            disabled={loading}
          >
            Cancel
          </button>
          <button
            onClick={handleSchedule}
            className={`${styles.button} ${styles.buttonPrimary}`}
            disabled={loading}
            style={{ minWidth: '140px' }}
          >
            {loading ? 'Creating...' : 'Create Schedule'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ScheduleModal;
