/**
 * Cloud Storage Service
 *
 * Handles file uploads to cloud storage providers:
 * - Google Drive
 * - Dropbox
 *
 * Requires OAuth tokens stored in database for each tenant
 */

const { google } = require('googleapis');
const { Dropbox } = require('dropbox');
const fs = require('fs');
const path = require('path');
const { query } = require('../../infrastructure/database/db');
const logger = require('../../infrastructure/logger');

/**
 * Upload file to Google Drive
 * @param {string} filePath - Local file path
 * @param {string} fileName - File name for Google Drive
 * @param {number} tenantId - Tenant ID
 * @returns {Promise<string>} File URL in Google Drive
 */
async function uploadToGoogleDrive(filePath, fileName, tenantId) {
  try {
    // Get tenant's Google Drive credentials
    const credentials = await getCloudCredentials(tenantId, 'google_drive');

    if (!credentials) {
      throw new Error('Google Drive not connected for this tenant');
    }

    // Initialize Google Drive API
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_DRIVE_CLIENT_ID,
      process.env.GOOGLE_DRIVE_CLIENT_SECRET,
      process.env.GOOGLE_DRIVE_REDIRECT_URI
    );

    oauth2Client.setCredentials({
      access_token: credentials.access_token,
      refresh_token: credentials.refresh_token
    });

    const drive = google.drive({ version: 'v3', auth: oauth2Client });

    // Create folder for exports if it doesn't exist
    const folderId = await getOrCreateFolder(drive, 'VTrustX Exports');

    // Upload file
    const fileMetadata = {
      name: fileName,
      parents: [folderId]
    };

    const media = {
      mimeType: getMimeType(fileName),
      body: fs.createReadStream(filePath)
    };

    const response = await drive.files.create({
      resource: fileMetadata,
      media: media,
      fields: 'id, webViewLink, webContentLink'
    });

    const fileId = response.data.id;
    const fileUrl = response.data.webViewLink;

    // Make file accessible (optional - configure based on requirements)
    await drive.permissions.create({
      fileId: fileId,
      requestBody: {
        role: 'reader',
        type: 'anyone'
      }
    });

    logger.info('[CloudStorageService] File uploaded to Google Drive', {
      tenantId,
      fileName,
      fileId,
      fileUrl
    });

    return fileUrl;

  } catch (error) {
    // Handle token expiration
    if (error.code === 401) {
      logger.warn('[CloudStorageService] Google Drive token expired, attempting refresh');
      // Token refresh logic would go here
    }

    logger.error('[CloudStorageService] Google Drive upload failed', {
      tenantId,
      fileName,
      error: error.message
    });
    throw error;
  }
}

/**
 * Upload file to Dropbox
 * @param {string} filePath - Local file path
 * @param {string} fileName - File name for Dropbox
 * @param {number} tenantId - Tenant ID
 * @returns {Promise<string>} Shared link URL
 */
async function uploadToDropbox(filePath, fileName, tenantId) {
  try {
    // Get tenant's Dropbox credentials
    const credentials = await getCloudCredentials(tenantId, 'dropbox');

    if (!credentials) {
      throw new Error('Dropbox not connected for this tenant');
    }

    // Initialize Dropbox client
    const dbx = new Dropbox({
      accessToken: credentials.access_token,
      refreshToken: credentials.refresh_token,
      clientId: process.env.DROPBOX_CLIENT_ID,
      clientSecret: process.env.DROPBOX_CLIENT_SECRET
    });

    // Read file
    const fileContent = fs.readFileSync(filePath);

    // Upload file
    const uploadPath = `/VTrustX Exports/${fileName}`;

    await dbx.filesUpload({
      path: uploadPath,
      contents: fileContent,
      mode: 'overwrite',
      autorename: true
    });

    // Create shared link
    const sharedLink = await dbx.sharingCreateSharedLinkWithSettings({
      path: uploadPath,
      settings: {
        requested_visibility: 'public',
        audience: 'public',
        access: 'viewer'
      }
    });

    const fileUrl = sharedLink.result.url;

    logger.info('[CloudStorageService] File uploaded to Dropbox', {
      tenantId,
      fileName,
      fileUrl
    });

    return fileUrl;

  } catch (error) {
    // Handle token expiration
    if (error.status === 401) {
      logger.warn('[CloudStorageService] Dropbox token expired, attempting refresh');
      // Token refresh logic would go here
    }

    logger.error('[CloudStorageService] Dropbox upload failed', {
      tenantId,
      fileName,
      error: error.message
    });
    throw error;
  }
}

/**
 * Get cloud storage credentials for a tenant
 */
async function getCloudCredentials(tenantId, provider) {
  try {
    const result = await query(
      `SELECT access_token, refresh_token, expires_at
       FROM cloud_storage_credentials
       WHERE tenant_id = $1 AND provider = $2 AND is_active = true`,
      [tenantId, provider]
    );

    return result.rows[0] || null;
  } catch (error) {
    logger.error('[CloudStorageService] Failed to get credentials', {
      tenantId,
      provider,
      error: error.message
    });
    return null;
  }
}

