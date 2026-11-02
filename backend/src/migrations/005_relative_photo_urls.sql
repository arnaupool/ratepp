-- Photo URLs used to be stored absolute, built from PUBLIC_URL
-- (e.g. http://192.168.1.50:4000/uploads/abc.jpg). With the Expo app retired
-- everything is served from one origin, so own uploads become the relative
-- path /uploads/abc.jpg. External poster URLs (TMDB, RAWG, Open Library) and
-- the order of each list are left untouched.

UPDATE scores
SET photo_urls = ARRAY(
  SELECT regexp_replace(u, '^https?://[^/]+(/uploads/[^/?#]+)$', '\1')
  FROM unnest(photo_urls) WITH ORDINALITY AS t(u, ord)
  ORDER BY ord
)
WHERE EXISTS (SELECT 1 FROM unnest(photo_urls) u WHERE u ~ '^https?://[^/]+/uploads/[^/?#]+$');

-- Gallery fields: a JSON array of URLs.
UPDATE score_fields
SET value = (
  SELECT COALESCE(jsonb_agg(
    CASE WHEN jsonb_typeof(e) = 'string'
      THEN to_jsonb(regexp_replace(e #>> '{}', '^https?://[^/]+(/uploads/[^/?#]+)$', '\1'))
      ELSE e END
    ORDER BY ord), '[]'::jsonb)
  FROM jsonb_array_elements(value) WITH ORDINALITY AS t(e, ord)
)
WHERE type = 'gallery' AND jsonb_typeof(value) = 'array';

-- Legacy single-photo fields: a JSON string.
UPDATE score_fields
SET value = to_jsonb(regexp_replace(value #>> '{}', '^https?://[^/]+(/uploads/[^/?#]+)$', '\1'))
WHERE type = 'photo' AND jsonb_typeof(value) = 'string';
