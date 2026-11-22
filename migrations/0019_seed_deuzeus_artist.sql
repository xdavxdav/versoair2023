-- Idempotent directory entry for DeuZeus (https://soundcloud.com/DeuZeus, Surrey, BC, Canada)
INSERT INTO public.artists (stage_name, genre, label_status, spotify_url, country_code)
SELECT 'DeuZeus', 'Hip-Hop', 'independent', 'https://soundcloud.com/DeuZeus', 'CA'
WHERE NOT EXISTS (
  SELECT 1 FROM public.artists WHERE LOWER(stage_name) = 'deuzeus'
);
