import { useState, useEffect } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { Palette, Download, Upload, RefreshCw, Eye } from 'lucide-react';
import axios from '../../axiosConfig';
import './ThemeBuilder.css';

/**
 * Theme Builder
 *
 * Visual theme customizer for white-label branding.
 * Allows customers to customize colors, typography, and preview changes in real-time.
 */
export default function ThemeBuilder() {
  const { customTheme, updateCustomTheme, currentTheme } = useTheme();

  const [colors, setColors] = useState({
    primary: customTheme?.colors?.primary || '#00695C',
    secondary: customTheme?.colors?.secondary || '#FFB300',
    surfaceBg: customTheme?.colors?.surfaceBg || '#ffffff',
    textPrimary: customTheme?.colors?.textPrimary || '#1a1c1e',
    sidebarBg: customTheme?.colors?.sidebarBg || '#ecfdf5'
  });

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  const handleColorChange = (key, value) => {
    setColors(prev => ({ ...prev, [key]: value }));
  };

  const handlePreview = () => {
    const newTheme = {
      ...customTheme,
      colors: {
        ...customTheme?.colors,
        ...colors
      }
    };
    updateCustomTheme(newTheme);
    setMessage({ type: 'success', text: 'Preview applied! Changes are temporary until saved.' });
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const themeData = {
        customTheme: {
          ...customTheme,
          colors: {
            ...customTheme?.colors,
            ...colors
          }
        }
      };

      await axios.post('/api/tenants/theme', themeData);
      updateCustomTheme(themeData.customTheme);
      setMessage({ type: 'success', text: 'Theme saved successfully!' });
    } catch (error) {
      console.error('Failed to save theme:', error);
      setMessage({ type: 'error', text: 'Failed to save theme. Please try again.' });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setColors({
      primary: '#00695C',
      secondary: '#FFB300',
      surfaceBg: '#ffffff',
      textPrimary: '#1a1c1e',
      sidebarBg: '#ecfdf5'
    });
    setMessage({ type: 'info', text: 'Reset to default colors. Click Preview to apply.' });
  };

  const handleExport = () => {
    const themeJSON = JSON.stringify({
      ...customTheme,
      colors: {
        ...customTheme?.colors,
        ...colors
      }
    }, null, 2);

    const blob = new Blob([themeJSON], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `theme-${currentTheme}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const imported = JSON.parse(e.target.result);
        if (imported.colors) {
          setColors(prev => ({ ...prev, ...imported.colors }));
          setMessage({ type: 'success', text: 'Theme imported! Click Preview to apply.' });
        }
      } catch (error) {
        setMessage({ type: 'error', text: 'Invalid theme file.' });
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="theme-builder">
      {/* Header */}
      <div className="theme-builder-header">
        <div className="header-left">
          <Palette size={32} color="#00695C" />
          <div>
            <h1>Theme Customization</h1>
            <p>Customize your platform's appearance with your brand colors</p>
          </div>
        </div>
        <div className="header-right">
          <button className="btn-secondary" onClick={handleExport} title="Export Theme">
            <Download size={18} />
            Export
          </button>
          <label className="btn-secondary" title="Import Theme">
            <Upload size={18} />
            Import
            <input
              type="file"
              accept=".json"
              style={{ display: 'none' }}
              onChange={handleImport}
            />
          </label>
          <button className="btn-secondary" onClick={handleReset} title="Reset to Default">
            <RefreshCw size={18} />
            Reset
          </button>
        </div>
      </div>

      {/* Message Banner */}
      {message && (
        <div className={`message-banner message-${message.type}`}>
          {message.text}
          <button onClick={() => setMessage(null)}>×</button>
        </div>
      )}

      <div className="theme-builder-content">
        {/* Color Pickers */}
        <div className="color-pickers-section">
          <h2>Brand Colors</h2>
          <p className="section-description">
            Customize the primary colors that define your brand identity
          </p>

          <div className="color-picker-grid">
            {/* Primary Color */}
            <div className="color-picker-item">
              <label>Primary Color</label>
              <div className="color-input-wrapper">
                <input
                  type="color"
                  value={colors.primary}
                  onChange={(e) => handleColorChange('primary', e.target.value)}
                  className="color-input"
                />
                <input
                  type="text"
                  value={colors.primary}
                  onChange={(e) => handleColorChange('primary', e.target.value)}
                  className="color-text-input"
                  placeholder="#00695C"
                />
              </div>
              <p className="color-description">Main brand color used for buttons and highlights</p>
            </div>

            {/* Secondary Color */}
            <div className="color-picker-item">
              <label>Secondary Color</label>
              <div className="color-input-wrapper">
                <input
                  type="color"
                  value={colors.secondary}
                  onChange={(e) => handleColorChange('secondary', e.target.value)}
                  className="color-input"
                />
                <input
                  type="text"
                  value={colors.secondary}
                  onChange={(e) => handleColorChange('secondary', e.target.value)}
                  className="color-text-input"
                  placeholder="#FFB300"
                />
              </div>
              <p className="color-description">Accent color for badges and highlights</p>
            </div>

            {/* Surface Background */}
            <div className="color-picker-item">
              <label>Surface Background</label>
              <div className="color-input-wrapper">
                <input
                  type="color"
                  value={colors.surfaceBg}
                  onChange={(e) => handleColorChange('surfaceBg', e.target.value)}
                  className="color-input"
                />
                <input
                  type="text"
                  value={colors.surfaceBg}
                  onChange={(e) => handleColorChange('surfaceBg', e.target.value)}
                  className="color-text-input"
                  placeholder="#ffffff"
                />
              </div>
              <p className="color-description">Background color for cards and surfaces</p>
            </div>

            {/* Text Primary */}
            <div className="color-picker-item">
              <label>Text Color</label>
              <div className="color-input-wrapper">
                <input
                  type="color"
                  value={colors.textPrimary}
                  onChange={(e) => handleColorChange('textPrimary', e.target.value)}
                  className="color-input"
                />
                <input
                  type="text"
                  value={colors.textPrimary}
                  onChange={(e) => handleColorChange('textPrimary', e.target.value)}
                  className="color-text-input"
                  placeholder="#1a1c1e"
                />
              </div>
              <p className="color-description">Primary text color for content</p>
            </div>
          </div>
        </div>

        {/* Preview Section */}
        <div className="preview-section">
          <h2>Live Preview</h2>
          <p className="section-description">
            See how your colors look with real UI components
          </p>

          <div className="preview-container">
            {/* Preview Card */}
            <div className="preview-card" style={{ background: colors.surfaceBg, color: colors.textPrimary }}>
              <h3 style={{ color: colors.textPrimary }}>Sample Card</h3>
              <p>This is how your content will look with the selected colors.</p>

              <div className="preview-buttons">
                <button
                  className="preview-btn-primary"
                  style={{ background: colors.primary, color: '#ffffff' }}
                >
                  Primary Button
                </button>
                <button
                  className="preview-btn-secondary"
                  style={{ background: colors.secondary, color: '#ffffff' }}
                >
                  Secondary Button
                </button>
              </div>

              <div className="preview-badge" style={{ background: `${colors.primary}15`, color: colors.primary }}>
                Status Badge
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="theme-builder-actions">
        <button
          className="btn-preview"
          onClick={handlePreview}
        >
          <Eye size={18} />
          Preview Changes
        </button>
        <button
          className="btn-save"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? 'Saving...' : 'Save Theme'}
        </button>
      </div>
    </div>
  );
}
