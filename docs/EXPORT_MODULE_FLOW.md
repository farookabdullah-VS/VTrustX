# Export Module - Visual Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          RayiX Export Module                               │
│                         Complete Data Flow Diagram                           │
└─────────────────────────────────────────────────────────────────────────────┘

┌───────────────────────────────────────────────────────────────────────────┐
│ 1. USER INITIATES EXPORT                                                  │
└───────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
                    ┌───────────────────────────────┐
                    │     ExportModal.jsx           │
                    │  ┌─────────────────────────┐  │
                    │  │ Raw Data      │ Active  │  │
                    │  │ Analytics     │         │  │
                    │  │ SPSS         │         │  │
                    │  │ SQL          │         │  │
                    │  └─────────────────────────┘  │
                    │                               │
                    │  Options:                     │
                    │  ☑ Format                    │
                    │  ☑ Filters                   │
                    │  ☑ Date Range                │
                    │  ☑ Configuration             │
                    └───────────────┬───────────────┘
                                    │
                                    ▼
┌───────────────────────────────────────────────────────────────────────────┐
│ 2. API REQUEST                                                            │
└───────────────────────────────────────────────────────────────────────────┘
                                    │
        POST /api/exports/{type}    │
        {                           │
          formId,                   │
          format,                   │
          options,                  │
          filters                   │
        }                           │
                                    ▼
                    ┌───────────────────────────────┐
                    │   exports.js (Routes)         │
                    │                               │
                    │  ✓ Authentication (JWT)       │
                    │  ✓ Authorization (Tenant)     │
                    │  ✓ Permission Check           │
                    │  ✓ Input Validation           │
                    └───────────────┬───────────────┘
                                    │
                                    ▼
┌───────────────────────────────────────────────────────────────────────────┐
│ 3. JOB CREATION                                                           │
└───────────────────────────────────────────────────────────────────────────┘
                                    │
                    ┌───────────────▼───────────────┐
                    │   ExportService.js            │
                    │                               │
                    │  createExportJob()            │
                    │  ├─ Generate Job ID           │
                    │  ├─ Store in Database         │
                    │  └─ Return Job ID             │
                    └───────────────┬───────────────┘
                                    │
                    ┌───────────────▼───────────────┐
                    │   export_jobs Table           │
                    │                               │
                    │  id: uuid                     │
                    │  tenant_id: uuid              │
                    │  form_id: uuid                │
                    │  export_type: 'raw'           │
                    │  format: 'xlsx'               │
                    │  status: 'pending' ◄─────────┐│
                    │  options: json                ││
                    │  filters: json                ││
                    └───────────────┬───────────────┘│
                                    │                │
                Response: 202 Accepted              │
                { jobId, statusUrl }                │
                                    │                │
                                    ▼                │
┌───────────────────────────────────────────────────────────────────────────┐
│ 4. ASYNC PROCESSING                                                       │
└───────────────────────────────────────────────────────────────────────────┘
                                    │                │
                    ┌───────────────▼───────────────┐│
                    │   processExport()             ││
                    │                               ││
                    │  Update: 'processing' ────────┘│
                    │                               │
                    │  Fetch Form Data              │
                    │  Fetch Submissions            │
                    │  Apply Filters                │
                    └───────────────┬───────────────┘
                                    │
                                    ▼
                    ┌───────────────────────────────┐
                    │   DataTransformer.js          │
                    │                               │
                    │  transform()                  │
                    │  ├─ Extract Questions         │
                    │  ├─ Parse Question Types      │
                    │  ├─ Transform Responses       │
                    │  ├─ Handle Checkboxes         │
                    │  ├─ Process Matrix            │
                    │  └─ Flatten Data              │
                    └───────────────┬───────────────┘
                                    │
                    ┌───────────────▼───────────────┐
                    │   Transformed Data            │
                    │                               │
                    │  {                            │
                    │    form: {...},               │
                    │    submissions: [...],        │
                    │    metadata: {...}            │
                    │  }                            │
                    └───────────────┬───────────────┘
                                    │
                                    ▼
