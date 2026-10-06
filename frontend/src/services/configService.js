/**
 * Config storage shared by POS and Waiter apps.
 * Storage key is namespaced by build mode so both apps
 * can ship independently without clashing.
 */

const IS_WAITER_BUILD =
  import.meta.env.VITE_WAITER_BUILD === 'true';

const STORAGE_KEY = IS_WAITER_BUILD
  ? 'safina_waiter_config'
  : 'safina_pos_config';

const DEFAULTS = {
  serverUrl: '',   // e.g. http://172.20.10.2:5000
  orgId: '',
  secret: '',
};

export function loadConfig() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULTS };
    const parsed = JSON.parse(raw);
    return { ...DEFAULTS, ...parsed };
  } catch {
    return { ...DEFAULTS };
  }
}

export function saveConfig(cfg) {
  const clean = {
    serverUrl: String(cfg.serverUrl || '').trim().replace(/\/$/, ''),
    orgId: String(cfg.orgId || '').trim(),
    secret: String(cfg.secret || '').trim(),
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(clean));
  return clean;
}

export function isConfigured() {
  const cfg = loadConfig();
  if (IS_WAITER_BUILD) {
    return Boolean(cfg.serverUrl && cfg.orgId && cfg.secret);
  }
  // POS only needs the server URL
  return Boolean(cfg.serverUrl);
}

export function clearConfig() {
  localStorage.removeItem(STORAGE_KEY);
}

/**
 * Validate the shape of a config before saving.
 * Returns { ok: true } or { ok: false, errors: { field: message } }
 */
export function validateConfig(cfg) {
  const errors = {};

  if (!cfg.serverUrl) {
    errors.serverUrl = 'Server URL is required';
  } else if (!/^https?:\/\//i.test(cfg.serverUrl)) {
    errors.serverUrl = 'URL must start with http:// or https://';
  } else if (!/:\d+/.test(cfg.serverUrl)) {
    errors.serverUrl = 'Include the port, e.g. http://192.168.1.10:5000';
  }

  // These are only required for the waiter build
  if (IS_WAITER_BUILD) {
    if (!cfg.orgId) {
      errors.orgId = 'Organization ID is required';
    } else if (cfg.orgId.length < 8) {
      errors.orgId = 'Looks too short — must be a UUID';
    }

    if (!cfg.secret) {
      errors.secret = 'Secret is required';
    } else if (cfg.secret.length < 6) {
      errors.secret = 'Secret looks too short';
    }
  }

  return Object.keys(errors).length
    ? { ok: false, errors }
    : { ok: true };
}