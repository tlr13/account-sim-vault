import { describe, expect, it } from 'vitest';
import { reorderProjectList, type ProjectItem } from '../types/models';

const makeProject = (id: string, name: string): ProjectItem => ({
  id,
  name,
  email: `${id}@gmail.com`,
  accountId: '',
  notes: '',
  updatedAt: '2026-11-25T00:00:00.000Z',
});

describe('reorderProjectList', () => {
  const base = [
    makeProject('p1', 'Bikin Web'),
    makeProject('p2', 'Project Tracker'),
    makeProject('p3', 'Lamar Kerja'),
    makeProject('p4', 'Freelance'),
  ];

  it('moves a row down after a target row', () => {
    const next = reorderProjectList(base, 'p1', 'p3', 'after');
    expect(next.map((p) => p.id)).toEqual(['p2', 'p3', 'p1', 'p4']);
  });

  it('moves a row up before a target row', () => {
    const next = reorderProjectList(base, 'p4', 'p1', 'before');
    expect(next.map((p) => p.id)).toEqual(['p4', 'p1', 'p2', 'p3']);
  });

  it('returns the same reference when dropping into an unchanged position', () => {
    expect(reorderProjectList(base, 'p1', 'p2', 'before')).toBe(base);
    expect(reorderProjectList(base, 'p2', 'p1', 'after')).toBe(base);
    expect(reorderProjectList(base, 'p2', 'p2', 'before')).toBe(base);
  });

  it('preserves hidden items cleanly when reordering two non-adjacent rows', () => {
    const next = reorderProjectList(base, 'p4', 'p2', 'before');
    expect(next.map((p) => p.id)).toEqual(['p1', 'p4', 'p2', 'p3']);
  });
});
