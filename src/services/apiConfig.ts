/**
 * Universal API and Cloud Backend Configuration
 * Seamlessly connects custom domains (e.g. porshibari.shop) with the central cloud database
 */

export const CLOUD_BACKEND_ORIGIN = 'https://ais-pre-ny755zkybcxi6bzbhv5wie-395359099967.asia-east1.run.app';

export function getApiUrl(endpoint: string): string {
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;

  if (typeof window === 'undefined') {
    return cleanEndpoint;
  }

  const hostname = window.location.hostname.toLowerCase();

  // If accessed from custom domains or static CDNs, route to the active Central Cloud Server
  const isExternalDomain =
    hostname.includes('porshibari.shop') ||
    hostname.includes('vercel.app') ||
    hostname.includes('netlify.app') ||
    hostname.includes('pages.dev') ||
    hostname.includes('github.io') ||
    hostname.includes('firebaseapp.com') ||
    hostname.includes('web.app');

  if (isExternalDomain) {
    return `${CLOUD_BACKEND_ORIGIN}${cleanEndpoint}`;
  }

  return cleanEndpoint;
}
