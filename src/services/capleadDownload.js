export const CAPLEAD_DEFAULT_DOWNLOAD_URL = '/downloads/caplead/latest/CapLead-latest.zip';
export const CAPLEAD_API_DOWNLOAD_URL = '/api/caplead/download';
export const CAPLEAD_DOWNLOAD_FILENAME = 'CapLead-latest.zip';

const isLocalhostDownloadUrl = (url = '') =>
  /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(?::\d+)?\//i.test(url);

const isProductionDownloadEnv = (env = {}) =>
  env.PROD === true || env.MODE === 'production' || env.VITE_VERCEL_ENV === 'production';

export const getCapLeadDownloadUrl = (env = {}) => {
  const configuredUrl = String(env.VITE_CAPLEAD_DOWNLOAD_URL || '').trim();
  const isProduction = isProductionDownloadEnv(env);
  if (configuredUrl && !(isProduction && isLocalhostDownloadUrl(configuredUrl))) return configuredUrl;
  return env.DEV && !isProduction ? 'http://localhost:3001/api/caplead/download' : CAPLEAD_API_DOWNLOAD_URL;
};

export const triggerCapLeadDownload = (browserWindow, env = {}) => {
  const downloadUrl = getCapLeadDownloadUrl(env);
  const link = browserWindow.document.createElement('a');

  link.href = downloadUrl;
  link.download = CAPLEAD_DOWNLOAD_FILENAME;
  link.rel = 'noopener';
  link.target = '_blank';
  browserWindow.document.body.appendChild(link);
  link.click();
  link.remove();

  return downloadUrl;
};
