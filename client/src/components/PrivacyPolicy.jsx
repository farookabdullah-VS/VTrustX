import React from 'react';
import { useTranslation } from 'react-i18next';
import { ShieldCheck, Mail, FileText, Lock } from 'lucide-react';

export function PrivacyPolicy() {
    const { t } = useTranslation();

    return (
        <div style={{
            maxWidth: '900px',
            margin: '0 auto',
            padding: '60px 20px',
            fontFamily: "'Outfit', sans-serif",
            color: '#334155',
            lineHeight: '1.6'
        }}>
            <header style={{ marginBottom: '40px', textAlign: 'center' }}>
                <div style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: '#e0f2f1',
                    color: '#00695C',
                    padding: '12px',
                    borderRadius: '50%',
                    marginBottom: '20px'
                }}>
                    <ShieldCheck size={48} />
                </div>
                <h1 style={{ fontSize: '2.5rem', fontWeight: '800', color: '#0f172a', marginBottom: '10px' }}>
                    Privacy Policy
                </h1>
                <p style={{ fontSize: '1.2rem', color: '#64748b' }}>
                    Last updated: {new Date().toLocaleDateString()}
                </p>
            </header>

            <section style={{ marginBottom: '40px', background: 'white', padding: '40px', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                    <Lock size={24} color="#00695C" />
                    <h2 style={{ fontSize: '1.5rem', fontWeight: '700', margin: 0 }}>Commitment to Privacy & ESOMAR Standards</h2>
                </div>
                <p>
                    RayiX (VTrustX) is committed to protecting the privacy and security of your personal data.
                    We strictly adhere to the <strong>ICC/ESOMAR International Code on Market, Opinion and Social Research and Data Analytics</strong>.
                </p>
                <p>
                    This policy outlines how we collect, use, disclosure, and safeguard your information when you participate in our surveys or use our platform.
                </p>
            </section>

            <section style={{ marginBottom: '30px' }}>
                <h3 style={{ fontSize: '1.3rem', fontWeight: '700', color: '#1e293b', marginBottom: '15px' }}>1. Data Collection & Anonymity</h3>
                <p>
                    When you participate in a survey on our platform:
                </p>
                <ul style={{ paddingLeft: '20px' }}>
                    <li><strong>Voluntary Participation:</strong> Your participation is completely voluntary. You may withdraw at any time.</li>
                    <li><strong>Confidentiality:</strong> Unless explicitly stated otherwise, your responses are treated as confidential. We separate your personal identity from your research data.</li>
                    <li><strong>Purpose Limitation:</strong> Data is collected for specific research purposes and will not be used for direct marketing or other non-research purposes without your explicit consent.</li>
                </ul>
            </section>

            <section style={{ marginBottom: '30px' }}>
                <h3 style={{ fontSize: '1.3rem', fontWeight: '700', color: '#1e293b', marginBottom: '15px' }}>2. Information We Collect</h3>
                <p>We may collect the following types of information:</p>
                <ul style={{ paddingLeft: '20px' }}>
                    <li><strong>Survey Responses:</strong> The answers you provide to survey questions.</li>
                    <li><strong>Metadata:</strong> Technical data such as browser type, device information, and interview duration for quality control.</li>
                    <li><strong>Sensory Data:</strong> If enabled and consented to, we may process audio, video, or image data for emotion analysis.</li>
                </ul>
            </section>

            <section style={{ marginBottom: '30px' }}>
                <h3 style={{ fontSize: '1.3rem', fontWeight: '700', color: '#1e293b', marginBottom: '15px' }}>3. Data Security</h3>
                <p>
                    We implement robust technical and organizational measures to protect your data against unauthorized access, loss, or misuse.
                    This includes encryption in transit and at rest, strict access controls, and regular security audits.
                </p>
            </section>

            <section style={{ marginBottom: '30px' }}>
                <h3 style={{ fontSize: '1.3rem', fontWeight: '700', color: '#1e293b', marginBottom: '15px' }}>4. Your Rights</h3>
                <p>Under applicable data protection laws and ESOMAR guidelines, you have the right to:</p>
                <ul style={{ paddingLeft: '20px' }}>
                    <li>Access the personal data we hold about you.</li>
                    <li>Request correction of inaccurate data.</li>
                    <li>Request deletion of your data ("Right to be Forgotten").</li>
                    <li>Withdraw consent at any time.</li>
                </ul>
            </section>

            <section style={{ marginTop: '60px', borderTop: '1px solid #e2e8f0', paddingTop: '40px' }}>
                <h3 style={{ fontSize: '1.3rem', fontWeight: '700', color: '#1e293b', marginBottom: '20px' }}>Contact Us</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
                    <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px', fontWeight: 'bold' }}>
                            <Mail size={18} /> Privacy Officer
                        </div>
                        <a href="mailto:privacy@rayix.sa" style={{ color: '#00695C', textDecoration: 'none' }}>privacy@rayix.sa</a>
                    </div>
                    <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px', fontWeight: 'bold' }}>
                            <FileText size={18} /> Compliance
                        </div>
                        <p style={{ margin: 0, fontSize: '0.9em', color: '#64748b' }}>
                            RayiX adheres to ISO 27001 and ESOMAR standards.
                        </p>
                    </div>
                </div>
            </section>
        </div>
    );
}