┌─────────────────────────┬───────────────────┬──────────────────┬──────────┐
│                         │                   │                  │          │
│   RawDataExporter      │ AnalyticsExporter │  SPSSExporter   │ SQLExporter
│                         │                   │                  │          │
│   ┌─────────────────┐  │  ┌─────────────┐  │  ┌────────────┐  │  ┌─────┐ │
│   │ Excel (.xlsx)   │  │  │ PowerPoint  │  │  │ SPSS (.sav)│  │  │ SQL │ │
│   │ ┌─────────────┐ │  │  │ (.pptx)     │  │  │ Package    │  │  │Dump │ │
│   │ │ Workbook    │ │  │  │             │  │  │            │  │  │     │ │
│   │ │ - Responses │ │  │  │ Charts:     │  │  │ Files:     │  │  │With:│ │
│   │ │ - Metadata  │ │  │  │ - Pie       │  │  │ - data.csv │  │  │-Sch │ │
│   │ │ - Dict      │ │  │  │ - Bar       │  │  │ - .sps     │  │  │-Data│ │
│   │ │ - Styling   │ │  │  │ - Line      │  │  │ - README   │  │  │-Idx │ │
│   │ └─────────────┘ │  │  │             │  │  │            │  │  │     │ │
│   │                 │  │  │ Statistics  │  │  │ ZIP file   │  │  │     │ │
│   │ CSV (.csv)      │  │  │ Templates   │  │  │            │  │  │     │ │
│   │ - UTF-8 BOM     │  │  │             │  │  │            │  │  │     │ │
│   │ - Headers       │  │  │ Word (.docx)│  │  │            │  │  │     │ │
│   └─────────────────┘  │  │ Excel (.xlsx│  │  │            │  │  │     │ │
│                         │  └─────────────┘  │  └────────────┘  │  └─────┘ │
└─────────────┬───────────┴──────────┬────────┴────────┬─────────┴──────┬───┘
              │                      │                 │                │
              │                      │                 │                │
              ▼                      ▼                 ▼                ▼
        ┌──────────────────────────────────────────────────────────────────┐
        │                    File Buffer                                   │
        │  { buffer: Buffer, fileName: string, mimeType: string }         │
        └─────────────────────────────┬────────────────────────────────────┘
                                      │
                                      ▼
                      ┌───────────────────────────────┐
                      │   saveExportFile()            │
                      │                               │
                      │  Local Storage:               │
                      │  server/exports/              │
                      │  {jobId}_{filename}           │
                      │                               │
                      │  OR                           │
                      │                               │
                      │  Cloud Storage:               │
                      │  GCS / S3 / Azure             │
                      └───────────────┬───────────────┘
                                      │
                                      ▼
                      ┌───────────────────────────────┐
                      │   Update Job Status           │
                      │                               │
                      │  status: 'completed'          │
                      │  file_url: '/api/.../jobId'   │
                      │  completed_at: timestamp      │
                      └───────────────────────────────┘
                                      │
                                      │
┌─────────────────────────────────────────────────────────────────────────────┐
│ 5. CLIENT POLLING                                                           │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
              ┌───────────────────────┼───────────────────────┐
              │                       │                       │
              ▼                       ▼                       ▼
    GET /api/exports/jobs/:id   (Every 5 seconds)
              │                       │                       │
              ▼                       ▼                       ▼
        ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
        │ 'pending'   │────▶│'processing' │────▶│ 'completed' │
        └─────────────┘     └─────────────┘     └──────┬──────┘
                                                        │
                                                        │
                                      ┌─────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ 6. DOWNLOAD                                                                 │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
              GET /api/exports/download/:jobId
                                      │
                      ┌───────────────▼───────────────┐
                      │   Verify Job Ownership        │
                      │   Set Content Headers         │
                      │   Stream File to Response     │
                      └───────────────┬───────────────┘
                                      │
                                      ▼
                        ┌─────────────────────┐
                        │   Browser Download  │
                        │   file.xlsx         │
                        └─────────────────────┘
                                      │
                                      │
┌─────────────────────────────────────────────────────────────────────────────┐
│ 7. CLEANUP (Scheduled - Every 24 hours)                                    │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                      ┌───────────────▼───────────────┐
                      │   cleanupOldExports()         │
                      │                               │
                      │  Find jobs > 24 hours old     │
                      │  Delete database records      │
                      │  Delete export files          │
                      │  Free disk space              │
                      └───────────────────────────────┘


═════════════════════════════════════════════════════════════════════════════
                          EXPORT FORMAT DETAILS
═════════════════════════════════════════════════════════════════════════════

RAW DATA EXPORT               ANALYTICS EXPORT           SPSS EXPORT
─────────────────             ───────────────            ────────────
Excel (.xlsx)                 PowerPoint (.pptx)         SPSS Package (.zip)
├─ Sheet 1: Responses         ├─ Slide 1: Title          ├─ data.csv
│  ├─ submission_id           ├─ Slide 2: Summary        ├─ import_syntax.sps
│  ├─ submitted_at            ├─ Slide 3+: Questions     │  ├─ Variable defs
│  ├─ status                  │  ├─ Question title       │  ├─ Value labels
│  ├─ respondent_email        │  ├─ Chart (PNG)          │  ├─ Missing values
│  └─ Q1, Q2, Q3...           │  └─ Statistics           │  └─ Import commands
├─ Sheet 2: Metadata          └─ Template styling        └─ README.txt
│  ├─ Form info                                          
│  ├─ Export date             Word (.docx)               SQL EXPORT
│  └─ Total responses         ├─ Title page              ────────────
└─ Sheet 3: Questions         ├─ Summary section         SQL Dump (.sql)
   ├─ Question name           ├─ Question sections       ├─ CREATE TABLE
   ├─ Question text           └─ Tables & stats          ├─ INSERT data
   ├─ Question type                                      ├─ Indexes
   └─ Choices                 Excel (.xlsx)              └─ Relationships
                              ├─ Summary sheet           
CSV (.csv)                    └─ Question sheets         
├─ UTF-8 BOM                     ├─ Distribution
├─ Headers                       └─ Charts
└─ Data rows                  

═════════════════════════════════════════════════════════════════════════════
                            SECURITY FLOW
═════════════════════════════════════════════════════════════════════════════

Request ────▶ JWT Token ────▶ Authenticate ────▶ Authorize ────▶ Process
              verification    User exists       Tenant match    Export
                             Not expired        Has permission
                                                Can view form

═════════════════════════════════════════════════════════════════════════════
```

## Key Components Interaction

```
ExportModal (React)
    │
    ├──▶ POST /api/exports/{type}
    │
    └──▶ Poll GET /api/exports/jobs/:id
         │
         └──▶ Download GET /api/exports/download/:jobId

Server Side:
    │
    ├──▶ ExportService (Orchestrator)
    │    │
    │    ├──▶ DataTransformer (Processing)
    │    │
    │    ├──▶ RawDataExporter
    │    ├──▶ AnalyticsExporter
    │    ├──▶ SPSSExporter
    │    └──▶ SQLExporter
    │
    └──▶ export_jobs Table (PostgreSQL)
```

## Error Handling Flow

```
Error Occurs
    │
    ├──▶ Catch in processExport()
    │
    ├──▶ Update job status to 'failed'
    │
    ├──▶ Store error_message
    │
    └──▶ Client polls and receives error
         │
         └──▶ Display error to user
```

## Performance Optimization

```
Small Export (<1K responses)
    └──▶ Synchronous processing ────▶ Immediate response

Medium Export (1K-10K responses)
    └──▶ Async job ────▶ Background processing ────▶ Poll status

Large Export (>10K responses)
    └──▶ Async job ────▶ Chunked processing ────▶ Stream to file
```
