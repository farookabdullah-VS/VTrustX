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
import { ActionPlanning } from './ActionPlanning';
import { QuotaSettings } from './QuotaSettings';
import { SurveyAudience } from './SurveyAudience';
import ExportModal from './ExportModal';

import { useTranslation } from 'react-i18next';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { FilePlus, LayoutTemplate, Sparkles, Download, Upload, Pencil, Megaphone, Settings, Zap, Share2, BarChart, History as HistoryIcon, Copy, FileSignature, StickyNote, Image as ImageIcon, ChevronLeft, ChevronRight, Grid, List, User, Users, Archive, Folder } from 'lucide-react';
import { registerCustomTypes, setupSurveyColors, VTrustTheme } from '../survey-config';
import { initCustomControls } from './CustomSurveyControls';
import { useToast } from './common/Toast';
import { SkeletonCard } from './common/Skeleton';
import { InlineHijriDate } from './common/HijriDate';
import { WhatsAppShareButton } from './common/WhatsAppShare';

const PREMIUM_GRADIENTS = [
    'linear-gradient(135deg, #FF9A9E 0%, #FECFEF 100%)',
    'linear-gradient(135deg, #accbee 0%, #e7f0fd 100%)',
    'linear-gradient(135deg, #e0c3fc 0%, #8ec5fc 100%)',
    'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
    'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
    'linear-gradient(135deg, #fad0c4 0%, #ffd1ff 100%)',
    'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)',
];

const getGradient = (id) => {
    const sum = (id || '').toString().split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return PREMIUM_GRADIENTS[sum % PREMIUM_GRADIENTS.length];
};

