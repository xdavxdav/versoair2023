-- Neighbourhood layer (country -> region -> city -> neighbourhood) and artist city/neighbourhood links.
CREATE TABLE IF NOT EXISTS public.neighbourhoods (
  id SERIAL PRIMARY KEY,
  city_id INTEGER NOT NULL REFERENCES public.cities(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (city_id, slug)
);
CREATE INDEX IF NOT EXISTS idx_neighbourhoods_city_id ON public.neighbourhoods(city_id);

ALTER TABLE public.artists
  ADD COLUMN IF NOT EXISTS city_id INTEGER REFERENCES public.cities(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS neighbourhood_id INTEGER REFERENCES public.neighbourhoods(id) ON DELETE SET NULL;
ALTER TABLE public.artist_profiles
  ADD COLUMN IF NOT EXISTS city_id INTEGER REFERENCES public.cities(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS neighbourhood_id INTEGER REFERENCES public.neighbourhoods(id) ON DELETE SET NULL;
ALTER TABLE public.music_artists
  ADD COLUMN IF NOT EXISTS city_id INTEGER REFERENCES public.cities(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS neighbourhood_id INTEGER REFERENCES public.neighbourhoods(id) ON DELETE SET NULL;

-- Seed Abidjan (communes) and Toronto (districts).
INSERT INTO public.neighbourhoods (city_id, name, slug)
SELECT c.id, v.name, v.slug
FROM public.cities c
JOIN public.countries co ON co.id = c.country_id
JOIN (VALUES
  ('CI', 'Abidjan', 'Biétry', 'bietry'),
  ('CI', 'Abidjan', 'Cocody', 'cocody'),
  ('CI', 'Abidjan', 'Marcory', 'marcory'),
  ('CI', 'Abidjan', 'Koumassi', 'koumassi'),
  ('CI', 'Abidjan', 'Treichville', 'treichville'),
  ('CI', 'Abidjan', 'Yopougon', 'yopougon'),
  ('CI', 'Abidjan', 'Plateau', 'plateau'),
  ('CA', 'Toronto', 'North York', 'north-york'),
  ('CA', 'Toronto', 'Scarborough', 'scarborough'),
  ('CA', 'Toronto', 'Etobicoke', 'etobicoke'),
  ('CA', 'Toronto', 'Downtown', 'downtown'),
  ('CA', 'Toronto', 'East York', 'east-york'),
  ('CA', 'Toronto', 'York', 'york')
) AS v(cc, city, name, slug) ON v.cc = co.code AND v.city = c.name
ON CONFLICT (city_id, slug) DO NOTHING;

-- Kouzco: Abidjan / Biétry. Jdacuz (jdcz): Toronto / North York.
UPDATE public.artists a
SET country_code = 'CI', city_id = n.city_id, neighbourhood_id = n.id
FROM public.neighbourhoods n
JOIN public.cities c ON c.id = n.city_id AND c.name = 'Abidjan'
WHERE n.slug = 'bietry' AND LOWER(a.stage_name) = 'kouzco';

UPDATE public.artists a
SET country_code = 'CA', city_id = n.city_id, neighbourhood_id = n.id
FROM public.neighbourhoods n
JOIN public.cities c ON c.id = n.city_id AND c.name = 'Toronto'
WHERE n.slug = 'north-york' AND LOWER(a.stage_name) = 'jdcz';
