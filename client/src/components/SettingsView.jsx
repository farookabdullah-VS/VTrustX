import React, { useState } from 'react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import { Shield, Mic, Bot } from 'lucide-react';
import { QuotaSettings } from './QuotaSettings';

export function SettingsView({ form, onBack, onUpdate }) {
    const { t, i18n } = useTranslation();
    const isRtl = i18n.language === 'ar';
    const [formData, setFormData] = useState({
        title: form.title,
        isPublished: form.isPublished || false,
        allowAudio: form.allowAudio || false,
        allowCamera: form.allowCamera || false,
        allowLocation: form.allowLocation || false,
        startDate: form.startDate ? new Date(form.startDate).toISOString().slice(0, 16) : '',
        endDate: form.endDate ? new Date(form.endDate).toISOString().slice(0, 16) : '',
        responseLimit: form.responseLimit || '',
        redirectUrl: form.redirectUrl || '',
        password: form.password || '',
        aiEnabled: form.aiEnabled || false,
        ai: form.ai || {},
        throttlingEnabled: false,
        botDetection: false,
        showNavigation: true,
        blockResubmission: false,
        allowMultiple: form.allowMultiple || false,
        isAnonymous: form.isAnonymous || false,
        enableVoiceAgent: form.enableVoiceAgent || false,
        slug: form.slug || '',
        allowedIps: form.allowedIps || ''
    });

    const [saving, setSaving] = useState(false);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleSettingChange = (section, key, value) => {
        if (section === 'ai') {
            setFormData(prev => ({
                ...prev,
                ai: { ...prev.ai, [key]: value }
            }));
        } else {
            setFormData(prev => ({
                ...prev,
                [key]: value
            }));
        }
    };

    const handleSave = () => {
        setSaving(true);
        axios.put(`/api/forms/${form.id}`, {
            ...formData,
            startDate: formData.startDate || null,
            endDate: formData.endDate || null,
            responseLimit: formData.responseLimit ? parseInt(formData.responseLimit) : null
        })
            .then(res => {
                alert("Settings saved!");
                if (onUpdate) onUpdate();
                setSaving(false);
            })
            .catch(err => {
                console.error(err);
                alert("Failed to save settings: " + (err.response?.data?.error || err.message));
                setSaving(false);
            });
    };

    // Toggle Component
    const Toggle = ({ label, subLabel, name, checked, onChange, info }) => (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', background: 'var(--input-bg)', border: '1px solid var(--input-border)', borderRadius: '10px', marginBottom: '15px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '0.95em', color: 'var(--text-color)', fontWeight: '500' }}>{label} {info && <span style={{ color: 'var(--text-muted)', fontSize: '0.9em', cursor: 'help' }}>ⓘ</span>}</span>
            </div>
            <label className="switch">
                <input
                    type="checkbox"
                    name={name}
                    checked={checked}
                    onChange={onChange}
                />
                <span className="slider round"></span>
            </label>
        </div>
    );

    const sectionHeaderStyle = {
        fontSize: '0.85em',
        fontWeight: '700',
        color: 'var(--text-color)',
        textTransform: 'uppercase',
        marginBottom: '15px',
        marginTop: '25px',
        letterSpacing: '0.5px'
    };

    // Styles
    const containerStyle = {
        padding: '30px',
        maxWidth: '800px',
        margin: '0 auto',
        fontFamily: "'Outfit', sans-serif",
        color: 'var(--text-color)',
        direction: isRtl ? 'rtl' : 'ltr'
    };

    return (
        <div style={containerStyle}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                <button onClick={onBack} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', fontSize: '1em' }}>
                    {isRtl ? '➡' : '⬅'} {t('settings.back')}
                </button>
                <button
                    onClick={handleSave}
                    disabled={saving}
                    style={{
                        padding: '10px 24px',
                        background: 'var(--primary-color)',
                        color: 'var(--button-text)',
                        border: 'none',
                        borderRadius: '8px',
                        fontWeight: '600',
                        cursor: saving ? 'not-allowed' : 'pointer',
                        opacity: saving ? 0.7 : 1
                    }}
                >
                    {saving ? t('settings.saving') : t('settings.save')}
                </button>
            </div>

            {/* QUOTAS - MOVED TO SEPARATE TAB */}
            {/* QUOTAS */}
            <div style={sectionHeaderStyle}>RESPONSE QUOTAS</div>
            <QuotaSettings form={form} />

            {/* BASIC SETTINGS */}
            <div style={sectionHeaderStyle}>{t('settings.basic.title') || 'BASIC SETTINGS'}</div>

            <Toggle
                label={t('settings.basic.published_label') || "Survey Status (Active)"}
                name="isPublished"
                checked={formData.isPublished}
                onChange={handleChange}
            />

            <Toggle
                label={t('settings.basic.audio_label') || "Allow Audio Recording"}
                name="allowAudio" // Fixed from allowVoice
                checked={formData.allowAudio}
                onChange={handleChange}
            />

            <Toggle
                label={t('settings.basic.camera_label') || "Allow Taking Pictures"}
                name="allowCamera"
                checked={formData.allowCamera}
                onChange={handleChange}
            />

            <div style={{ padding: '16px 20px', background: 'var(--input-bg)', border: '1px solid var(--input-border)', borderRadius: '10px', marginBottom: '15px' }}>
                <div style={{ marginBottom: '10px', fontWeight: '500', color: 'var(--text-color)' }}>{t('settings.basic.deadlines') || "Survey Deadlines"}</div>
                <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: '200px' }}>
                        <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.9em', color: 'var(--text-muted)' }}>{t('settings.basic.start_date') || "Start Date"}</label>
                        <input
                            type="datetime-local"
                            name="startDate"
                            value={formData.startDate}
                            onChange={handleChange}
                            style={{ width: '100%', padding: '8px', border: '1px solid var(--input-border)', borderRadius: '6px', fontFamily: 'inherit', background: 'var(--input-bg)', color: 'var(--input-text)' }}
                        />
                    </div>
                    <div style={{ flex: 1, minWidth: '200px' }}>
                        <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.9em', color: 'var(--text-muted)' }}>{t('settings.basic.end_date') || "End Date"}</label>
                        <input
                            type="datetime-local"
                            name="endDate"
                            value={formData.endDate}
                            onChange={handleChange}
                            style={{ width: '100%', padding: '8px', border: '1px solid var(--input-border)', borderRadius: '6px', fontFamily: 'inherit', background: 'var(--input-bg)', color: 'var(--input-text)' }}
                        />
                    </div>
                </div>
            </div>

            {/* VOICE AGENT */}
            <div style={sectionHeaderStyle}>VOICE AGENT</div>

            <Toggle
                label="Enable Voice Agent"
                name="enableVoiceAgent"
                checked={formData.enableVoiceAgent}
                onChange={handleChange}
            />

            {formData.enableVoiceAgent && (
                <div style={{ padding: '16px 20px', background: 'var(--input-bg)', border: '1px solid var(--input-border)', borderRadius: '10px', marginBottom: '15px' }}>
                    <div style={{ marginBottom: '15px' }}>
                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '8px' }}>
                            <label style={{ display: 'block', fontSize: '0.9em', color: 'var(--text-muted)' }}>Voice Agent Token</label>
                            <div style={{ fontSize: '0.8em', color: 'var(--text-muted)', background: 'var(--sidebar-bg)', padding: '2px 6px', borderRadius: '4px' }}>Required</div>
                        </div>
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <input
                                type="text"
                                name="slug"
                                value={formData.slug}
                                onChange={handleChange}
                                placeholder="e.g. USER_REF_123"
                                style={{ flex: 1, padding: '10px', borderRadius: '6px', border: '1px solid var(--input-border)', fontFamily: 'monospace', background: 'var(--input-bg)', color: 'var(--input-text)' }}
                            />
                            <button
                                onClick={() => {
                                    const random = Math.random().toString(36).substring(2, 9).toUpperCase();
                                    setFormData(prev => ({ ...prev, slug: random }));
                                }}
                                style={{ padding: '10px 15px', background: 'var(--sidebar-bg)', border: '1px solid var(--input-border)', borderRadius: '6px', color: 'var(--text-color)', cursor: 'pointer', fontSize: '0.9em' }}
                            >
                                Generate Unique
                            </button>
                        </div>
                        <div style={{ fontSize: '0.8em', color: 'var(--text-muted)', marginTop: '5px' }}>
                            Use a unique identifier per customer/session if needed.
                        </div>
                    </div>

                    <div style={{ padding: '15px', background: 'var(--sidebar-bg)', borderRadius: '8px', border: '1px solid var(--input-border)' }}>
                        <div style={{ fontSize: '0.85em', color: 'var(--primary-color)', marginBottom: '5px', fontWeight: '600' }}>AGENT LINK:</div>
                        <div style={{ fontFamily: 'monospace', color: 'var(--text-color)', wordBreak: 'break-all', fontSize: '0.9em' }}>
                            {window.location.origin}/s/voice/{formData.slug || form.id}
                        </div>
                    </div>
                </div>
            )}

            {/* AI SETTINGS */}
            <div style={sectionHeaderStyle}>AI SETTINGS</div>
            <Toggle
                label="Enable AI features"
                name="aiEnabled"
                checked={formData.aiEnabled}
                onChange={handleChange}
                info={true}
            />
            {formData.aiEnabled && (
                <div style={{ padding: '16px 20px', background: 'var(--input-bg)', border: '1px solid var(--input-border)', borderRadius: '10px', marginBottom: '15px' }}>
                    <div style={{ padding: '20px', borderBottom: '1px solid var(--input-border)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px' }}>
                            <Shield size={20} color="var(--primary-color)" />
                            <h3 style={{ margin: 0, color: 'var(--text-color)' }}>Privacy & Permissions</h3>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                                <input
                                    type="checkbox"
                                    name="allowLocation"
                                    checked={formData.allowLocation}
                                    onChange={handleChange}
                                />
                                <span style={{ color: 'var(--text-color)' }}>Collect Geo-Location</span>
                            </label>



                            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                                <input
                                    type="checkbox"
                                    name="isAnonymous"
                                    checked={formData.isAnonymous}
                                    onChange={handleChange}
                                />
                                <span style={{ color: 'var(--text-color)' }}>Anonymous Responses</span>
                            </label>

                            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                                <input
                                    type="checkbox"
                                    name="allowMultiple"
                                    checked={formData.allowMultiple}
                                    onChange={handleChange}
                                />
                                <span style={{ color: 'var(--text-color)' }}>Allow Multiple Responses per User</span>
                            </label>
                        </div>
                    </div>



                    <div style={{ padding: '20px', borderBottom: '1px solid var(--input-border)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px' }}>
                            <Bot size={20} color="var(--primary-color)" />
                            <h3 style={{ margin: 0, color: 'var(--text-color)' }}>AI Models</h3>
                        </div>

                        <div>
                            <label style={{ display: 'block', marginBottom: '5px', color: 'var(--text-muted)' }}>AI Provider</label>
                            <select
                                value={formData.ai?.provider || 'gemini'}
                                onChange={(e) => handleSettingChange('ai', 'provider', e.target.value)}
                                style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--input-border)', marginBottom: '15px', background: 'var(--input-bg)', color: 'var(--input-text)' }}
                            >
                                <option value="gemini">Google Gemini (API Key)</option>
                                <option value="vertex">Google Vertex AI (GCP)</option>
                                <option value="openai">OpenAI</option>
                                <option value="anthropic">Anthropic Claude</option>
                            </select>
                        </div>

                        <div>
                            <label style={{ display: 'block', marginBottom: '5px', color: 'var(--text-muted)' }}>Model Name</label>
                            <input
                                list="model-suggestions"
                                type="text"
                                value={formData.ai?.modelName || 'gemini-3.0'}
                                onChange={(e) => handleSettingChange('ai', 'modelName', e.target.value)}
                                placeholder="e.g. gemini-3.0, gemini-1.5-pro"
                                style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--input-border)', marginBottom: '15px', background: 'var(--input-bg)', color: 'var(--input-text)' }}
                            />
                            <datalist id="model-suggestions">
                                <option value="gemini-3.0" />
                                <option value="gemini-2.0-flash-exp" />
                                <option value="gemini-1.5-pro" />
                                <option value="gemini-1.5-flash" />
                            </datalist>
                        </div>
                    </div>

                    {formData.ai?.provider === 'vertex' && (
                        <div style={{ padding: '20px' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '5px', color: 'var(--text-muted)' }}>GCP Project ID</label>
                                <input
                                    type="text"
                                    value={formData.ai?.vertexProject || ''}
                                    onChange={(e) => handleSettingChange('ai', 'vertexProject', e.target.value)}
                                    placeholder="e.g. my-gcp-project-id"
                                    style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--input-border)', marginBottom: '15px', background: 'var(--input-bg)', color: 'var(--input-text)' }}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '5px', color: 'var(--text-muted)' }}>Location / Region</label>
                                <input
                                    type="text"
                                    value={formData.ai?.vertexLocation || 'us-central1'}
                                    onChange={(e) => handleSettingChange('ai', 'vertexLocation', e.target.value)}
                                    placeholder="e.g. us-central1"
                                    style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--input-border)', marginBottom: '15px', background: 'var(--input-bg)', color: 'var(--input-text)' }}
                                />
                            </div>
                        </div>
                    )}

                    {(formData.ai?.provider !== 'vertex') && (
                        <div style={{ padding: '20px' }}>
                            <label style={{ display: 'block', marginBottom: '5px', color: 'var(--text-muted)' }}>API Key</label>
                            <input
                                type="password"
                                value={formData.ai?.apiKey || ''}
                                onChange={(e) => handleSettingChange('ai', 'apiKey', e.target.value)}
                                placeholder="sk-..."
                                style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--input-border)', marginBottom: '15px', background: 'var(--input-bg)', color: 'var(--input-text)' }}
                            />
                        </div>
                    )}
                </div>
            )
            }

            {/* THROTTLING */}
            <div style={sectionHeaderStyle}>THROTTLING</div>
            <Toggle
                label="Survey Level Throttling"
                name="throttlingEnabled"
                checked={formData.throttlingEnabled}
                onChange={handleChange}
                info={true}
            />

            {/* SECURITY */}
            <div style={sectionHeaderStyle}>SECURITY</div>

            <div style={{ padding: '16px 20px', background: 'var(--input-bg)', border: '1px solid var(--input-border)', borderRadius: '10px', marginBottom: '15px' }}>
                <div style={{ marginBottom: '15px' }}>
                    <div style={{ fontWeight: '500', color: 'var(--text-color)', marginBottom: '6px' }}>Password Protection</div>
                    <div style={{ fontSize: '0.85em', color: 'var(--text-muted)', marginBottom: '8px' }}>Require a password to access the survey.</div>
                    <input
                        type="password"
                        name="password"
                        value={formData.password}
                        onChange={handleChange}
                        placeholder="Enter password (optional)"
                        style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: 'var(--input-text)' }}
                    />
                </div>

                <div style={{ borderTop: '1px solid var(--input-border)', margin: '15px 0' }}></div>

                <div>
                    <div style={{ fontWeight: '500', color: 'var(--text-color)', marginBottom: '6px' }}>IP Whitelist</div>
                    <div style={{ fontSize: '0.85em', color: 'var(--text-muted)', marginBottom: '8px' }}>Limit access to specific IP addresses (comma separated). Leave empty to allow all.</div>
                    <textarea
                        name="allowedIps"
                        value={formData.allowedIps}
                        onChange={handleChange}
                        placeholder="e.g. 192.168.1.1, 203.0.113.5"
                        rows={3}
                        style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--input-border)', fontFamily: 'monospace', background: 'var(--input-bg)', color: 'var(--input-text)' }}
                    />
                </div>
            </div>

            <Toggle
                label="Bot detection"
                name="botDetection"
                checked={formData.botDetection}
                onChange={handleChange}
            />

            {/* NAVIGATION */}
            <div style={sectionHeaderStyle}>NAVIGATION</div>
            <Toggle
                label="Show navigation menu"
                name="showNavigation"
                checked={formData.showNavigation}
                onChange={handleChange}
            />
            {
                formData.showNavigation && (
                    <div style={{ marginLeft: '10px', marginBottom: '15px', display: 'flex', gap: '20px', color: 'var(--text-muted)', fontSize: '0.9em' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <input type="radio" name="navMode" value="section" checked={true} readOnly /> List Section ⓘ
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <input type="radio" name="navMode" value="question" /> List Questions ⓘ
                        </label>
                    </div>
                )
            }

            <Toggle
                label="Block access to previously answered questions"
                name="blockResubmission"
                checked={formData.blockResubmission}
                onChange={handleChange}
                info={true}
            />
        </div >
    );
}
