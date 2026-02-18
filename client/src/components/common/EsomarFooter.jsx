import React from 'react';
import { useTranslation } from 'react-i18next';
import { ShieldCheck, Info, ExternalLink } from 'lucide-react';

export function EsomarFooter({
    privacyLink = "/privacy",
    contactEmail = "privacy@rayix.sa",
    showCompliance = true
}) {
    const { t } = useTranslation();

    return (
        <div style={{
            padding: '20px',
            marginTop: 'auto',
            borderTop: '1px solid var(--border-color, #e2e8f0)',
            background: 'var(--surface-bg, #f8fafc)',
            fontSize: '0.85em',
            color: 'var(--text-muted, #64748b)',
            textAlign: 'center',
            fontFamily: "'Outfit', sans-serif"
        }}>
            <div style={{
                maxWidth: '800px',
                margin: '0 auto',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                alignItems: 'center'
            }}>

                {/* Compliance Badge */}
                {showCompliance && (
                    <div style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '8px',
                        background: 'var(--card-bg, #ffffff)',
                        padding: '6px 12px',
                        borderRadius: '20px',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                        border: '1px solid var(--border-color, #e2e8f0)'
                    }}>
                        <ShieldCheck size={14} color="var(--primary-color, #00695C)" />
                        <span style={{ fontWeight: '500', color: 'var(--text-color, #1e293b)' }}>
                            ESOMAR Compliant
                        </span>
                    </div>
                )}

                {/* Rights Statement */}
                <p style={{ margin: 0, lineHeight: '1.5' }}>
                    {t('esomar.rights_statement', 'This survey adheres to the ICC/ESOMAR International Code on Market, Opinion and Social Research and Data Analytics. Your privacy and data rights are protected.')}
                </p>

                {/* Links */}
                <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', justifyContent: 'center' }}>
                    <a
                        href={privacyLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: 'var(--primary-color, #00695C)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}
                    >
                        {t('esomar.privacy_policy', 'Privacy Policy')} <ExternalLink size={12} />
                    </a>
                    <span style={{ opacity: 0.3 }}>|</span>
                    <a
                        href={`mailto:${contactEmail}`}
                        style={{ color: 'var(--primary-color, #00695C)', textDecoration: 'none' }}
                    >
                        {t('esomar.contact_us', 'Contact Support')}
                    </a>
                    <span style={{ opacity: 0.3 }}>|</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Info size={12} /> {t('esomar.anonymous', 'Responses are confidential')}
                    </span>
                </div>

                {/* Copyright / Footer Text */}
                <div style={{ fontSize: '0.9em', opacity: 0.7 }}>
                    &copy; {new Date().getFullYear()} RayiX. All rights reserved.
                </div>

            </div>
        </div>
    );
}
