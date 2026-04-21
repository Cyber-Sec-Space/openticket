CREATE INDEX incident_fts_idx ON "Incident" USING GIN (to_tsvector('english', title || ' ' || description));
