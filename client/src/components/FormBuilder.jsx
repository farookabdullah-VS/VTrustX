import React, { useEffect, useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { SurveyCreatorComponent, SurveyCreator } from "survey-creator-react";
import { Serializer, Action } from "survey-core";
import { ReactElementFactory } from "survey-react-ui";
import { surveyLocalization } from "survey-core";
import "survey-core/survey-core.min.css";
import "survey-creator-core/survey-creator-core.min.css";
import "survey-core/i18n";
import "survey-creator-core/i18n";
import './FormBuilder.css';

import "survey-core/themes/index";
import "survey-creator-core/themes/index";
import axios from 'axios';
import { User, Globe, LogOut, ChevronDown, Bell } from 'lucide-react';
import { SettingsView } from './SettingsView';
import { CollectView } from './CollectView';

import { AnalyticsView } from './AnalyticsView';
import { SurveyAudience } from './SurveyAudience';

import { LoopLogicView } from './LoopLogicView';

import { registerCustomTypes, setupSurveyColors, VTrustTheme } from '../survey-config';
import { initCustomControls } from './CustomSurveyControls';
import { initLoopLogic } from './SurveyLoopLogic';
import { QuotaSettings } from './QuotaSettings';
import { VoiceAgentSettings } from './settings/VoiceAgentSettings';

const creatorOptions = {
    showLogicTab: true,
    showTranslationTab: true,
    showThemeTab: true,
    showEmbedProcessingTab: true,
    showJSONEditorTab: true,
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
    const currentFormId = useRef(formId);

    // System Settings
    const [workflowEnabled, setWorkflowEnabled] = useState(false);

    const [submissions, setSubmissions] = useState([]);

    useEffect(() => {
        if (activeNav === 'analytics' && formId) {
            axios.get(`/api/submissions?formId=${formId}`)
                .then(res => setSubmissions(res.data))
                .catch(err => console.error("Failed to load submissions:", err));
        }
    }, [activeNav, formId]);

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

    // 1. Initialize Creator Instance (Once)
    useEffect(() => {
        registerCustomTypes();
        initCustomControls();

        // Step 2: Register all available languages
        surveyLocalization.supportedLocales = Object.keys(surveyLocalization.locales || {});

        const c = new SurveyCreator(creatorOptions);
        c.readOnly = false; // Step 3
        // Force options
        c.showLogicTab = true;
        c.showTranslationTab = true;
        c.showThemeTab = true;
        c.showEmbedProcessingTab = true;
        c.showJSONEditorTab = true;

        // --- REGISTER LOOP LOGIC TAB ---
        // --- REGISTER LOOP LOGIC TAB ---
        // try {
        //     if (ReactElementFactory && ReactElementFactory.Instance) {
        //         // Check if already registered to avoid duplicates on re-render
        //         // SurveyJS doesn't have a check method easily, but re-registering keeps the latest handler
        //         ReactElementFactory.Instance.registerElement("svc-tab-loops", (props) => {
        //             return <LoopLogicView creator={props.data} />;
        //         });
        //     }

        //     if (c.tabs) {
        //         const logicTab = c.tabs.find(t => t.id === 'logic');
        //         const insertIndex = logicTab ? c.tabs.indexOf(logicTab) + 1 : 3;

        //         // Check if already exists
        //         if (!c.tabs.find(t => t.id === "loops")) {
        //             const loopTab = new Action({
        //                 id: "loops",
        //                 name: "loops",
        //                 title: "Loop Logic",
        //                 component: "svc-tab-loops",
        //                 data: c,
        //                 action: () => {
        //                     c.makeNewViewActive("loops");
        //                 }
        //             });
        //             c.tabs.splice(insertIndex, 0, loopTab);
        //         }
        //     }
        // } catch (e) {
        //     console.error("Failed to register Loop Logic tab:", e);
        // }

        // Event Handlers with safety checks
        try {
            if (c.onSurveyInstanceCreated && typeof c.onSurveyInstanceCreated.add === 'function') {
                c.onSurveyInstanceCreated.add((sender, options) => {
                    setupSurveyColors(options.survey);
                });
            }

            if (c.onShowingProperty && typeof c.onShowingProperty.add === 'function') {
                c.onShowingProperty.add((sender, options) => {
                    const q = options.obj;
                    if (q && q.getType() === "rating" && (q.renderGradient === 'csat' || q.renderGradient === 'ces' || q.renderGradient === 'nps')) {
                        const hiddenProps = ["rateMax", "rateMin", "rateStep", "rateValues", "minRateDescription", "maxRateDescription", "rateColorMode", "ratingTheme", "displayMode"];
                        if (hiddenProps.includes(options.property.name)) options.canShow = false;
                    }
                });
            }

            if (c.onDefineElementMenuItems && typeof c.onDefineElementMenuItems.add === 'function') {
                c.onDefineElementMenuItems.add((sender, options) => {
                    const q = options.obj;
                    if (q && q.getType() === "rating" && (q.renderGradient === 'csat' || q.renderGradient === 'ces' || q.renderGradient === 'nps')) {
                        const allowedActionIds = ['delete', 'copy', 'duplicate', 'settings', 'questionSettings'];
                        options.items = options.items.filter(item => allowedActionIds.includes(item.id));
                    }
                });
            }

            // Initialize Loop Logic safely
            // if (typeof initLoopLogic === 'function') {
            //     initLoopLogic(c);
            // }
        } catch (error) {
            console.warn("SurveyCreator initialization warning:", error);
        }

        // Add Toolbox Items
        const basicControls = [
            { name: "nps", title: "NPS", iconName: "icon-radiogroup", category: "Custom", json: { type: "rating", name: "nps_score", title: "How likely are you to recommend us?", minRateDescription: "Not Likely", maxRateDescription: "Extremely Likely", rateMin: 0, rateMax: 10, renderGradient: "nps" } },
            { name: "csat", title: "CSAT", iconName: "icon-rating", category: "Custom", json: { type: "rating", name: "csat_score", title: "Customer Satisfaction Score", rateMin: 1, rateMax: 5, minRateDescription: "Very Dissatisfied", maxRateDescription: "Very Satisfied", renderGradient: "csat" } },
            { name: "ces", title: "CES", iconName: "icon-rating", category: "Custom", json: { type: "rating", name: "ces_score", title: "Customer Effort Score", rateMin: 1, rateMax: 5, minRateDescription: "Very Difficult", maxRateDescription: "Very Easy", renderGradient: "ces" } },
            { name: "fullname", title: "Full Name", iconName: "icon-text", category: "Basic Controls", json: { type: "multipletext", name: "fullname", title: "Full Name", items: [{ name: "first_name", title: "First Name", isRequired: true, width: "50%" }, { name: "last_name", title: "Last Name", isRequired: true, width: "50%" }] } },
            { name: "email", title: "Email", iconName: "icon-text", category: "Basic Controls", json: { type: "text", name: "email", title: "Email", inputType: "email", isRequired: true, validators: [{ type: "email" }] } },
            { name: "address", title: "Address", iconName: "icon-comment", category: "Basic Controls", json: { type: "comment", name: "address", title: "Address" } },
            { name: "phone", title: "Phone", iconName: "icon-text", category: "Basic Controls", json: { type: "text", name: "phone", title: "Phone", inputType: "tel", validators: [{ type: "regex", regex: "\\\\d+", text: "Please enter a valid phone number" }] } },
            { name: "datepicker", title: "Date Picker", iconName: "icon-datepicker", category: "Basic Controls", json: { type: "text", name: "date", title: "Date", inputType: "date" } },
            { name: "appointment", title: "Appointment", iconName: "icon-datepicker", category: "Basic Controls", json: { type: "text", name: "appointment", title: "Appointment", inputType: "datetime-local" } },
            { name: "signature", title: "Signature", iconName: "icon-signature", category: "Basic Controls", json: { type: "signaturepad", name: "signature", title: "Signature", signatureWidth: 500, signatureHeight: 200, width: "60%" } },
            { name: "fillintheblank", title: "Fill in the Blank", iconName: "icon-text", category: "Basic Controls", json: { type: "text", name: "question", title: "Question" } },
            { name: "voicerecord", title: "Voice Record", iconName: "icon-radiogroup", category: "Basic Controls", json: { type: "audiorecorder", name: "voice_response", title: "Record your answer" } },
            { name: "authenticator", title: "Authenticator", iconName: "icon-settings", category: "Security & Logic", json: { type: "authenticator", name: "auth_gate", title: "Enter Password to Continue", isRequired: true } }
        ];

        // Force Toolbox to be visible
        c.showToolbox = true;
        c.readOnly = false; // Default to editable

        if (c.toolbox) {
            // Explicitly ensuring standard tools are available
            const standardTools = [
                { name: "paneldynamic", title: "Dynamic Panel (Loop)", iconName: "icon-paneldynamic", category: "Containers", json: { type: "paneldynamic", name: "panel1", title: "New Dynamic Panel" } },
                { name: "panel", title: "Panel (Group)", iconName: "icon-panel", category: "Containers", json: { type: "panel", name: "panel1", title: "New Panel" } },
                { name: "text", title: "Single Input", iconName: "icon-text", category: "Questions", json: { type: "text" } },
                { name: "checkbox", title: "Checkbox", iconName: "icon-checkbox", category: "Questions", json: { type: "checkbox", name: "q1", choices: ["Item 1", "Item 2"] } },
                { name: "radiogroup", title: "Radio Group", iconName: "icon-radiogroup", category: "Questions", json: { type: "radiogroup", name: "q1", choices: ["Item 1", "Item 2"] } },
                { name: "dropdown", title: "Dropdown", iconName: "icon-dropdown", category: "Questions", json: { type: "dropdown", name: "q1", choices: ["Item 1", "Item 2"] } },
                { name: "matrix", title: "Single Choice Matrix", iconName: "icon-matrix", category: "Matrix", json: { type: "matrix" } },
                { name: "matrixdynamic", title: "Dynamic Matrix", iconName: "icon-matrixdynamic", category: "Matrix", json: { type: "matrixdynamic" } },
                { name: "file", title: "File Upload", iconName: "icon-file", category: "Questions", json: { type: "file" } },
                { name: "html", title: "HTML / Text", iconName: "icon-html", category: "Questions", json: { type: "html", html: "Enter your text here" } }
            ];

            // Add standard tools first
            standardTools.forEach(tool => {
                const exists = c.toolbox.items.some(i => i.name === tool.name);
                if (!exists) {
                    c.toolbox.addItem(tool);
                }
            });

            // Add custom Basic Controls
            basicControls.forEach(item => c.toolbox.addItem(item));
        }

        // Save Function
        c.saveSurveyFunc = (saveNo, callback) => {
            // Save Theme along with Definition
            const surveyDef = c.JSON;
            // Embed theme in the definition object or alongside it. 
            // Since we use definition column in DB, let's mix it in or wrap it.
            // But c.JSON might be strict. Let's add 'theme' property to the object we send.
            // However, existing backend likely maps 'definition' -> DB column.
            // So we modify 'definition' to include theme.
            const payload = {
                definition: { ...surveyDef, theme: c.theme },
                title: c.survey.title || "Untitled Form",
                version: 1
            };
            const targetId = currentFormId.current;

            if (targetId) {
                axios.put(`/api/forms/${targetId}`, payload).then(res => {
                    callback(saveNo, true);
                }).catch(err => {
                    console.error("Save Error:", err);
                    alert("Save Error: " + (err.response?.data?.error || err.message));
                    callback(saveNo, false);
                });
            } else {
                axios.post(`/api/forms`, payload).then(res => {
                    if (res.data && res.data.id) {
                        currentFormId.current = res.data.id;
                        setFormMetadata(res.data);
                    }
                    callback(saveNo, true);
                }).catch(err => {
                    console.error("Create Error:", err);
                    callback(saveNo, false);
                });
            }
        };

        setCreator(c);

        return () => {
        };
    }, []);
    // Run ONCE

    // 2. Load Data when Creator or IDs change
    useEffect(() => {
        if (!creator) return;

        // Prevent reloading if we are already on this form to avoid wiping unsaved changes?
        // Ideally checking if the loaded form ID matches helps. 
        // But here we rely on the fact that formId change implies a navigation.

        if (formId) {
            axios.get(`/api/forms/${formId}`)
                .then(res => {
                    creator.JSON = res.data.definition;
                    setFormMetadata(res.data);
                    if (res.data.isPublished) creator.readOnly = true;
                    else creator.readOnly = false;
                })
                .catch(err => {
                    console.error("Error loading form:", err);
                    creator.JSON = { ...VTrustTheme };
                    creator.readOnly = false;
                });
        } else if (initialData) {
            const def = (initialData.themeVariables || initialData.themeName) ? initialData : { ...initialData, ...VTrustTheme };
            creator.JSON = def;
            creator.readOnly = false;
        } else {
            // Only reset if we are indeed intending to show a New Survey
            // We might check if creator.JSON is empty to avoid overwriting existing work if effect re-runs?
            // But relying on dependency array is safer.
            creator.JSON = {
                title: "New Survey",
                pages: [{ name: "page1", elements: [] }],
                ...VTrustTheme
            };
            creator.readOnly = false;
        }

        // Apply Theme and map to sjs variables that we also set in App.js
        // This ensures the Creator UI itself uses the user's color scheme
        creator.theme = {
            "themeName": "default",
            "colorPalette": "light",
            "isPanelless": false,
            "cssVariables": {
                // Using var() here works if SurveyJS supports dynamic CSS Vars in their config,
                // otherwise we rely on index.css .svc-creator overrides.
                // However, mapping them explicitly is safer for the compiled CSS.
                "--sjs-primary-backcolor": "var(--primary-color, #064e3b)",
                "--sjs-primary-backcolor-light": "rgba(6, 78, 59, 0.1)", // Approximate
                "--sjs-primary-backcolor-dark": "var(--primary-hover, #047857)",
                "--sjs-primary-forecolor": "var(--button-text, #ffffff)",
                "--sjs-primary-forecolor-light": "#ffffff",
                "--sjs-special-red": "#b91c1c"
            }
        };

    }, [creator, formId, initialData]);

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
        const id = currentFormId.current;
        if (!id) return;
        if (confirm("Approve and Publish this survey?")) {
            axios.post(`/api/forms/${id}/approve`, { username: user?.user?.username })
                .then(res => {
                    alert("Survey Approved and Published!");
                    setFormMetadata(res.data);
                    if (creator) creator.readOnly = true;
                })
                .catch(err => alert(err.message));
        }
    };

    const handleReject = () => {
        const id = currentFormId.current;
        if (!id) return;
        if (confirm("Reject this survey? It will return to draft status.")) {
            axios.post(`/api/forms/${id}/reject`, { username: user?.user?.username })
                .then(res => {
                    alert("Survey Rejected.");
                    setFormMetadata(res.data);
                })
                .catch(err => alert(err.message));
        }
    };

    const handlePublish = async () => {
        let id = currentFormId.current;

        if (confirm("Save and Publish this survey? It will become live and immutable.")) {
            try {
                // 1. Capture current definition
                const surveyDef = creator.JSON;
                let payload = {
                    definition: { ...surveyDef, theme: creator.theme },
                    title: creator.survey.title || "Untitled Form",
                };

                if (!id) {
                    // Create New Form
                    payload.version = 1;
                    const res = await axios.post(`/api/forms`, payload);
                    id = res.data.id;
                    currentFormId.current = id;
                    setFormMetadata(res.data);
                } else {
                    // Update Existing Form
                    await axios.put(`/api/forms/${id}`, payload);
                }

                // 2. Trigger Publish
                const res = await axios.post(`/api/forms/${id}/publish`);

                alert("Published successfully!");
                setFormMetadata(res.data);
                if (creator) creator.readOnly = true;
            } catch (err) {
                console.error("Publish Error:", err);
                alert("Publish Failed: " + (err.response?.data?.error || err.message));
            }
        }
    };

    const handleCreateDraft = () => {
        const id = currentFormId.current;
        if (!id) return;
        axios.post(`/api/forms/${id}/draft`)
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
        const id = currentFormId.current;
        if (!id) return;
        const payload = {
            ...formMetadata,
            // Ensure these fields are explicitly sent from metadata state
            // formMetadata should be updated by inputs before calling this
        };

        axios.put(`/api/forms/${id}`, payload)
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
                    <h2 style={{ color: 'var(--text-color, #1e293b)', margin: 0 }}>Basic Settings</h2>
                    <button onClick={handleSaveSettings} style={{ padding: '10px 20px', background: 'var(--primary-color, #064e3b)', color: 'var(--button-text, #ffffff)', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }}>
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



    return (
        <div style={{ height: "100vh", display: 'flex', flexDirection: 'column', direction: isRtl ? 'rtl' : 'ltr', fontFamily: "'Outfit', sans-serif" }}>
            {/* TOP NAVIGATION */}
            <div style={{ background: 'var(--card-bg, white)', borderBottom: '1px solid var(--border-color, #e2e8f0)', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>

                {/* ROW 1: Title & Actions */}
                <div style={{ height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 30px', borderBottom: '1px solid var(--border-color, #f1f5f9)' }}>

                    {/* LEFT: Back & Title */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                        {onBack && <button onClick={onBack} style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: '18px', color: 'var(--text-muted, #64748b)', padding: '5px' }}>←</button>}
                        <div>
                            <div style={{ fontWeight: '700', fontSize: '16px', color: 'var(--text-color, #0f172a)' }}>{formMetadata?.title || 'Survey Editor'}</div>
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
                                background: 'var(--primary-color, #064e3b)',
                                color: 'var(--button-text, #ffffff)', // Pale Green Text
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
                        <button
                            onClick={() => creator.setDisplayMode('design')}
                            style={{ padding: '8px 12px', background: creator.activeTab === 'designer' ? '#e2e8f0' : 'white', border: '1px solid #cbd5e1', borderRadius: '8px', cursor: 'pointer', fontSize: '14px' }}
                            title="Edit Design">
                            ✏️
                        </button>
                        <button
                            onClick={() => creator.setDisplayMode('test')}
                            style={{ padding: '8px 12px', background: creator.activeTab === 'test' ? '#e2e8f0' : 'white', border: '1px solid #cbd5e1', borderRadius: '8px', cursor: 'pointer', fontSize: '14px' }}
                            title="Preview Survey">
                            👁️
                        </button>
                        {!formMetadata?.isPublished && (
                            <button
                                onClick={() => creator.saveSurvey()}
                                style={{ padding: '8px 16px', background: 'var(--card-bg, white)', color: 'var(--primary-color, #064e3b)', border: '1px solid var(--primary-color, #064e3b)', borderRadius: '8px', cursor: 'pointer', fontWeight: '500', fontSize: '14px' }}>
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
                                <button onClick={handlePublish} style={{ padding: '8px 16px', background: 'var(--primary-color, #064e3b)', color: 'var(--button-text, #ffffff)', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '500', fontSize: '14px' }}>
                                    {t('builder.btn.publish')}
                                </button>
                            );

                        })()}
                    </div>
                </div>

                {/* ROW 2: Navigation Tabs */}
                <div style={{ height: '48px', display: 'flex', alignItems: 'center', padding: '0 30px', gap: '10px' }}>
                    <div className={`fb-nav-item ${activeNav === 'questionnaire' ? 'active' : ''}`} onClick={() => setActiveNav('questionnaire')}>{t('surveys.action.edit_design')}</div>
                    <div className={`fb-nav-item ${activeNav === 'audience' ? 'active' : ''}`} onClick={() => setActiveNav('audience')}>{t('surveys.action.audience')}</div>
                    <div className={`fb-nav-item ${activeNav === 'settings' ? 'active' : ''}`} onClick={() => setActiveNav('settings')}>{t('surveys.action.settings')}</div>
                    <div className={`fb-nav-item ${activeNav === 'voice-agent' ? 'active' : ''}`} onClick={() => setActiveNav('voice-agent')}>{t('builder.nav.voice_agent') || 'Voice Agent'}</div>
                    <div className={`fb-nav-item ${activeNav === 'quotas' ? 'active' : ''}`} onClick={() => setActiveNav('quotas')}>{t('surveys.action.quotas')}</div>
                    <div className={`fb-nav-item ${activeNav === 'automation' ? 'active' : ''}`} onClick={() => setActiveNav('automation')}>{t('surveys.action.automation')}</div>
                    <div className={`fb-nav-item ${activeNav === 'collect' ? 'active' : ''}`} onClick={() => setActiveNav('collect')}>{t('surveys.action.collect')}</div>
                    <div className={`fb-nav-item ${activeNav === 'analytics' ? 'active' : ''}`} onClick={() => setActiveNav('analytics')}>{t('surveys.action.results')}</div>
                    <div className={`fb-nav-item ${activeNav === 'history' ? 'active' : ''}`} onClick={() => setActiveNav('history')}>{t('surveys.action.history')}</div>
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

            <div style={{ flex: 1, overflowY: 'auto', background: (activeNav !== 'questionnaire') ? 'var(--bg-subtle, #f8fafc)' : 'var(--card-bg, white)' }}>
                {activeNav === 'settings' && <SettingsView form={{ ...(formMetadata || {}), id: formId, definition: creator?.JSON }} onBack={() => setActiveNav('questionnaire')} />}
                {activeNav === 'voice-agent' && <VoiceAgentSettings formId={formMetadata?.id || formId} form={formMetadata} />}
                {activeNav === 'quotas' && (
                    <div style={{ padding: '30px', maxWidth: '800px', margin: '0 auto' }}>
                        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '20px' }}>
                            <button onClick={() => setActiveNav('questionnaire')} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', fontSize: '1em' }}>
                                {isRtl ? '➡' : '⬅'} {t('settings.back') || 'Back'}
                            </button>
                            <h2 style={{ margin: '0 0 0 20px', fontSize: '1.5em', color: '#1e293b' }}>Quota Management</h2>
                        </div>
                        <QuotaSettings form={{ ...(formMetadata || {}), id: formId, definition: creator?.JSON }} />
                    </div>
                )}
                {activeNav === 'collect' && <CollectView form={formMetadata || { id: formId, title: "Survey" }} onBack={() => setActiveNav('questionnaire')} />}
                {activeNav === 'audience' && <SurveyAudience form={formMetadata || { id: formId, title: "Survey" }} onBack={() => setActiveNav('questionnaire')} />}
                {activeNav === 'analytics' && <AnalyticsView form={formMetadata || { id: formId, title: "Survey" }} submissions={submissions} onBack={() => setActiveNav('questionnaire')} />}
                {activeNav === 'automation' && <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}><h2>Automation Workflow</h2><p>Configure triggers and actions here.</p></div>}
                {activeNav === 'history' && <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}><h2>Version History</h2><p>View prior versions (3).</p></div>}

                {activeNav === 'questionnaire' && <SurveyCreatorComponent creator={creator} />}
            </div>
        </div>
    );
}
