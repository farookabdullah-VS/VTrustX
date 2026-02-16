/**
 * Unit tests for ExportModal component
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import axios from 'axios';
import { ExportModal } from '../modals/ExportModal';

// Mock axios
jest.mock('axios');

// Mock window.open
global.window.open = jest.fn();

const mockReport = {
  id: 'report-123',
  title: 'Test Report',
  widgets: []
};

const mockExportResult = {
  fileUrl: 'https://storage.example.com/report.pdf',
  filename: 'report_123_1234567890.pdf',
  size: 102400,
  expiresAt: '2026-02-23T00:00:00.000Z'
};

describe('ExportModal', () => {
  const mockOnClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    window.open.mockClear();
  });

  describe('Rendering', () => {
    test('renders export modal with title', () => {
      render(<ExportModal report={mockReport} onClose={mockOnClose} />);

      expect(screen.getByText('Export Report')).toBeInTheDocument();
    });

    test('displays format selection buttons', () => {
      render(<ExportModal report={mockReport} onClose={mockOnClose} />);

      expect(screen.getByText('PDF Document')).toBeInTheDocument();
      expect(screen.getByText('PowerPoint')).toBeInTheDocument();
    });

    test('PDF format is selected by default', () => {
      const { container } = render(<ExportModal report={mockReport} onClose={mockOnClose} />);

      const pdfButton = screen.getByText('PDF Document').closest('button');
      expect(pdfButton).toHaveStyle({ background: '#eff6ff' });
    });

    test('displays PDF options when PDF format selected', () => {
      render(<ExportModal report={mockReport} onClose={mockOnClose} />);

      expect(screen.getByText('PDF Options')).toBeInTheDocument();
      expect(screen.getByText('Orientation')).toBeInTheDocument();
      expect(screen.getByText(/Include charts and visualizations/i)).toBeInTheDocument();
      expect(screen.getByText(/Include raw data tables/i)).toBeInTheDocument();
    });

    test('hides PDF options when PowerPoint format selected', () => {
      render(<ExportModal report={mockReport} onClose={mockOnClose} />);

      const pptxButton = screen.getByText('PowerPoint').closest('button');
      fireEvent.click(pptxButton);

      expect(screen.queryByText('PDF Options')).not.toBeInTheDocument();
    });
  });

  describe('Format Selection', () => {
    test('switches to PowerPoint format when clicked', () => {
      const { container } = render(<ExportModal report={mockReport} onClose={mockOnClose} />);

      const pptxButton = screen.getByText('PowerPoint').closest('button');
      fireEvent.click(pptxButton);

      expect(pptxButton).toHaveStyle({ background: '#eff6ff' });
    });

    test('switches back to PDF format', () => {
      render(<ExportModal report={mockReport} onClose={mockOnClose} />);

      const pptxButton = screen.getByText('PowerPoint').closest('button');
      fireEvent.click(pptxButton);

      const pdfButton = screen.getByText('PDF Document').closest('button');
      fireEvent.click(pdfButton);

      expect(pdfButton).toHaveStyle({ background: '#eff6ff' });
    });
  });

  describe('PDF Options', () => {
    test('changes orientation option', () => {
      render(<ExportModal report={mockReport} onClose={mockOnClose} />);

      const orientationSelect = screen.getByLabelText('Orientation');
      fireEvent.change(orientationSelect, { target: { value: 'portrait' } });

      expect(orientationSelect.value).toBe('portrait');
    });

    test('toggles include charts checkbox', () => {
      render(<ExportModal report={mockReport} onClose={mockOnClose} />);

      const chartsCheckbox = screen.getByLabelText(/Include charts and visualizations/i);
      expect(chartsCheckbox).toBeChecked();

      fireEvent.click(chartsCheckbox);
      expect(chartsCheckbox).not.toBeChecked();
    });

    test('toggles include data checkbox', () => {
      render(<ExportModal report={mockReport} onClose={mockOnClose} />);

      const dataCheckbox = screen.getByLabelText(/Include raw data tables/i);
      expect(dataCheckbox).not.toBeChecked();

      fireEvent.click(dataCheckbox);
      expect(dataCheckbox).toBeChecked();
    });
  });

  describe('Export Functionality', () => {
    test('exports PDF with correct endpoint', async () => {
      axios.post.mockResolvedValueOnce({ data: mockExportResult });

      render(<ExportModal report={mockReport} onClose={mockOnClose} />);

      const exportButton = screen.getByRole('button', { name: /Export/i });
      fireEvent.click(exportButton);

      await waitFor(() => {
        expect(axios.post).toHaveBeenCalledWith(
          '/api/analytics/reports/report-123/export/pdf',
          expect.objectContaining({
            orientation: 'landscape',
            includeCharts: true,
            includeData: false
          })
        );
      });
    });

    test('exports PowerPoint with correct endpoint', async () => {
      axios.post.mockResolvedValueOnce({ data: mockExportResult });

      render(<ExportModal report={mockReport} onClose={mockOnClose} />);

      const pptxButton = screen.getByText('PowerPoint').closest('button');
      fireEvent.click(pptxButton);

      const exportButton = screen.getByRole('button', { name: /Export/i });
      fireEvent.click(exportButton);

      await waitFor(() => {
        expect(axios.post).toHaveBeenCalledWith(
          '/api/analytics/reports/report-123/export/pptx',
          expect.any(Object)
        );
      });
    });

    test('shows loading state during export', async () => {
      axios.post.mockImplementationOnce(() => new Promise(resolve => setTimeout(resolve, 100)));

      render(<ExportModal report={mockReport} onClose={mockOnClose} />);

      const exportButton = screen.getByRole('button', { name: /Export/i });
      fireEvent.click(exportButton);

      expect(screen.getByText('Exporting...')).toBeInTheDocument();
      expect(exportButton).toBeDisabled();
    });

    test('displays success state after export', async () => {
      axios.post.mockResolvedValueOnce({ data: mockExportResult });

      render(<ExportModal report={mockReport} onClose={mockOnClose} />);

      const exportButton = screen.getByRole('button', { name: /Export/i });
      fireEvent.click(exportButton);

      await waitFor(() => {
        expect(screen.getByText('Export Ready!')).toBeInTheDocument();
        expect(screen.getByText('Your report has been exported successfully.')).toBeInTheDocument();
      });
    });

    test('displays file size and expiry in success state', async () => {
      axios.post.mockResolvedValueOnce({ data: mockExportResult });

      render(<ExportModal report={mockReport} onClose={mockOnClose} />);

      const exportButton = screen.getByRole('button', { name: /Export/i });
      fireEvent.click(exportButton);

      await waitFor(() => {
        expect(screen.getByText('100.00 KB')).toBeInTheDocument();
        expect(screen.getByText('2/23/2026')).toBeInTheDocument();
      });
    });

    test('download button opens file URL', async () => {
      axios.post.mockResolvedValueOnce({ data: mockExportResult });

      render(<ExportModal report={mockReport} onClose={mockOnClose} />);

      const exportButton = screen.getByRole('button', { name: /Export/i });
      fireEvent.click(exportButton);

      await waitFor(() => {
        expect(screen.getByText('Export Ready!')).toBeInTheDocument();
      });

      const downloadButton = screen.getByRole('button', { name: /Download Report/i });
      fireEvent.click(downloadButton);

      expect(window.open).toHaveBeenCalledWith(mockExportResult.fileUrl, '_blank');
    });
  });

  describe('Error Handling', () => {
    test('displays error message when export fails', async () => {
      axios.post.mockRejectedValueOnce({
        response: { data: { error: 'Export failed' } }
      });

      render(<ExportModal report={mockReport} onClose={mockOnClose} />);

      const exportButton = screen.getByRole('button', { name: /Export/i });
      fireEvent.click(exportButton);

      await waitFor(() => {
        expect(screen.getByText('Export failed')).toBeInTheDocument();
      });
    });

    test('displays generic error message on network failure', async () => {
      axios.post.mockRejectedValueOnce(new Error('Network error'));

      render(<ExportModal report={mockReport} onClose={mockOnClose} />);

      const exportButton = screen.getByRole('button', { name: /Export/i });
      fireEvent.click(exportButton);

      await waitFor(() => {
        expect(screen.getByText(/Failed to export report/i)).toBeInTheDocument();
      });
    });

    test('can retry after error', async () => {
      axios.post.mockRejectedValueOnce(new Error('Network error'));
      axios.post.mockResolvedValueOnce({ data: mockExportResult });

      render(<ExportModal report={mockReport} onClose={mockOnClose} />);

      const exportButton = screen.getByRole('button', { name: /Export/i });
      fireEvent.click(exportButton);

      await waitFor(() => {
        expect(screen.getByText(/Failed to export report/i)).toBeInTheDocument();
      });

      fireEvent.click(exportButton);

      await waitFor(() => {
        expect(screen.getByText('Export Ready!')).toBeInTheDocument();
      });
    });
  });

  describe('Modal Interactions', () => {
    test('closes modal when close button clicked', () => {
      render(<ExportModal report={mockReport} onClose={mockOnClose} />);

      const closeButton = screen.getByLabelText('Close export dialog');
      fireEvent.click(closeButton);

      expect(mockOnClose).toHaveBeenCalled();
    });

    test('closes modal when cancel button clicked', () => {
      render(<ExportModal report={mockReport} onClose={mockOnClose} />);

      const cancelButton = screen.getByText('Cancel');
      fireEvent.click(cancelButton);

      expect(mockOnClose).toHaveBeenCalled();
    });

    test('disables cancel button during export', async () => {
      axios.post.mockImplementationOnce(() => new Promise(resolve => setTimeout(resolve, 100)));

      render(<ExportModal report={mockReport} onClose={mockOnClose} />);

      const exportButton = screen.getByRole('button', { name: /Export/i });
      fireEvent.click(exportButton);

      const cancelButton = screen.getByText('Cancel');
      expect(cancelButton).toBeDisabled();
    });

    test('hides cancel button in success state', async () => {
      axios.post.mockResolvedValueOnce({ data: mockExportResult });

      render(<ExportModal report={mockReport} onClose={mockOnClose} />);

      const exportButton = screen.getByRole('button', { name: /Export/i });
      fireEvent.click(exportButton);

      await waitFor(() => {
        expect(screen.queryByText('Cancel')).not.toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    test('modal has proper ARIA attributes', () => {
      render(<ExportModal report={mockReport} onClose={mockOnClose} />);

      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-modal', 'true');
      expect(dialog).toHaveAttribute('aria-labelledby', 'export-modal-title');
    });

    test('close button has accessible label', () => {
      render(<ExportModal report={mockReport} onClose={mockOnClose} />);

      const closeButton = screen.getByLabelText('Close export dialog');
      expect(closeButton).toBeInTheDocument();
    });

    test('export button is keyboard accessible', () => {
      render(<ExportModal report={mockReport} onClose={mockOnClose} />);

      const exportButton = screen.getByRole('button', { name: /Export/i });
      expect(exportButton).toHaveProperty('type', 'button');
    });
  });
});
