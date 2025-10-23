// Global middleware for CORS and security headers

export const onRequest: PagesFunction = async (context) => {
  const { request, next } = context;

  // Handle CORS preflight requests
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': request.headers.get('Origin') || '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Credentials': 'true',
        'Access-Control-Max-Age': '86400',
      },
    });
  }

  // Continue to the next handler
  const response = await next();

  // Clone the response to modify headers
  const modifiedResponse = new Response(response.body, response);

  // Add security headers
  modifiedResponse.headers.set('X-Content-Type-Options', 'nosniff');
  modifiedResponse.headers.set('X-Frame-Options', 'DENY');
  modifiedResponse.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  modifiedResponse.headers.set('X-XSS-Protection', '1; mode=block');

  // Add CORS headers for actual requests
  const origin = request.headers.get('Origin');
  if (origin) {
    modifiedResponse.headers.set('Access-Control-Allow-Origin', origin);
    modifiedResponse.headers.set('Access-Control-Allow-Credentials', 'true');
  }

  return modifiedResponse;
};
