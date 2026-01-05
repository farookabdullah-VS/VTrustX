import React from 'react';
import { Model } from 'survey-core';
import { Survey } from 'survey-react-ui';
import 'survey-core/survey-core.min.css';
import axios from 'axios';
import * as XLSX from 'xlsx';
import { AnalysisViewer } from './AnalysisViewer';
import { ResultsViewer } from './ResultsViewer';
import { CollectView } from './CollectView';
import { SettingsView } from './SettingsView';
import { WorkflowView } from './WorkflowView';
import { AudioRecorder } from './AudioRecorder';

import { useTranslation } from 'react-i18next';
import { FilePlus, LayoutTemplate, Sparkles, Download, Upload, Pencil, Megaphone, Settings, Zap, Share2, BarChart, History as HistoryIcon, Copy, FileSignature, StickyNote, Image as ImageIcon } from 'lucide-react';
import { registerCustomTypes, setupSurveyColors } from '../survey-config';
import { initCustomControls } from './CustomSurveyControls';

export function FormViewer({ formId, submissionId, onSelectForm, onEditSubmission, onEditForm, onCreate, slug, isPublic }) {
    const { t, i18n } = useTranslation();
    const isRtl = i18n.language === 'ar';
    const [resultsViewId, setResultsViewId] = React.useState(null);
    const [collectViewId, setCollectViewId] = React.useState(null);
    const [settingsViewId, setSettingsViewId] = React.useState(null);
    const [workflowViewId, setWorkflowViewId] = React.useState(null);
    const [survey, setSurvey] = React.useState(null);
    const [submissionMeta, setSubmissionMeta] = React.useState(null);
    const [formList, setFormList] = React.useState([]);
    const [showCreateOptions, setShowCreateOptions] = React.useState(false);

    // Dropdown state for "⋮" menu
    const [actionMenuOpenId, setActionMenuOpenId] = React.useState(null);
    const [isLoading, setIsLoading] = React.useState(false);
    const [error, setError] = React.useState(null);

    // State for History Modal
    const [historyModalOpenId, setHistoryModalOpenId] = React.useState(null);
    const [historyList, setHistoryList] = React.useState([]);

    const loadForms = () => {
        setIsLoading(true);
        axios.get('/api/forms')
            .then(res => {
                setFormList(res.data);
                setIsLoading(false);
            })
            .catch(err => {
                console.error("Failed to load forms:", err);
                setError(err.response?.data?.error || err.message || "Failed to load");
                setIsLoading(false);
            });
    };

    // --- ACTIONS ---

    const handleDelete = (id, title) => {
        if (confirm(`Are you sure you want to delete "${title}"?`)) {
            axios.delete(`/api/forms/${id}`)
                .then(() => {
                    setFormList(prev => prev.filter(f => f.id !== id));
                    if (resultsViewId === id) setResultsViewId(null);
                    if (collectViewId === id) setCollectViewId(null);
                    if (settingsViewId === id) setSettingsViewId(null);
                    if (workflowViewId === id) setWorkflowViewId(null);
                })
                .catch(err => {
                    console.error(err);
                    alert("Failed to delete form: " + (err.response?.data?.error || err.message || "Unknown error"));
                });
        }
    };

    const handleDuplicate = (form) => {
        if (!confirm(`Duplicate "${form.title}"?`)) return;

        const newTitle = `Copy of ${form.title}`;
        const newDef = { ...form.definition, title: newTitle };

        axios.post('/api/forms', {
            title: newTitle,
            definition: newDef,
            version: 1
        }).then(() => {
            loadForms();
            alert("Survey duplicated!");
        }).catch(err => alert("Duplicate failed"));
    };

    const handleRename = (form) => {
        const newTitle = prompt("Enter new title:", form.title);
        if (!newTitle || newTitle === form.title) return;

        const newDef = { ...form.definition, title: newTitle }; // Update internal definition too
        axios.put(`/api/forms/${form.id}`, {
            title: newTitle,
            definition: newDef
        }).then(() => loadForms()).catch(err => alert("Rename failed"));
    };

    const handleAddNotes = (form) => {
        const currentDesc = form.definition.description || "";
        const newDesc = prompt("Enter notes/description:", currentDesc);
        if (newDesc === null) return;

        const newDef = { ...form.definition, description: newDesc };
        axios.put(`/api/forms/${form.id}`, {
            title: form.title,
            definition: newDef
        }).then(() => loadForms()).catch(err => alert("Notes update failed"));
    };

    const getProcessedForms = () => {
        // Group by Title to handle versioning
        const groups = {};
        formList.forEach(form => {
            const key = form.title.trim();
            if (!groups[key]) groups[key] = [];
            groups[key].push(form);
        });

        // For each group, pick latest version as "Active"
        return Object.values(groups).map(group => {
            // Sort Descending by Version
            group.sort((a, b) => b.version - a.version);
            const latest = group[0];
            const oldVersions = group.slice(1);

            // Attach history to the latest object for UI access
            return { ...latest, history: oldVersions };
        });
    };

    const formsToDisplay = getProcessedForms();

    const handleViewHistory = (form) => {
        setHistoryList(form.history || []);
        setHistoryModalOpenId(form.id);
        setActionMenuOpenId(null);
    };

    // Helper: Get Cover Image (Custom or Random Default)
    const getCoverImage = (form) => {
        if (form.definition && form.definition.coverImage) {
            return form.definition.coverImage;
        }
        // Random deterministic choice based on ID
        const defaults = [
            '/covers/cover_1.png',
            '/covers/cover_2.png',
            '/covers/cover_3.png'
        ];
        // Simple hash of ID to pick index
        const idInt = parseInt(form.id) || form.title.length;
        return defaults[idInt % defaults.length];
    };

    // Handle Cover Image Upload
    const handleCoverImageUpload = (e, formId) => {
        const file = e.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('file', file);

        axios.post('/api/files/upload', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        }).then(res => {
            const imageUrl = `http://localhost:3000${res.data.url}`;

            // Find form and update definition
            const form = formList.find(f => f.id === formId);
            if (!form) return;

            const newDef = { ...form.definition, coverImage: imageUrl };
            axios.put(`/api/forms/${formId}`, {
                title: form.title,
                definition: newDef
            }).then(() => {
                alert("Cover updated!");
                loadForms();
                setActionMenuOpenId(null);
            });
        }).catch(err => {
            console.error(err);
            alert("Upload failed");
        });
    };

    // File Import Handler
    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (evt) => {
            const bstr = evt.target.result;
            const wb = XLSX.read(bstr, { type: 'binary' });
            const wsname = wb.SheetNames[0];
            const ws = wb.Sheets[wsname];
            const data = XLSX.utils.sheet_to_json(ws, { header: 1 });

            if (!data || data.length === 0) {
                alert("File is empty");
                return;
            }

            let startIndex = 0;
            // Check for header
            if (data[0] && (data[0][0] && typeof data[0][0] === 'string' && data[0][0].toLowerCase().includes('question'))) {
                startIndex = 1;
            }

            const elements = [];
            for (let i = startIndex; i < data.length; i++) {
                const row = data[i];
                if (!row || row.length === 0 || !row[0]) continue;

                const title = row[0];
                let type = row[1] ? row[1].toLowerCase().trim() : 'text';
                const choicesStr = row[2];

                // Normalize Type
                if (type === 'yes/no' || type === 'bool') type = 'boolean';
                if (type === 'radio' || type === 'single') type = 'radiogroup';
                if (type === 'multi' || type === 'check') type = 'checkbox';
                if (type === 'score' || type === '1-5') type = 'rating';

                const question = { type: type, name: `q${i}`, title: title };

                if (choicesStr && (type === 'radiogroup' || type === 'checkbox' || type === 'dropdown')) {
                    question.choices = choicesStr.toString().split(',').map(c => c.trim());
                }

                if (type === 'rating') {
                    question.rateMax = 5;
                }

                elements.push(question);
            }

            if (elements.length === 0) {
                alert("No valid questions found. Ensure rows are: Question, Type, Choices");
                return;
            }

            const surveyDef = {
                title: file.name.split('.')[0],
                pages: [{ name: 'page1', elements: elements }]
            };

            // Close dropdown and navigate
            setShowCreateOptions(false);
            onCreate('create-imported', { title: surveyDef.title, definition: surveyDef });
        };
        reader.readAsBinaryString(file);
    };

    // Download Template Handler
    const handleDownloadTemplate = () => {
        // Sheet 1: Instructions
        const instructions = [
            ["VTrustX Survey Import Template Instructions"],
            [""],
            ["How to use this template:"],
            ["1. Switch to the 'Survey Template' sheet."],
            ["2. Fill in your questions based on the columns provided."],
            ["3. Save the file and use 'Import Survey' to upload it."],
            [""],
            ["Column Guide:"],
            ["Column A: Question Title", "The text of your question (Required)."],
            ["Column B: Question Type", "text, rating, radiogroup, checkbox, boolean (Optional, default is text)."],
            ["Column C: Choices", "Comma-separated values for radiogroup/checkbox (e.g., 'Yes, No, Maybe')."]
        ];

        // Sheet 2: Template
        const templateHeaders = [
            ["Question Title", "Question Type", "Choices (Optional)"],
            ["Example: Do you like our service?", "boolean", ""],
            ["Example: Rate your experience", "rating", ""],
            ["Example: Select your favorite fruits", "checkbox", "Apple, Banana, Orange"]
        ];

        const wb = XLSX.utils.book_new();

        const wsInstructions = XLSX.utils.aoa_to_sheet(instructions);
        XLSX.utils.book_append_sheet(wb, wsInstructions, "Instructions");

        const wsTemplate = XLSX.utils.aoa_to_sheet(templateHeaders);
        XLSX.utils.book_append_sheet(wb, wsTemplate, "Survey Template");

        XLSX.writeFile(wb, "VTrustX_Survey_Template.xlsx");
        setShowCreateOptions(false);
    };

    React.useEffect(() => {
        registerCustomTypes(); // Ensure types exist
        initCustomControls();

        // CASE 1: Default Listing Mode (No specific form)
        if (!formId && !slug) {
            setSurvey(null);
            loadForms();
            return;
        }

        // CASE 2: Specific Form (ID or Slug)
        let fetchUrl = formId ? `/api/forms/${formId}` : `/api/forms/slug/${slug}`;

        axios.get(fetchUrl)
            .then(res => {
                const formDef = res.data;
                const resolvedId = formDef.id; // Get ID from resolved form

                // CHECK DEADLINES
                const now = new Date();
                if (formDef.startDate && new Date(formDef.startDate) > now) {
                    setError("This survey has not started yet.");
                    setIsLoading(false);
                    return;
                }
                if (formDef.endDate && new Date(formDef.endDate) < now) {
                    setError("This survey has expired.");
                    setIsLoading(false);
                    return;
                }

                // CHECK PASSWORD (Frontend Check - Weak)
                // Ideally this should be server-side enforced (403), but for MVP:
                if (formDef.password && !sessionStorage.getItem(`auth_${resolvedId}`)) {
                    const input = prompt("This survey is password protected. Enter password:");
                    if (input !== formDef.password) {
                        setError("Incorrect Password.");
                        setIsLoading(false);
                        return;
                    }
                    sessionStorage.setItem(`auth_${resolvedId}`, 'true');
                }

                const model = new Model(formDef.definition);
                setupSurveyColors(model); // Apply colors

                model.applyTheme({ "themeName": "default", "colorPalette": "light", "isPanelless": false });
                model.locale = i18n.language; // Set SurveyJS locale

                if (formDef.allowAudio) model.setVariable("allowAudio", true);
                if (formDef.allowCamera) model.setVariable("allowCamera", true);
                if (formDef.allowLocation) model.setVariable("allowLocation", true);

                // Pass password to the survey instance for the Authenticator custom question
                if (formDef.password) {
                    // Check if survey has 'jsonObj' property where we can stash this for the React wrapper,
                    // or just use setVariable if we update the component to read from variables.
                    // The component reads from `question.survey.jsonObj.password` currently.
                    // Let's ensure the jsonObj has it if it wasn't part of the definition.
                    if (!model.jsonObj) model.jsonObj = {};
                    model.jsonObj.password = formDef.password;
                }

                // If submissionId provided, load data (Edit/View Submission Mode)
                if (submissionId) {
                    axios.get(`/api/submissions/${submissionId}`)
                        .then(subRes => {
                            model.data = subRes.data.data;
                            model.mode = 'display';
                            setSubmissionMeta(subRes.data);
                        })
                        .catch(err => console.error("Error loading submission:", err));
                }

                // Secure File Upload Handler
                model.onUploadFiles.add((survey, options) => {
                    const formData = new FormData();
                    options.files.forEach(file => { formData.append('file', file); });
                    axios.post('/api/files/upload', formData, {
                        headers: { 'Content-Type': 'multipart/form-data' }
                    }).then(res => {
                        options.callback("success", options.files.map(file => {
                            return { file: file, content: `http://localhost:3000${res.data.url}` };
                        }));
                    }).catch(err => { options.callback("error"); });
                });

                // Submission Handler
                model.onComplete.add(async (sender) => {
                    const results = sender.data;

                    // Capture Device & Browser Info
                    const metadata = {
                        device_info: {
                            userAgent: navigator.userAgent,
                            platform: navigator.platform, // Note: Deprecated but still widely supported
                            language: navigator.language,
                            screenResolution: `${window.screen.width}x${window.screen.height}`,
                            windowSize: `${window.innerWidth}x${window.innerHeight}`,
                            deviceMemory: navigator.deviceMemory || 'unknown',
                            hardwareConcurrency: navigator.hardwareConcurrency || 'unknown',
                            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
                        }
                    };

                    // Show visual feedback
                    const loadingMsg = document.createElement('div');
                    loadingMsg.id = 'submission-loading';
                    loadingMsg.innerText = formDef.allowLocation ? "📍 Acquiring Location & Submitting..." : "🚀 Submitting...";
                    Object.assign(loadingMsg.style, {
                        position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                        background: 'rgba(0,0,0,0.85)', color: 'white', padding: '20px 40px',
                        borderRadius: '8px', zIndex: 9999, fontSize: '1.2em', display: 'flex', alignItems: 'center', gap: '10px'
                    });
                    document.body.appendChild(loadingMsg);

                    if (formDef.allowLocation) {
                        try {
                            const position = await new Promise((resolve, reject) => {
                                if (!navigator.geolocation) reject(new Error("Geolocation not supported"));
                                navigator.geolocation.getCurrentPosition(resolve, reject, {
                                    timeout: 8000,
                                    enableHighAccuracy: true
                                });
                            });
                            metadata.location = {
                                lat: position.coords.latitude,
                                long: position.coords.longitude,
                                accuracy: position.coords.accuracy,
                                timestamp: new Date(position.timestamp).toISOString()
                            };
                        } catch (e) {
                            console.warn("Location capture failed:", e);
                            metadata.location_error = e.message || 'Permission denied or timeout';
                        }
                    }

                    const finalize = () => {
                        const el = document.getElementById('submission-loading');
                        if (el) el.remove();
                    };

                    if (submissionId) {
                        axios.put(`/api/submissions/${submissionId}`, {
                            data: results,
                            metadata: metadata
                        }).then(() => {
                            finalize();
                            alert("Submission Updated!");
                        }).catch(err => {
                            finalize();
                            alert("Update failed: " + err.message);
                        });
                    } else {
                        axios.post('/api/submissions', {
                            formId: resolvedId,
                            formVersion: formDef.version || 1,
                            data: results,
                            metadata: metadata
                        }).then(() => {
                            finalize();
                            if (formDef.redirectUrl) {
                                window.location.href = formDef.redirectUrl;
                            } else {
                                if (!isPublic && onSelectForm) {
                                    // Internal: Return to survey list
                                    onSelectForm(null);
                                }
                                // Public: Stay on Thank You page (SurveyJS default)
                            }
                        }).catch(err => {
                            finalize();
                            alert("Submission failed: " + err.message);
                        });
                    }
                });
                setSurvey(model);
            })
            .catch(err => {
                console.error(err);
                setError("Form not found or inaccessible.");
            });
    }, [formId, submissionId, slug]);

    // VIEW: Settings
    if (settingsViewId) {
        const formToEdit = formList.find(f => f.id === settingsViewId);
        return <SettingsView form={formToEdit} onBack={() => setSettingsViewId(null)} onUpdate={loadForms} />;
    }

    // VIEW: Workflow
    if (workflowViewId) {
        const formToEdit = formList.find(f => f.id === workflowViewId);
        return <WorkflowView form={formToEdit} onBack={() => setWorkflowViewId(null)} />;
    }

    // VIEW: Collect / Share
    if (collectViewId) {
        const formToShare = formList.find(f => f.id === collectViewId);
        return <CollectView form={formToShare} onBack={() => setCollectViewId(null)} />;
    }

    // VIEW: Results Analysis
    if (resultsViewId) {
        return <ResultsViewer formId={resultsViewId} onBack={() => setResultsViewId(null)} onEditSubmission={onEditSubmission} />;
    }

    // VIEW: Survey Taking (Single Form)
    if (formId || (slug && survey)) {
        const handleAudioUpload = (blob) => {
            const formData = new FormData();
            // Create a unique filename
            const filename = `audio_${Date.now()}.webm`;
            formData.append('file', blob, filename);

            axios.post('/api/files/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            }).then(res => {
                const url = `http://localhost:3000${res.data.url}`;
                // Set the value in Survey Data
                // We use a custom key 'audio_response' or append to a hidden question if it existed
                // For now, simple kv:
                const currentData = survey.data || {};
                survey.data = { ...currentData, audio_response: url };
                alert("Audio Attached Successfully!");
            }).catch(err => {
                console.error(err);
                alert("Failed to upload audio.");
            });
        };

        const allowAudio = survey && survey.getVariable('allowAudio');

        return (
            <div style={{ height: 'calc(100vh - 100px)', overflow: 'auto', padding: '20px' }}>
                {!isPublic && (
                    <button onClick={() => { onSelectForm(null) }} style={{ marginBottom: '15px', background: '#64748b', padding: '8px 16px', border: 'none', borderRadius: '4px', color: 'white' }}>
                        &larr; Back to Listings
                    </button>
                )}
                {submissionMeta && (
                    <div style={{ padding: '15px', background: '#f1f5f9', marginBottom: '20px', borderRadius: '6px', borderLeft: '4px solid #2563eb' }}>
                        <strong>Viewing Submission by:</strong> {submissionMeta.user_id}
                    </div>
                )}

                <Survey model={survey} />

                {allowAudio && !submissionMeta && ( // Only show recorder if allowed and NOT reviewing a submission
                    <div style={{ maxWidth: '800px', margin: '0 auto', marginBottom: '40px' }}>
                        <AudioRecorder onRecordingComplete={handleAudioUpload} />
                    </div>
                )}
            </div>
        );
    }

    // VIEW: Form Listing (Grid Dashboard)
    if (isPublic) {
        return (
            <div style={{ maxWidth: '800px', margin: '0 auto', padding: '40px' }}>
                {isLoading && <div>Loading Survey...</div>}
                {error && <div style={{ padding: '20px', background: '#fee2e2', color: '#dc2626', borderRadius: '8px', textAlign: 'center' }}>{error}</div>}
            </div>
        );
    }

    return (
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '30px', direction: isRtl ? 'rtl' : 'ltr', fontFamily: "'Outfit', sans-serif" }}>
            {/* Header + Create Action */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
                <div>
                    <h2 style={{ fontSize: '2.2em', margin: 0, color: '#064e3b' }}>{t('surveys.title')}</h2>
                    <p style={{ margin: '8px 0 0 0', color: '#047857', fontSize: '1.1em' }}>{t('surveys.subtitle')}</p>
                </div>

                <div style={{ position: 'relative' }}>
                    <button
                        onClick={() => setShowCreateOptions(!showCreateOptions)}
                        style={{ background: '#064e3b', color: 'white', padding: '12px 24px', fontSize: '1.1em', border: 'none', borderRadius: '8px', fontWeight: '600', boxShadow: '0 4px 6px rgba(185, 28, 28, 0.2)' }}
                    >
                        {t('surveys.new_btn')}
                    </button>
                    {showCreateOptions && (
                        <div style={{
                            position: 'absolute', top: 'calc(100% + 10px)', right: 0,
                            background: '#064e3b', border: '1px solid #047857', borderRadius: '12px',
                            boxShadow: '0 10px 25px rgba(0,0,0,0.2)', width: '240px', zIndex: 100,
                            overflow: 'hidden', display: 'flex', flexDirection: 'column'
                        }}>
                            <button onClick={() => onCreate('create-normal')} style={{ padding: '16px', background: 'transparent', border: 'none', borderBottom: '1px solid rgba(217, 248, 229, 0.1)', cursor: 'pointer', textAlign: 'left', color: '#D9F8E5', display: 'flex', alignItems: 'center', gap: '10px' }} onMouseEnter={e => e.currentTarget.style.background = '#047857'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                <FilePlus size={18} /> {t('surveys.menu.blank')}
                            </button>
                            <button onClick={() => onCreate('create-template')} style={{ padding: '16px', background: 'transparent', border: 'none', borderBottom: '1px solid rgba(217, 248, 229, 0.1)', cursor: 'pointer', textAlign: 'left', color: '#D9F8E5', display: 'flex', alignItems: 'center', gap: '10px' }} onMouseEnter={e => e.currentTarget.style.background = '#047857'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                <LayoutTemplate size={18} /> {t('surveys.menu.template')}
                            </button>
                            <button onClick={() => onCreate('create-ai')} style={{ padding: '16px', background: 'transparent', border: 'none', borderBottom: '1px solid rgba(217, 248, 229, 0.1)', cursor: 'pointer', textAlign: 'left', color: '#D9F8E5', display: 'flex', alignItems: 'center', gap: '10px' }} onMouseEnter={e => e.currentTarget.style.background = '#047857'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                <Sparkles size={18} /> {t('surveys.menu.ai')}
                            </button>

                            <button onClick={handleDownloadTemplate} style={{ padding: '16px', background: 'transparent', border: 'none', borderBottom: '1px solid rgba(217, 248, 229, 0.1)', cursor: 'pointer', textAlign: 'left', color: '#D9F8E5', display: 'flex', alignItems: 'center', gap: '10px' }} onMouseEnter={e => e.currentTarget.style.background = '#047857'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                <Download size={18} /> {t('surveys.menu.import_template')}
                            </button>

                            <button onClick={() => document.getElementById('fv-import-input').click()} style={{ padding: '16px', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left', color: '#D9F8E5', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '10px' }} onMouseEnter={e => e.currentTarget.style.background = '#047857'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                <Upload size={18} /> {t('surveys.menu.import_survey')}
                            </button>
                            {/* Hidden Input for Import */}
                            <input
                                type="file"
                                id="fv-import-input"
                                accept=".xlsx,.csv"
                                style={{ display: 'none' }}
                                onChange={handleFileUpload}
                                onClick={(e) => { e.target.value = null; }} // Allow re-selecting same file
                            />
                        </div>
                    )}
                </div>
            </div>

            {isLoading && <div style={{ textAlign: 'center', padding: '60px', color: '#64748b', fontSize: '1.2em' }}>Loading your surveys...</div>}

            {error && <div style={{ textAlign: 'center', padding: '20px', background: '#fee2e2', color: '#dc2626', borderRadius: '8px' }}>Error: {error}</div>}

            {!isLoading && !error && (
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                    gap: '24px'
                }}>
                    {formsToDisplay.map(form => (
                        <div
                            key={form.id}
                            style={{
                                background: 'white',
                                border: '1px solid #e2e8f0',
                                borderRadius: '16px',
                                padding: '24px',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                textAlign: 'center',
                                position: 'relative',
                                boxShadow: '0 2px 4px rgba(0,0,0,0.04)',
                                transition: 'transform 0.2s, box-shadow 0.2s',
                                cursor: 'default'
                            }}
                            onMouseEnter={e => {
                                e.currentTarget.style.transform = 'translateY(-4px)';
                                e.currentTarget.style.boxShadow = '0 12px 24px -4px rgba(0, 0, 0, 0.08)';
                            }}
                            onMouseLeave={e => {
                                e.currentTarget.style.transform = 'none';
                                e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.04)';
                            }}
                        >
                            {/* Actions: Delete (Outside) + Menu (Outside) */}
                            <div style={{ position: 'absolute', top: '12px', insetInlineEnd: '12px', display: 'flex', gap: '8px' }}>
                                {/* Dedicated Delete Button (Visible) */}
                                <button
                                    onClick={(e) => { e.stopPropagation(); handleDelete(form.id, form.title); }}
                                    title="Delete Survey"
                                    style={{ padding: '8px', background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '1.2em', color: '#ef4444', lineHeight: 0.5, borderRadius: '50%' }}
                                    onMouseEnter={e => e.target.style.background = '#fee2e2'}
                                    onMouseLeave={e => e.target.style.background = 'transparent'}
                                >
                                    🗑️
                                </button>

                                <button
                                    onClick={(e) => { e.stopPropagation(); setActionMenuOpenId(actionMenuOpenId === form.id ? null : form.id); }}
                                    style={{ padding: '8px', background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '1.5em', color: '#94a3b8', lineHeight: 0.5, borderRadius: '50%' }}
                                    onMouseEnter={e => e.target.style.background = '#f1f5f9'}
                                    onMouseLeave={e => e.target.style.background = 'transparent'}
                                >
                                    ⋮
                                </button>
                                {actionMenuOpenId === form.id && (
                                    <div style={{
                                        position: 'absolute', top: '100%', right: 0,
                                        background: '#064e3b', border: '1px solid #047857', borderRadius: '12px',
                                        boxShadow: '0 4px 20px rgba(0,0,0,0.15)', width: '220px', zIndex: 50,
                                        display: 'flex', flexDirection: 'column', overflow: 'hidden', textAlign: 'left'
                                    }}>
                                        <button onClick={() => onEditForm(form.id)} style={{ padding: '12px 16px', textAlign: isRtl ? 'right' : 'left', background: 'transparent', border: 'none', cursor: 'pointer', borderBottom: '1px solid rgba(217, 248, 229, 0.1)', color: '#D9F8E5', display: 'flex', alignItems: 'center', gap: '10px' }} onMouseEnter={e => e.currentTarget.style.background = '#047857'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                            <Pencil size={16} /> {t('surveys.action.edit_design')}
                                        </button>
                                        <button onClick={() => onEditForm(form.id, 'audience')} style={{ padding: '12px 16px', textAlign: isRtl ? 'right' : 'left', background: 'transparent', border: 'none', cursor: 'pointer', borderBottom: '1px solid rgba(217, 248, 229, 0.1)', color: '#D9F8E5', display: 'flex', alignItems: 'center', gap: '10px' }} onMouseEnter={e => e.currentTarget.style.background = '#047857'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                            <Megaphone size={16} /> {t('surveys.action.audience')}
                                        </button>
                                        <button onClick={() => setSettingsViewId(form.id)} style={{ padding: '12px 16px', textAlign: isRtl ? 'right' : 'left', background: 'transparent', border: 'none', cursor: 'pointer', borderBottom: '1px solid rgba(217, 248, 229, 0.1)', color: '#D9F8E5', display: 'flex', alignItems: 'center', gap: '10px' }} onMouseEnter={e => e.currentTarget.style.background = '#047857'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                            <Settings size={16} /> {t('surveys.action.settings')}
                                        </button>
                                        <button onClick={() => setWorkflowViewId(form.id)} style={{ padding: '12px 16px', textAlign: isRtl ? 'right' : 'left', background: 'transparent', border: 'none', cursor: 'pointer', borderBottom: '1px solid rgba(217, 248, 229, 0.1)', color: '#D9F8E5', display: 'flex', alignItems: 'center', gap: '10px' }} onMouseEnter={e => e.currentTarget.style.background = '#047857'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                            <Zap size={16} /> {t('surveys.action.automation')}
                                        </button>
                                        <button onClick={() => setCollectViewId(form.id)} style={{ padding: '12px 16px', textAlign: isRtl ? 'right' : 'left', background: 'transparent', border: 'none', cursor: 'pointer', borderBottom: '1px solid rgba(217, 248, 229, 0.1)', color: '#D9F8E5', display: 'flex', alignItems: 'center', gap: '10px' }} onMouseEnter={e => e.currentTarget.style.background = '#047857'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                            <Share2 size={16} /> {t('surveys.action.collect')}
                                        </button>
                                        <button onClick={() => setResultsViewId(form.id)} style={{ padding: '12px 16px', textAlign: isRtl ? 'right' : 'left', background: 'transparent', border: 'none', cursor: 'pointer', borderBottom: '1px solid rgba(217, 248, 229, 0.1)', color: '#D9F8E5', display: 'flex', alignItems: 'center', gap: '10px' }} onMouseEnter={e => e.currentTarget.style.background = '#047857'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                            <BarChart size={16} /> {t('surveys.action.results')}
                                        </button>

                                        {/* Version History Button */}
                                        {form.history && form.history.length > 0 && (
                                            <button onClick={() => handleViewHistory(form)} style={{ padding: '12px 16px', textAlign: isRtl ? 'right' : 'left', background: 'transparent', border: 'none', cursor: 'pointer', borderBottom: '1px solid rgba(217, 248, 229, 0.1)', color: '#D9F8E5', display: 'flex', alignItems: 'center', gap: '10px' }} onMouseEnter={e => e.currentTarget.style.background = '#047857'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                                <HistoryIcon size={16} /> {t('surveys.action.history')} ({form.history.length})
                                            </button>
                                        )}

                                        <button onClick={() => handleDuplicate(form)} style={{ padding: '12px 16px', textAlign: isRtl ? 'right' : 'left', background: 'transparent', border: 'none', cursor: 'pointer', borderBottom: '1px solid rgba(217, 248, 229, 0.1)', color: '#D9F8E5', display: 'flex', alignItems: 'center', gap: '10px' }} onMouseEnter={e => e.currentTarget.style.background = '#047857'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                            <Copy size={16} /> {t('surveys.action.duplicate')}
                                        </button>
                                        <button onClick={() => handleRename(form)} style={{ padding: '12px 16px', textAlign: isRtl ? 'right' : 'left', background: 'transparent', border: 'none', cursor: 'pointer', borderBottom: '1px solid rgba(217, 248, 229, 0.1)', color: '#D9F8E5', display: 'flex', alignItems: 'center', gap: '10px' }} onMouseEnter={e => e.currentTarget.style.background = '#047857'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                            <FileSignature size={16} /> {t('surveys.action.rename')}
                                        </button>
                                        <button onClick={() => handleAddNotes(form)} style={{ padding: '12px 16px', textAlign: isRtl ? 'right' : 'left', background: 'transparent', border: 'none', cursor: 'pointer', borderBottom: '1px solid rgba(217, 248, 229, 0.1)', color: '#D9F8E5', display: 'flex', alignItems: 'center', gap: '10px' }} onMouseEnter={e => e.currentTarget.style.background = '#047857'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                            <StickyNote size={16} /> {t('surveys.action.notes')}
                                        </button>

                                        {/* Change Cover Action */}
                                        <button onClick={() => document.getElementById(`cover-upload-${form.id}`).click()} style={{ padding: '12px 16px', textAlign: isRtl ? 'right' : 'left', background: 'transparent', border: 'none', cursor: 'pointer', color: '#D9F8E5', display: 'flex', alignItems: 'center', gap: '10px' }} onMouseEnter={e => e.currentTarget.style.background = '#047857'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                            <ImageIcon size={16} /> {t('surveys.action.change_cover')}
                                        </button>
                                        <input
                                            type="file"
                                            id={`cover-upload-${form.id}`}
                                            style={{ display: 'none' }}
                                            accept="image/*"
                                            onChange={(e) => handleCoverImageUpload(e, form.id)}
                                        />

                                    </div>
                                )}
                            </div>

                            {/* Card Content with Image */}
                            <div style={{ width: '100%', height: '120px', overflow: 'hidden', borderRadius: '12px 12px 0 0', marginBottom: '16px', marginTop: '-24px', marginLeft: '-24px', marginRight: '-24px', width: 'calc(100% + 48px)' }}>
                                <img
                                    src={getCoverImage(form)}
                                    alt="Cover"
                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                />
                            </div>

                            <div style={{ marginBottom: '16px', marginTop: '10px' }}>
                                {/* REMOVED OLD ICON */}
                                <h3 style={{ margin: '0 0 8px 0', color: '#1e293b', fontSize: '1.25em' }}>{form.title}</h3>
                                <div style={{ color: '#64748b', fontSize: '0.9em' }}>{t('surveys.card.version')}{form.version} • {form.slug || form.id.toString().substring(0, 8)}</div>
                                {form.definition?.description && <div style={{ marginTop: '12px', fontSize: '0.9em', color: '#475569', fontStyle: 'italic', background: '#f8fafc', padding: '8px', borderRadius: '6px' }}>"{form.definition.description}"</div>}
                            </div>

                            {/* Overlay to close menu */}
                            {actionMenuOpenId === form.id && (
                                <div
                                    style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 40 }}
                                    onClick={() => setActionMenuOpenId(null)}
                                ></div>
                            )}
                        </div>
                    ))}

                    {formsToDisplay.length === 0 && (
                        <div style={{ gridColumn: '1 / -1', padding: '80px', textAlign: 'center', color: '#94a3b8', background: '#f8fafc', borderRadius: '16px', border: '2px dashed #e2e8f0' }}>
                            <div style={{ fontSize: '3em', marginBottom: '15px' }}>📭</div>
                            <div style={{ fontSize: '1.4em', fontWeight: '600', color: '#475569' }}>{t('surveys.card.no_surveys')}</div>
                            <p style={{ marginTop: '10px' }}>{t('surveys.card.no_surveys_sub')}</p>
                        </div>
                    )}
                </div>
            )}

            {/* HISTORY MODAL */}
            {historyModalOpenId && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ background: '#D9F8E5', borderRadius: '16px', padding: '24px', width: '500px', maxHeight: '80vh', overflowY: 'auto', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <h3 style={{ margin: 0 }}>Version History</h3>
                            <button onClick={() => setHistoryModalOpenId(null)} style={{ background: 'none', border: 'none', fontSize: '1.5em', cursor: 'pointer', color: '#64748b' }}>×</button>
                        </div>
                        {historyList.length === 0 ? <p style={{ color: '#94a3b8' }}>No previous versions found.</p> : (
                            <ul style={{ listStyle: 'none', padding: 0 }}>
                                {historyList.map(h => (
                                    <li key={h.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', borderBottom: '1px solid #f1f5f9' }}>
                                        <div>
                                            <div style={{ fontWeight: '600', color: '#334155' }}>Version {h.version}</div>
                                            <div style={{ fontSize: '0.8em', color: '#64748b' }}>
                                                {h.created_at ? new Date(h.created_at).toLocaleDateString() + ' ' + new Date(h.created_at).toLocaleTimeString() : 'Unknown Date'}
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (onSelectForm) onSelectForm(h.id);
                                                    setHistoryModalOpenId(null);
                                                }}
                                                className="btn-history-view"
                                                style={{ padding: '6px 14px', borderRadius: '6px', border: '1px solid #3b82f6', background: 'white', cursor: 'pointer', fontSize: '0.9em', color: '#3b82f6', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '500' }}
                                                title="View/Take this version"
                                            >
                                                <span>👁️</span> View
                                            </button>
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setResultsViewId(h.id);
                                                    setHistoryModalOpenId(null);
                                                }}
                                                className="btn-history-results"
                                                style={{ padding: '6px 14px', borderRadius: '6px', border: '1px solid #f97316', background: 'white', cursor: 'pointer', fontSize: '0.9em', color: '#f97316', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '500' }}
                                                title="View Results"
                                            >
                                                <span>📊</span> Results
                                            </button>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
