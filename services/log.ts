type Level = 'debug' | 'info' | 'warn' | 'error';

const levelOrder: Record<Level, number> = { debug: 10, info: 20, warn: 30, error: 40 };
const envLevel = (import.meta as any).env?.VITE_LOG_LEVEL as Level || 'info';

const should = (lvl: Level) => levelOrder[lvl] >= levelOrder[envLevel];

export const log = {
  debug: (...args: any[]) => should('debug') && console.debug('[dbg]', ...args),
  info: (...args: any[]) => should('info') && console.info('[info]', ...args),
  warn: (...args: any[]) => should('warn') && console.warn('[warn]', ...args),
  error: (...args: any[]) => should('error') && console.error('[err]', ...args)
};

export async function withRetry<T>(fn: () => Promise<T>, opts: { retries?: number; baseDelayMs?: number; label?: string } = {}): Promise<T> {
  const { retries = 1, baseDelayMs = 200, label = 'op' } = opts;
  let attempt = 0;
  while (true) {
    try {
      return await fn();
    } catch (e) {
      attempt++;
      if (attempt > retries) throw e;
      const delay = baseDelayMs * attempt;
      log.warn(`[retry] ${label} tentativo ${attempt}/${retries} fallito. Ritento tra ${delay}ms`, e);
      await new Promise(r => setTimeout(r, delay));
    }
  }
}
