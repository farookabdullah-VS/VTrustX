const express = require('express');
const router = express.Router();
const { query } = require('../../infrastructure/database/db');
const authenticate = require('../middleware/auth');

// Export CJM as PDF (server-side)
router.post('/pdf', authenticate, async (req, res) => {
    try {
        const tenantId = req.user.tenant_id;
        const { mapId } = req.body;
        if (!mapId) return res.status(400).json({ error: 'mapId required' });

        const result = await query("SELECT * FROM cjm_maps WHERE id = $1 AND tenant_id = $2", [mapId, tenantId]);
        if (result.rows.length === 0) return res.status(404).json({ error: "Map not found" });

        const map = result.rows[0];
        const data = map.data || {};
        const stages = data.stages || [];
        const sections = data.sections || [];

        // Build PDF using pdfkit if available, otherwise return JSON summary
        try {
            const PDFDocument = require('pdfkit');
            const doc = new PDFDocument({ layout: 'landscape', size: 'A3' });

            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename="${map.title.replace(/[^a-zA-Z0-9]/g, '_')}.pdf"`);
            doc.pipe(res);

            // Title
            doc.fontSize(24).font('Helvetica-Bold').text(map.title, 50, 50);
            doc.fontSize(12).font('Helvetica').text(map.description || '', 50, 80);
            doc.moveDown(2);

            // Stage headers
            const stageWidth = Math.min(180, (doc.page.width - 200) / Math.max(stages.length, 1));
            let startX = 200;
            doc.fontSize(10).font('Helvetica-Bold');
            stages.forEach((stage, i) => {
                doc.text(stage.name, startX + (i * stageWidth), 120, { width: stageWidth - 10, align: 'center' });
            });

            // Sections
            let yPos = 150;
            doc.fontSize(9).font('Helvetica');
            sections.forEach(section => {
                if (yPos > doc.page.height - 100) {
                    doc.addPage({ layout: 'landscape', size: 'A3' });
                    yPos = 50;
                }
                doc.font('Helvetica-Bold').text(section.title || section.type, 20, yPos, { width: 170 });
                doc.font('Helvetica');
                stages.forEach((stage, i) => {
                    const cell = section.cells?.[stage.id] || {};
                    let cellText = '';
                    if (cell.value !== undefined) cellText = String(cell.value);
                    if (cell.items) cellText = cell.items.map(it => it.label || it).join(', ');
                    if (cell.note) cellText += ` (${cell.note})`;
                    doc.text(cellText || '-', startX + (i * stageWidth), yPos, { width: stageWidth - 10, height: 40 });
                });
                yPos += 50;
            });

            doc.end();
        } catch (pdfErr) {
            // pdfkit not available - return JSON export as fallback
            console.warn("[CJM Export] pdfkit not available, returning JSON:", pdfErr.message);
            res.json({ title: map.title, stages, sections, exportedAt: new Date() });
        }
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Export CJM as PowerPoint
router.post('/pptx', authenticate, async (req, res) => {
    try {
        const tenantId = req.user.tenant_id;
        const { mapId } = req.body;
        if (!mapId) return res.status(400).json({ error: 'mapId required' });

        const result = await query("SELECT * FROM cjm_maps WHERE id = $1 AND tenant_id = $2", [mapId, tenantId]);
        if (result.rows.length === 0) return res.status(404).json({ error: "Map not found" });

        const map = result.rows[0];
        const data = map.data || {};

        try {
            const PptxGenJS = require('pptxgenjs');
            const pptx = new PptxGenJS();
            pptx.title = map.title;
            pptx.layout = 'LAYOUT_WIDE';

            // Title slide
            const titleSlide = pptx.addSlide();
            titleSlide.addText(map.title, { x: 1, y: 1.5, w: 11, h: 1.5, fontSize: 36, bold: true, color: '1e293b' });
            titleSlide.addText(map.description || 'Customer Journey Map', { x: 1, y: 3, w: 11, h: 1, fontSize: 18, color: '64748b' });

            // Journey overview slide
            const stages = data.stages || [];
            const sections = data.sections || [];

            if (stages.length > 0) {
                const overviewSlide = pptx.addSlide();
                overviewSlide.addText('Journey Stages', { x: 0.5, y: 0.3, w: 12, h: 0.5, fontSize: 20, bold: true, color: '1e293b' });

                const colW = Math.min(2, 12 / Math.max(stages.length, 1));
                stages.forEach((stage, i) => {
                    overviewSlide.addShape(pptx.ShapeType.roundRect, {
                        x: 0.3 + (i * colW), y: 1.2, w: colW - 0.2, h: 0.8,
                        fill: { color: (stage.style?.bg_color || '#f0f4ff').replace('#', '') },
                        line: { color: 'e2e8f0' }
                    });
                    overviewSlide.addText(stage.name, {
                        x: 0.3 + (i * colW), y: 1.2, w: colW - 0.2, h: 0.8,
                        fontSize: 11, align: 'center', valign: 'middle', bold: true
                    });
                });

                // Section data
                sections.forEach((section, sIdx) => {
                    const yOff = 2.5 + (sIdx * 0.7);
                    if (yOff < 7) {
                        overviewSlide.addText(section.title || section.type, { x: 0.3, y: yOff, w: 2, h: 0.5, fontSize: 9, bold: true });
                        stages.forEach((stage, i) => {
                            const cell = section.cells?.[stage.id] || {};
                            let txt = cell.value !== undefined ? String(cell.value) : '';
                            if (cell.items) txt = cell.items.map(it => it.label || it).join(', ');
                            overviewSlide.addText(txt || '-', {
                                x: 0.3 + (i * colW), y: yOff, w: colW - 0.2, h: 0.5,
                                fontSize: 8, color: '475569'
                            });
                        });
                    }
                });
            }

            const pptxData = await pptx.write({ outputType: 'nodebuffer' });
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.presentationml.presentation');
            res.setHeader('Content-Disposition', `attachment; filename="${map.title.replace(/[^a-zA-Z0-9]/g, '_')}.pptx"`);
            res.send(Buffer.from(pptxData));
        } catch (pptxErr) {
            console.warn("[CJM Export] pptxgenjs not available:", pptxErr.message);
            res.status(501).json({ error: 'PowerPoint export not available. Install pptxgenjs.' });
        }
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Export CJM as Excel (JSON data for client-side xlsx generation)
router.post('/excel-data', authenticate, async (req, res) => {
    try {
        const tenantId = req.user.tenant_id;
        const { mapId } = req.body;
        if (!mapId) return res.status(400).json({ error: 'mapId required' });

        const result = await query("SELECT * FROM cjm_maps WHERE id = $1 AND tenant_id = $2", [mapId, tenantId]);
        if (result.rows.length === 0) return res.status(404).json({ error: "Map not found" });

        const map = result.rows[0];
        const data = map.data || {};
        const stages = data.stages || [];
        const sections = data.sections || [];

        // Build tabular data
        const rows = [];
        const header = ['Section', ...stages.map(s => s.name)];
        rows.push(header);

        sections.forEach(section => {
            const row = [section.title || section.type];
            stages.forEach(stage => {
                const cell = section.cells?.[stage.id] || {};
                let val = '';
                if (cell.value !== undefined) val = String(cell.value);
                if (cell.items) val = cell.items.map(it => it.label || it).join(', ');
                if (cell.note) val += val ? ` (${cell.note})` : cell.note;
                row.push(val || '');
            });
            rows.push(row);
        });

        res.json({ title: map.title, rows });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

module.exports = router;
