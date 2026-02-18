# Automated User Manual Generation

This project includes a tool to automatically generate a comprehensive User Manual with up-to-date screenshots of the application.

## Prerequisites

1.  **Build the Client**: The generator runs against the production build of the frontend.
    ```bash
    cd client
    npm run build
    cd ..
    ```

2.  **Database**: Ensure your local database is running and accessible (or Cloud SQL Proxy is active).

## How to Generate the Manual

We have provided a single command to capture screenshots and compile the PDF.

1.  Open a terminal in the `server` directory.
2.  Run the following command:

    ```bash
    npm run manual:all
    ```

### What this does:

1.  **Starts the Application**: It spins up the server locally.
2.  **Captures Screenshots**: Runs a Playwright script (`e2e/tests/manual_screenshots.spec.js`) that navigates to 10+ key pages (Dashboard, Survey Builder, Settings, etc.) and saves high-resolution screenshots to `manual-assets/`.
3.  **Compiles PDF**: Runs a Node.js script (`server/scripts/generate_manual_pdf.js`) that combines the screenshots with descriptions from `manual-config.json` into a professional PDF.

## Output

The final manual will be saved as:
**`USER_MANUAL.pdf`** in the project root.

## Customization

-   **Add Pages**: Edit `manual-config.json` in the root directory to add more pages or change descriptions.
-   **Change Styles**: Edit `server/scripts/generate_manual_pdf.js` to modify the PDF layout or styling.
