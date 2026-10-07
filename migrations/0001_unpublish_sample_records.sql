UPDATE artisan_communities
SET status = 'DRAFT', updated_at = NOW()
WHERE slug IN (
  'abidjan-textile-collective-community',
  'yamoussoukro-ceramics-guild-community',
  'korhogo-carvers-association-community',
  'bouake-metalwork-artisans-community',
  'san-pedro-leather-craftspeople-community',
  'daloa-jewelry-makers-community'
)
AND status = 'PUBLISHED';
--> statement-breakpoint

UPDATE businesses
SET is_verified = false,
    verified_at = NULL,
    approval_status = 'pending',
    updated_at = NOW()
WHERE email LIKE 'contact+%@versoair.local'
  AND website LIKE '%.example.com'
  AND phone LIKE '+1-555-%';
--> statement-breakpoint

UPDATE properties
SET verified = false,
    verification_status = 'unverified',
    updated_at = NOW()
WHERE host_email IN (
  'info@hotelivoire.ci',
  'abidjan@radissonblu.com',
  'novotel.abidjan@accor.com',
  'sofitel.abidjan@sofitel.com',
  'contact@hotelpresident.ci',
  'contact@hotelindependence.ci',
  'contact@hotelcommerce.ci',
  'contact@sanpedoresort.ci',
  'marie@cocodyguest.ci',
  'jean@plateauapartment.ci'
);
