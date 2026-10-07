UPDATE music_tracks
SET status = 'archived'
WHERE UPPER(title) IN ('NEONTEST', 'BIGTEST')
  AND status = 'published';
