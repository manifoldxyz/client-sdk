export function logger(enabled: boolean) {
  return (...args: unknown[]): void => {
    if (enabled) {
      console.log('[Manifold SDK]', ...args);
    }
  };
}
