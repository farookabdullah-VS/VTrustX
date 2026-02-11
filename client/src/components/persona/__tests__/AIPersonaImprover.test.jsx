import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AIPersonaImprover } from '../AIPersonaImprover';
import axios from 'axios';

vi.mock('axios');

const mockSections = [
  { id: 'goals_1', type: 'list', title: 'Goals', data: ['Ship fast', 'Reduce bugs'] },
  { id: 'challenges_1', type: 'text', title: 'Challenges', content: 'Tight deadlines.' },
  { id: 'quote_1', type: 'quote', title: 'Quote', content: '"I need better tools."' },
  { id: 'demo_1', type: 'demographic', title: 'Demographic', data: [{ label: 'Gender', value: 'Female', icon: 'user' }] },
  { id: 'skills_1', type: 'skills', title: 'Skills', data: [{ id: 's1', label: 'Coding', value: 80 }] },
  { id: 'header_1', type: 'header', title: 'Identity', data: { name: 'Sarah', role: 'PM' } },
];

const defaultProps = {
  isOpen: true,
  onClose: vi.fn(),
  sections: mockSections,
  personaName: 'Sarah',
  personaRole: 'Product Manager',
  onApplySectionUpdate: vi.fn(),
};

describe('AIPersonaImprover', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns null when not open', () => {
    const { container } = render(<AIPersonaImprover {...defaultProps} isOpen={false} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders the panel when open', () => {
    render(<AIPersonaImprover {...defaultProps} />);
    expect(screen.getByText('AI Improver')).toBeInTheDocument();
  });

  it('shows improvable sections (excludes header)', () => {
    render(<AIPersonaImprover {...defaultProps} />);
    expect(screen.getByText('Goals')).toBeInTheDocument();
    expect(screen.getByText('Challenges')).toBeInTheDocument();
    expect(screen.getByText('Quote')).toBeInTheDocument();
    expect(screen.getByText('Demographic')).toBeInTheDocument();
    expect(screen.getByText('Skills')).toBeInTheDocument();
    // Header should not appear as improvable
    expect(screen.queryByText('Identity')).not.toBeInTheDocument();
  });

  it('toggles section checkboxes', () => {
    render(<AIPersonaImprover {...defaultProps} />);
    const checkboxes = screen.getAllByRole('checkbox');
    expect(checkboxes[0]).not.toBeChecked();
    fireEvent.click(checkboxes[0]);
    expect(checkboxes[0]).toBeChecked();
  });

  it('selects all sections', () => {
    render(<AIPersonaImprover {...defaultProps} />);
    fireEvent.click(screen.getByText('Select All'));
    const checkboxes = screen.getAllByRole('checkbox');
    checkboxes.forEach(cb => expect(cb).toBeChecked());
  });

  it('disables improve button when no sections or preset selected', () => {
    render(<AIPersonaImprover {...defaultProps} />);
    // Find the footer improve button (contains Wand2 icon)
    const footerButtons = screen.getAllByRole('button');
    const improveBtn = footerButtons.find(b => b.textContent.match(/Improve\s*$/));
    expect(improveBtn).toBeDisabled();
  });

  it('enables improve button when sections and preset selected', () => {
    render(<AIPersonaImprover {...defaultProps} />);
    // Select a section
    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[0]);
    // Select a preset
    fireEvent.click(screen.getByText('Make More Detailed'));

    const footerButtons = screen.getAllByRole('button');
    const improveBtn = footerButtons.find(b => b.textContent.includes('Improve (1)'));
    expect(improveBtn).not.toBeDisabled();
  });

  it('processes sections sequentially via API', async () => {
    axios.post
      .mockResolvedValueOnce({ data: { text: 'Better goal 1\nBetter goal 2' } })
      .mockResolvedValueOnce({ data: { text: 'Improved challenges text.' } });

    render(<AIPersonaImprover {...defaultProps} />);

    // Select goals and challenges
    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[0]); // Goals
    fireEvent.click(checkboxes[1]); // Challenges

    // Select preset
    fireEvent.click(screen.getByText('Make More Detailed'));

    // Click improve
    fireEvent.click(screen.getByText(/Improve \(2\)/));

    await waitFor(() => {
      expect(screen.getByText('Review Improvements')).toBeInTheDocument();
    });

    expect(axios.post).toHaveBeenCalledTimes(2);
  });

  it('accepts and applies a list result', async () => {
    const onApply = vi.fn();
    axios.post.mockResolvedValueOnce({ data: { text: 'Better goal 1\nBetter goal 2' } });

    render(<AIPersonaImprover {...defaultProps} onApplySectionUpdate={onApply} />);

    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[0]); // Goals
    fireEvent.click(screen.getByText('Make More Detailed'));
    fireEvent.click(screen.getByText(/Improve \(1\)/));

    await waitFor(() => {
      expect(screen.getByText('Review Improvements')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Accept'));
    expect(onApply).toHaveBeenCalledWith('goals_1', { data: ['Better goal 1', 'Better goal 2'] });
  });

  it('accepts and applies a text result', async () => {
    const onApply = vi.fn();
    axios.post.mockResolvedValueOnce({ data: { text: 'Improved challenge content.' } });

    render(<AIPersonaImprover {...defaultProps} onApplySectionUpdate={onApply} />);

    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[1]); // Challenges (text type)
    fireEvent.click(screen.getByText('Make More Detailed'));
    fireEvent.click(screen.getByText(/Improve \(1\)/));

    await waitFor(() => {
      expect(screen.getByText('Review Improvements')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Accept'));
    expect(onApply).toHaveBeenCalledWith('challenges_1', { content: 'Improved challenge content.' });
  });

  it('accepts and applies a demographic result', async () => {
    const onApply = vi.fn();
    axios.post.mockResolvedValueOnce({ data: { text: 'Gender: Male\nAge: 30' } });

    render(<AIPersonaImprover {...defaultProps} onApplySectionUpdate={onApply} />);

    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[3]); // Demographic
    fireEvent.click(screen.getByText('Make More Detailed'));
    fireEvent.click(screen.getByText(/Improve \(1\)/));

    await waitFor(() => {
      expect(screen.getByText('Review Improvements')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Accept'));
    expect(onApply).toHaveBeenCalledWith('demo_1', {
      data: [
        { label: 'Gender', value: 'Male', icon: 'user' },
        { label: 'Age', value: '30', icon: 'user' },
      ],
    });
  });

  it('accepts and applies a skills result', async () => {
    const onApply = vi.fn();
    axios.post.mockResolvedValueOnce({ data: { text: 'Coding: 90%\nDesign: 70%' } });

    render(<AIPersonaImprover {...defaultProps} onApplySectionUpdate={onApply} />);

    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[4]); // Skills
    fireEvent.click(screen.getByText('Make More Detailed'));
    fireEvent.click(screen.getByText(/Improve \(1\)/));

    await waitFor(() => {
      expect(screen.getByText('Review Improvements')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Accept'));
    expect(onApply).toHaveBeenCalledWith('skills_1', {
      data: [
        { id: 's1', label: 'Coding', value: 90 },
        { id: 's2', label: 'Design', value: 70 },
      ],
    });
  });

  it('rejects a result', async () => {
    axios.post.mockResolvedValueOnce({ data: { text: 'New text' } });

    render(<AIPersonaImprover {...defaultProps} />);

    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[1]); // Challenges
    fireEvent.click(screen.getByText('Make More Detailed'));
    fireEvent.click(screen.getByText(/Improve \(1\)/));

    await waitFor(() => {
      expect(screen.getByText('Reject')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Reject'));
    // Reject button disappears after rejection
    expect(screen.queryByText('Reject')).not.toBeInTheDocument();
  });

  it('accepts all pending results', async () => {
    const onApply = vi.fn();
    axios.post
      .mockResolvedValueOnce({ data: { text: 'G1\nG2' } })
      .mockResolvedValueOnce({ data: { text: 'Better challenges' } });

    render(<AIPersonaImprover {...defaultProps} onApplySectionUpdate={onApply} />);

    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[0]); // Goals
    fireEvent.click(checkboxes[1]); // Challenges
    fireEvent.click(screen.getByText('Make More Detailed'));
    fireEvent.click(screen.getByText(/Improve \(2\)/));

    await waitFor(() => {
      expect(screen.getByText('Accept All')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Accept All'));
    expect(onApply).toHaveBeenCalledTimes(2);
  });
});
