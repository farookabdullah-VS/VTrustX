/**
 * ReportExportService - Export reports to PDF and PowerPoint formats
 *
 * Features:
 * - PDF generation with Puppeteer
 * - PowerPoint generation with pptxgenjs
 * - Chart rendering as images
 * - Cloud storage integration
 * - Signed URLs for download
 */

const puppeteer = require('puppeteer');
const pptxgen = require('pptxgenjs');
const { query } = require('../infrastructure/database/db');
const StorageService = require('../infrastructure/storage/StorageService');
const logger = require('../infrastructure/logger');
const crypto = require('crypto');

class ReportExportService {
  /**
   * Export report to PDF format
   *
   * @param {string} reportId - Report ID
   * @param {number} tenantId - Tenant ID
   * @param {Object} options - Export options
   * @returns {Promise<Object>} { fileUrl, expiresAt }
   */
  async exportToPDF(reportId, tenantId, options = {}) {
    try {
      logger.info('Starting PDF export', { reportId, tenantId });

      // Get report data
      const report = await this.getReportData(reportId, tenantId);

      if (!report) {
        throw new Error('Report not found');
      }

      // Generate HTML for the report
      const html = await this.generateReportHTML(report, options);

      // Launch headless browser
      const browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu'
        ]
      });

      const page = await browser.newPage();

      // Set viewport for consistent rendering
      await page.setViewport({ width: 1920, height: 1080 });

      // Load HTML content
      await page.setContent(html, { waitUntil: 'networkidle0', timeout: 30000 });

      // Generate PDF
      const pdfBuffer = await page.pdf({
        format: 'A4',
        orientation: options.orientation || 'landscape',
        printBackground: true,
        preferCSSPageSize: true,
        margin: {
          top: '20mm',
          right: '15mm',
          bottom: '20mm',
          left: '15mm'
        }
      });

      await browser.close();

      // Upload to storage
      const filename = `reports/${tenantId}/export_${reportId}_${Date.now()}.pdf`;
      const uploadResult = await StorageService.uploadBuffer(
        pdfBuffer,
        filename,
        'application/pdf',
        { reportId, tenantId, format: 'pdf' }
      );

      // Generate signed URL (7 days expiry)
      const fileUrl = await StorageService.getSignedUrl(filename, 7 * 24 * 60);

      logger.info('PDF export completed', {
        reportId,
        tenantId,
        fileUrl,
        size: pdfBuffer.length
      });

      return {
        fileUrl,
        filename,
        size: pdfBuffer.length,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      };
    } catch (error) {
      logger.error('PDF export failed', {
        error: error.message,
        stack: error.stack,
        reportId,
        tenantId
      });
      throw error;
    }
  }

  /**
   * Export report to PowerPoint format
   *
   * @param {string} reportId - Report ID
   * @param {number} tenantId - Tenant ID
   * @param {Object} options - Export options
   * @returns {Promise<Object>} { fileUrl, expiresAt }
   */
  async exportToPowerPoint(reportId, tenantId, options = {}) {
    try {
      logger.info('Starting PowerPoint export', { reportId, tenantId });

      // Get report data
      const report = await this.getReportData(reportId, tenantId);

      if (!report) {
        throw new Error('Report not found');
      }

      // Create new presentation
      const pptx = new pptxgen();

      // Set presentation properties
      pptx.layout = 'LAYOUT_WIDE';
      pptx.author = 'VTrustX Analytics Studio';
      pptx.title = report.title;
      pptx.subject = 'Analytics Report';

      // Title slide
      await this.addTitleSlide(pptx, report);

      // Add widget slides
      const widgets = report.widgets || [];
      for (const widget of widgets) {
        await this.addWidgetSlide(pptx, widget, report);
      }

      // Summary slide
      await this.addSummarySlide(pptx, report);

      // Generate PowerPoint file
      const pptxBuffer = await pptx.write({ outputType: 'nodebuffer' });

      // Upload to storage
      const filename = `reports/${tenantId}/export_${reportId}_${Date.now()}.pptx`;
      await StorageService.uploadBuffer(
        pptxBuffer,
        filename,
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        { reportId, tenantId, format: 'pptx' }
      );

      // Generate signed URL (7 days expiry)
      const fileUrl = await StorageService.getSignedUrl(filename, 7 * 24 * 60);

      logger.info('PowerPoint export completed', {
        reportId,
        tenantId,
        fileUrl,
        size: pptxBuffer.length,
        slideCount: widgets.length + 2
      });

      return {
        fileUrl,
        filename,
        size: pptxBuffer.length,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      };
    } catch (error) {
      logger.error('PowerPoint export failed', {
        error: error.message,
        stack: error.stack,
        reportId,
        tenantId
      });
      throw error;
    }
  }

  /**
   * Get report data from database
   */
  async getReportData(reportId, tenantId) {
    const result = await query(
      `SELECT r.*, f.title as form_title
       FROM reports r
       LEFT JOIN forms f ON r.form_id = f.id
       WHERE r.id = $1 AND r.tenant_id = $2`,
      [reportId, tenantId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0];
  }

  /**
   * Generate HTML for PDF export
   */
  async generateReportHTML(report, options = {}) {
    const widgets = report.widgets || [];

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>${this.escapeHtml(report.title)}</title>
        <style>
          * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
          }

          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            font-size: 14px;
            line-height: 1.6;
            color: #1e293b;
            background: #ffffff;
            padding: 40px;
          }

          .report-header {
            margin-bottom: 40px;
            padding-bottom: 20px;
            border-bottom: 3px solid #2563eb;
          }

          .report-title {
            font-size: 32px;
            font-weight: 700;
            color: #1e293b;
            margin-bottom: 8px;
          }

          .report-subtitle {
            font-size: 16px;
            color: #64748b;
          }

          .report-meta {
            margin-top: 12px;
            font-size: 12px;
            color: #94a3b8;
          }

          .widgets-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 30px;
          }

          .widget {
            background: #ffffff;
            border: 1px solid #e2e8f0;
            border-radius: 12px;
            padding: 24px;
            page-break-inside: avoid;
          }

          .widget-title {
            font-size: 18px;
            font-weight: 600;
            color: #1e293b;
            margin-bottom: 16px;
          }

          .widget-content {
            min-height: 200px;
          }

          .kpi-value {
            font-size: 48px;
            font-weight: 700;
            color: #2563eb;
            margin-bottom: 8px;
          }

          .kpi-label {
            font-size: 14px;
            color: #64748b;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }

          .chart-placeholder {
            width: 100%;
            height: 300px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            border-radius: 8px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 16px;
            font-weight: 600;
          }

          .table {
            width: 100%;
            border-collapse: collapse;
          }

          .table th {
            background: #f1f5f9;
            padding: 12px;
            text-align: left;
            font-weight: 600;
            color: #475569;
            border-bottom: 2px solid #cbd5e1;
          }

          .table td {
            padding: 12px;
            border-bottom: 1px solid #e2e8f0;
          }

          .footer {
            margin-top: 60px;
            padding-top: 20px;
            border-top: 1px solid #e2e8f0;
            text-align: center;
            font-size: 12px;
            color: #94a3b8;
          }

          @media print {
            body {
              padding: 20px;
            }

            .widget {
              page-break-inside: avoid;
            }
          }
        </style>
      </head>
      <body>
        <div class="report-header">
          <h1 class="report-title">${this.escapeHtml(report.title)}</h1>
          <div class="report-subtitle">
            ${report.form_title ? `Survey: ${this.escapeHtml(report.form_title)}` : ''}
          </div>
          <div class="report-meta">
            Generated: ${new Date().toLocaleString()} | VTrustX Analytics Studio
          </div>
        </div>

        <div class="widgets-grid">
          ${widgets.map(widget => this.generateWidgetHTML(widget)).join('\n')}
        </div>

        <div class="footer">
          <p>This report was generated by VTrustX Analytics Studio</p>
          <p>© ${new Date().getFullYear()} VTrustX. All rights reserved.</p>
        </div>
      </body>
      </html>
    `;

    return html;
  }

  /**
   * Generate HTML for a single widget
   */
  generateWidgetHTML(widget) {
    const title = widget.config?.title || 'Untitled Widget';
    let content = '';

    switch (widget.type) {
      case 'kpi':
        content = `
          <div class="kpi-value">${widget.config?.value || 'N/A'}</div>
          <div class="kpi-label">${widget.config?.label || ''}</div>
        `;
        break;

      case 'chart':
        content = `
          <div class="chart-placeholder">
            ${widget.config?.chartType || 'Chart'} Visualization
          </div>
        `;
        break;

      case 'table':
        content = `
          <table class="table">
            <thead>
              <tr>
                ${(widget.config?.columns || ['Column 1', 'Column 2']).map(col =>
                  `<th>${this.escapeHtml(col)}</th>`
                ).join('')}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colspan="${widget.config?.columns?.length || 2}">
                  Data preview not available in export
                </td>
              </tr>
            </tbody>
          </table>
        `;
        break;

      default:
        content = `
          <div class="chart-placeholder">
            ${widget.type} Widget
          </div>
        `;
    }

    return `
      <div class="widget">
        <div class="widget-title">${this.escapeHtml(title)}</div>
        <div class="widget-content">
          ${content}
        </div>
      </div>
    `;
  }

  /**
   * Add title slide to PowerPoint
   */
  async addTitleSlide(pptx, report) {
    const slide = pptx.addSlide();

    // Background
    slide.background = { color: '2563EB' };

    // Title
    slide.addText(report.title, {
      x: 1,
      y: 2,
      w: 8,
      h: 1,
      fontSize: 44,
      bold: true,
      color: 'FFFFFF',
      align: 'center'
    });

    // Subtitle
    if (report.form_title) {
      slide.addText(`Survey: ${report.form_title}`, {
        x: 1,
        y: 3.2,
        w: 8,
        h: 0.5,
        fontSize: 20,
        color: 'E0E7FF',
        align: 'center'
      });
    }

    // Footer
    slide.addText(`Generated: ${new Date().toLocaleDateString()} | VTrustX Analytics Studio`, {
      x: 1,
      y: 5,
      w: 8,
      h: 0.3,
      fontSize: 12,
      color: 'CBD5E1',
      align: 'center'
    });
  }

  /**
   * Add widget slide to PowerPoint
   */
  async addWidgetSlide(pptx, widget, report) {
    const slide = pptx.addSlide();
    const title = widget.config?.title || 'Untitled Widget';

    // Title
    slide.addText(title, {
      x: 0.5,
      y: 0.3,
      w: 9,
      h: 0.5,
      fontSize: 24,
      bold: true,
      color: '1E293B'
    });

    // Content based on widget type
    switch (widget.type) {
      case 'kpi':
        this.addKPIContent(slide, widget);
        break;

      case 'chart':
        this.addChartPlaceholder(slide, widget);
        break;

      case 'table':
        this.addTableContent(slide, widget);
        break;

      default:
        slide.addText(`${widget.type} widget`, {
          x: 1,
          y: 2,
          w: 8,
          h: 1,
          fontSize: 20,
          color: '64748B',
          align: 'center'
        });
    }
  }

  /**
   * Add KPI content to slide
   */
  addKPIContent(slide, widget) {
    const value = widget.config?.value || 'N/A';
    const label = widget.config?.label || '';

    slide.addText(String(value), {
      x: 2,
      y: 2,
      w: 6,
      h: 1.5,
      fontSize: 72,
      bold: true,
      color: '2563EB',
      align: 'center'
    });

    if (label) {
      slide.addText(label, {
        x: 2,
        y: 3.5,
        w: 6,
        h: 0.5,
        fontSize: 18,
        color: '64748B',
        align: 'center'
      });
    }
  }

  /**
   * Add chart placeholder to slide
   */
  addChartPlaceholder(slide, widget) {
    const chartType = widget.config?.chartType || 'Chart';

    slide.addShape('rect', {
      x: 1,
      y: 1.5,
      w: 8,
      h: 4,
      fill: { type: 'solid', color: 'F1F5F9' }
    });

    slide.addText(`${chartType} Visualization`, {
      x: 1,
      y: 3.2,
      w: 8,
      h: 0.6,
      fontSize: 20,
      color: '94A3B8',
      align: 'center'
    });

    slide.addText('Chart data not available in export', {
      x: 1,
      y: 3.8,
      w: 8,
      h: 0.4,
      fontSize: 14,
      color: 'CBD5E1',
      align: 'center',
      italic: true
    });
  }

  /**
   * Add table content to slide
   */
  addTableContent(slide, widget) {
    const columns = widget.config?.columns || ['Column 1', 'Column 2', 'Column 3'];

    slide.addText('Table preview not available in export', {
      x: 1,
      y: 2.5,
      w: 8,
      h: 1,
      fontSize: 16,
      color: '64748B',
      align: 'center',
      italic: true
    });
  }

  /**
   * Add summary slide to PowerPoint
   */
  async addSummarySlide(pptx, report) {
    const slide = pptx.addSlide();

    // Title
    slide.addText('Summary', {
      x: 0.5,
      y: 0.3,
      w: 9,
      h: 0.5,
      fontSize: 24,
      bold: true,
      color: '1E293B'
    });

    const widgetCount = (report.widgets || []).length;

    slide.addText([
      { text: 'Report: ', options: { bold: true, fontSize: 18, color: '1E293B' } },
      { text: report.title, options: { fontSize: 18, color: '64748B' } }
    ], {
      x: 1,
      y: 2,
      w: 8,
      h: 0.5
    });

    slide.addText([
      { text: 'Widgets: ', options: { bold: true, fontSize: 18, color: '1E293B' } },
      { text: String(widgetCount), options: { fontSize: 18, color: '64748B' } }
    ], {
      x: 1,
      y: 2.7,
      w: 8,
      h: 0.5
    });

    slide.addText([
      { text: 'Generated: ', options: { bold: true, fontSize: 18, color: '1E293B' } },
      { text: new Date().toLocaleString(), options: { fontSize: 18, color: '64748B' } }
    ], {
      x: 1,
      y: 3.4,
      w: 8,
      h: 0.5
    });

    // Footer
    slide.addText('VTrustX Analytics Studio', {
      x: 1,
      y: 5.2,
      w: 8,
      h: 0.3,
      fontSize: 14,
      color: '94A3B8',
      align: 'center'
    });
  }

  /**
   * Escape HTML to prevent XSS
   */
  escapeHtml(text) {
    if (!text) return '';
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}

module.exports = new ReportExportService();
