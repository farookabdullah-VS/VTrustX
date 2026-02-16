import React from 'react';
import { AlertCircle, CheckCircle, Clock, MessageSquare } from 'lucide-react';
import styles from '../styles/Analytics.module.css';

/**
 * ClosedLoopPanel - Displays detractors requiring follow-up actions
 */
export function ClosedLoopPanel({ detractors, onCreateTicket, stats }) {
  return (
    <div className={styles.rightPanel} style={{ width: '320px' }}>
      {/* Header */}
      <div style={{
        padding: '20px',
        borderBottom: '1px solid #e2e8f0',
        background: '#fff'
      }}>
        <h3 style={{
          margin: 0,
          fontSize: '1rem',
          color: '#1e293b',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <AlertCircle size={20} color="#ef4444" /> Action Required
        </h3>
        <p style={{ margin: '5px 0 0 0', fontSize: '0.75rem', color: '#64748b' }}>
          Follow up with detractors to close the loop.
        </p>
      </div>

      {/* Detractors List */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '15px' }}>
        {!detractors || detractors.length === 0 ? (
          <div className={styles.emptyState}>
            <CheckCircle size={32} style={{ margin: '0 auto 10px', display: 'block' }} />
            <div className={styles.emptyStateText}>
              No pending detractors found for this report.
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {detractors.map((detractor, index) => (
              <div
                key={index}
                style={{
                  border: '1px solid #fee2e2',
                  borderRadius: '10px',
                  background: '#fff5f5',
                  padding: '12px',
                  transition: 'transform 0.2s',
                  cursor: 'pointer',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                }}
              >
                {/* Detractor Header */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  marginBottom: '8px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{
                      background: '#ef4444',
                      color: 'white',
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.75rem',
                      fontWeight: '700'
                    }}>
                      {detractor.score || '?'}
                    </div>
                    <div style={{ fontWeight: '600', fontSize: '0.85rem', color: '#1e293b' }}>
                      {detractor.respondent || 'Anonymous'}
                    </div>
                  </div>
                  <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
                    <Clock size={10} style={{ verticalAlign: 'middle', marginRight: '3px' }} />
                    {detractor.time}
                  </div>
                </div>

                {/* Comment */}
                <div style={{
                  fontSize: '0.8rem',
                  color: '#475569',
                  marginBottom: '10px',
                  fontStyle: 'italic',
                  lineHeight: '1.4'
                }}>
                  "{detractor.comment || 'No comment provided.'}"
                </div>

                {/* Action */}
                {detractor.ticketId ? (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    color: '#10b981',
                    fontSize: '0.75rem',
                    fontWeight: '600'
                  }}>
                    <CheckCircle size={14} /> Ticket: {detractor.ticketCode}
                  </div>
                ) : (
                  <button
                    onClick={() => onCreateTicket(detractor)}
                    className={`${styles.button} ${styles.buttonDanger}`}
                    style={{
                      width: '100%',
                      fontSize: '0.75rem',
                      fontWeight: '700',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      padding: '8px'
                    }}
                  >
                    <MessageSquare size={14} /> CREATE TICKET
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Stats Footer */}
      <div style={{
        padding: '20px',
        borderTop: '1px solid #e2e8f0',
        background: '#f8fafc'
      }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          <div style={{
            background: 'white',
            padding: '10px',
            borderRadius: '8px',
            border: '1px solid #e2e8f0'
          }}>
            <div style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: '600' }}>
              OPEN TASKS
            </div>
            <div style={{ fontSize: '1.1rem', fontWeight: '700', color: '#ef4444' }}>
              {stats?.openTasks || 0}
            </div>
          </div>
          <div style={{
            background: 'white',
            padding: '10px',
            borderRadius: '8px',
            border: '1px solid #e2e8f0'
          }}>
            <div style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: '600' }}>
              LOOP CLOSED
            </div>
            <div style={{ fontSize: '1.1rem', fontWeight: '700', color: '#10b981' }}>
              {stats?.closedLoop || 0}%
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ClosedLoopPanel;
