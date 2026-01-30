import type { FrequencyRequest, FrequencyResponse, EstimateResponse } from '../types';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

export interface ApiErrorResponse {
  error: string;
  code?: string;
  newRequests?: number;
  maxRequests?: number;
}

export async function fetchFrequencyData(
  request: FrequencyRequest
): Promise<FrequencyResponse> {
  const url = `${SUPABASE_URL}/functions/v1/frequency`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'apikey': SUPABASE_ANON_KEY,
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const errorData: ApiErrorResponse = await response.json().catch(() => ({ error: `Request failed: ${response.status}` }));
    const error = new Error(errorData.error) as Error & { code?: string };
    error.code = errorData.code;
    throw error;
  }

  return response.json();
}

export async function fetchEstimate(
  request: Omit<FrequencyRequest, 'granularity'> & { granularity?: string }
): Promise<EstimateResponse> {
  const url = `${SUPABASE_URL}/functions/v1/frequency`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'apikey': SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({
      ...request,
      granularity: request.granularity || 'monthly',
      estimateOnly: true,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Request failed: ${response.status}`);
  }

  return response.json();
}

export interface TestQueryResponse {
  url: string;
  query: string;
  phrase: string;
  region: string;
  rawText: string;
  parsedJson: unknown | null;
  error: string | null;
}

export async function testGdeltQuery(
  request: Omit<FrequencyRequest, 'granularity'> & { granularity?: string }
): Promise<TestQueryResponse> {
  const url = `${SUPABASE_URL}/functions/v1/frequency`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'apikey': SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({
      ...request,
      granularity: request.granularity || 'monthly',
      testMode: true,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Request failed: ${response.status}`);
  }

  return response.json();
}
