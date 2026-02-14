import React, { useState, useEffect } from 'react';
import axios from '../../axiosConfig';
import { Shield, AlertTriangle, Check, X, Copy, Download, Key, RefreshCw } from 'lucide-react';
import './TwoFactorSettings.css';

function TwoFactorSettings() {
    const [status, setStatus] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [setupData, setSetupData] = useState(null);
    const [verificationCode, setVerificationCode] = useState('');
    const [disableCode, setDisableCode] = useState('');
    const [showBackupCodes, setShowBackupCodes] = useState(false);
    const [copiedSecret, setCopiedSecret] = useState(false);

    useEffect(() => {
        fetchStatus();
    }, []);

    const fetchStatus = async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await axios.get('/api/auth/2fa/status');
            setStatus(response.data);
        } catch (err) {
            console.error('Failed to fetch 2FA status:', err);
            setError('Failed to load two-factor authentication status');
        } finally {
            setLoading(false);
        }
    };

    const handleSetup = async () => {
        try {
            setError(null);
            const response = await axios.post('/api/auth/2fa/setup');
            setSetupData(response.data);
        } catch (err) {
            console.error('Failed to setup 2FA:', err);
            setError(err.response?.data?.error || 'Failed to setup two-factor authentication');
        }
    };

    const handleEnable = async (e) => {
        e.preventDefault();

        if (!verificationCode || verificationCode.length !== 6) {
            setError('Please enter a valid 6-digit code');
            return;
        }

        try {
            setError(null);
            await axios.post('/api/auth/2fa/enable', {
                secret: setupData.secret,
                token: verificationCode,
                backupCodes: setupData.backupCodes
            });

            setShowBackupCodes(true);
            setVerificationCode('');
            await fetchStatus();
        } catch (err) {
            console.error('Failed to enable 2FA:', err);
            setError(err.response?.data?.error || 'Failed to enable two-factor authentication. Please check your code.');
        }
    };

    const handleDisable = async (e) => {
        e.preventDefault();

        if (!disableCode) {
            setError('Please enter a verification code');
            return;
        }

        if (!window.confirm('Are you sure you want to disable two-factor authentication? This will make your account less secure.')) {
            return;
        }

        try {
            setError(null);
            await axios.post('/api/auth/2fa/disable', {
                token: disableCode
            });

            setDisableCode('');
            setSetupData(null);
            setShowBackupCodes(false);
            await fetchStatus();
            alert('Two-factor authentication has been disabled');
        } catch (err) {
            console.error('Failed to disable 2FA:', err);
            setError(err.response?.data?.error || 'Failed to disable two-factor authentication');
        }
    };

    const handleRegenerateCodes = async () => {
        if (!window.confirm('This will invalidate your current backup codes. Are you sure?')) {
            return;
        }

        try {
            setError(null);
            const response = await axios.post('/api/auth/2fa/regenerate-codes');
            setSetupData({ ...setupData, backupCodes: response.data.backupCodes });
            setShowBackupCodes(true);
            alert('Backup codes regenerated successfully');
        } catch (err) {
            console.error('Failed to regenerate backup codes:', err);
            setError(err.response?.data?.error || 'Failed to regenerate backup codes');
        }
    };

    const copySecret = () => {
        navigator.clipboard.writeText(setupData.secret);
        setCopiedSecret(true);
        setTimeout(() => setCopiedSecret(false), 2000);
    };

    const downloadBackupCodes = () => {
        const text = `VTrustX Two-Factor Authentication Backup Codes\n\nGenerated: ${new Date().toLocaleString()}\n\n${setupData.backupCodes.join('\n')}\n\nIMPORTANT: Store these codes in a safe place. Each code can only be used once.`;
        const blob = new Blob([text], { type: 'text/plain' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'vtrustx-backup-codes.txt';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
    };

    const handleCancel = () => {
        setSetupData(null);
        setVerificationCode('');
        setShowBackupCodes(false);
        setError(null);
    };

    if (loading) {
        return (
            <div className="two-factor-settings">
                <div className="loading-container">
                    <div className="spinner"></div>
                    <p>Loading settings...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="two-factor-settings">
            <div className="settings-header">
                <div className="header-left">
                    <Shield size={24} />
                    <div>
                        <h1>Two-Factor Authentication</h1>
                        <p>Add an extra layer of security to your account</p>
                    </div>
                </div>
                {status?.enabled && (
                    <div className="status-badge enabled">
                        <Check size={16} />
                        <span>Enabled</span>
                    </div>
                )}
            </div>

            {error && (
                <div className="error-message">
                    <AlertTriangle size={16} />
                    <span>{error}</span>
                </div>
            )}

            {/* Not Enabled State */}
            {!status?.enabled && !setupData && (
                <div className="info-panel">
                    <div className="info-content">
                        <h2>Secure Your Account</h2>
                        <p>
                            Two-factor authentication (2FA) adds an extra layer of security to your account.
                            In addition to your password, you'll need to enter a code from your authenticator app.
                        </p>

                        <div className="benefits-list">
                            <h3>Benefits:</h3>
                            <ul>
                                <li>
                                    <Check size={16} />
                                    <span>Protects against password theft</span>
                                </li>
                                <li>
                                    <Check size={16} />
                                    <span>Prevents unauthorized access</span>
                                </li>
                                <li>
                                    <Check size={16} />
                                    <span>Complies with security best practices</span>
                                </li>
                                <li>
                                    <Check size={16} />
                                    <span>Works with popular authenticator apps</span>
                                </li>
                            </ul>
                        </div>

                        <div className="supported-apps">
                            <h3>Supported Apps:</h3>
                            <div className="app-badges">
                                <span className="app-badge">Google Authenticator</span>
                                <span className="app-badge">Microsoft Authenticator</span>
                                <span className="app-badge">Authy</span>
                                <span className="app-badge">1Password</span>
                            </div>
                        </div>

                        <button className="btn-primary large" onClick={handleSetup}>
                            <Shield size={16} />
                            Enable Two-Factor Authentication
                        </button>
                    </div>
                </div>
            )}

            {/* Setup Flow */}
            {setupData && !showBackupCodes && (
                <div className="setup-panel">
                    <h2>Set Up Two-Factor Authentication</h2>
                    <p>Follow these steps to enable 2FA on your account</p>

                    <div className="setup-steps">
                        <div className="step-card">
                            <div className="step-number">1</div>
                            <div className="step-content">
                                <h3>Install an Authenticator App</h3>
                                <p>
                                    Download and install an authenticator app on your mobile device.
                                    We recommend Google Authenticator or Microsoft Authenticator.
                                </p>
                            </div>
                        </div>

                        <div className="step-card">
                            <div className="step-number">2</div>
                            <div className="step-content">
                                <h3>Scan the QR Code</h3>
                                <p>Open your authenticator app and scan this QR code:</p>
                                <div className="qr-code-container">
                                    <img src={setupData.qrCodeDataUrl} alt="QR Code" className="qr-code" />
                                </div>
                                <div className="manual-entry">
                                    <p>Can't scan? Enter this code manually:</p>
                                    <div className="secret-code">
                                        <code>{setupData.secret}</code>
                                        <button className="btn-icon" onClick={copySecret}>
                                            {copiedSecret ? <Check size={16} /> : <Copy size={16} />}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="step-card">
                            <div className="step-number">3</div>
                            <div className="step-content">
                                <h3>Enter Verification Code</h3>
                                <p>Enter the 6-digit code from your authenticator app:</p>
                                <form onSubmit={handleEnable}>
                                    <input
                                        type="text"
                                        className="code-input"
                                        placeholder="000000"
                                        maxLength="6"
                                        value={verificationCode}
                                        onChange={(e) => setVerificationCode(e.target.value.replace(/[^0-9]/g, ''))}
                                        autoFocus
                                    />
                                    <div className="form-actions">
                                        <button type="button" className="btn-secondary" onClick={handleCancel}>
                                            Cancel
                                        </button>
                                        <button type="submit" className="btn-primary">
                                            Verify & Enable
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Backup Codes Display */}
            {showBackupCodes && setupData && (
                <div className="backup-codes-panel">
                    <div className="panel-header">
                        <AlertTriangle size={24} style={{ color: '#F59E0B' }} />
                        <h2>Save Your Backup Codes</h2>
                    </div>
                    <p>
                        Store these backup codes in a safe place. You can use them to access your account
                        if you lose access to your authenticator app. Each code can only be used once.
                    </p>

                    <div className="codes-grid">
                        {setupData.backupCodes.map((code, index) => (
                            <div key={index} className="backup-code">
                                <Key size={14} />
                                <code>{code}</code>
                            </div>
                        ))}
                    </div>

                    <div className="codes-actions">
                        <button className="btn-secondary" onClick={downloadBackupCodes}>
                            <Download size={16} />
                            Download Codes
                        </button>
                        <button className="btn-primary" onClick={() => {
                            setShowBackupCodes(false);
                            setSetupData(null);
                        }}>
                            I've Saved My Codes
                        </button>
                    </div>
                </div>
            )}

            {/* Enabled State */}
            {status?.enabled && !setupData && !showBackupCodes && (
                <div className="enabled-panel">
                    <div className="status-card success">
                        <Check size={48} />
                        <h2>Two-Factor Authentication is Enabled</h2>
                        <p>Your account is protected with an additional security layer</p>
                    </div>

                    <div className="actions-card">
                        <h3>Manage Two-Factor Authentication</h3>

                        <div className="action-item">
                            <div className="action-info">
                                <h4>Backup Codes</h4>
                                <p>Generate new backup codes (invalidates old ones)</p>
                            </div>
                            <button className="btn-secondary" onClick={handleRegenerateCodes}>
                                <RefreshCw size={16} />
                                Regenerate Codes
                            </button>
                        </div>

                        <div className="action-item danger">
                            <div className="action-info">
                                <h4>Disable Two-Factor Authentication</h4>
                                <p>Remove the extra security layer from your account</p>
                            </div>
                            <form onSubmit={handleDisable} className="disable-form">
                                <input
                                    type="text"
                                    placeholder="Enter 6-digit code"
                                    maxLength="6"
                                    value={disableCode}
                                    onChange={(e) => setDisableCode(e.target.value.replace(/[^0-9]/g, ''))}
                                />
                                <button type="submit" className="btn-danger">
                                    <X size={16} />
                                    Disable
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default TwoFactorSettings;
