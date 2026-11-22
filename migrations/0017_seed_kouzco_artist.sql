-- Idempotent directory entry for Kouzco (https://soundcloud.com/kouzco)
INSERT INTO public.artists (stage_name, genre, label_status, spotify_url, country_code)
SELECT 'Kouzco', 'Hip-Hop', 'independent', 'https://soundcloud.com/kouzco', NULL
WHERE NOT EXISTS (
  SELECT 1 FROM public.artists WHERE LOWER(stage_name) = 'kouzco'
);
