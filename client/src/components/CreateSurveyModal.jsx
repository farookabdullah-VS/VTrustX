import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useToast } from './common/Toast';

export function CreateSurveyModal({ isOpen, onClose, onCreate }) {
    const { t } = useTranslation();
    const toast = useToast();
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [category, setCategory] = useState('feedback');

    if (!isOpen) return null;

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!title.trim()) {
            toast.warning(t('surveys.create_modal.title_label') + " is required");
            return;
        }
        onCreate({
            title,
            description,
            category
        });
        // Reset
        setTitle('');
        setDescription('');
    };

    const categories = [
        { id: 'feedback', label: t('surveys.create_modal.categories.feedback') },
        { id: 'employee', label: t('surveys.create_modal.categories.employee') },
        { id: 'market', label: t('surveys.create_modal.categories.market') },
        { id: 'event', label: t('surveys.create_modal.categories.event') },
        { id: 'quiz', label: t('surveys.create_modal.categories.quiz') },
        { id: 'other', label: t('surveys.create_modal.categories.other') }
    ];

    return (
        <div style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(15, 23, 42, 0.6)',
            backdropFilter: 'blur(4px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            animation: 'fadeIn 0.2s ease-out'
        }}>
            <div style={{
                background: 'white',
                borderRadius: '16px',
                width: '500px',
                maxWidth: '90%',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                overflow: 'hidden',
                animation: 'slideUp 0.3s ease-out'
            }}>
                {/* Header */}
                <div style={{
                    padding: '24px 32px',
                    borderBottom: '1px solid var(--border-color)',
                    background: 'white',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                }}>
                    <div>
                        <h2 style={{ margin: 0, fontSize: '1.5em', color: 'var(--primary-color)' }}>{t('surveys.create_modal.title')}</h2>
                        <div style={{ fontSize: '0.9em', color: 'var(--text-color)', opacity: 0.8, marginTop: '4px' }}>{t('surveys.create_modal.subtitle')}</div>
                    </div>
                    <button
                        onClick={onClose}
                        style={{
                            background: 'transparent',
                            border: 'none',
                            fontSize: '24px',
                            color: '#94a3b8',
                            cursor: 'pointer',
                            padding: '4px'
                        }}
                    >
                        ×
                    </button>
                </div>

                {/* Body */}
                <form onSubmit={handleSubmit} style={{ padding: '32px' }}>
                    <div style={{ marginBottom: '24px' }}>
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: 'var(--label-color)' }}>
                            {t('surveys.create_modal.title_label')} <span style={{ color: '#ef4444' }}>*</span>
                        </label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder={t('surveys.create_modal.title_label')}
                            autoFocus
                            style={{
                                width: '100%',
                                padding: '12px 16px',
                                borderRadius: '8px',
                                border: '1px solid var(--border-color)',
                                backgroundColor: 'var(--input-bg)',
                                color: 'var(--input-text)',
                                fontSize: '1em',
                                outline: 'none',
                                transition: 'border-color 0.2s',
                                boxSizing: 'border-box'
                            }}
                            onFocus={(e) => e.target.style.borderColor = 'var(--primary-color)'}
                            onBlur={(e) => e.target.style.borderColor = 'var(--border-color)'}
                        />
                    </div>

                    <div style={{ marginBottom: '24px' }}>
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: 'var(--label-color)' }}>
                            {t('surveys.create_modal.desc_label')} <span style={{ color: '#94a3b8', fontWeight: 'normal' }}>(Optional)</span>
                        </label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder={t('surveys.create_modal.desc_placeholder')}
                            rows={3}
                            style={{
                                width: '100%',
                                padding: '12px 16px',
                                borderRadius: '8px',
                                border: '1px solid var(--border-color)',
                                backgroundColor: 'var(--input-bg)',
                                color: 'var(--input-text)',
                                fontSize: '1em',
                                outline: 'none',
                                transition: 'border-color 0.2s',
                                resize: 'vertical',
                                fontFamily: 'inherit',
                                boxSizing: 'border-box'
                            }}
                            onFocus={(e) => e.target.style.borderColor = 'var(--primary-color)'}
                            onBlur={(e) => e.target.style.borderColor = 'var(--border-color)'}
                        />
                    </div>

                    <div style={{ marginBottom: '32px' }}>
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: 'var(--label-color)' }}>
                            {t('surveys.create_modal.category_label')}
                        </label>
                        <select
                            value={category}
                            onChange={(e) => setCategory(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '12px 16px',
                                borderRadius: '8px',
                                border: '1px solid var(--border-color)',
                                backgroundColor: 'var(--input-bg)',
                                color: 'var(--input-text)',
                                fontSize: '1em',
                                outline: 'none',
                                cursor: 'pointer',
                                boxSizing: 'border-box'
                            }}
                        >
                            {categories.map(cat => (
                                <option key={cat.id} value={cat.id}>{cat.label}</option>
                            ))}
                        </select>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                        <button
                            type="button"
                            onClick={onClose}
                            style={{
                                padding: '12px 24px',
                                borderRadius: '8px',
                                border: '1px solid var(--border-color)',
                                background: 'white',
                                color: 'var(--label-color)',
                                fontWeight: '600',
                                cursor: 'pointer',
                                transition: 'background 0.2s'
                            }}
                            onMouseEnter={(e) => e.target.style.background = '#f1f5f9'}
                            onMouseLeave={(e) => e.target.style.background = 'white'}
                        >
                            {t('surveys.create_modal.cancel')}
                        </button>
                        <button
                            type="submit"
                            style={{
                                padding: '12px 32px',
                                borderRadius: 'var(--button-radius, 8px)',
                                border: 'none',
                                background: 'var(--button-bg, var(--primary-color))',
                                color: 'var(--button-text, #ffffff)',
                                fontWeight: '600',
                                cursor: 'pointer',
                                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                                transition: 'transform 0.1s'
                            }}
                            onMouseDown={(e) => e.target.style.transform = 'scale(0.98)'}
                            onMouseUp={(e) => e.target.style.transform = 'scale(1)'}
                        >
                            {t('surveys.create_modal.create')}
                        </button>
                    </div>
                </form>
            </div>
            <style>{`
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
            `}</style>
        </div>
    );
}
