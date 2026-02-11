import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CxPersonaBuilder } from '../../CxPersonaBuilder';
import axios from 'axios';

vi.mock('axios');

// Mock child components to avoid their complexity
vi.mock('../ModernPersonaEditor', () => ({
  ModernPersonaEditor: ({ onClose }) => (
    <div data-testid="persona-editor">
      <button onClick={onClose}>Close Editor</button>
    </div>
  ),
}));

vi.mock('../AIPersonaGenerator', () => ({
  AIPersonaGenerator: ({ isOpen, onClose }) =>
    isOpen ? <div data-testid="ai-generator"><button onClick={onClose}>Close Generator</button></div> : null,
}));

const mockPersonas = [
  { id: 1, name: 'Sarah', title: 'PM', status: 'Active', updated_at: '2024-01-15T00:00:00Z' },
  { id: 2, name: 'Alex', title: 'Designer', status: 'Draft', updated_at: '2024-02-01T00:00:00Z' },
];

describe('CxPersonaBuilder', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    axios.get.mockResolvedValue({ data: mockPersonas });
  });

  it('renders heading and new persona button', async () => {
    render(<CxPersonaBuilder />);
    expect(screen.getByText('CX Personas')).toBeInTheDocument();
    expect(screen.getByText('New Persona')).toBeInTheDocument();
  });

  it('shows loading state initially', () => {
    axios.get.mockReturnValue(new Promise(() => {})); // Never resolves
    render(<CxPersonaBuilder />);
    expect(screen.getByText('Loading personas...')).toBeInTheDocument();
  });

  it('renders persona cards after loading', async () => {
    render(<CxPersonaBuilder />);
    await waitFor(() => {
      expect(screen.getByText('Sarah')).toBeInTheDocument();
      expect(screen.getByText('Alex')).toBeInTheDocument();
    });
  });

  it('shows persona status badge', async () => {
    render(<CxPersonaBuilder />);
    await waitFor(() => {
      expect(screen.getByText('Active')).toBeInTheDocument();
      expect(screen.getByText('Draft')).toBeInTheDocument();
    });
  });

  it('opens editor when persona card is clicked', async () => {
    render(<CxPersonaBuilder />);
    await waitFor(() => {
      expect(screen.getByText('Sarah')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Sarah'));
    expect(screen.getByTestId('persona-editor')).toBeInTheDocument();
  });

  it('shows create modal when New Persona is clicked', async () => {
    render(<CxPersonaBuilder />);
    await waitFor(() => {
      expect(screen.getByText('Sarah')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('New Persona'));
    // Modal has heading and three options
    expect(screen.getByText('Start Blank')).toBeInTheDocument();
    expect(screen.getByText('Use Template')).toBeInTheDocument();
    expect(screen.getByText('Generate with AI')).toBeInTheDocument();
    // "Create New Persona" appears in both ghost card and modal heading
    expect(screen.getAllByText('Create New Persona').length).toBeGreaterThanOrEqual(2);
  });

  it('deletes persona with confirmation', async () => {
    window.confirm = vi.fn().mockReturnValue(true);
    axios.delete.mockResolvedValue({});

    render(<CxPersonaBuilder />);
    await waitFor(() => {
      expect(screen.getByText('Sarah')).toBeInTheDocument();
    });

    // Find delete buttons (Trash2 icons)
    const deleteButtons = screen.getAllByTitle('Delete');
    fireEvent.click(deleteButtons[0]);

    expect(window.confirm).toHaveBeenCalled();
    expect(axios.delete).toHaveBeenCalledWith('/api/cx-personas/1');
  });

  it('does not delete when confirmation is cancelled', async () => {
    window.confirm = vi.fn().mockReturnValue(false);

    render(<CxPersonaBuilder />);
    await waitFor(() => {
      expect(screen.getByText('Sarah')).toBeInTheDocument();
    });

    const deleteButtons = screen.getAllByTitle('Delete');
    fireEvent.click(deleteButtons[0]);

    expect(window.confirm).toHaveBeenCalled();
    expect(axios.delete).not.toHaveBeenCalled();
  });

  it('shows error message when load fails', async () => {
    axios.get.mockRejectedValue(new Error('Network Error'));

    render(<CxPersonaBuilder />);
    await waitFor(() => {
      expect(screen.getByText('Failed to load personas. Please try again.')).toBeInTheDocument();
    });
  });

  it('shows retry button on load failure', async () => {
    axios.get.mockRejectedValueOnce(new Error('fail')).mockResolvedValueOnce({ data: mockPersonas });

    render(<CxPersonaBuilder />);
    await waitFor(() => {
      expect(screen.getByText('Retry')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Retry'));
    await waitFor(() => {
      expect(screen.getByText('Sarah')).toBeInTheDocument();
    });
  });

  it('creates blank persona and opens editor', async () => {
    axios.post.mockResolvedValue({ data: { id: 99 } });

    render(<CxPersonaBuilder />);
    await waitFor(() => {
      expect(screen.getByText('Sarah')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('New Persona'));
    fireEvent.click(screen.getByText('Start Blank'));

    await waitFor(() => {
      expect(screen.getByTestId('persona-editor')).toBeInTheDocument();
    });
  });

  it('shows ghost card for adding new persona', async () => {
    render(<CxPersonaBuilder />);
    await waitFor(() => {
      expect(screen.getByText('Create New Persona')).toBeInTheDocument();
    });
  });
});
