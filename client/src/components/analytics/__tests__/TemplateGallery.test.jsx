/**
 * Unit tests for TemplateGallery component
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import axios from 'axios';
import { TemplateGallery } from '../templates/TemplateGallery';

// Mock axios
jest.mock('axios');

const mockTemplates = [
  {
    id: 1,
    name: 'NPS Overview Dashboard',
    description: 'Comprehensive NPS analysis',
    category: 'survey',
    usage_count: 50,
    widgets: [{}, {}, {}]
  },
  {
    id: 2,
    name: 'Delivery Performance',
    description: 'Multi-channel delivery metrics',
    category: 'delivery',
    usage_count: 30,
    widgets: [{}, {}]
  },
  {
    id: 3,
    name: 'Sentiment Analysis',
    description: 'Text analytics with sentiment',
    category: 'sentiment',
    usage_count: 20,
    widgets: [{}]
  }
];

describe('TemplateGallery', () => {
  const mockOnClose = jest.fn();
  const mockOnSelectTemplate = jest.fn();
  const surveyId = 'survey-123';

  beforeEach(() => {
    jest.clearAllMocks();
    axios.get.mockResolvedValue({ data: mockTemplates });
    axios.post.mockResolvedValue({
      data: {
        success: true,
        report: { id: 'report-123', title: 'New Report' }
      }
    });
  });

  describe('Rendering', () => {
    test('renders template gallery with title', async () => {
      render(
        <TemplateGallery
          surveyId={surveyId}
          onSelectTemplate={mockOnSelectTemplate}
          onClose={mockOnClose}
        />
      );

      expect(screen.getByText('Report Templates')).toBeInTheDocument();
      expect(screen.getByText(/Choose a pre-built template/i)).toBeInTheDocument();
    });

    test('displays loading state initially', () => {
      render(
        <TemplateGallery
          surveyId={surveyId}
          onSelectTemplate={mockOnSelectTemplate}
          onClose={mockOnClose}
        />
      );

      expect(screen.getByText('Loading templates...')).toBeInTheDocument();
    });

    test('displays templates after loading', async () => {
      render(
        <TemplateGallery
          surveyId={surveyId}
          onSelectTemplate={mockOnSelectTemplate}
          onClose={mockOnClose}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('NPS Overview Dashboard')).toBeInTheDocument();
        expect(screen.getByText('Delivery Performance')).toBeInTheDocument();
        expect(screen.getByText('Sentiment Analysis')).toBeInTheDocument();
      });
    });

    test('displays template metadata', async () => {
      render(
        <TemplateGallery
          surveyId={surveyId}
          onSelectTemplate={mockOnSelectTemplate}
          onClose={mockOnClose}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('3 widgets')).toBeInTheDocument();
        expect(screen.getByText('50 uses')).toBeInTheDocument();
      });
    });
  });

  describe('Category Filtering', () => {
    test('fetches all templates by default', async () => {
      render(
        <TemplateGallery
          surveyId={surveyId}
          onSelectTemplate={mockOnSelectTemplate}
          onClose={mockOnClose}
        />
      );

      await waitFor(() => {
        expect(axios.get).toHaveBeenCalledWith('/api/report-templates');
      });
    });

    test('filters by category when category button clicked', async () => {
      render(
        <TemplateGallery
          surveyId={surveyId}
          onSelectTemplate={mockOnSelectTemplate}
          onClose={mockOnClose}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('NPS Overview Dashboard')).toBeInTheDocument();
      });

      const surveyButton = screen.getByRole('button', { name: /survey/i });
      fireEvent.click(surveyButton);

      await waitFor(() => {
        expect(axios.get).toHaveBeenCalledWith('/api/report-templates?category=survey');
      });
    });

    test('displays category tabs', async () => {
      render(
        <TemplateGallery
          surveyId={surveyId}
          onSelectTemplate={mockOnSelectTemplate}
          onClose={mockOnClose}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('All Templates')).toBeInTheDocument();
        expect(screen.getByText(/Survey/i)).toBeInTheDocument();
        expect(screen.getByText(/Delivery/i)).toBeInTheDocument();
        expect(screen.getByText(/Sentiment/i)).toBeInTheDocument();
        expect(screen.getByText(/Mixed/i)).toBeInTheDocument();
      });
    });
  });

  describe('Search Functionality', () => {
    test('filters templates by search query', async () => {
      render(
        <TemplateGallery
          surveyId={surveyId}
          onSelectTemplate={mockOnSelectTemplate}
          onClose={mockOnClose}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('NPS Overview Dashboard')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText('Search templates...');
      fireEvent.change(searchInput, { target: { value: 'NPS' } });

      await waitFor(() => {
        expect(screen.getByText('NPS Overview Dashboard')).toBeInTheDocument();
        expect(screen.queryByText('Delivery Performance')).not.toBeInTheDocument();
      });
    });

    test('shows no results message when search has no matches', async () => {
      render(
        <TemplateGallery
          surveyId={surveyId}
          onSelectTemplate={mockOnSelectTemplate}
          onClose={mockOnClose}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('NPS Overview Dashboard')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText('Search templates...');
      fireEvent.change(searchInput, { target: { value: 'NonExistent' } });

      await waitFor(() => {
        expect(screen.getByText('No templates found')).toBeInTheDocument();
      });
    });
  });

  describe('Template Selection', () => {
    test('creates report when template is selected', async () => {
      render(
        <TemplateGallery
          surveyId={surveyId}
          onSelectTemplate={mockOnSelectTemplate}
          onClose={mockOnClose}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('NPS Overview Dashboard')).toBeInTheDocument();
      });

      const useButton = screen.getAllByText('Use This Template')[0];
      fireEvent.click(useButton);

      await waitFor(() => {
        expect(axios.post).toHaveBeenCalledWith(
          '/api/report-templates/1/create-report',
          expect.objectContaining({
            surveyId,
            title: expect.stringContaining('NPS Overview Dashboard')
          })
        );
      });

      expect(mockOnSelectTemplate).toHaveBeenCalledWith({
        id: 'report-123',
        title: 'New Report'
      });
    });

    test('shows alert if no surveyId provided', async () => {
      window.alert = jest.fn();

      render(
        <TemplateGallery
          surveyId={null}
          onSelectTemplate={mockOnSelectTemplate}
          onClose={mockOnClose}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('NPS Overview Dashboard')).toBeInTheDocument();
      });

      const useButton = screen.getAllByText('Use This Template')[0];
      fireEvent.click(useButton);

      expect(window.alert).toHaveBeenCalledWith('Please select a survey first');
      expect(axios.post).not.toHaveBeenCalled();
    });

    test('shows alert on template creation error', async () => {
      window.alert = jest.fn();
      axios.post.mockRejectedValueOnce(new Error('Creation failed'));

      render(
        <TemplateGallery
          surveyId={surveyId}
          onSelectTemplate={mockOnSelectTemplate}
          onClose={mockOnClose}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('NPS Overview Dashboard')).toBeInTheDocument();
      });

      const useButton = screen.getAllByText('Use This Template')[0];
      fireEvent.click(useButton);

      await waitFor(() => {
        expect(window.alert).toHaveBeenCalledWith('Failed to create report. Please try again.');
      });
    });
  });

  describe('Error Handling', () => {
    test('displays error message when fetch fails', async () => {
      axios.get.mockRejectedValueOnce(new Error('Network error'));

      render(
        <TemplateGallery
          surveyId={surveyId}
          onSelectTemplate={mockOnSelectTemplate}
          onClose={mockOnClose}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Failed to load templates. Please try again.')).toBeInTheDocument();
      });
    });

    test('retry button refetches templates', async () => {
      axios.get.mockRejectedValueOnce(new Error('Network error'));

      render(
        <TemplateGallery
          surveyId={surveyId}
          onSelectTemplate={mockOnSelectTemplate}
          onClose={mockOnClose}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Failed to load templates. Please try again.')).toBeInTheDocument();
      });

      axios.get.mockResolvedValueOnce({ data: mockTemplates });

      const retryButton = screen.getByText('Try Again');
      fireEvent.click(retryButton);

      await waitFor(() => {
        expect(screen.getByText('NPS Overview Dashboard')).toBeInTheDocument();
      });
    });
  });

  describe('Modal Interactions', () => {
    test('closes modal when close button clicked', async () => {
      render(
        <TemplateGallery
          surveyId={surveyId}
          onSelectTemplate={mockOnSelectTemplate}
          onClose={mockOnClose}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('NPS Overview Dashboard')).toBeInTheDocument();
      });

      const closeButton = screen.getByLabelText('Close template gallery');
      fireEvent.click(closeButton);

      expect(mockOnClose).toHaveBeenCalled();
    });

    test('closes modal when overlay clicked', async () => {
      const { container } = render(
        <TemplateGallery
          surveyId={surveyId}
          onSelectTemplate={mockOnSelectTemplate}
          onClose={mockOnClose}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('NPS Overview Dashboard')).toBeInTheDocument();
      });

      const overlay = container.querySelector('[role="dialog"]');
      fireEvent.click(overlay);

      expect(mockOnClose).toHaveBeenCalled();
    });

    test('does not close when modal content clicked', async () => {
      render(
        <TemplateGallery
          surveyId={surveyId}
          onSelectTemplate={mockOnSelectTemplate}
          onClose={mockOnClose}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('NPS Overview Dashboard')).toBeInTheDocument();
      });

      const title = screen.getByText('Report Templates');
      fireEvent.click(title);

      expect(mockOnClose).not.toHaveBeenCalled();
    });

    test('cancel button closes modal', async () => {
      render(
        <TemplateGallery
          surveyId={surveyId}
          onSelectTemplate={mockOnSelectTemplate}
          onClose={mockOnClose}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('NPS Overview Dashboard')).toBeInTheDocument();
      });

      const cancelButton = screen.getByText('Cancel');
      fireEvent.click(cancelButton);

      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    test('modal has proper ARIA attributes', async () => {
      render(
        <TemplateGallery
          surveyId={surveyId}
          onSelectTemplate={mockOnSelectTemplate}
          onClose={mockOnClose}
        />
      );

      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-modal', 'true');
      expect(dialog).toHaveAttribute('aria-labelledby', 'template-gallery-title');
    });

    test('close button has accessible label', async () => {
      render(
        <TemplateGallery
          surveyId={surveyId}
          onSelectTemplate={mockOnSelectTemplate}
          onClose={mockOnClose}
        />
      );

      const closeButton = screen.getByLabelText('Close template gallery');
      expect(closeButton).toBeInTheDocument();
    });
  });
});
