import { describe, it, expect } from 'vitest';
import { getMilestoneMessage } from '../app/lib/socialService';

describe('getMilestoneMessage', () => {
  it('returns null below any milestone', () => {
    expect(getMilestoneMessage(0)).toBeNull();
    expect(getMilestoneMessage(5000)).toBeNull();
  });

  it('triggers 10K milestone', () => {
    const msg = getMilestoneMessage(10_000);
    expect(msg).toBeTruthy();
    expect(msg).toContain('10K');
  });

  it('triggers 50K milestone', () => {
    const msg = getMilestoneMessage(50_000);
    expect(msg).toBeTruthy();
    expect(msg).toContain('50K');
  });

  it('triggers 100K milestone', () => {
    const msg = getMilestoneMessage(100_000);
    expect(msg).toBeTruthy();
    expect(msg).toContain('100K');
  });

  it('triggers 500K milestone', () => {
    const msg = getMilestoneMessage(500_000);
    expect(msg).toBeTruthy();
    expect(msg).toContain('million');
  });

  it('triggers 1M milestone', () => {
    const msg = getMilestoneMessage(1_000_000);
    expect(msg).toBeTruthy();
    expect(msg).toContain('1M');
  });

  it('returns null when well past a milestone (no longer in 10% window)', () => {
    expect(getMilestoneMessage(20_000)).toBeNull();
    expect(getMilestoneMessage(200_000)).toBeNull();
  });

  it('returns message at exactly the threshold', () => {
    expect(getMilestoneMessage(10_000)).not.toBeNull();
    expect(getMilestoneMessage(50_000)).not.toBeNull();
    expect(getMilestoneMessage(100_000)).not.toBeNull();
  });
});
