const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

// Paths relative to this script
const CONFIG_PATH = path.join(__dirname, '../../manual-config.json');
const ASSETS_DIR = path.join(__dirname, '../../manual-assets');
const OUTPUT_PATH = path.join(__dirname, '../../USER_MANUAL.pdf');

// Check dependencies
if (!fs.existsSync(CONFIG_PATH)) {
    console.error(`Config file not found at ${CONFIG_PATH}`);
    process.exit(1);
}

const config = require(CONFIG_PATH);

// Create PDF document
const doc = new PDFDocument({ margin: 50 });

// Pipe output to file
const stream = fs.createWriteStream(OUTPUT_PATH);
doc.pipe(stream);

// Add Title Page
doc.fontSize(30).text('VTrustX User Manual', { align: 'center' });
doc.moveDown();
doc.fontSize(16).text('Generated Documentation', { align: 'center' });
doc.moveDown();
doc.fontSize(12).text(new Date().toLocaleDateString(), { align: 'center' });
doc.addPage();

// Iterate through pages
config.forEach((page, index) => {
    // Add Title
    doc.fontSize(20).text(`${index + 1}. ${page.title}`, { underline: true });
    doc.moveDown(0.5);

    // Add Description
    doc.fontSize(12).text(page.description);
    doc.moveDown(1);

    // Check for screenshot
    const imagePath = path.join(ASSETS_DIR, page.filename);
    if (fs.existsSync(imagePath)) {
        try {
            // Fit image to page width (A4 width is ~595pt, margins 50pt each side -> 495pt available)
            doc.image(imagePath, {
                fit: [500, 400],
                align: 'center',
                valign: 'center'
            });
            doc.moveDown(1);
        } catch (e) {
            console.error(`Error embedding image ${page.filename}:`, e.message);
            doc.text(`(Error loading screenshot: ${page.filename})`, { color: 'red' });
        }
    } else {
        console.warn(`Screenshot missing: ${page.filename}`);
        doc.text(`(Screenshot not available)`, { color: 'gray', align: 'center' });
    }

    // Add placeholder for functions/buttons table if requested
    doc.moveDown(2);
    doc.fontSize(14).text('Key Functions:', { underline: true });
    doc.fontSize(10);
    doc.list([
        'Function 1: Description...',
        'Function 2: Description...'
    ]); // In a real scenario, this would come from config too.

    // Add new page for next item (unless asking for continuous flow, but full page screenshots are big)
    if (index < config.length - 1) {
        doc.addPage();
    }
});

// Finalize PDF
doc.end();

console.log(`Manual generated successfully at: ${OUTPUT_PATH}`);
