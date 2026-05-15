const DEFAULT_CAPLEAD_RELEASE_URL =
  'https://github.com/KentaurosTI/CapLead/releases/latest/download/CapLead-latest.zip';

export default async function handler(req: any, res: any) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.status(204).end();
    return;
  }

  if (req.method !== 'GET') {
    res.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
    return;
  }

  const downloadUrl = process.env.CAPLEAD_DOWNLOAD_URL || DEFAULT_CAPLEAD_RELEASE_URL;
  res.redirect(302, downloadUrl);
}
