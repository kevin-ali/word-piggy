/*
  # Create chunk cache table for GDELT request caching

  1. New Tables
    - `chunk_cache`
      - `id` (uuid, primary key)
      - `cache_key` (text, unique) - Unique identifier for the cached chunk
      - `data_json` (jsonb) - The cached chunk data including phrase, region, points
      - `created_at` (timestamptz) - When the cache entry was created

  2. Purpose
    - Stores individual GDELT API request results at the chunk level
    - Allows reuse of partial results across different queries
    - Reduces redundant GDELT API calls and helps with rate limiting

  3. Notes
    - Cache entries are managed by application-level TTL (7 days)
    - No RLS needed as this is server-side cache only
*/

CREATE TABLE IF NOT EXISTS chunk_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cache_key text UNIQUE NOT NULL,
  data_json jsonb NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chunk_cache_created_at ON chunk_cache(created_at);
