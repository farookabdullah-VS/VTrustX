import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { SurveyCreatorComponent, SurveyCreator } from "survey-creator-react";
import "survey-core/survey-core.min.css";
import "survey-creator-core/survey-creator-core.min.css";
import axios from 'axios';
import { User, Globe, LogOut, ChevronDown, Bell } from 'lucide-react';
import { SettingsView } from './SettingsView';
import { CollectView } from './CollectView';

import { AnalyticsView } from './AnalyticsView';
import { SurveyAudience } from './SurveyAudience';

import { registerCustomTypes, setupSurveyColors, VTrustTheme } from '../survey-config';
import { initCustomControls } from './CustomSurveyControls';
import { QuotaSettings } from './settings/QuotaSettings';
import { VoiceAgentSettings } from './settings/VoiceAgentSettings';

const creatorOptions = {
    showLogicTab: true,
    isAutoSave: false
};

export function FormBuilder({ user, formId, initialData, onBack, onNavigate, onFormChange }) {
    const { t, i18n } = useTranslation();
    const isRtl = i18n.language === 'ar';
    const [creator, setCreator] = useState(null);
    const [formMetadata, setFormMetadata] = useState(null);
    const [activeNav, setActiveNav] = useState(initialData?.initialTab || 'questionnaire');
    const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);

    // AI State
    const [showAIModal, setShowAIModal] = useState(false);
    const [aiPrompt, setAiPrompt] = useState('');
    const [aiLoading, setAiLoading] = useState(false);
    // Use ref to track ID between saves without re-binding
    const currentFormId = React.useRef(formId);

    // System Settings
    const [workflowEnabled, setWorkflowEnabled] = useState(false);

    useEffect(() => {
        axios.get('/api/settings')
            .then(res => {
                if (res.data.enable_workflow === 'true') {
                    setWorkflowEnabled(true);
                }
            })
            .catch(err => console.error("Failed to load settings", err));
    }, []);

    useEffect(() => {
        currentFormId.current = formId;
    }, [formId]);

    useEffect(() => {
        registerCustomTypes(); // Ensure csat/ces types exist
        initCustomControls(); // Register Audio Recorder etc.
        const c = new SurveyCreator(creatorOptions);

        // Apply coloring logic to the inner survey instance
        c.onSurveyInstanceCreated.add((sender, options) => {
            setupSurveyColors(options.survey);
        });

        // Hide specific properties for CSAT, CES, and NPS to prevent modification (Lock Down)
        c.onShowingProperty.add((sender, options) => {
            const q = options.obj;
            // check if it's our flagged custom control
            if (q && q.getType() === "rating" && (q.renderGradient === 'csat' || q.renderGradient === 'ces' || q.renderGradient === 'nps')) {
                const hiddenProps = [
                    "rateMax", "rateMin", "rateStep", "rateValues",
                    "minRateDescription", "maxRateDescription",
                    "rateColorMode", "ratingTheme", "displayMode"
                ];
                if (hiddenProps.includes(options.property.name)) {
                    options.canShow = false;
                }
            }
        });

        // Remove +/- buttons, Type Selector, and other rating-specific adorners
        c.onDefineElementMenuItems.add((sender, options) => {
            const q = options.obj;
            // Check if it's our flagged custom control
            if (q && q.getType() === "rating" && (q.renderGradient === 'csat' || q.renderGradient === 'ces' || q.renderGradient === 'nps')) {
                // Whitelist: Only allow essential actions. Remove everything else (Type Selector, +/-, etc.)
                const allowedActionIds = ['delete', 'copy', 'duplicate', 'settings', 'questionSettings'];

                options.items = options.items.filter(item => {
                    return allowedActionIds.includes(item.id);
                });
            }
        });

        // Register Custom Controls (NPS, CSAT, CES)
        c.toolbox.addItem({
            name: "nps",
            title: "NPS",
            isCopied: true,
            iconName: "icon-rating",
            category: "Voice of Customer",
            json: { type: "rating", name: "nps", title: "Net Promoter Score", rateMax: 10, renderGradient: "nps" }
        });
        c.toolbox.addItem({
            name: "csat",
            title: "CSAT",
            isCopied: true,
            iconName: "icon-rating",
            category: "Voice of Customer",
            json: { type: "rating", name: "csat", title: "Customer Satisfaction", rateMax: 5, renderGradient: "csat" }
        });
        c.toolbox.addItem({
            name: "ces",
            title: "CES",
            isCopied: true,
            iconName: "icon-rating",
            category: "Voice of Customer",
            json: { type: "rating", name: "ces", title: "Customer Effort Score", rateMax: 5, renderGradient: "ces" }
        });

        // Basic Controls (Requested by User)
        const basicControls = [
            {
                name: "heading",
                title: "Heading",
                iconName: "icon-default",
                category: "Basic Controls",
                json: { type: "html", html: "<h3>Heading</h3>" }
            },
            {
                name: "fullname",
                title: "Full Name",
                iconName: "icon-text",
                category: "Basic Controls",
                json: {
                    type: "panel",
                    title: "Name",
                    elements: [
                        {
                            type: "text",
                            name: "first_name",
                            title: "First Name",
                            titleLocation: "bottom",
                            isRequired: true,
                            startWithNewLine: false,
                            width: "50%"
                        },
                        {
                            type: "text",
                            name: "last_name",
                            title: "Last Name",
                            titleLocation: "bottom",
                            startWithNewLine: false,
                            isRequired: true,
                            width: "50%"
                        }
                    ]
                }
            },
            {
                name: "email",
                title: "Email",
                iconName: "icon-text",
                category: "Basic Controls",
                json: { type: "text", name: "email", title: "Email", inputType: "email", isRequired: true, validators: [{ type: "email" }] }
            },
            {
                name: "address",
                title: "Address",
                iconName: "icon-comment",
                category: "Basic Controls",
                json: { type: "comment", name: "address", title: "Address" }
            },
            {
                name: "phone",
                title: "Phone",
                iconName: "icon-text",
                category: "Basic Controls",
                json: { type: "text", name: "phone", title: "Phone", inputType: "tel", validators: [{ type: "regex", regex: "\\\\d+", text: "Please enter a valid phone number" }] }
            },
            {
                name: "datepicker",
                title: "Date Picker",
                iconName: "icon-datepicker",
                category: "Basic Controls",
                json: { type: "text", name: "date", title: "Date", inputType: "date" }
            },
            {
                name: "appointment",
                title: "Appointment",
                iconName: "icon-datepicker",
                category: "Basic Controls",
                json: { type: "text", name: "appointment", title: "Appointment", inputType: "datetime-local" }
            },
            {
                name: "signature",
                title: "Signature",
                iconName: "icon-signature",
                category: "Basic Controls",
                json: {
                    type: "signaturepad",
                    name: "signature",
                    title: "Signature",
                    signatureWidth: 500,
                    signatureHeight: 200,
                    width: "60%"
                }
            },
            {
                name: "fillintheblank",
                title: "Fill in the Blank",
                iconName: "icon-text",
                category: "Basic Controls",
                json: { type: "text", name: "question", title: "Question" }
            },
            {
                name: "voicerecord",
                title: "Voice Record",
                iconName: "icon-radiogroup",
                category: "Basic Controls",
                json: { type: "audiorecorder", name: "voice_response", title: "Record your answer" }
            },
            {
                name: "authenticator",
                title: "Authenticator",
                iconName: "icon-settings",
                category: "Security & Logic",
                json: { type: "authenticator", name: "auth_gate", title: "Enter Password to Continue", isRequired: true }
            }
        ];

        basicControls.forEach(item => c.toolbox.addItem(item));

        // Implement Save Logic
        c.saveSurveyFunc = (saveNo, callback) => {
            const payload = {
                definition: c.JSON,
                title: c.survey.title || "Untitled Form",
                version: 1
            };

            // Use Ref to get latest ID even if effect didn't re-run
            const targetId = currentFormId.current;

            if (targetId) {
                // Update Existing
                axios.put(`/api/forms/${targetId}`, payload)
                    .then(() => callback(saveNo, true))
                    .catch(err => {
                        console.error("Save Error:", err);
                        alert("Save Error: " + (err.response?.data?.error || err.message));
                        callback(saveNo, false);
                    });
            } else {
                // Create New
                axios.post(`/api/forms`, payload)
                    .then(res => {
                        if (res.data && res.data.id) {
                            currentFormId.current = res.data.id; // Update ref for next save
                            setFormMetadata(res.data);
                        }
                        callback(saveNo, true);
                    })
                    .catch(err => {
                        console.error("Create Error:", err);
                        callback(saveNo, false);
                    });
            }
        };

        setCreator(c);

        if (formId) {
            axios.get(`/api/forms/${formId}`)
                .then(res => {
                    c.JSON = res.data.definition;
                    setFormMetadata(res.data);

                    // Read-only mode if published?
                    if (res.data.isPublished) {
                        c.readOnly = true;
                    }
                })
                .catch(err => {
                    console.error("Error loading form:", err);
                    // Fallback for failed load or just bad ID
                    c.JSON = { ...VTrustTheme };
                });

        } else if (initialData) {
            // Check if initialData has a theme, if not apply defaults
            const def = (initialData.themeVariables || initialData.themeName) ? initialData : { ...initialData, ...VTrustTheme };
            c.JSON = def;
        } else {
            // New Blank Survey
            c.JSON = {
                title: "New Survey",
                pages: [
                    {
                        name: "page1",
                        elements: []
                    }
                ],
                ...VTrustTheme // Apply Default Red Theme
            };
        }

        // Apply Red Theme (Brand Updated)
        c.theme = {
            "themeName": "default",
            "colorPalette": "light",
            "isPanelless": false,
            "cssVariables": {
                "--sjs-primary-backcolor": "#b91c1c",
                "--sjs-primary-backcolor-light": "rgba(185, 28, 28, 0.1)",
                "--sjs-primary-backcolor-dark": "#991b1b",
                "--sjs-primary-forecolor": "#ffffff",
                "--sjs-primary-forecolor-light": "#ffffff",
                "--sjs-special-red": "#b91c1c"
            }
        };



    }, [formId, initialData]);

    useEffect(() => {
        if (creator) {
            creator.locale = isRtl ? 'ar' : 'en';
        }
    }, [creator, isRtl]);

    const handleRequestApproval = () => {
        const id = currentFormId.current;
        if (!id) return;
        if (confirm("Submit this survey for approval? You won't be able to edit it while it's pending.")) {
            axios.post(`/api/forms/${id}/request-approval`, { username: user?.user?.username })
                .then(res => {
                    alert("Submitted for approval!");
                    setFormMetadata(res.data);
                })
                .catch(err => alert(err.message));
        }
    };

    const handleApprove = () => {
        if (!formId) return;
        if (confirm("Approve and Publish this survey?")) {
            axios.post(`/api/forms/${formId}/approve`, { username: user?.user?.username })
                .then(res => {
                    alert("Survey Approved and Published!");
                    setFormMetadata(res.data);
                    if (creator) creator.readOnly = true;
                })
                .catch(err => alert(err.message));
        }
    };

    const handleReject = () => {
        if (!formId) return;
        if (confirm("Reject this survey? It will return to draft status.")) {
            axios.post(`/api/forms/${formId}/reject`, { username: user?.user?.username })
                .then(res => {
                    alert("Survey Rejected.");
                    setFormMetadata(res.data);
                })
                .catch(err => alert(err.message));
        }
    };

    const handlePublish = () => {
        if (!formId) return;
        // Legacy/Fallback
        if (confirm("Are you sure you want to publish this version? It will become immutable.")) {
            axios.post(`/api/forms/${formId}/publish`)
                .then(res => {
                    alert("Published successfully!");
                    setFormMetadata(res.data);
                    if (creator) creator.readOnly = true;
                })
                .catch(err => alert(err.message));
        }
    };

    const handleCreateDraft = () => {
        if (!formId) return;
        axios.post(`/api/forms/${formId}/draft`)
            .then(res => {
                alert("New draft version created!");
                if (onFormChange && res.data.id) {
                    // Switch to the new draft immediately
                    onFormChange(res.data.id);
                } else if (onBack) {
                    onBack();
                }
            })
            .catch(err => alert(err.message));
    };

    const handleAIGenerate = async () => {
        if (!aiPrompt) return;
        setAiLoading(true);
        try {
            const res = await axios.post('/api/ai/generate', { prompt: aiPrompt });
            const definition = res.data.definition;

            if (definition) {
                creator.JSON = definition; // Replace current survey
                setShowAIModal(false);
            }
            setAiLoading(false);
        } catch (err) {
            console.error(err);
            alert("AI Generation Failed: " + (err.response?.data?.error || err.message));
            setAiLoading(false);
        }
    };

    const handleSaveSettings = () => {
        if (!formId) return;
        const payload = {
            ...formMetadata,
            // Ensure these fields are explicitly sent from metadata state
            // formMetadata should be updated by inputs before calling this
        };

        axios.put(`/api/forms/${formId}`, payload)
            .then(res => {
                alert("Settings Saved!");
                setFormMetadata(res.data);
            })
            .catch(err => alert("Error saving settings: " + err.message));
    };

    const renderSettings = () => {
        if (!formMetadata) return <div>Loading settings...</div>;

        const SettingRow = ({ title, description, children }) => (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px 0', borderBottom: '1px solid #f1f5f9' }}>
                <div style={{ paddingRight: '20px' }}>
                    <div style={{ fontWeight: '600', color: '#334155', marginBottom: '4px' }}>{title}</div>
                    <div style={{ fontSize: '0.85em', color: '#64748b' }}>{description}</div>
                </div>
                <div>{children}</div>
            </div>
        );

        return (
            <div style={{ padding: '40px', maxWidth: '800px', margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                    <h2 style={{ color: '#1e293b', margin: 0 }}>Basic Settings</h2>
                    <button onClick={handleSaveSettings} style={{ padding: '10px 20px', background: '#064e3b', color: '#D9F8E5', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }}>
                        Save Changes
                    </button>
                </div>

                <div style={{ background: 'white', padding: '30px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>

                    {/* Active Status - using isActive if available, defaulting to true if undefined since migration added default TRUE */}
                    <SettingRow title="Survey Status" description="Allow users to access this survey. If disabled, users will see a message that the survey is closed.">
                        <label className="switch">
                            <input
                                type="checkbox"
                                checked={formMetadata.isActive !== false}
                                onChange={(e) => setFormMetadata({ ...formMetadata, isActive: e.target.checked })}
                            />
                            <span className="slider round"></span>
                        </label>
                    </SettingRow>

                    {/* Audio */}
                    <SettingRow title="Allow Audio Recording" description="Allow users to record audio answers directly in the survey.">
                        <label className="switch">
                            <input
                                type="checkbox"
                                checked={!!formMetadata.allowAudio}
                                onChange={(e) => setFormMetadata({ ...formMetadata, allowAudio: e.target.checked })}
                            />
                            <span className="slider round"></span>
                        </label>
                    </SettingRow>

                    {/* Camera */}
                    <SettingRow title="Allow Taking Pictures" description="Allow users to capture pictures using their device camera.">
                        <label className="switch">
                            <input
                                type="checkbox"
                                checked={!!formMetadata.allowCamera}
                                onChange={(e) => setFormMetadata({ ...formMetadata, allowCamera: e.target.checked })}
                            />
                            <span className="slider round"></span>
                        </label>
                    </SettingRow>

                    {/* Location */}
                    <SettingRow title="Enable Geolocation Tracking" description="Capture users' location data with their submission.">
                        <label className="switch">
                            <input
                                type="checkbox"
                                checked={!!formMetadata.allowLocation}
                                onChange={(e) => setFormMetadata({ ...formMetadata, allowLocation: e.target.checked })}
                            />
                            <span className="slider round"></span>
                        </label>
                    </SettingRow>

                    {/* Start Date */}
                    <SettingRow title="Start Date" description="Automatically open the survey on this date.">
                        <input
                            type="datetime-local"
                            style={{ padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px', color: '#334155' }}
                            value={formMetadata.startDate ? new Date(formMetadata.startDate).toISOString().slice(0, 16) : ''}
                            onChange={(e) => setFormMetadata({ ...formMetadata, startDate: e.target.value ? new Date(e.target.value).toISOString() : null })}
                        />
                    </SettingRow>

                    {/* End Date */}
                    <SettingRow title="End Date" description="Automatically close the survey on this date.">
                        <input
                            type="datetime-local"
                            style={{ padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px', color: '#334155' }}
                            value={formMetadata.endDate ? new Date(formMetadata.endDate).toISOString().slice(0, 16) : ''}
                            onChange={(e) => setFormMetadata({ ...formMetadata, endDate: e.target.value ? new Date(e.target.value).toISOString() : null })}
                        />
                    </SettingRow>

                </div>
            </div>
        );
    };

    if (!creator) return <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Initializing Editor...</div>;

    const navLinkStyle = (active) => ({
        padding: '0 15px',
        color: active ? '#064e3b' : '#64748b',
        fontWeight: active ? '600' : '500',
        cursor: 'pointer',
        textDecoration: 'none',
        borderBottom: active ? '2px solid #064e3b' : 'none',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        background: 'transparent',
        fontSize: '14px', // Unified Font Size
        transition: 'color 0.2s, border-bottom 0.2s'
    });

    return (
        <div style={{ height: "100vh", display: 'flex', flexDirection: 'column', direction: isRtl ? 'rtl' : 'ltr', fontFamily: "'Outfit', sans-serif" }}>
            {/* TOP NAVIGATION */}
            <div style={{ background: 'white', borderBottom: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>

                {/* ROW 1: Title & Actions */}
                <div style={{ height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 30px', borderBottom: '1px solid #f1f5f9' }}>

                    {/* LEFT: Back & Title */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                        {onBack && <button onClick={onBack} style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: '18px', color: '#64748b', padding: '5px' }}>←</button>}
                        <div>
                            <div style={{ fontWeight: '700', fontSize: '16px', color: '#0f172a' }}>{formMetadata?.title || 'Survey Editor'}</div>
                            <div style={{ fontSize: '12px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: formMetadata?.isPublished ? '#22c55e' : '#f59e0b', boxShadow: formMetadata?.isPublished ? '0 0 5px #22c55e' : 'none' }}></span>
                                <span style={{ fontWeight: '500' }}>{formMetadata?.isPublished ? t('builder.status.published') : t('builder.status.draft')}</span>
                                <span style={{ color: '#cbd5e1' }}>|</span>
                                <span>{t('surveys.card.version')}{formMetadata?.version || 1}</span>
                            </div>
                        </div>
                    </div>

                    {/* RIGHT: Buttons */}
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                        <button
                            onClick={() => setShowAIModal(true)}
                            style={{
                                padding: '8px 16px',
                                background: '#064e3b',
                                color: '#ecfdf5', // Pale Green Text
                                border: 'none',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                fontWeight: '600',
                                fontSize: '14px',
                                boxShadow: '0 2px 5px rgba(6, 78, 59, 0.3)'
                            }}>
                            ✨ {t('builder.btn.ai_assistant')}
                        </button>
                        {!formMetadata?.isPublished && (
                            <button
                                onClick={() => creator.saveSurvey()}
                                style={{ padding: '8px 16px', background: 'white', color: '#064e3b', border: '1px solid #064e3b', borderRadius: '8px', cursor: 'pointer', fontWeight: '500', fontSize: '14px' }}>
                                💾 {t('builder.btn.save')}
                            </button>
                        )}
                        {/* WORKFLOW BUTTONS */}
                        {(() => {
                            const status = formMetadata?.status || 'draft';
                            const isPublished = formMetadata?.isPublished;

                            if (isPublished) {
                                return (
                                    <button onClick={handleCreateDraft} style={{ padding: '8px 16px', background: '#f8fafc', color: '#334155', border: '1px solid #cbd5e1', borderRadius: '8px', cursor: 'pointer', fontWeight: '500', fontSize: '14px' }}>
                                        {t('builder.btn.create_new_version')}
                                    </button>
                                );
                            }

                            // IF Workflow is Enabled
                            if (workflowEnabled) {
                                if (status === 'pending_approval') {
                                    return (
                                        <>
                                            <button
                                                disabled
                                                style={{ padding: '8px 16px', background: '#e2e8f0', color: '#64748b', border: 'none', borderRadius: '8px', cursor: 'not-allowed', fontWeight: '500', fontSize: '14px' }}>
                                                🕒 {t('builder.btn.pending_approval')}
                                            </button>
                                            <button onClick={handleApprove} style={{ padding: '8px 16px', background: '#22c55e', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '500', fontSize: '14px' }}>
                                                ✓ {t('builder.btn.approve')}
                                            </button>
                                            <button onClick={handleReject} style={{ padding: '8px 16px', background: '#ef4444', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '500', fontSize: '14px' }}>
                                                ✕ {t('builder.btn.reject')}
                                            </button>
                                        </>
                                    );
                                }

                                // Draft or Rejected (Workflow Enabled)
                                return (
                                    <button onClick={handleRequestApproval} style={{ padding: '8px 16px', background: '#064e3b', color: '#D9F8E5', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '500', fontSize: '14px' }}>
                                        {t('builder.btn.request_approval')}
                                    </button>
                                );
                            }

                            // IF Workflow is Disabled (Direct Publish)
                            return (
                                <button onClick={handlePublish} style={{ padding: '8px 16px', background: '#064e3b', color: '#D9F8E5', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '500', fontSize: '14px' }}>
                                    {t('builder.btn.publish')}
                                </button>
                            );

                        })()}
                    </div>
                </div>

                {/* ROW 2: Navigation Tabs */}
                <div style={{ height: '48px', display: 'flex', alignItems: 'center', padding: '0 30px', gap: '10px' }}>
                    <div style={navLinkStyle(activeNav === 'questionnaire')} onClick={() => setActiveNav('questionnaire')}>Edit Design</div>
                    <div style={navLinkStyle(activeNav === 'audience')} onClick={() => setActiveNav('audience')}>Survey Audience</div>
                    <div style={navLinkStyle(activeNav === 'settings')} onClick={() => setActiveNav('settings')}>Settings</div>
                    <div style={navLinkStyle(activeNav === 'voice-agent')} onClick={() => setActiveNav('voice-agent')}>Voice Agent</div>
                    <div style={navLinkStyle(activeNav === 'quotas')} onClick={() => setActiveNav('quotas')}>Quotas</div>
                    <div style={navLinkStyle(activeNav === 'automation')} onClick={() => setActiveNav('automation')}>Automation</div>
                    <div style={navLinkStyle(activeNav === 'collect')} onClick={() => setActiveNav('collect')}>Collect</div>
                    <div style={navLinkStyle(activeNav === 'analytics')} onClick={() => setActiveNav('analytics')}>Results</div>
                    <div style={navLinkStyle(activeNav === 'history')} onClick={() => setActiveNav('history')}>History</div>
                </div>
            </div>

            {/* AI Modal */}
            {showAIModal && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000
                }}>
                    <div style={{ background: '#D9F8E5', padding: '30px', borderRadius: '16px', width: '550px', maxWidth: '90%', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '10px', fontSize: '1.25em', color: '#1e293b' }}>
                                <span style={{ fontSize: '1.2em' }}>✨</span> {t('builder.ai_modal.title')}
                            </h3>
                            <button onClick={() => setShowAIModal(false)} style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: '1.5em', color: '#94a3b8', padding: 0, lineHeight: 1 }}>×</button>
                        </div>
                        <p style={{ color: '#64748b', fontSize: '0.95em', lineHeight: '1.6', marginBottom: '20px' }}>
                            {t('builder.ai_modal.desc')}
                        </p>

                        <div style={{ marginBottom: '24px' }}>
                            <textarea
                                className="form-textarea"
                                style={{ width: '100%', minHeight: '140px', padding: '16px', borderRadius: '12px', border: '1px solid #cbd5e1', fontFamily: 'inherit', fontSize: '0.95em', resize: 'vertical', outline: 'none', transition: 'border-color 0.2s', background: '#f8fafc' }}
                                placeholder={t('builder.ai_modal.placeholder')}
                                value={aiPrompt}
                                onChange={(e) => setAiPrompt(e.target.value)}
                                onFocus={(e) => e.target.style.borderColor = '#8b5cf6'}
                                onBlur={(e) => e.target.style.borderColor = '#cbd5e1'}
                            />
                            <div style={{ fontSize: '0.8em', color: '#ef4444', marginTop: '8px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                ⚠️ {t('builder.ai_modal.warning')}
                            </div>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                            <button style={{ padding: '10px 20px', background: 'white', border: '1px solid #cbd5e1', borderRadius: '8px', cursor: 'pointer', color: '#064e3b', fontWeight: '500' }} onClick={() => setShowAIModal(false)}>{t('builder.ai_modal.cancel')}</button>
                            <button
                                style={{ background: 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)', color: 'white', border: 'none', padding: '10px 24px', borderRadius: '8px', cursor: 'pointer', opacity: aiLoading ? 0.7 : 1, fontWeight: '600', boxShadow: '0 4px 6px -1px rgba(99, 102, 241, 0.4)' }}
                                onClick={handleAIGenerate}
                                disabled={aiLoading}
                            >
                                {aiLoading ? t('builder.ai_modal.generating') : t('builder.ai_modal.generate')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div style={{ flex: 1, overflowY: 'auto', background: (activeNav !== 'questionnaire') ? '#f8fafc' : 'white' }}>
                {activeNav === 'settings' && <SettingsView form={formMetadata || { id: formId, title: "Survey Settings" }} onBack={() => setActiveNav('questionnaire')} />}
                {activeNav === 'voice-agent' && <VoiceAgentSettings formId={formMetadata?.id || formId} form={formMetadata} />}
                {activeNav === 'quotas' && (
                    <div style={{ padding: '30px', maxWidth: '800px', margin: '0 auto' }}>
                        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '20px' }}>
                            <button onClick={() => setActiveNav('questionnaire')} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', fontSize: '1em' }}>
                                {isRtl ? '➡' : '⬅'} {t('settings.back') || 'Back'}
                            </button>
                            <h2 style={{ margin: '0 0 0 20px', fontSize: '1.5em', color: '#1e293b' }}>Quota Management</h2>
                        </div>
                        <QuotaSettings formId={formMetadata?.id || formId} />
                    </div>
                )}
                {activeNav === 'collect' && <CollectView form={formMetadata || { id: formId, title: "Survey" }} onBack={() => setActiveNav('questionnaire')} />}
                {activeNav === 'audience' && <SurveyAudience form={formMetadata || { id: formId, title: "Survey" }} onBack={() => setActiveNav('questionnaire')} />}
                {activeNav === 'analytics' && <AnalyticsView form={formMetadata || { id: formId, title: "Survey" }} onBack={() => setActiveNav('questionnaire')} />}
                {activeNav === 'automation' && <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}><h2>Automation Workflow</h2><p>Configure triggers and actions here.</p></div>}
                {activeNav === 'history' && <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}><h2>Version History</h2><p>View prior versions (3).</p></div>}

                {activeNav === 'questionnaire' && <SurveyCreatorComponent creator={creator} />}
            </div>
        </div>
    );
}
