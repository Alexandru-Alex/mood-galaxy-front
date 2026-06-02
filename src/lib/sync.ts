let _lastSync: Date | null = null;

export function getLastSync(): Date | null { return _lastSync; }

export function setLastSync(date: Date): void { _lastSync = date; }

export function relativeTime(date: Date): string {
  const mins = Math.floor((Date.now() - date.getTime()) / 60_000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} h ago`;
  return `${Math.floor(hours / 24)} d ago`;
}
