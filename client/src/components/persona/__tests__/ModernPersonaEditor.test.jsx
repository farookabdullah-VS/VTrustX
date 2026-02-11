import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ModernPersonaEditor } from '../ModernPersonaEditor';
import axios from 'axios';

vi.mock('axios');

// Mock heavy child components
vi.mock('../PersonaCanvas', () => ({
  PersonaCanvas: ({ sections }) => (
    <div data-testid="persona-canvas">
      {sections.map(s => <div key={s.id}>{s.title}</div>)}
    </div>
  ),
}));

vi.mock('../PersonaHeader', () => ({
  PersonaHeader: () => <div data-testid="persona-header" />,
}));

vi.mock('../PersonaHelpModal', () => ({
  PersonaHelpModal: ({ onClose }) => <div data-testid="help-modal"><button onClick={onClose}>Close Help</button></div>,
}));

vi.mock('../ChannelSelectorModal', () => ({
  ChannelSelectorModal: () => null,
}));

vi.mock('../ChartEditorModal', () => ({
  ChartEditorModal: () => null,
}));

vi.mock('../DocumentSelectorModal', () => ({
  DocumentSelectorModal: () => null,
}));

vi.mock('../AIPersonaImprover', () => ({
  AIPersonaImprover: ({ isOpen }) => isOpen ? <div data-testid="ai-improver" /> : null,
}));

vi.mock('../AIPersonaChat', () => ({
  AIPersonaChat: ({ isOpen }) => isOpen ? <div data-testid="ai-chat" /> : null,
}));

vi.mock('html2canvas', () => ({
  default: vi.fn(),
}));

vi.mock('xlsx', () => ({
  utils: {
    json_to_sheet: vi.fn(() => ({})),
    book_new: vi.fn(() => ({})),
    book_append_sheet: vi.fn(),
  },
  writeFile: vi.fn(),
}));

const mockPersonaData = {
  id: 1,
  name: 'Test Persona',
  title: 'PM',
  persona_type: 'Rational',
  layout_config: [
    { id: 'header_1', type: 'header', title: 'Identity', data: { name: 'Sarah', role: 'PM' }, layout: { i: 'header_1', x: 0, y: 0, w: 12, h: 6 } },
    { id: 'goals_1', type: 'list', title: 'Goals', data: ['Ship fast'], layout: { i: 'goals_1', x: 0, y: 6, w: 6, h: 4 } },
  ],
};

describe('ModernPersonaEditor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    axios.get.mockImplementation((url) => {
      if (url.includes('cx-personas')) return Promise.resolve({ data: mockPersonaData });
      if (url.includes('forms')) return Promise.resolve({ data: [] });
      return Promise.resolve({ data: {} });
    });
  });

  it('renders toolbar buttons', () => {
    render(<ModernPersonaEditor personaId={1} onClose={vi.fn()} />);
    expect(screen.getByText('Persona Studio')).toBeInTheDocument();
    expect(screen.getByText('SAVE')).toBeInTheDocument();
    expect(screen.getByText('CLOSE')).toBeInTheDocument();
    expect(screen.getByText('PRINT')).toBeInTheDocument();
    expect(screen.getByText('Excel')).toBeInTheDocument();
    expect(screen.getByText('PNG')).toBeInTheDocument();
  });

  it('loads persona data on mount', async () => {
    render(<ModernPersonaEditor personaId={1} onClose={vi.fn()} />);
    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledWith('/api/cx-personas/1');
    });
  });

  it('saves persona via API', async () => {
    axios.put.mockResolvedValue({});
    window.alert = vi.fn();

    render(<ModernPersonaEditor personaId={1} onClose={vi.fn()} />);
    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledWith('/api/cx-personas/1');
    });

    fireEvent.click(screen.getByText('SAVE'));
    await waitFor(() => {
      expect(axios.put).toHaveBeenCalledWith('/api/cx-personas/1', expect.any(Object));
      expect(window.alert).toHaveBeenCalledWith('Saved successfully!');
    });
  });

  it('calls onClose when CLOSE is clicked (no dirty)', async () => {
    const onClose = vi.fn();
    render(<ModernPersonaEditor personaId={1} onClose={onClose} />);

    fireEvent.click(screen.getByText('CLOSE'));
    expect(onClose).toHaveBeenCalled();
  });

  it('warns about unsaved changes on close', async () => {
    const onClose = vi.fn();
    window.confirm = vi.fn().mockReturnValue(false);

    render(<ModernPersonaEditor personaId={1} onClose={onClose} />);
    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledWith('/api/cx-personas/1');
    });

    // Simulate a change by clicking a section add in the left panel
    // Use "Frustrations" which is unique (no duplicate in canvas)
    fireEvent.click(screen.getByText('Frustrations'));

    fireEvent.click(screen.getByText('CLOSE'));
    expect(window.confirm).toHaveBeenCalledWith('You have unsaved changes. Are you sure you want to close?');
    expect(onClose).not.toHaveBeenCalled();
  });

  it('shows alert on load failure', async () => {
    window.alert = vi.fn();
    axios.get.mockImplementation((url) => {
      if (url.includes('cx-personas')) return Promise.reject(new Error('fail'));
      return Promise.resolve({ data: [] });
    });

    render(<ModernPersonaEditor personaId={1} onClose={vi.fn()} />);
    await waitFor(() => {
      expect(window.alert).toHaveBeenCalledWith('Failed to load persona data.');
    });
  });

  it('opens AI Improver panel', async () => {
    render(<ModernPersonaEditor personaId={1} onClose={vi.fn()} />);
    fireEvent.click(screen.getByText('AI Improve'));
    expect(screen.getByTestId('ai-improver')).toBeInTheDocument();
  });

  it('opens AI Chat panel', async () => {
    render(<ModernPersonaEditor personaId={1} onClose={vi.fn()} />);
    fireEvent.click(screen.getByText('Chat'));
    expect(screen.getByTestId('ai-chat')).toBeInTheDocument();
  });

  it('opens Help modal', async () => {
    render(<ModernPersonaEditor personaId={1} onClose={vi.fn()} />);
    const helpBtn = screen.getByText('Help');
    fireEvent.click(helpBtn);
    expect(screen.getByTestId('help-modal')).toBeInTheDocument();
  });

  it('shows left panel tabs', () => {
    render(<ModernPersonaEditor personaId={1} onClose={vi.fn()} />);
    expect(screen.getByText('TEXT')).toBeInTheDocument();
    expect(screen.getByText('GRAPHS')).toBeInTheDocument();
    expect(screen.getByText('MEDIA')).toBeInTheDocument();
  });

  it('toggles left panel visibility', () => {
    render(<ModernPersonaEditor personaId={1} onClose={vi.fn()} />);
    // Explorer button toggles left panel
    const explorerBtn = screen.getByText('Explorer');
    fireEvent.click(explorerBtn);
    // Left panel content should be hidden
    expect(screen.queryByText('TEXT')).not.toBeInTheDocument();

    // Click again to show
    fireEvent.click(explorerBtn);
    expect(screen.getByText('TEXT')).toBeInTheDocument();
  });
});
