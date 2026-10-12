import Mapbox from '@rnmapbox/maps';

const TOKEN = process.env.EXPO_PUBLIC_MAPBOX_TOKEN;

export function initMapbox(): void {
  if (!TOKEN) {
    throw new Error('EXPO_PUBLIC_MAPBOX_TOKEN is not set');
  }
  Mapbox.setAccessToken(TOKEN);
}