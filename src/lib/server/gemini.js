const PLACEHOLDER_PREFIX = 'masukkan_';
const DEFAULT_GEMINI_MODEL = 'gemini-2.5-flash';

function normalizeEnvValue(value) {
  if (typeof value !== 'string') {
    return '';
  }

  const normalized = value.trim();
  if (!normalized || normalized.startsWith(PLACEHOLDER_PREFIX)) {
    return '';
  }

  return normalized;
}

function splitEnvList(value) {
  return normalizeEnvValue(value)
    .split(/[\r\n,]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function getConfiguredGeminiApiKeys() {
  return [
    ...new Set(
      [
        normalizeEnvValue(process.env.GEMINI_API_KEY),
        normalizeEnvValue(process.env.GOOGLE_API_KEY),
        ...splitEnvList(process.env.GEMINI_API_KEYS),
      ].filter(Boolean)
    ),
  ];
}

export function hasConfiguredGeminiApiKey() {
  return getConfiguredGeminiApiKeys().length > 0;
}

export function getConfiguredGeminiModels() {
  return [
    ...new Set(
      [
        normalizeEnvValue(process.env.GEMINI_MODEL),
        normalizeEnvValue(process.env.GOOGLE_GENERATIVE_AI_MODEL),
        DEFAULT_GEMINI_MODEL,
      ].filter(Boolean)
    ),
  ];
}
