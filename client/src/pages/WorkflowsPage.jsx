/**
 * Workflows Page
 *
 * Main page for workflow automation with template browser and workflow list
 */

import React, { useState } from 'react';
import WorkflowTemplatesBrowser from '../components/workflows/WorkflowTemplatesBrowser';
import WorkflowsList from '../components/workflows/WorkflowsList';
import { FlaskConical, List } from 'lucide-react';
import './WorkflowsPage.css';

const WorkflowsPage = () => {
    const [activeTab, setActiveTab] = useState('templates');

    const handleTemplateSelect = (workflow) => {
        // Switch to workflows list after creating workflow from template
        setActiveTab('workflows');
    };

    return (
        <div className="workflows-page">
            <div className="workflows-tabs">
                <button
                    className={`tab-button ${activeTab === 'templates' ? 'active' : ''}`}
                    onClick={() => setActiveTab('templates')}
                >
                    <FlaskConical size={20} />
                    Template Marketplace
                </button>
                <button
                    className={`tab-button ${activeTab === 'workflows' ? 'active' : ''}`}
                    onClick={() => setActiveTab('workflows')}
                >
                    <List size={20} />
                    My Workflows
                </button>
            </div>

            <div className="workflows-content">
                {activeTab === 'templates' ? (
                    <WorkflowTemplatesBrowser onTemplateSelect={handleTemplateSelect} />
                ) : (
                    <WorkflowsList />
                )}
            </div>
        </div>
    );
};

export default WorkflowsPage;
