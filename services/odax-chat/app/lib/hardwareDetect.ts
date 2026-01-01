'use client';

/**
 * Hardware detection utility for OdaxAI
 * Collects CPU, GPU, and memory info for flex-worthy stats
 */

export interface HardwareInfo {
  cpu: {
    cores: number;
    architecture: string;
  };
  memory: {
    totalGB: number | null;
  };
  gpu: {
    renderer: string | null;
    vendor: string | null;
  };
  platform: string;
  userAgent: string;
}

/**
 * Detect hardware specifications
 * Works in browser environment only
 */
export function detectHardware(): HardwareInfo {
  if (typeof window === 'undefined') {
    return getDefaultHardwareInfo();
  }

  const info: HardwareInfo = {
    cpu: {
      cores: navigator.hardwareConcurrency || 0,
      architecture: getArchitecture(),
    },
    memory: {
      totalGB: (navigator as any).deviceMemory || null,
    },
    gpu: detectGPU(),
    platform: navigator.platform || 'Unknown',
    userAgent: navigator.userAgent,
  };

  return info;
}

/**
 * Get CPU architecture from user agent
 */
function getArchitecture(): string {
  const ua = navigator.userAgent.toLowerCase();

  if (ua.includes('arm64') || ua.includes('aarch64')) {
    return 'ARM64 (Apple Silicon)';
  }
  if (ua.includes('arm')) {
    return 'ARM';
  }
  if (ua.includes('x64') || ua.includes('x86_64') || ua.includes('amd64')) {
    return 'x64';
  }
  if (ua.includes('x86') || ua.includes('i386') || ua.includes('i686')) {
    return 'x86';
  }

  // Check platform for macOS
  if (navigator.platform === 'MacIntel') {
    // Could be Intel or Apple Silicon via Rosetta
    return 'x64/ARM64';
  }

  return 'Unknown';
}

/**
 * Detect GPU using WebGL
 */
function detectGPU(): { renderer: string | null; vendor: string | null } {
  try {
    const canvas = document.createElement('canvas');
    const gl =
      canvas.getContext('webgl') || canvas.getContext('experimental-webgl');

    if (!gl) {
      return { renderer: null, vendor: null };
    }

    const webgl = gl as WebGLRenderingContext;
    const debugInfo = webgl.getExtension('WEBGL_debug_renderer_info');

    if (!debugInfo) {
      return { renderer: null, vendor: null };
    }

    return {
      renderer: webgl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || null,
      vendor: webgl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) || null,
    };
  } catch {
    return { renderer: null, vendor: null };
  }
}

/**
 * Default hardware info for SSR
 */
function getDefaultHardwareInfo(): HardwareInfo {
  return {
    cpu: { cores: 0, architecture: 'Unknown' },
    memory: { totalGB: null },
    gpu: { renderer: null, vendor: null },
    platform: 'Unknown',
    userAgent: '',
  };
}

/**
 * Calculate performance metrics
 */
export interface PerformanceMetrics {
  tokensPerSecond: number;
  responseTimeMs: number;
  totalTokens: number;
}

export function calculatePerformance(
  totalTokens: number,
  responseTimeMs: number
): PerformanceMetrics {
  const tokensPerSecond =
    responseTimeMs > 0
      ? Math.round((totalTokens / responseTimeMs) * 1000 * 10) / 10
      : 0;

  return {
    tokensPerSecond,
    responseTimeMs,
    totalTokens,
  };
}

/**
 * Format hardware info for display
 */
export function formatHardwareForPost(hardware: HardwareInfo): string {
  const parts: string[] = [];

  if (hardware.cpu.cores > 0) {
    parts.push(`${hardware.cpu.cores}-core`);
  }

  if (hardware.cpu.architecture && hardware.cpu.architecture !== 'Unknown') {
    parts.push(hardware.cpu.architecture);
  }

  if (hardware.gpu.renderer) {
    // Shorten GPU name
    let gpuName = hardware.gpu.renderer;
    // Remove common prefixes
    gpuName = gpuName.replace(
      /^(ANGLE \(|Apple |NVIDIA |AMD |Intel\(R\) )/i,
      ''
    );
    gpuName = gpuName.replace(/\)$/, '');
    if (gpuName.length > 25) {
      gpuName = gpuName.slice(0, 25) + '...';
    }
    parts.push(gpuName);
  }

  if (hardware.memory.totalGB) {
    parts.push(`${hardware.memory.totalGB}GB RAM`);
  }

  return parts.join(' • ');
}
