// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { RepositoryViewSwitcher } from '../RepositoryViewSwitcher';

describe('RepositoryViewSwitcher', () => {
  afterEach(() => {
    cleanup();
  });

  it('defaults to all when all is selected', () => {
    render(<RepositoryViewSwitcher value="all" onChange={() => undefined} />);

    expect(screen.getByRole('button', { name: 'すべて' }).getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByRole('button', { name: 'カンバン' }).getAttribute('aria-pressed')).toBe('false');
  });

  it('calls onChange with the selected mode', () => {
    const onChange = vi.fn();
    render(<RepositoryViewSwitcher value="all" onChange={onChange} />);

    fireEvent.click(screen.getByRole('button', { name: 'ロードマップ' }));

    expect(onChange).toHaveBeenCalledWith('roadmap');
  });

  it('marks the active button via aria-pressed', () => {
    render(<RepositoryViewSwitcher value="kanban" onChange={() => undefined} />);

    expect(screen.getByRole('button', { name: 'カンバン' }).getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByRole('button', { name: 'すべて' }).getAttribute('aria-pressed')).toBe('false');
  });
});
