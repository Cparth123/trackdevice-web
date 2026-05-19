import { BACKEND_URL } from './config';

export async function fetchIceServers(): Promise<RTCIceServer[]> {
  const response = await fetch(`${BACKEND_URL}/api/ice-servers`, {
    cache: 'no-store',
  });

  if (!response.ok) {
    return [{ urls: 'stun:stun.l.google.com:19302' }];
  }

  const data = (await response.json()) as { iceServers?: RTCIceServer[] };
  return data.iceServers?.length ? data.iceServers : [{ urls: 'stun:stun.l.google.com:19302' }];
}
