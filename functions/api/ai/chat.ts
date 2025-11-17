/**
 * AI Chat API Endpoint
 *
 * Handles chat messages to Claude (and future Copilot integration).
 * This is a Cloudflare Functions endpoint.
 */

import Anthropic from '@anthropic-ai/sdk';

interface Env {
  ANTHROPIC_API_KEY?: string;
}

interface ChatRequest {
  provider: 'claude' | 'copilot';
  message: string;
  sessionId?: string;
  context?: string;
  model?: string;
  apiKey?: string; // User's API key (optional, for non-subscription users)
}

interface ChatResponse {
  reply: string;
  tokenUsage: {
    inputTokens: number;
    outputTokens: number;
  };
}

interface ErrorResponse {
  error: {
    code: number;
    type: string;
    message: string;
    retryAfter?: number;
  };
}

/**
 * Rate limiter using in-memory storage
 * In production, this should use Durable Objects or KV for distributed rate limiting
 */
const rateLimitMap = new Map<string, number[]>();

function checkRateLimit(accountId: string, maxRequests: number = 50, windowMs: number = 60000): boolean {
  const now = Date.now();
  const key = `rate:${accountId}`;

  // Get recent requests
  const recent = (rateLimitMap.get(key) || []).filter(t => now - t < windowMs);

  // Check limit
  if (recent.length >= maxRequests) {
    return false;
  }

  // Record request
  recent.push(now);
  rateLimitMap.set(key, recent);

  return true;
}

/**
 * Call Claude API
 */
async function callClaude(
  apiKey: string,
  message: string,
  model: string = 'claude-3-5-sonnet-20241022',
  context?: string
): Promise<ChatResponse> {
  const anthropic = new Anthropic({ apiKey });

  const systemPrompt = context
    ? `あなたはGitHubリポジトリの開発を支援するAIアシスタントです。\n\nコンテキスト:\n${context}`
    : 'あなたはGitHubリポジトリの開発を支援するAIアシスタントです。';

  const response = await anthropic.messages.create({
    model,
    max_tokens: 4096,
    system: systemPrompt,
    messages: [
      {
        role: 'user',
        content: message,
      },
    ],
  });

  // Extract text from response
  const reply = response.content
    .filter(block => block.type === 'text')
    .map(block => ('text' in block ? block.text : ''))
    .join('\n');

  return {
    reply,
    tokenUsage: {
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
    },
  };
}

/**
 * Handle errors and convert to standard error response
 */
function handleError(error: unknown): Response {
  console.error('AI API error:', error);

  // Anthropic API errors
  if (error && typeof error === 'object' && 'status' in error) {
    const apiError = error as { status: number; message?: string; error?: { type: string; message: string } };

    const errorResponse: ErrorResponse = {
      error: {
        code: apiError.status,
        type: apiError.error?.type || 'api_error',
        message: apiError.error?.message || apiError.message || 'An error occurred',
      },
    };

    // Add retry-after for rate limits
    if (apiError.status === 429) {
      errorResponse.error.retryAfter = 60; // Default 60 seconds
    }

    return Response.json(errorResponse, { status: apiError.status });
  }

  // Network or other errors
  return Response.json(
    {
      error: {
        code: 500,
        type: 'internal_error',
        message: error instanceof Error ? error.message : 'An unexpected error occurred',
      },
    },
    { status: 500 }
  );
}

/**
 * Main request handler
 */
export async function onRequest(context: { request: Request; env: Env }): Promise<Response> {
  const { request, env } = context;

  // Only allow POST requests
  if (request.method !== 'POST') {
    return Response.json(
      {
        error: {
          code: 405,
          type: 'method_not_allowed',
          message: 'Only POST requests are allowed',
        },
      },
      { status: 405 }
    );
  }

  try {
    // Parse request body
    const body: ChatRequest = await request.json();

    // Validate required fields
    if (!body.provider || !body.message) {
      return Response.json(
        {
          error: {
            code: 400,
            type: 'invalid_request',
            message: 'Missing required fields: provider, message',
          },
        },
        { status: 400 }
      );
    }

    // Check rate limit (use session ID or IP as identifier)
    const accountId = body.sessionId || request.headers.get('cf-connecting-ip') || 'anonymous';
    if (!checkRateLimit(accountId, 50, 60000)) {
      return Response.json(
        {
          error: {
            code: 429,
            type: 'rate_limit_error',
            message: 'Rate limit exceeded. Please try again in 60 seconds.',
            retryAfter: 60,
          },
        },
        { status: 429 }
      );
    }

    // Handle different providers
    if (body.provider === 'claude') {
      // Use user's API key if provided, otherwise use environment variable
      const apiKey = body.apiKey || env.ANTHROPIC_API_KEY;

      if (!apiKey) {
        return Response.json(
          {
            error: {
              code: 401,
              type: 'authentication_error',
              message: 'API key not configured. Please set your Claude API key in settings.',
            },
          },
          { status: 401 }
        );
      }

      const result = await callClaude(apiKey, body.message, body.model, body.context);
      return Response.json(result);
    }

    if (body.provider === 'copilot') {
      return Response.json(
        {
          error: {
            code: 503,
            type: 'service_unavailable',
            message: 'GitHub Copilot API is not yet available. Please use Claude instead.',
          },
        },
        { status: 503 }
      );
    }

    // Unknown provider
    return Response.json(
      {
        error: {
          code: 400,
          type: 'invalid_request',
          message: `Unknown provider: ${body.provider}`,
        },
      },
      { status: 400 }
    );
  } catch (error) {
    return handleError(error);
  }
}
