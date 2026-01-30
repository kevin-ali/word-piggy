/*
  # Create FrequencyCache Table for PhrasePulse

  1. New Tables
    - `frequency_cache`
      - `id` (uuid, primary key) - Unique identifier
      - `cache_key` (text, unique) - Hash of query parameters for lookup
      - `created_at` (timestamptz) - When the cache entry was created
      - `response_json` (jsonb) - The cached GDELT API response
      - `domains_version` (text) - Version identifier for domain lists used

  2. Purpose
    - Caches GDELT API responses to reduce API calls
    - 24-hour TTL enforced at application level
    - Enables fast repeated queries

  3. Security
    - RLS enabled
    - Public read/write access for anonymous users (cache is non-sensitive data)
*/

CREATE TABLE IF NOT EXISTS frequency_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cache_key text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  response_json jsonb NOT NULL,
  domains_version text DEFAULT 'v1' NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_frequency_cache_key ON frequency_cache(cache_key);
CREATE INDEX IF NOT EXISTS idx_frequency_cache_created_at ON frequency_cache(created_at);

ALTER TABLE frequency_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to cache"
  ON frequency_cache FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Allow public insert to cache"
  ON frequency_cache FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Allow public delete of expired cache"
  ON frequency_cache FOR DELETE
  TO anon
  USING (created_at < now() - interval '24 hours');