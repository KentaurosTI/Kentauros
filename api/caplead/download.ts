const DEFAULT_CAPLEAD_RELEASE_URL =
  'https://github.com/KentaurosTI/CapLead/releases/latest/download/CapLead-latest.zip';

export default async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
      },
    });
  }

  if (req.method !== 'GET') {
    return Response.json({ error: 'METHOD_NOT_ALLOWED' }, { status: 405 });
  }

  const downloadUrl = process.env.CAPLEAD_DOWNLOAD_URL || DEFAULT_CAPLEAD_RELEASE_URL;
  return Response.redirect(downloadUrl, 302);
}