/**
 * Get or create a folder in Google Drive
 */
async function getOrCreateFolder(drive, folderName) {
  try {
    // Search for existing folder
    const response = await drive.files.list({
      q: `name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
      fields: 'files(id, name)',
      spaces: 'drive'
    });

    if (response.data.files.length > 0) {
      return response.data.files[0].id;
    }

    // Create folder if doesn't exist
    const fileMetadata = {
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder'
    };

    const folder = await drive.files.create({
      resource: fileMetadata,
      fields: 'id'
    });

    return folder.data.id;

  } catch (error) {
    logger.error('[CloudStorageService] Failed to get/create folder', {
      folderName,
      error: error.message
    });
    throw error;
  }
}

/**
 * Get MIME type from file extension
 */
function getMimeType(fileName) {
  const ext = path.extname(fileName).toLowerCase();
  const mimeTypes = {
    '.pdf': 'application/pdf',
    '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    '.xls': 'application/vnd.ms-excel',
    '.csv': 'text/csv',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.doc': 'application/msword',
    '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    '.ppt': 'application/vnd.ms-powerpoint',
    '.zip': 'application/zip',
    '.sav': 'application/x-spss-sav'
  };

  return mimeTypes[ext] || 'application/octet-stream';
}

/**
 * Delete file from cloud storage
 */
async function deleteFromCloudStorage(fileId, provider, tenantId) {
  try {
    const credentials = await getCloudCredentials(tenantId, provider);

    if (!credentials) {
      throw new Error(`${provider} not connected for this tenant`);
    }

    switch (provider) {
      case 'google_drive':
        const oauth2Client = new google.auth.OAuth2(
          process.env.GOOGLE_DRIVE_CLIENT_ID,
          process.env.GOOGLE_DRIVE_CLIENT_SECRET,
          process.env.GOOGLE_DRIVE_REDIRECT_URI
        );
        oauth2Client.setCredentials({
          access_token: credentials.access_token,
          refresh_token: credentials.refresh_token
        });
        const drive = google.drive({ version: 'v3', auth: oauth2Client });
        await drive.files.delete({ fileId });
        break;

      case 'dropbox':
        const dbx = new Dropbox({
          accessToken: credentials.access_token,
          refreshToken: credentials.refresh_token,
          clientId: process.env.DROPBOX_CLIENT_ID,
          clientSecret: process.env.DROPBOX_CLIENT_SECRET
        });
        await dbx.filesDeleteV2({ path: fileId });
        break;

      default:
        throw new Error(`Unsupported provider: ${provider}`);
    }

    logger.info('[CloudStorageService] File deleted', {
      tenantId,
      provider,
      fileId
    });

    return true;

  } catch (error) {
    logger.error('[CloudStorageService] File deletion failed', {
      tenantId,
      provider,
      fileId,
      error: error.message
    });
    throw error;
  }
}

/**
 * List files in cloud storage
 */
async function listCloudFiles(provider, tenantId, options = {}) {
  try {
    const { limit = 100, pageToken } = options;
    const credentials = await getCloudCredentials(tenantId, provider);

    if (!credentials) {
      throw new Error(`${provider} not connected for this tenant`);
    }

    let files = [];
    let nextPageToken = null;

    switch (provider) {
      case 'google_drive':
        const oauth2Client = new google.auth.OAuth2(
          process.env.GOOGLE_DRIVE_CLIENT_ID,
          process.env.GOOGLE_DRIVE_CLIENT_SECRET,
          process.env.GOOGLE_DRIVE_REDIRECT_URI
        );
        oauth2Client.setCredentials({
          access_token: credentials.access_token,
          refresh_token: credentials.refresh_token
        });
        const drive = google.drive({ version: 'v3', auth: oauth2Client });

        const response = await drive.files.list({
          q: "mimeType!='application/vnd.google-apps.folder' and trashed=false",
          pageSize: limit,
          pageToken: pageToken,
          fields: 'nextPageToken, files(id, name, size, createdTime, modifiedTime, webViewLink)',
          orderBy: 'modifiedTime desc'
        });

        files = response.data.files;
        nextPageToken = response.data.nextPageToken;
        break;

      case 'dropbox':
        const dbx = new Dropbox({
          accessToken: credentials.access_token,
          refreshToken: credentials.refresh_token,
          clientId: process.env.DROPBOX_CLIENT_ID,
          clientSecret: process.env.DROPBOX_CLIENT_SECRET
        });

        const result = await dbx.filesListFolder({
          path: '/VTrustX Exports',
          limit: limit
        });

        files = result.result.entries.map(entry => ({
          id: entry.id,
          name: entry.name,
          size: entry.size,
          modifiedTime: entry.client_modified
        }));
        break;
    }

    return { files, nextPageToken };

  } catch (error) {
    logger.error('[CloudStorageService] Failed to list files', {
      tenantId,
      provider,
      error: error.message
    });
    throw error;
  }
}

module.exports = {
  uploadToGoogleDrive,
  uploadToDropbox,
  deleteFromCloudStorage,
  listCloudFiles,
  getCloudCredentials
};
