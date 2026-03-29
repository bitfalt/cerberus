export function nowUnixSeconds() {
  return Math.floor(Date.now() / 1000);
}

export function durationMsToSeconds(durationMs: number) {
  return Math.floor(durationMs / 1000);
}
