import crypto from 'crypto';
import { runMatchFromLog } from './engine.js';

export const stableStringify = (value) => {
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(',')}]`;
  }
  if (value && typeof value === 'object') {
    const keys = Object.keys(value).sort();
    const body = keys.map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(',');
    return `{${body}}`;
  }
  return JSON.stringify(value);
};

export const hashEvents = (events) => {
  const hash = crypto.createHash('sha256');
  hash.update(stableStringify(events));
  return hash.digest('hex');
};

export const replayMatch = ({ seed, actors, actionLog }) => {
  const state = runMatchFromLog({ seed, actors, actionLog });
  return {
    state,
    eventHash: hashEvents(state.events),
  };
};
