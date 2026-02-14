/**
 * Logic Builder Component
 *
 * Visual builder for creating survey logic rules
 * Features:
 * - Create skip logic rules
 * - Define display conditions
 * - Set up question piping
 * - Configure quotas
 * - Manage question groups
 */

import React, { useState, useEffect } from 'react';
import {
    GitBranch,
    Plus,
    Trash2,
    Eye,
    Settings,
    ChevronRight,
    Check,
    X,
    Target
} from 'lucide-react';
import axios from '../../axiosConfig';
import './LogicBuilder.css';

const LogicBuilder = ({ formId, questions, onClose }) => {
    const [activeTab, setActiveTab] = useState('skip-logic');
    const [rules, setRules] = useState([]);
    const [quotas, setQuotas] = useState([]);
    const [pipingRules, setPipingRules] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showAddRule, setShowAddRule] = useState(false);

    // New rule form state
    const [newRule, setNewRule] = useState({
        questionId: '',
        logicType: 'skip',
        conditions: [{ questionId: '', operator: 'equals', value: '' }],
        action: 'show',
        actionTarget: '',
        operator: 'and'
    });

    useEffect(() => {
        if (formId) {
            fetchLogicRules();
            fetchQuotas();
            fetchPipingRules();
        }
    }, [formId]);

    const fetchLogicRules = async () => {
        try {
            setLoading(true);
            const response = await axios.get(`/api/survey-logic/rules/${formId}`);
            setRules(response.data.data);
        } catch (error) {
            console.error('Failed to fetch logic rules:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchQuotas = async () => {
        try {
            const response = await axios.get(`/api/survey-logic/quotas/${formId}`);
            setQuotas(response.data.data);
        } catch (error) {
            console.error('Failed to fetch quotas:', error);
        }
    };

    const fetchPipingRules = async () => {
        try {
            const response = await axios.get(`/api/survey-logic/piping/${formId}`);
            setPipingRules(response.data.data);
        } catch (error) {
            console.error('Failed to fetch piping rules:', error);
        }
    };

    const handleAddCondition = () => {
        setNewRule({
            ...newRule,
            conditions: [
                ...newRule.conditions,
                { questionId: '', operator: 'equals', value: '' }
            ]
        });
    };

    const handleUpdateCondition = (index, field, value) => {
        const updatedConditions = [...newRule.conditions];
        updatedConditions[index][field] = value;
        setNewRule({ ...newRule, conditions: updatedConditions });
    };

    const handleRemoveCondition = (index) => {
        const updatedConditions = newRule.conditions.filter((_, i) => i !== index);
        setNewRule({ ...newRule, conditions: updatedConditions });
    };

    const handleCreateRule = async () => {
        try {
            await axios.post('/api/survey-logic/rules', {
                formId,
                ...newRule
            });

            alert('Logic rule created successfully!');
            fetchLogicRules();
            setShowAddRule(false);
            setNewRule({
                questionId: '',
                logicType: 'skip',
                conditions: [{ questionId: '', operator: 'equals', value: '' }],
                action: 'show',
                actionTarget: '',
                operator: 'and'
            });
        } catch (error) {
            console.error('Failed to create rule:', error);
            alert('Failed to create logic rule');
        }
    };

    const handleDeleteRule = async (ruleId) => {
        if (!confirm('Are you sure you want to delete this rule?')) return;

        try {
            await axios.delete(`/api/survey-logic/rules/${ruleId}`);
            alert('Rule deleted successfully');
            fetchLogicRules();
        } catch (error) {
            console.error('Failed to delete rule:', error);
            alert('Failed to delete rule');
        }
    };

    const getQuestionLabel = (questionId) => {
        const question = questions.find(q => q.id === questionId);
        return question ? question.text || `Question ${questionId}` : questionId;
    };

    const operatorLabels = {
        'equals': 'equals',
        'not_equals': 'does not equal',
        'contains': 'contains',
        'not_contains': 'does not contain',
        'greater_than': 'is greater than',
        'less_than': 'is less than',
        'is_empty': 'is empty',
        'is_not_empty': 'is not empty'
    };

    return (
        <div className="logic-builder">
            <div className="logic-builder-header">
                <div className="header-left">
                    <GitBranch size={24} />
                    <div>
                        <h2>Logic Builder</h2>
                        <p>Create conditional logic for your survey</p>
                    </div>
                </div>
                <button className="btn-close" onClick={onClose}>
                    <X size={20} />
                </button>
            </div>

            <div className="logic-builder-tabs">
                <button
                    className={`tab ${activeTab === 'skip-logic' ? 'active' : ''}`}
                    onClick={() => setActiveTab('skip-logic')}
                >
                    Skip Logic
                </button>
                <button
                    className={`tab ${activeTab === 'quotas' ? 'active' : ''}`}
                    onClick={() => setActiveTab('quotas')}
                >
                    Quotas
                </button>
                <button
                    className={`tab ${activeTab === 'piping' ? 'active' : ''}`}
                    onClick={() => setActiveTab('piping')}
                >
                    Piping
                </button>
            </div>

            <div className="logic-builder-body">
                {/* Skip Logic Tab */}
                {activeTab === 'skip-logic' && (
                    <div className="logic-tab">
                        <div className="tab-header">
                            <h3>Skip Logic Rules</h3>
                            <button
                                className="btn-add-rule"
                                onClick={() => setShowAddRule(true)}
                            >
                                <Plus size={16} />
                                Add Rule
                            </button>
                        </div>

                        {loading ? (
                            <div className="loading-state">
                                <div className="spinner"></div>
                                <p>Loading rules...</p>
                            </div>
                        ) : rules.length === 0 ? (
                            <div className="empty-state">
                                <GitBranch size={48} color="#D1D5DB" />
                                <h4>No Logic Rules Yet</h4>
                                <p>Add rules to show/hide questions based on previous answers</p>
                            </div>
                        ) : (
                            <div className="rules-list">
                                {rules.map((rule) => (
                                    <div key={rule.id} className="rule-card">
                                        <div className="rule-header">
                                            <div className="rule-question">
                                                <Target size={16} />
                                                <span>{getQuestionLabel(rule.question_id)}</span>
                                            </div>
                                            <button
                                                className="btn-delete-rule"
                                                onClick={() => handleDeleteRule(rule.id)}
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>

                                        <div className="rule-conditions">
                                            {JSON.parse(rule.conditions).map((condition, index) => (
                                                <div key={index} className="condition">
                                                    <span className="condition-text">
                                                        If <strong>{getQuestionLabel(condition.questionId)}</strong>
                                                        {' '}{operatorLabels[condition.operator] || condition.operator}{' '}
                                                        <strong>"{condition.value}"</strong>
                                                    </span>
                                                </div>
                                            ))}
                                        </div>

                                        <div className="rule-action">
                                            <ChevronRight size={16} />
                                            <span className="action-text">
                                                Then <strong>{rule.action}</strong> this question
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Quotas Tab */}
                {activeTab === 'quotas' && (
                    <div className="logic-tab">
                        <div className="tab-header">
                            <h3>Response Quotas</h3>
                            <button className="btn-add-rule">
                                <Plus size={16} />
                                Add Quota
                            </button>
                        </div>

                        <div className="empty-state">
                            <Settings size={48} color="#D1D5DB" />
                            <h4>Coming Soon</h4>
                            <p>Set response limits for specific options</p>
                        </div>
                    </div>
                )}

                {/* Piping Tab */}
                {activeTab === 'piping' && (
                    <div className="logic-tab">
                        <div className="tab-header">
                            <h3>Question Piping</h3>
                            <button className="btn-add-rule">
                                <Plus size={16} />
                                Add Piping
                            </button>
                        </div>

                        <div className="empty-state">
                            <Settings size={48} color="#D1D5DB" />
                            <h4>Coming Soon</h4>
                            <p>Reference previous answers in questions</p>
                        </div>
                    </div>
                )}
            </div>

            {/* Add Rule Modal */}
            {showAddRule && (
                <div className="modal-overlay" onClick={() => setShowAddRule(false)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>Add Skip Logic Rule</h3>
                            <button onClick={() => setShowAddRule(false)}>
                                <X size={20} />
                            </button>
                        </div>

                        <div className="modal-body">
                            <div className="form-group">
                                <label>Target Question</label>
                                <select
                                    value={newRule.questionId}
                                    onChange={(e) => setNewRule({ ...newRule, questionId: e.target.value })}
                                >
                                    <option value="">Select question...</option>
                                    {questions.map((q) => (
                                        <option key={q.id} value={q.id}>
                                            {q.text || `Question ${q.id}`}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="form-group">
                                <label>Conditions</label>
                                {newRule.conditions.map((condition, index) => (
                                    <div key={index} className="condition-builder">
                                        <select
                                            value={condition.questionId}
                                            onChange={(e) => handleUpdateCondition(index, 'questionId', e.target.value)}
                                        >
                                            <option value="">Select question...</option>
                                            {questions.map((q) => (
                                                <option key={q.id} value={q.id}>
                                                    {q.text || `Question ${q.id}`}
                                                </option>
                                            ))}
                                        </select>

                                        <select
                                            value={condition.operator}
                                            onChange={(e) => handleUpdateCondition(index, 'operator', e.target.value)}
                                        >
                                            <option value="equals">equals</option>
                                            <option value="not_equals">does not equal</option>
                                            <option value="contains">contains</option>
                                            <option value="greater_than">is greater than</option>
                                            <option value="less_than">is less than</option>
                                            <option value="is_empty">is empty</option>
                                            <option value="is_not_empty">is not empty</option>
                                        </select>

                                        {!['is_empty', 'is_not_empty'].includes(condition.operator) && (
                                            <input
                                                type="text"
                                                placeholder="Value..."
                                                value={condition.value}
                                                onChange={(e) => handleUpdateCondition(index, 'value', e.target.value)}
                                            />
                                        )}

                                        {newRule.conditions.length > 1 && (
                                            <button
                                                className="btn-remove-condition"
                                                onClick={() => handleRemoveCondition(index)}
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        )}
                                    </div>
                                ))}

                                <button className="btn-add-condition" onClick={handleAddCondition}>
                                    <Plus size={16} />
                                    Add Condition
                                </button>
                            </div>

                            <div className="form-group">
                                <label>Action</label>
                                <select
                                    value={newRule.action}
                                    onChange={(e) => setNewRule({ ...newRule, action: e.target.value })}
                                >
                                    <option value="show">Show question</option>
                                    <option value="hide">Hide question</option>
                                    <option value="skip_to">Skip to question</option>
                                    <option value="require">Make required</option>
                                </select>
                            </div>

                            <div className="modal-footer">
                                <button
                                    className="btn-secondary"
                                    onClick={() => setShowAddRule(false)}
                                >
                                    Cancel
                                </button>
                                <button
                                    className="btn-primary"
                                    onClick={handleCreateRule}
                                    disabled={!newRule.questionId}
                                >
                                    Create Rule
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default LogicBuilder;