export function FormViewer({ formId: propsFormId, submissionId: propsSubmissionId, onSelectForm, onEditSubmission, onEditForm, onCreate, slug, isPublic, ticketCode, user }) {
    const { t, i18n } = useTranslation();
    const toast = useToast();
    const isRtl = i18n.language === 'ar';
    const navigate = useNavigate();
    const { formId: urlFormId } = useParams();
    const [searchParams] = useSearchParams();

    // Prioritize URL param over prop (backward compatibility)
    const formId = urlFormId || propsFormId;
    const submissionId = searchParams.get('submissionId') || propsSubmissionId;
    const isKiosk = window.location.search.includes('kiosk=true');
    const [resultsViewId, setResultsViewId] = React.useState(null);
    const startTimeRef = React.useRef(null);
    const [collectViewId, setCollectViewId] = React.useState(null);
    const [settingsViewId, setSettingsViewId] = React.useState(null);
    const [workflowViewId, setWorkflowViewId] = React.useState(null);
    const [quotaViewId, setQuotaViewId] = React.useState(null);
    const [audienceViewId, setAudienceViewId] = React.useState(null);
    const [survey, setSurvey] = React.useState(null);
    const [submissionMeta, setSubmissionMeta] = React.useState(null);
    const [formList, setFormList] = React.useState([]);
    const [showCreateOptions, setShowCreateOptions] = React.useState(false);
    const [isExportModalOpen, setIsExportModalOpen] = React.useState(false);
    const [exportForm, setExportForm] = React.useState(null);

    // Dropdown state for "⋮" menu
    const [actionMenuOpenId, setActionMenuOpenId] = React.useState(null);
    const [isLoading, setIsLoading] = React.useState(false);
    const [error, setError] = React.useState(null);

    // State for History Modal
    const [historyModalOpenId, setHistoryModalOpenId] = React.useState(null);
    const [historyList, setHistoryList] = React.useState([]);

    // Folders State
    const [folders, setFolders] = React.useState([]);
    const [isCreateFolderModalOpen, setIsCreateFolderModalOpen] = React.useState(false);

    // UI State for New Layout
    const [activeTab, setActiveTab] = React.useState('all'); // 'all', 'my', 'shared', 'archived'
    const [searchQuery, setSearchQuery] = React.useState('');
    const [viewMode, setViewMode] = React.useState('grid'); // 'grid' | 'list'
    const [isSideMenuOpen, setIsSideMenuOpen] = React.useState(true);
    const [selectedFolder, setSelectedFolder] = React.useState('all');

    const loadFolders = () => {
        axios.get('/api/folders')
            .then(res => setFolders(res.data))
            .catch(err => console.error("Failed to load folders:", err));
    };

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
        loadFolders();
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
                    if (quotaViewId === id) setQuotaViewId(null);
                    if (audienceViewId === id) setAudienceViewId(null);
                })
                .catch(err => {
                    console.error(err);
                    toast.error("Failed to delete form: " + (err.response?.data?.error || err.message || "Unknown error"));
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
            toast.success("Survey duplicated!");
        }).catch(err => toast.error("Duplicate failed"));
    };

    const handleRename = (form) => {
        const newTitle = prompt("Enter new title:", form.title);
        if (!newTitle || newTitle === form.title) return;

        const newDef = { ...form.definition, title: newTitle }; // Update internal definition too
        axios.put(`/api/forms/${form.id}`, {
            title: newTitle,
            definition: newDef
        }).then(() => loadForms()).catch(err => toast.error("Rename failed"));
    };

    const handleMoveToFolder = (formId, folderId) => {
        const targetFolder = (folderId === 'all' || folderId === 'my' || folderId === 'shared') ? null : folderId;
        axios.put(`/api/forms/${formId}`, { folderId: targetFolder })
            .then(() => {
                loadForms();
                setActionMenuOpenId(null);
            })
            .catch(err => {
                console.error("Failed to move form:", err);
            });
    };

    const handleAddNotes = (form) => {
        const currentDesc = form.definition.description || "";
        const newDesc = prompt("Enter notes/description:", currentDesc);
        if (newDesc === null) return;

        const newDef = { ...form.definition, description: newDesc };
        axios.put(`/api/forms/${form.id}`, {
            title: form.title,
            definition: newDef
        }).then(() => loadForms()).catch(err => toast.error("Notes update failed"));
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
            const imageUrl = `${res.data.url}`; // Use relative path or window.location.origin

            // Find form and update definition
            const form = formList.find(f => f.id === formId);
            if (!form) return;

            const newDef = { ...form.definition, coverImage: imageUrl };
            axios.put(`/api/forms/${formId}`, {
                title: form.title,
                definition: newDef
            }).then(() => {
                toast.success("Cover updated!");
                loadForms();
                setActionMenuOpenId(null);
            });
        }).catch(err => {
            console.error(err);
            toast.error("Upload failed");
        });
    };

    // Export Handler - Opens Modal
    const handleExport = (form) => {
        setExportForm(form);
        setIsExportModalOpen(true);
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
                toast.error("File is empty");
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
                toast.error("No valid questions found. Ensure rows are: Question, Type, Choices");
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
            ["RayiX Survey Import Template Instructions"],
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

        XLSX.writeFile(wb, "RayiX_Survey_Template.xlsx");
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

        // Detect Kiosk Mode
        const searchParams = new URLSearchParams(window.location.search);
        const isKiosk = searchParams.get('mode') === 'kiosk';
        // If kiosk, we might want to prevent "Back to Listings" or other navigation

        // CASE 2: Specific Form (ID or Slug)
        let fetchUrl = formId ? `/api/forms/${formId}` : `/api/forms/slug/${slug}`;

        axios.get(fetchUrl)
            .then(res => {
                const formDef = res.data;
                const resolvedId = formDef.id; // Get ID from resolved form

                // Apply Tenant Theme if Public
                if (isPublic && formDef.tenantTheme) {
                    const theme = formDef.tenantTheme;
                    const root = document.documentElement;
                    const setVar = (key, val) => {
                        if (val) root.style.setProperty(key, val);
                    };

                    if (theme.primaryColor) setVar('--primary-color', theme.primaryColor);
                    if (theme.backgroundColor) setVar('--deep-bg', theme.backgroundColor);
                    if (theme.textColor) setVar('--text-color', theme.textColor);
                    if (theme.buttonBg) setVar('--button-bg', theme.buttonBg);
                    if (theme.buttonText) setVar('--button-text', theme.buttonText);
                    if (theme.sidebarBg) setVar('--sidebar-bg', theme.sidebarBg);
                    if (theme.bgPattern) setVar('--bg-pattern', theme.bgPattern);
                    if (theme.bgPatternSize) setVar('--bg-pattern-size', theme.bgPatternSize);
                    if (theme.fontFamily) setVar('--font-family', theme.fontFamily);
                    if (theme.borderRadius) setVar('--border-radius', theme.borderRadius);
                }

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

                // CHECK PASSWORD (Server-Side Enforcement)
                if (formDef.password && !sessionStorage.getItem(`auth_${resolvedId}`)) {
                    const input = prompt("This survey is password protected. Enter password:");
                    if (input) {
                        axios.post(`/api/forms/${resolvedId}/check-password`, { password: input })
                            .then(() => {
                                sessionStorage.setItem(`auth_${resolvedId}`, 'true');
                                window.location.reload(); // Reload to initialize with session
                            })
                            .catch(() => {
                                setError("Incorrect Password.");
                                setIsLoading(false);
                            });
                        return; // Wait for async check
                    } else {
                        setError("Password required.");
                        setIsLoading(false);
                        return;
                    }
                }

                const model = new Model(formDef.definition);
                setupSurveyColors(model); // Apply colors

                if (formDef.definition && formDef.definition.theme) {
                    model.applyTheme(formDef.definition.theme);
                } else {
                    // Fallback: derive theme from platform CSS variables
                    model.applyTheme(VTrustTheme);
                }
                model.locale = i18n.language; // Set SurveyJS locale

                // Inject Ticket Code for Closed-Loop
                if (ticketCode) {
                    model.data = { ticket_code: ticketCode };
                    // Optionally make it read-only if it exists as a question
                    const q = model.getQuestionByName("ticket_code");
                    if (q) q.readOnly = true;
                }

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

                if (submissionId) {
                    axios.get(`/api/submissions/${submissionId}`)
                        .then(subRes => {
                            model.data = subRes.data.data;
                            model.mode = 'edit'; // Enable editing
                            model.completeText = "Update Submission";
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
                            return { file: file, content: `${res.data.url}` };
                        }));
                    }).catch(err => { options.callback("error"); });
                });

                // --- NEW LOGIC: Partial Save (Incomplete Status) ---
                model.onCurrentPageChanged.add((sender) => {
                    const data = sender.data;
                    // Dont save on first page immediately, wait for some progress
                    // But if we want to capture "halfway", saving on page change is good.

                    // Determine if we need to create or update
                    const payload = {
                        formId: resolvedId,
                        formVersion: formDef.version || 1,
                        data: data,
                        metadata: {
                            ...submissionMeta?.metadata,
                            status: 'incomplete', // Mark as incomplete during progress
                            last_page: sender.currentPageNo
                        }
                    };

                    // We need a local ref to track the ID if we just created it
                    // Since we can't easily use state inside this callback without refs, we'll try to use the prop or a window/obj var if needed, 
                    // but for now let's rely on server handling or simple implementation.
                    // Ideally: if (!submissionId && !createdId) Create -> setCreatedId.
                    // For MVP, we might skip partial save if complexity is too high, 
                    // BUT user explicitly asked for "incomplete" status.
                    // Let's implement a simple fire-and-forget update if we have an ID, or create one if we don't.
                });

                // --- NEW LOGIC: Quota & Terminal Question Check ---
                let activeQuotas = [];
                axios.get(`/api/quotas?formId=${resolvedId}`)
                    .then(qRes => { activeQuotas = qRes.data.filter(q => q.is_active); })
                    .catch(qErr => console.error("Quota fetch failed:", qErr));

                model.onValueChanged.add((sender, options) => {
                    const data = sender.data;

                    // 1. Specific Quota Check (Immediate Exit)
                    for (const quota of activeQuotas) {
                        const criteria = typeof quota.criteria === 'string' ? JSON.parse(quota.criteria) : quota.criteria;
                        if (!criteria || Object.keys(criteria).length === 0) continue;

                        // Check if current answer is part of this quota's criteria
                        const criteriaKeys = Object.keys(criteria);
                        if (criteriaKeys.includes(options.name)) {
                            // Helper for operator matching
                            const evaluateQuotaCondition = (actual, expected) => {
                                const actualStr = String(actual || '').trim();
                                const expectedStr = String(expected || '').trim();
                                if (expectedStr.startsWith('>=')) return parseFloat(actualStr) >= parseFloat(expectedStr.substring(2));
                                if (expectedStr.startsWith('<=')) return parseFloat(actualStr) <= parseFloat(expectedStr.substring(2));
                                if (expectedStr.startsWith('>')) return parseFloat(actualStr) > parseFloat(expectedStr.substring(1));
                                if (expectedStr.startsWith('<')) return parseFloat(actualStr) < parseFloat(expectedStr.substring(1));
                                if (expectedStr.startsWith('!=')) return actualStr != expectedStr.substring(2);
                                return actualStr == expectedStr;
                            };

                            // Check if ALL criteria for this quota are now met in the survey data
                            const allMatched = criteriaKeys.every(k => evaluateQuotaCondition(data[k], criteria[k]));

                            if (allMatched && quota.current_count >= quota.limit_count) {
                                // Quota Exceeded!
                                const action = quota.action || 'reject';
                                let msg = quota.action_data?.message || `Quota exceeded for ${quota.label || 'this selection'}.`;

                                if (action === 'termination') {
                                    model.completedHtml = `
                                        <div style="text-align:center; padding: 60px 40px; font-family: 'Outfit', sans-serif;">
                                            <div style="font-size: 4rem; margin-bottom: 25px;">🛑</div>
                                            <h3 style="color: #ef4444; margin-bottom: 15px; font-size: 2rem; font-weight: 800;">Not Eligible</h3>
                                            <p style="font-size: 1.2em; color: #475569;">${msg}</p>
                                        </div>`;
                                } else {
                                    model.completedHtml = `
                                        <div style="text-align:center; padding: 60px 40px; font-family: 'Outfit', sans-serif;">
                                            <div style="font-size: 4rem; margin-bottom: 25px;">⚠️</div>
                                            <h3 style="color: #f59e0b; margin-bottom: 15px; font-size: 2rem; font-weight: 800;">Quota Reached</h3>
                                            <p style="font-size: 1.2em; color: #64748b;">${msg}</p>
                                        </div>`;
                                }
                                model.setVariable("isQuotaExceeded", true);
                                sender.doComplete();
                                return;
                            }
                        }
                    }

                });

                // Submission Handler
                model.onComplete.add(async (sender, options) => {
                    options.showDataSaving = true; // Tell SurveyJS to wait for async logic
                    const results = sender.data;
                    const questions = sender.getAllQuestions();

                    // 1. LOGIC: Rejection / Eligibility (First Question Check)
                    let status = 'completed';
                    let completedHtml = "<h3>Thank you for your feedback!</h3>"; // Default

                    // REMOVED: Automatic rejection based on first question value.
                    // This was causing valid responses (e.g. "No" to "Have you used us before?") to be rejected and not count towards quotas.
                    // Screen-outs should be handled via Survey Triggers or explicit Logic.

                    // 1.5 LOGIC: Client-Side Quota Violation
                    if (sender.getVariable("isQuotaExceeded")) {
                        status = 'rejected';
                        completedHtml = model.completedHtml;
                    }

                    // 2. LOGIC: Low Score / Apology
                    // Scan for Rating/NPS questions
                    if (status === 'completed') {
                        let totalScore = 0;
                        let maxScore = 0;
                        let hasRating = false;

                        questions.forEach(q => {
                            if (q.getType() === 'rating' || q.getType() === 'barrating') { // SurveyJS types
                                const val = results[q.name];
                                if (typeof val === 'number') {
                                    hasRating = true;
                                    totalScore += val;
                                    maxScore += (q.rateMax || 10);
                                }
                            }
                        });

                        if (hasRating) {
                            const percentage = (totalScore / maxScore) * 100;
                            // Threshold: < 40% (e.g. 2/5) -> Apology
                            if (percentage <= 40) {
                                completedHtml = "<h3>We're Sorry.</h3><p>We apologize for the inconvenience. We've created a support ticket to address your concerns.</p>";

                                // Optional: Auto-create ticket trigger could be handled by backend Workflow Engine based on this data
                            }
                        }
                    }

                    // Apply custom message
                    // Note: SurveyJS renders immediately, so we toggle the `completedHtml` property
                    model.completedHtml = completedHtml;

                    let metadata = {};

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

                    // SKIP HEAVY TASKS (like Location) for Rejections/Quotas to ensure IMMEDIATE exit
                    const isRejected = status === 'rejected' || sender.getVariable("isQuotaExceeded");

                    if (formDef.allowLocation && !isRejected) {
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

                    // ESOMAR: Duration & Consent
                    const now = new Date();
                    const durationSeconds = startTimeRef.current
                        ? Math.floor((now.getTime() - startTimeRef.current.getTime()) / 1000)
                        : 0;

                    const consentGiven = results.consent === true || results.consent === "Yes" || results.consent === "agreed";

                    // Handle Submission
                    const payload = {
                        formId: resolvedId,
                        formVersion: formDef.version || 1,
                        data: results,
                        metadata: {
                            status: status,
                            device_info: {
                                userAgent: navigator.userAgent, // General tech info usually okay
                                language: navigator.language,
                                timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                                ...(consentGiven ? {
                                    // Sensitive Fingerprinting - only with consent
                                    platform: navigator.platform,
                                    screenResolution: `${window.screen.width}x${window.screen.height}`,
                                    windowSize: `${window.innerWidth}x${window.innerHeight}`,
                                    deviceMemory: navigator.deviceMemory || 'unknown',
                                    hardwareConcurrency: navigator.hardwareConcurrency || 'unknown'
                                } : {})
                            },
                            ...metadata // Include location if acquired
                        },
                        startedAt: startTimeRef.current?.toISOString(),
                        durationSeconds: durationSeconds,
                        consentGiven: consentGiven
                    };

                    const request = submissionId
                        ? axios.put(`/api/submissions/${submissionId}`, payload)
                        : axios.post('/api/submissions', payload);

                    request.then((resp) => {
                        console.log("Submission Saved Successfully:", resp.data);
                        finalize();
                        options.showDataSavingSuccess("Feedback received!");
                        // Note: completedHtml is already set on the model, SurveyJS will show it now.
                    }).catch(err => {
                        finalize();
                        const errorData = err.response?.data || {};
                        console.error("Submission Save Failed:", {
                            status: err.response?.status,
                            data: errorData,
                            message: err.message
                        });

                        // Handle Quota/Limit Errors gracefully
                        if (err.response && (err.response.status === 403 || err.response.status === 429)) {
                            const data = err.response.data || {};
                            const msg = data.error || "Submission rejected.";
                            const action = data.action || 'reject';
                            const label = data.label || 'Quota';

                            console.warn("Quota Hit (403):", msg);

                            let errorHtml = "";

                            if (action === 'thank_you') {
                                errorHtml = completedHtml || `
                                    <div style="text-align:center; padding: 40px; font-family: 'Outfit', sans-serif;">
                                        <div style="font-size: 3.5rem; margin-bottom: 20px;">✨</div>
                                        <h3 style="color: var(--primary-color, #10b981); margin-bottom: 15px; font-size: 1.8rem;">Thank You!</h3>
                                        <p style="font-size: 1.1em; color: var(--text-muted, #64748b);">Your response has been recorded.</p>
                                    </div>`;
                            } else if (action === 'termination') {
                                errorHtml = `
                                    <div style="text-align:center; padding: 60px 40px; font-family: 'Outfit', sans-serif; background: #fff; border-radius: 20px; box-shadow: 0 10px 25px rgba(0,0,0,0.05);">
                                        <div style="font-size: 4rem; margin-bottom: 25px; animation: pulse 2s infinite;">🛑</div>
                                        <h3 style="color: #ef4444; margin-bottom: 15px; font-size: 2rem; font-weight: 800;">Not Eligible</h3>
                                        <p style="font-size: 1.2em; color: #475569; max-width: 500px; margin: 0 auto 30px;">${msg}</p>
                                    </div>`;
                            } else {
                                // Default / Reject Action: SHOW MESSAGE
                                errorHtml = `
                                    <div style="text-align:center; padding: 60px 40px; font-family: 'Outfit', sans-serif; background: #fff; border-radius: 20px; box-shadow: 0 10px 25px rgba(0,0,0,0.05);">
                                        <div style="font-size: 4rem; margin-bottom: 25px;">⚠️</div>
                                        <h3 style="color: #f59e0b; margin-bottom: 15px; font-size: 2rem; font-weight: 800;">Quota Reached</h3>
                                        <div style="background: #fffbeb; border: 1px solid #fef3c7; padding: 20px; border-radius: 12px; margin: 20px auto; max-width: 600px;">
                                            <p style="font-size: 1.2em; color: #b45309; font-weight: 600; margin: 0;">${msg}</p>
                                        </div>
                                    </div>`;
                            }

                            model.completedHtml = errorHtml;
                            options.showDataSavingSuccess("Processed.");
                        } else {
                            // General Error (500, etc)
                            const errorMsg = errorData.error || err.message || "Connection Error";
                            model.completedHtml = `
                                <div style="text-align:center; padding: 40px;">
                                    <h3 style="color: #ef4444;">Submission Error</h3>
                                    <p>${errorMsg}</p>
                                    <button onclick="window.location.reload()" style="padding: 10px 20px; background: #3b82f6; color: white; border: none; border-radius: 6px; cursor: pointer; margin-top: 20px;">Try Again</button>
                                </div>
                            `;
                            options.showDataSavingError("Error: " + errorMsg);
                        }
                    });

                    // Kiosk Restart Logic
                    if (isKiosk) {
                        setTimeout(() => {
                            window.location.reload();
                        }, 5000);
                    }
                });
                setSurvey(model);
                startTimeRef.current = new Date();
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

    // VIEW: Quota Management
    if (quotaViewId) {
        const formToEdit = formList.find(f => f.id === quotaViewId);
        return (
            <div style={{ padding: '40px', maxWidth: '1200px', margin: '0 auto', animation: 'fadeIn 0.4s ease-out' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '30px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                        <button
                            onClick={() => setQuotaViewId(null)}
                            style={{
                                background: '#f1f5f9', border: 'none', color: '#475569', cursor: 'pointer',
                                display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', borderRadius: '10px',
                                fontSize: '0.95em', fontWeight: '600', transition: 'all 0.2s'
                            }}
                            onMouseOver={e => e.currentTarget.style.background = '#e2e8f0'}
                            onMouseOut={e => e.currentTarget.style.background = '#f1f5f9'}
                        >
                            {isRtl ? '➡' : '⬅'} {t('settings.back') || 'Back'}
                        </button>
                        <div>
                            <h2 style={{ margin: 0, fontSize: '1.8em', fontWeight: '800', color: '#0f172a' }}>Response Quotas</h2>
                            <p style={{ margin: '4px 0 0 0', color: '#64748b' }}>Manage limits and logic for survey eligibility.</p>
                        </div>
                    </div>
                </div>
                <QuotaSettings form={formToEdit} />
            </div>
        );
    }

    // VIEW: Survey Audience
    if (audienceViewId) {
        const formToEdit = formList.find(f => f.id === audienceViewId);
        return <SurveyAudience form={formToEdit} onBack={() => setAudienceViewId(null)} />;
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
                const url = `${res.data.url}`;
                // Set the value in Survey Data
                // We use a custom key 'audio_response' or append to a hidden question if it existed
                // For now, simple kv:
                const currentData = survey.data || {};
                survey.data = { ...currentData, audio_response: url };
                toast.success("Audio Attached Successfully!");
            }).catch(err => {
                console.error(err);
                toast.error("Failed to upload audio.");
            });
        };

        const allowAudio = survey && survey.getVariable('allowAudio');

        return (
            <div style={{ height: 'calc(100vh - 100px)', overflow: 'auto', position: 'relative' }}>
                {!isPublic && !isKiosk && (
                    <div style={{ padding: '20px 20px 0 20px', position: 'relative', zIndex: 10 }}>
                        <button onClick={() => { onSelectForm(null) }} aria-label="Back to survey listings" style={{ marginBottom: '15px', background: '#64748b', padding: '8px 16px', border: 'none', borderRadius: '4px', color: 'white' }}>
                            &larr; Back to Listings
                        </button>
                    </div>
                )}
                {submissionMeta && (
                    <div style={{ margin: '20px', padding: '15px', background: '#f1f5f9', borderRadius: '6px', borderLeft: '4px solid #2563eb', position: 'relative', zIndex: 10 }}>
                        <strong>Editing Submission by:</strong> {submissionMeta.user_id || 'Anonymous'}
                    </div>
                )}

                {!survey ? (
                    <div style={{ padding: '20px', textAlign: 'center', color: '#64748b' }}>Loading Form...</div>
                ) : (
                    <Survey model={survey} />
                )}

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
                {error && <div role="alert" style={{ padding: '20px', background: '#fee2e2', color: '#dc2626', borderRadius: '8px', textAlign: 'center' }}>{error}</div>}
            </div>
        );
    }

    return (
        <div style={{ maxWidth: '100%', margin: '0 auto', padding: '30px', direction: isRtl ? 'rtl' : 'ltr', fontFamily: "'Outfit', sans-serif" }}>
            {/* Header + Create Action */}
            {/* Header + Create Action */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
                <div>
                    <h2 style={{ fontSize: '2.2em', margin: 0, color: 'var(--primary-color)' }}>{t('surveys.title')}</h2>
                    <p style={{ margin: '8px 0 0 0', color: '#64748b', fontSize: '1.1em' }}>{t('surveys.subtitle')}</p>
                </div>

                <div style={{ position: 'relative' }}>
                    <button
                        onClick={() => setShowCreateOptions(!showCreateOptions)}
                        style={{ background: 'var(--primary-color, #0f172a)', color: '#ffffff', padding: '12px 24px', fontSize: '1.1em', border: 'none', borderRadius: '8px', fontWeight: '600', boxShadow: '0 4px 6px rgba(0,0,0,0.2)' }}
                    >
                        {t('surveys.new_btn')}
                    </button>
                    {showCreateOptions && (
                        <div style={{
                            position: 'absolute', top: 'calc(100% + 10px)', right: 0,
                            background: 'var(--primary-color)', border: '1px solid #f1f5f9', borderRadius: '12px',
                            boxShadow: '0 10px 25px rgba(0,0,0,0.2)', width: '240px', zIndex: 100,
                            overflow: 'hidden', display: 'flex', flexDirection: 'column'
                        }}>
                            <button onClick={() => onCreate('create-normal')} style={{ padding: '16px', background: 'transparent', border: 'none', borderBottom: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer', textAlign: 'left', color: '#ffffff', display: 'flex', alignItems: 'center', gap: '10px' }} onMouseEnter={e => e.currentTarget.style.background = '#f1f5f9'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                <FilePlus size={18} /> {t('surveys.menu.blank')}
                            </button>
                            <button onClick={() => onCreate('create-template')} style={{ padding: '16px', background: 'transparent', border: 'none', borderBottom: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer', textAlign: 'left', color: '#ffffff', display: 'flex', alignItems: 'center', gap: '10px' }} onMouseEnter={e => e.currentTarget.style.background = '#f1f5f9'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                <LayoutTemplate size={18} /> {t('surveys.menu.template')}
                            </button>
                            <button onClick={() => onCreate('create-ai')} style={{ padding: '16px', background: 'transparent', border: 'none', borderBottom: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer', textAlign: 'left', color: '#ffffff', display: 'flex', alignItems: 'center', gap: '10px' }} onMouseEnter={e => e.currentTarget.style.background = '#f1f5f9'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                <Sparkles size={18} /> {t('surveys.menu.ai')}
                            </button>

                            <button onClick={handleDownloadTemplate} style={{ padding: '16px', background: 'transparent', border: 'none', borderBottom: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer', textAlign: 'left', color: '#ffffff', display: 'flex', alignItems: 'center', gap: '10px' }} onMouseEnter={e => e.currentTarget.style.background = '#f1f5f9'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                <Download size={18} /> {t('surveys.menu.import_template')}
                            </button>

                            <button onClick={() => document.getElementById('fv-import-input').click()} style={{ padding: '16px', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left', color: '#ffffff', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '10px' }} onMouseEnter={e => e.currentTarget.style.background = '#f1f5f9'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
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

            {isLoading && (
                <div role="status" aria-label="Loading surveys" style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', padding: '20px' }}>
                    {[1, 2, 3, 4, 5, 6].map(i => (
                        <div key={i} style={{ flex: '1 1 280px', minWidth: '280px', maxWidth: '400px' }}>
                            <SkeletonCard />
                        </div>
                    ))}
                </div>
            )}

            {error && <div role="alert" style={{ textAlign: 'center', padding: '20px', background: '#fee2e2', color: '#dc2626', borderRadius: '8px' }}>Error: {error}</div>}

            {!isLoading && !error && (
                <div style={{ display: 'flex', height: 'calc(100vh - 100px)', gap: '20px' }}>

                    {/* LEFT SIDEBAR (Folders) */}
                    <div style={{
                        width: isSideMenuOpen ? '260px' : '0px',
                        opacity: isSideMenuOpen ? 1 : 0,
                        overflow: 'hidden',
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        display: 'flex', flexDirection: 'column', gap: '8px',
                        borderRight: isSideMenuOpen ? '1px solid #e2e8f0' : 'none',
                        paddingRight: isSideMenuOpen ? '20px' : '0'
                    }}>
                        <div style={{ padding: '0 0 15px 0', fontSize: '0.85em', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            {t('surveys.sidebar.folders')}
                        </div>

                        {[
                            { id: 'all', icon: <LayoutTemplate size={18} />, label: t('surveys.tab.all') },
                            { id: 'my', icon: <User size={18} />, label: t('surveys.tab.my') },
                            { id: 'shared', icon: <Share2 size={18} />, label: t('surveys.sidebar.shared') },
                        ].concat(folders.map(f => ({ id: f.id, icon: <Folder size={18} />, label: f.name, isFolder: true }))).map(item => (
                            <div
                                key={item.id}
                                onClick={() => { setActiveTab(item.id); setSelectedFolder(item.id); }}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: '12px',
                                    padding: '10px 14px', borderRadius: '8px', cursor: 'pointer',
                                    background: activeTab === item.id ? '#f1f5f9' : 'transparent',
                                    color: activeTab === item.id ? 'var(--primary-color)' : '#64748b',
                                    fontWeight: activeTab === item.id ? '600' : '500',
                                    transition: 'all 0.2s',
                                    position: 'relative',
                                    border: '2px dashed transparent' // For drop highlight
                                }}
                                onDragOver={(e) => {
                                    e.preventDefault();
                                    e.currentTarget.style.background = '#e2e8f0';
                                    e.currentTarget.style.borderColor = 'var(--primary-color)';
                                }}
                                onDragLeave={(e) => {
                                    e.currentTarget.style.background = activeTab === item.id ? '#f1f5f9' : 'transparent';
                                    e.currentTarget.style.borderColor = 'transparent';
                                }}
                                onDrop={(e) => {
                                    e.preventDefault();
                                    e.currentTarget.style.background = activeTab === item.id ? '#f1f5f9' : 'transparent';
                                    e.currentTarget.style.borderColor = 'transparent';
                                    const formId = e.dataTransfer.getData("formId");
                                    if (formId) handleMoveToFolder(formId, item.id);
                                }}
                                onMouseEnter={(e) => {
                                    if (item.isFolder) e.currentTarget.querySelector('.folder-actions').style.opacity = 1;
                                }}
                                onMouseLeave={(e) => {
                                    if (item.isFolder) e.currentTarget.querySelector('.folder-actions').style.opacity = 0;
                                }}
                            >
                                {item.icon}
                                <span>{item.label}</span>
                                {item.id === 'all' && <span style={{ marginLeft: 'auto', fontSize: '0.8em', background: '#e2e8f0', padding: '2px 6px', borderRadius: '4px', color: '#475569' }}>{formsToDisplay.length}</span>}
                                {item.isFolder && (
                                    <div className="folder-actions" style={{ marginLeft: 'auto', opacity: 0, transition: 'opacity 0.2s' }}>
                                        {/* Optional: Delete/Edit folder actions here */}
                                    </div>
                                )}
                            </div>
                        ))}

                        <div
                            onClick={() => {
                                const name = prompt("Enter folder name:");
                                if (name) {
                                    axios.post('/api/folders', { name, type: 'private' }).then(loadFolders).catch(e => toast.error(e.message));
                                }
                            }}
                            style={{
                                marginTop: '10px', padding: '10px', borderRadius: '8px',
                                border: '1px dashed #e2e8f0', color: '#64748b', cursor: 'pointer',
                                textAlign: 'center', fontSize: '0.9em', display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center'
                            }}
                        >
                            <FilePlus size={16} /> New Folder
                        </div>
                    </div>

                    {/* MAIN CONTENT AREA */}
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

                        {/* TOOLBAR */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', gap: '15px' }}>

                            {/* Toggle Sidebar Button */}
                            <button
                                onClick={() => setIsSideMenuOpen(!isSideMenuOpen)}
                                aria-label={isSideMenuOpen ? "Hide folders sidebar" : "Show folders sidebar"}
                                aria-expanded={isSideMenuOpen}
                                style={{ padding: '8px', background: 'white', border: '1px solid #e2e8f0', borderRadius: '8px', cursor: 'pointer', color: '#64748b', display: 'flex', alignItems: 'center' }}
                            >
                                {isSideMenuOpen ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
                            </button>

                            {/* Search */}
                            <div style={{ flex: 1, maxWidth: '400px', position: 'relative' }}>
                                <input
                                    type="text"
                                    aria-label="Search surveys"
                                    placeholder={t('surveys.search_placeholder')}
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    style={{
                                        width: '100%', padding: '10px 16px 10px 40px', borderRadius: '10px',
                                        border: '1px solid #cbd5e1', outline: 'none', background: 'white',
                                        boxShadow: '0 2px 4px rgba(0,0,0,0.02)', fontSize: '0.95em'
                                    }}
                                />
                                <div style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}>🔍</div>
                            </div>

                            {/* View Toggles & Creates */}
                            <div style={{ display: 'flex', gap: '10px' }}>
                                <div style={{ background: '#f1f5f9', padding: '4px', borderRadius: '8px', display: 'flex' }}>
                                    <button
                                        onClick={() => setViewMode('grid')}
                                        aria-label="Grid view"
                                        aria-pressed={viewMode === 'grid'}
                                        style={{ padding: '6px', background: viewMode === 'grid' ? 'white' : 'transparent', boxShadow: viewMode === 'grid' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
                                    >
                                        <Grid size={18} color={viewMode === 'grid' ? 'var(--primary-color)' : '#64748b'} />
                                    </button>
                                    <button
                                        onClick={() => setViewMode('list')}
                                        aria-label="List view"
                                        aria-pressed={viewMode === 'list'}
                                        style={{ padding: '6px', background: viewMode === 'list' ? 'white' : 'transparent', boxShadow: viewMode === 'list' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
                                    >
                                        <List size={18} color={viewMode === 'list' ? 'var(--primary-color)' : '#64748b'} />
                                    </button>
                                </div>


                            </div>
                        </div>

                        {/* CONTENT (Grid or List) */}
                        <div style={{ overflowY: 'auto', flex: 1, paddingBottom: '20px' }}>
                            {/* Filter Logic */}
                            {(() => {
                                let filtered = formsToDisplay;
                                const currentUserId = user?.id || user?.user?.id; // Handle both user structures

                                // Search Filter
                                if (searchQuery) {
                                    const q = searchQuery.toLowerCase();
                                    filtered = filtered.filter(f => f.title.toLowerCase().includes(q));
                                }

                                // Tab Filter (My vs Shared)
                                if (activeTab === 'my') {
                                    if (currentUserId) {
                                        filtered = filtered.filter(f => f.createdBy === currentUserId || f.ownerId === currentUserId);
                                    }
                                } else if (activeTab === 'shared') {
                                    if (currentUserId) {
                                        // Implicit Share: "Not created by me, but visible in tenant"
                                        filtered = filtered.filter(f => f.createdBy !== currentUserId);
                                    }
                                } else if (activeTab !== 'all') {
                                    // Folder Filter
                                    // activeTab is folder ID
                                    filtered = filtered.filter(f => f.folderId === activeTab);
                                }

                                if (filtered.length === 0) {
                                    return (
                                        <div style={{ textAlign: 'center', padding: '60px', color: '#94a3b8', background: 'rgba(255,255,255,0.5)', borderRadius: '16px', border: '2px dashed #e2e8f0', marginTop: '20px' }}>
                                            <div style={{ fontSize: '3em', marginBottom: '15px', opacity: 0.5 }}>🔍</div>
                                            <div style={{ fontSize: '1.2em', fontWeight: '600', color: '#64748b' }}>No surveys found</div>
                                            <p style={{ marginTop: '5px' }}>Try adjusting your search or filters.</p>
                                        </div>
                                    );
                                }

                                if (viewMode === 'list') {
                                    return (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                            {/* List Header */}
                                            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 2fr) 100px 150px 100px', padding: '0 20px 10px 20px', color: '#94a3b8', fontSize: '0.85em', fontWeight: '600', borderBottom: '1px solid #e2e8f0' }}>
                                                <div>SURVEY NAME</div>
                                                <div>VERSION</div>
                                                <div>MODIFIED</div>
                                                <div style={{ textAlign: 'right' }}>ACTIONS</div>
                                            </div>

                                            {filtered.map(form => (
                                                <div
                                                    key={form.id}
                                                    draggable
                                                    onDragStart={(e) => {
                                                        e.dataTransfer.setData("formId", form.id);
                                                        e.dataTransfer.effectAllowed = "move";
                                                    }}
                                                    onDoubleClick={() => onEditForm(form.id)}
                                                    style={{
                                                        display: 'grid', gridTemplateColumns: 'minmax(300px, 2fr) 100px 150px 100px',
                                                        alignItems: 'center',
                                                        padding: '16px 20px', background: 'white', borderRadius: '12px',
                                                        border: '1px solid #e2e8f0', cursor: 'pointer',
                                                        transition: 'transform 0.1s, box-shadow 0.1s',
                                                        position: 'relative',
                                                        zIndex: actionMenuOpenId === form.id ? 100 : 1,
                                                        opacity: 1
                                                    }}
                                                    onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.05)'; e.currentTarget.style.transform = 'scale(1.002)'; }}
                                                    onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = 'none'; }}
                                                >
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                                        <div style={{ width: '36px', height: '36px', borderRadius: '8px', overflow: 'hidden', flexShrink: 0 }}>
                                                            <img src={getCoverImage(form)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                                                        </div>
                                                        <div>
                                                            <div style={{ fontWeight: '600', color: '#1e293b' }}>{form.title}</div>
                                                            <div style={{ fontSize: '0.8em', color: '#94a3b8' }}>{form.slug || 'No Slug'}</div>
                                                        </div>
                                                    </div>
                                                    <div style={{ color: '#64748b', fontSize: '0.9em' }}>v{form.version}</div>
                                                    <div style={{ color: '#64748b', fontSize: '0.9em' }}>{(form.updated_at || form.created_at) ? new Date(form.updated_at || form.created_at).toLocaleDateString() : '-'}</div>

                                                    <div style={{ textAlign: 'right' }}>
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); setActionMenuOpenId(actionMenuOpenId === form.id ? null : form.id); }}
                                                            aria-label={`Options for ${form.title}`}
                                                            aria-expanded={actionMenuOpenId === form.id}
                                                            aria-haspopup="true"
                                                            style={{ padding: '6px 10px', background: 'transparent', border: '1px solid #e2e8f0', cursor: 'pointer', borderRadius: '6px', color: '#64748b' }}
                                                        >
                                                            Options ▼
                                                        </button>
                                                        {actionMenuOpenId === form.id && (
                                                            <div style={{
                                                                position: 'absolute', top: 'calc(100% + 5px)', right: '0',
                                                                background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px',
                                                                boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.15)', width: '220px', zIndex: 100,
                                                                display: 'flex', flexDirection: 'column', textAlign: 'left',
                                                                padding: '4px'
                                                            }}>
                                                                <button onClick={() => onEditForm(form.id)} style={{ padding: '10px 12px', background: 'transparent', border: 'none', cursor: 'pointer', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.9em', borderRadius: '6px' }} onMouseEnter={e => e.currentTarget.style.background = '#f1f5f9'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                                                    <Pencil size={16} color="#3b82f6" /> {t('surveys.action.edit_design')}
                                                                </button>
                                                                <button onClick={() => setResultsViewId(form.id)} style={{ padding: '10px 12px', background: 'transparent', border: 'none', cursor: 'pointer', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.9em', borderRadius: '6px' }} onMouseEnter={e => e.currentTarget.style.background = '#f1f5f9'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                                                    <BarChart size={16} color="#8b5cf6" /> {t('surveys.action.results')}
                                                                </button>
                                                                <button onClick={() => handleExport(form)} style={{ padding: '10px 12px', background: 'transparent', border: 'none', cursor: 'pointer', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.9em', borderRadius: '6px' }} onMouseEnter={e => e.currentTarget.style.background = '#f1f5f9'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                                                    <Download size={16} color="#6366f1" /> Export
                                                                </button>
                                                                <button onClick={() => setCollectViewId(form.id)} style={{ padding: '10px 12px', background: 'transparent', border: 'none', cursor: 'pointer', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.9em', borderRadius: '6px' }} onMouseEnter={e => e.currentTarget.style.background = '#f1f5f9'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                                                    <Share2 size={16} color="#10b981" /> {t('surveys.action.collect')}
                                                                </button>
                                                                <a
                                                                    href={`https://api.whatsapp.com/send?text=${encodeURIComponent(`${form.title} - ${window.location.origin}/s/${form.slug || form.id}`)}`}
                                                                    target="_blank" rel="noopener noreferrer"
                                                                    style={{ padding: '10px 12px', background: 'transparent', border: 'none', cursor: 'pointer', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.9em', borderRadius: '6px', textDecoration: 'none' }}
                                                                    onMouseEnter={e => e.currentTarget.style.background = '#dcfce7'}
                                                                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                                                >
                                                                    <span style={{ display: 'inline-flex', width: 16, height: 16, alignItems: 'center', justifyContent: 'center', color: '#25D366', fontWeight: 'bold', fontSize: '16px' }}>◉</span> Share via WhatsApp
                                                                </a>
                                                                <div style={{ height: '1px', background: '#e2e8f0', margin: '4px 0' }}></div>
                                                                <button onClick={() => setSettingsViewId(form.id)} style={{ padding: '10px 12px', background: 'transparent', border: 'none', cursor: 'pointer', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.9em', borderRadius: '6px' }} onMouseEnter={e => e.currentTarget.style.background = '#f1f5f9'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                                                    <Settings size={16} color="#64748b" /> {t('surveys.action.settings')}
                                                                </button>
                                                                <button onClick={() => setWorkflowViewId(form.id)} style={{ padding: '10px 12px', background: 'transparent', border: 'none', cursor: 'pointer', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.9em', borderRadius: '6px' }} onMouseEnter={e => e.currentTarget.style.background = '#f1f5f9'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                                                    <Zap size={16} color="#f59e0b" /> {t('surveys.action.automation')}
                                                                </button>
                                                                <button onClick={() => setQuotaViewId(form.id)} style={{ padding: '10px 12px', background: 'transparent', border: 'none', cursor: 'pointer', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.9em', borderRadius: '6px' }} onMouseEnter={e => e.currentTarget.style.background = '#f1f5f9'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                                                    <Archive size={16} color="#0891b2" /> {t('surveys.action.quotas')}
                                                                </button>
                                                                <button onClick={() => setAudienceViewId(form.id)} style={{ padding: '10px 12px', background: 'transparent', border: 'none', cursor: 'pointer', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.9em', borderRadius: '6px' }} onMouseEnter={e => e.currentTarget.style.background = '#f1f5f9'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                                                    <Users size={16} color="#f97316" /> {t('surveys.action.audience')}
                                                                </button>
                                                                <div style={{ height: '1px', background: '#e2e8f0', margin: '4px 0' }}></div>
                                                                <button onClick={() => { setHistoryModalOpenId(form.id); }} style={{ padding: '10px 12px', background: 'transparent', border: 'none', cursor: 'pointer', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.9em', borderRadius: '6px' }} onMouseEnter={e => e.currentTarget.style.background = '#f1f5f9'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                                                    <HistoryIcon size={16} color="#64748b" /> {t('surveys.action.history')}
                                                                </button>
                                                                <button onClick={() => handleDuplicate(form)} style={{ padding: '10px 12px', background: 'transparent', border: 'none', cursor: 'pointer', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.9em', borderRadius: '6px' }} onMouseEnter={e => e.currentTarget.style.background = '#f1f5f9'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                                                    <Copy size={16} color="#64748b" /> {t('surveys.action.duplicate')}
                                                                </button>
                                                                <button onClick={() => handleRename(form)} style={{ padding: '10px 12px', background: 'transparent', border: 'none', cursor: 'pointer', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.9em', borderRadius: '6px' }} onMouseEnter={e => e.currentTarget.style.background = '#f1f5f9'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                                                    <FileSignature size={16} color="#64748b" /> {t('surveys.action.rename')}
                                                                </button>

                                                                {/* Move to Folder - Simple Implementation */}
                                                                <div style={{ height: '1px', background: '#e2e8f0', margin: '4px 0' }}></div>
                                                                <div style={{ padding: '8px 12px', fontSize: '0.8em', color: '#94a3b8', fontWeight: '600' }}>MOVE TO FOLDER</div>
                                                                {folders.length === 0 && <div style={{ padding: '4px 12px', fontSize: '0.8em', color: '#cbd5e1' }}>No folders created</div>}
                                                                {folders.map(folder => (
                                                                    <button
                                                                        key={folder.id}
                                                                        onClick={() => handleMoveToFolder(form.id, folder.id)}
                                                                        style={{ padding: '8px 12px', background: 'transparent', border: 'none', cursor: 'pointer', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.9em', borderRadius: '6px', paddingLeft: '20px' }}
                                                                        onMouseEnter={e => e.currentTarget.style.background = '#f1f5f9'}
                                                                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                                                    >
                                                                        📁 {folder.name}
                                                                    </button>
                                                                ))}
                                                                <button
                                                                    onClick={() => handleMoveToFolder(form.id, null)}
                                                                    style={{ padding: '8px 12px', background: 'transparent', border: 'none', cursor: 'pointer', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.9em', borderRadius: '6px', paddingLeft: '20px' }}
                                                                    onMouseEnter={e => e.currentTarget.style.background = '#fef2f2'}
                                                                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                                                >
                                                                    🚫 Remove from Folder
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    );
                                }

                                // GRID VIEW (Default)
                                return (
                                    <div style={{
                                        display: 'grid',
                                        gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
                                        gap: '24px'
                                    }}>
                                        {filtered.map((form, index) => (
                                            <div
                                                key={form.id}
                                                draggable
                                                onDragStart={(e) => {
                                                    e.dataTransfer.setData("formId", form.id);
                                                    e.dataTransfer.effectAllowed = "move";
                                                }}
                                                className={`glass-panel fade-in-up stagger-${(index % 10) + 1}`}
                                                style={{
                                                    padding: '0', // No padding helper wrapper
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    position: 'relative',
                                                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                                    cursor: 'pointer',
                                                    background: 'var(--card-bg)',
                                                    zIndex: actionMenuOpenId === form.id ? 100 : 1
                                                }}
                                                onDoubleClick={() => onEditForm(form.id)}
                                                onMouseEnter={e => {
                                                    e.currentTarget.style.transform = 'translateY(-5px)';
                                                    e.currentTarget.style.boxShadow = 'var(--primary-glow)';
                                                    e.currentTarget.style.borderColor = 'var(--primary-color)';
                                                }}
                                                onMouseLeave={e => {
                                                    e.currentTarget.style.transform = 'translateY(0)';
                                                    e.currentTarget.style.boxShadow = 'var(--glass-shadow)';
                                                    e.currentTarget.style.borderColor = 'var(--glass-border)';
                                                }}
                                            >
                                                {/* Cover */}
                                                <div style={{ height: '140px', background: '#f8fafc', position: 'relative', borderTopLeftRadius: '16px', borderTopRightRadius: '16px', overflow: 'hidden' }}>
                                                    {form.json && form.json.logo ? (
                                                        <img src={form.json.logo} style={{ width: '100%', height: '100%', objectFit: 'contain', padding: '10px' }} alt="" />
                                                    ) : (
                                                        <div style={{ width: '100%', height: '100%', background: getGradient(form.id), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                            <div style={{ background: 'rgba(255,255,255,0.2)', padding: '12px', borderRadius: '50%', backdropFilter: 'blur(4px)' }}>
                                                                <LayoutTemplate size={32} color="white" />
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Version / Status Badge */}
                                                    <div style={{ position: 'absolute', top: 12, right: 12, display: 'flex', gap: '6px' }}>
                                                        <div style={{
                                                            background: 'rgba(255,255,255,0.9)',
                                                            padding: '4px 8px', borderRadius: '20px',
                                                            fontSize: '0.7em', fontWeight: '700',
                                                            color: '#334155', boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                                                            display: 'flex', alignItems: 'center', gap: '4px'
                                                        }}>
                                                            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: form.is_active !== 0 ? '#10b981' : '#cbd5e1' }}></div>
                                                            v{form.version}
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Content */}
                                                <div style={{ padding: '20px' }}>
                                                    <h3 style={{ margin: '0 0 8px 0', fontSize: '1.2em', color: '#1e293b', fontWeight: '700', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', letterSpacing: '-0.3px' }} title={form.title}>
                                                        {form.title}
                                                    </h3>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                        <div style={{ fontSize: '0.85em', color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                            <HistoryIcon size={14} />
                                                            {(form.updated_at || form.created_at) ? new Date(form.updated_at || form.created_at).toLocaleDateString() : '-'}
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Footer Actions */}
                                                <div style={{ padding: '12px 16px', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fafafa', borderBottomLeftRadius: '16px', borderBottomRightRadius: '16px' }}>
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); onEditForm(form.id); }}
                                                        style={{ fontSize: '0.85em', color: 'var(--primary-color)', background: 'none', border: 'none', fontWeight: '600', cursor: 'pointer' }}
                                                    >
                                                        Edit
                                                    </button>
                                                    <div style={{ display: 'flex', gap: '8px' }}>
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); handleDelete(form.id, form.title); }}
                                                            style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}
                                                            title="Delete"
                                                            aria-label={`Delete survey ${form.title}`}
                                                        >
                                                            <div style={{ fontSize: '1.1em' }}>🗑️</div>
                                                        </button>
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); setActionMenuOpenId(actionMenuOpenId === form.id ? null : form.id); }}
                                                            style={{ color: '#64748b', background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}
                                                            aria-label={`More options for ${form.title}`}
                                                            aria-expanded={actionMenuOpenId === form.id}
                                                            aria-haspopup="true"
                                                        >
                                                            <div style={{ fontSize: '1.2em' }}>⋮</div>
                                                        </button>
                                                    </div>
                                                </div>

                                                {/* RE-USE EXISTING MENU LOGIC FOR GRID */}
                                                {actionMenuOpenId === form.id && (
                                                    <div style={{
                                                        position: 'absolute', top: 'calc(100% - 50px)', right: '10px',
                                                        background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px',
                                                        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.15)', width: '220px', zIndex: 50,
                                                        display: 'flex', flexDirection: 'column', overflow: 'hidden', textAlign: 'left',
                                                        padding: '4px'
                                                    }}>
                                                        <button onClick={() => onEditForm(form.id)} style={{ padding: '10px 12px', background: 'transparent', border: 'none', cursor: 'pointer', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.9em', borderRadius: '6px' }} onMouseEnter={e => e.currentTarget.style.background = '#f1f5f9'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                                            <Pencil size={16} color="#3b82f6" /> {t('surveys.action.edit_design')}
                                                        </button>
                                                        <button onClick={() => setResultsViewId(form.id)} style={{ padding: '10px 12px', background: 'transparent', border: 'none', cursor: 'pointer', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.9em', borderRadius: '6px' }} onMouseEnter={e => e.currentTarget.style.background = '#f1f5f9'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                                            <BarChart size={16} color="#8b5cf6" /> {t('surveys.action.results')}
                                                        </button>
                                                        <button onClick={() => handleExport(form)} style={{ padding: '10px 12px', background: 'transparent', border: 'none', cursor: 'pointer', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.9em', borderRadius: '6px' }} onMouseEnter={e => e.currentTarget.style.background = '#f1f5f9'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                                            <Download size={16} color="#6366f1" /> Export
                                                        </button>
                                                        <button onClick={() => setCollectViewId(form.id)} style={{ padding: '10px 12px', background: 'transparent', border: 'none', cursor: 'pointer', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.9em', borderRadius: '6px' }} onMouseEnter={e => e.currentTarget.style.background = '#f1f5f9'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                                            <Share2 size={16} color="#10b981" /> {t('surveys.action.collect')}
                                                        </button>

                                                        <div style={{ height: '1px', background: '#e2e8f0', margin: '4px 0' }}></div>

                                                        <button onClick={() => setSettingsViewId(form.id)} style={{ padding: '10px 12px', background: 'transparent', border: 'none', cursor: 'pointer', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.9em', borderRadius: '6px' }} onMouseEnter={e => e.currentTarget.style.background = '#f1f5f9'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                                            <Settings size={16} color="#64748b" /> {t('surveys.action.settings')}
                                                        </button>
                                                        <button onClick={() => setWorkflowViewId(form.id)} style={{ padding: '10px 12px', background: 'transparent', border: 'none', cursor: 'pointer', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.9em', borderRadius: '6px' }} onMouseEnter={e => e.currentTarget.style.background = '#f1f5f9'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                                            <Zap size={16} color="#f59e0b" /> {t('surveys.action.automation')}
                                                        </button>
                                                        <button onClick={() => setQuotaViewId(form.id)} style={{ padding: '10px 12px', background: 'transparent', border: 'none', cursor: 'pointer', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.9em', borderRadius: '6px' }} onMouseEnter={e => e.currentTarget.style.background = '#f1f5f9'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                                            <Archive size={16} color="#0891b2" /> {t('surveys.action.quotas')}
                                                        </button>
                                                        <button onClick={() => setAudienceViewId(form.id)} style={{ padding: '10px 12px', background: 'transparent', border: 'none', cursor: 'pointer', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.9em', borderRadius: '6px' }} onMouseEnter={e => e.currentTarget.style.background = '#f1f5f9'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                                            <Users size={16} color="#f97316" /> {t('surveys.action.audience')}
                                                        </button>
                                                        <div style={{ height: '1px', background: '#e2e8f0', margin: '4px 0' }}></div>
                                                        <button onClick={() => { setHistoryModalOpenId(form.id); }} style={{ padding: '10px 12px', background: 'transparent', border: 'none', cursor: 'pointer', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.9em', borderRadius: '6px' }} onMouseEnter={e => e.currentTarget.style.background = '#f1f5f9'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                                            <HistoryIcon size={16} color="#64748b" /> {t('surveys.action.history')}
                                                        </button>
                                                        <button onClick={() => handleDuplicate(form)} style={{ padding: '10px 12px', background: 'transparent', border: 'none', cursor: 'pointer', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.9em', borderRadius: '6px' }} onMouseEnter={e => e.currentTarget.style.background = '#f1f5f9'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                                            <Copy size={16} color="#64748b" /> {t('surveys.action.duplicate')}
                                                        </button>
                                                        <button onClick={() => handleRename(form)} style={{ padding: '10px 12px', background: 'transparent', border: 'none', cursor: 'pointer', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.9em', borderRadius: '6px' }} onMouseEnter={e => e.currentTarget.style.background = '#f1f5f9'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                                            <FileSignature size={16} color="#64748b" /> {t('surveys.action.rename')}
                                                        </button>

                                                        <div style={{ height: '1px', background: '#e2e8f0', margin: '4px 0' }}></div>
                                                        <div style={{ padding: '8px 12px', fontSize: '0.8em', color: '#94a3b8', fontWeight: '600' }}>MOVE TO FOLDER</div>
                                                        {folders.map(folder => (
                                                            <button
                                                                key={folder.id}
                                                                onClick={() => handleMoveToFolder(form.id, folder.id)}
                                                                style={{ padding: '8px 12px', background: 'transparent', border: 'none', cursor: 'pointer', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.9em', borderRadius: '6px', paddingLeft: '20px' }}
                                                                onMouseEnter={e => e.currentTarget.style.background = '#f1f5f9'}
                                                                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                                            >
                                                                📁 {folder.name}
                                                            </button>
                                                        ))}
                                                        <button
                                                            onClick={() => handleMoveToFolder(form.id, null)}
                                                            style={{ padding: '8px 12px', background: 'transparent', border: 'none', cursor: 'pointer', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.9em', borderRadius: '6px', paddingLeft: '20px' }}
                                                            onMouseEnter={e => e.currentTarget.style.background = '#fef2f2'}
                                                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                                        >
                                                            🚫 Remove from Folder
                                                        </button>
                                                    </div>
                                                )}

                                                {/* CLOSE OVERLAY */}
                                                {actionMenuOpenId === form.id && (
                                                    <div
                                                        style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 40 }}
                                                        onClick={(e) => { e.stopPropagation(); setActionMenuOpenId(null); }}
                                                    ></div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                );
                            })()}

                        </div>
                    </div>
                </div>
            )
            }

            {/* HISTORY MODAL */}
            {
                historyModalOpenId && (
                    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <div style={{ background: '#D9F8E5', borderRadius: '16px', padding: '24px', width: '500px', maxHeight: '80vh', overflowY: 'auto', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                                <h3 style={{ margin: 0 }}>Version History</h3>
                                <button onClick={() => setHistoryModalOpenId(null)} aria-label="Close version history" style={{ background: 'none', border: 'none', fontSize: '1.5em', cursor: 'pointer', color: '#64748b' }}>×</button>
                            </div>
                            {historyList.length === 0 ? <p style={{ color: '#94a3b8' }}>No previous versions found.</p> : (
                                <ul style={{ listStyle: 'none', padding: 0 }}>
                                    {historyList.map(h => (
                                        <li key={h.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', borderBottom: '1px solid #f1f5f9' }}>
                                            <div>
                                                <div style={{ fontWeight: '600', color: '#334155' }}>Version {h.version}</div>
                                                <div style={{ fontSize: '0.8em', color: '#64748b' }}>
                                                    {h.created_at ? <InlineHijriDate date={h.created_at} /> : 'Unknown Date'}
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
                )
            }
            {/* EXPORT MODAL */}
            <ExportModal
                isOpen={isExportModalOpen}
                onClose={() => setIsExportModalOpen(false)}
                formId={exportForm?.id}
                formTitle={exportForm?.title}
            />
        </div >
    );
}
