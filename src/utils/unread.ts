const unreadByRide: Record<string, boolean> = {};

export function setUnread(rideId: string, value: boolean) {
  unreadByRide[rideId] = value;
}

export function getUnread(rideId?: string | null): boolean {
  return rideId ? !!unreadByRide[rideId] : false;
}

export function clearUnread(rideId?: string | null) {
  if (rideId) {
    delete unreadByRide[rideId];
  }
}