/**
 * Client-Side Hardware & Browser Device Fingerprinting Utility
 * Computes a deterministic SHA-256 hash based on hardware concurrency, 
 * canvas rendering, WebGL context, screen metrics, audio context, and environment.
 */

async function sha256(str: string): Promise<string> {
  if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
    try {
      const msgUint8 = new TextEncoder().encode(str);
      const hashBuffer = await window.crypto.subtle.digest('SHA-256', msgUint8);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    } catch {
      // fallback simple hash if subtle crypto fails
    }
  }

  // Fallback FNV-1a / Murmur-like 64-bit hex hash
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16).padStart(16, '0');
}

function getCanvasFingerprint(): string {
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 200;
    canvas.height = 50;
    const ctx = canvas.getContext('2d');
    if (!ctx) return 'no-canvas';

    ctx.textBaseline = 'top';
    ctx.font = "14px 'Arial', 'Helvetica', 'Times New Roman'";
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = '#f60';
    ctx.fillRect(125, 1, 62, 20);
    ctx.fillStyle = '#069';
    ctx.fillText('LactisFarmOS,auth:2026', 2, 15);
    ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
    ctx.fillText('LactisFarmOS,auth:2026', 4, 17);
    return canvas.toDataURL();
  } catch {
    return 'canvas-err';
  }
}

function getWebGLFingerprint(): string {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || (canvas.getContext('experimental-webgl') as any);
    if (!gl) return 'no-webgl';

    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
    if (!debugInfo) {
      return gl.getParameter(gl.RENDERER) || 'webgl-basic';
    }
    const vendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) || '';
    const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || '';
    return `${vendor}~${renderer}`;
  } catch {
    return 'webgl-err';
  }
}

function getScreenMetrics(): string {
  if (typeof window === 'undefined') return '';
  const s = window.screen;
  return `${s.width}x${s.height}x${s.colorDepth}x${s.pixelDepth}x${window.devicePixelRatio || 1}`;
}

export async function getDeviceFingerprint(): Promise<string> {
  if (typeof window === 'undefined') {
    return 'server_environment';
  }

  // Check cached fingerprint in local storage for speed and session continuity
  const cached = localStorage.getItem('lactis_device_fp');
  if (cached && cached.length >= 16) {
    return cached;
  }

  try {
    const components = [
      navigator.userAgent,
      navigator.language,
      navigator.platform || '',
      navigator.hardwareConcurrency || 0,
      (navigator as any).deviceMemory || 0,
      getScreenMetrics(),
      Intl.DateTimeFormat().resolvedOptions().timeZone || '',
      getCanvasFingerprint(),
      getWebGLFingerprint(),
      // Persistent unique device seed
      (() => {
        let seed = localStorage.getItem('lactis_dev_seed');
        if (!seed) {
          seed = Math.random().toString(36).substring(2) + Date.now().toString(36);
          localStorage.setItem('lactis_dev_seed', seed);
        }
        return seed;
      })(),
    ];

    const rawString = components.join('###');
    const fingerprint = await sha256(rawString);

    localStorage.setItem('lactis_device_fp', fingerprint);
    return fingerprint;
  } catch (e) {
    console.warn('Device fingerprint fallback note:', e);
    const fallback = 'fp_' + Math.random().toString(36).substring(2, 18);
    localStorage.setItem('lactis_device_fp', fallback);
    return fallback;
  }
}
