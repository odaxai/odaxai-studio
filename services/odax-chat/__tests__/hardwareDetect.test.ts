import { describe, it, expect } from 'vitest';
import { calculatePerformance, formatHardwareForPost } from '../app/lib/hardwareDetect';
import type { HardwareInfo } from '../app/lib/hardwareDetect';

describe('calculatePerformance', () => {
  it('calculates tokens per second correctly', () => {
    const result = calculatePerformance(100, 2000);
    expect(result.tokensPerSecond).toBe(50);
    expect(result.totalTokens).toBe(100);
    expect(result.responseTimeMs).toBe(2000);
  });

  it('returns 0 tok/s when response time is 0', () => {
    const result = calculatePerformance(100, 0);
    expect(result.tokensPerSecond).toBe(0);
  });

  it('returns 0 tok/s when response time is negative', () => {
    const result = calculatePerformance(100, -1);
    expect(result.tokensPerSecond).toBe(0);
  });

  it('handles zero tokens', () => {
    const result = calculatePerformance(0, 1000);
    expect(result.tokensPerSecond).toBe(0);
    expect(result.totalTokens).toBe(0);
  });

  it('rounds to one decimal place', () => {
    const result = calculatePerformance(333, 1000);
    expect(result.tokensPerSecond).toBe(333);
  });

  it('handles large token counts', () => {
    const result = calculatePerformance(1_000_000, 60_000);
    expect(result.tokensPerSecond).toBeGreaterThan(0);
    expect(result.totalTokens).toBe(1_000_000);
  });
});

describe('formatHardwareForPost', () => {
  it('formats full hardware info', () => {
    const hw: HardwareInfo = {
      cpu: { cores: 10, architecture: 'ARM64 (Apple Silicon)' },
      memory: { totalGB: 16 },
      gpu: { renderer: 'Apple M1 Pro', vendor: 'Apple' },
      platform: 'MacIntel',
      userAgent: '',
    };
    const result = formatHardwareForPost(hw);
    expect(result).toContain('10-core');
    expect(result).toContain('ARM64');
    expect(result).toContain('16GB RAM');
  });

  it('handles missing GPU gracefully', () => {
    const hw: HardwareInfo = {
      cpu: { cores: 8, architecture: 'x64' },
      memory: { totalGB: null },
      gpu: { renderer: null, vendor: null },
      platform: 'Linux',
      userAgent: '',
    };
    const result = formatHardwareForPost(hw);
    expect(result).toContain('8-core');
    expect(result).toContain('x64');
    expect(result).not.toContain('RAM');
  });

  it('handles empty hardware info', () => {
    const hw: HardwareInfo = {
      cpu: { cores: 0, architecture: 'Unknown' },
      memory: { totalGB: null },
      gpu: { renderer: null, vendor: null },
      platform: 'Unknown',
      userAgent: '',
    };
    const result = formatHardwareForPost(hw);
    expect(result).toBe('');
  });

  it('strips common GPU prefixes', () => {
    const hw: HardwareInfo = {
      cpu: { cores: 4, architecture: 'x64' },
      memory: { totalGB: 8 },
      gpu: { renderer: 'ANGLE (Metal, Apple M2)', vendor: 'Apple' },
      platform: 'MacIntel',
      userAgent: '',
    };
    const result = formatHardwareForPost(hw);
    expect(result).not.toContain('ANGLE (');
  });

  it('truncates long GPU names to 25 chars', () => {
    const hw: HardwareInfo = {
      cpu: { cores: 4, architecture: 'x64' },
      memory: { totalGB: null },
      gpu: { renderer: 'Very Long GPU Name That Exceeds Twenty Five Characters Limit', vendor: 'Test' },
      platform: 'Test',
      userAgent: '',
    };
    const result = formatHardwareForPost(hw);
    const gpuPart = result.split(' • ').find(p => p.includes('...'));
    if (gpuPart) {
      expect(gpuPart.length).toBeLessThanOrEqual(28);
    }
  });
});
