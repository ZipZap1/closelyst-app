-- Run before the generated drizzle migration.
-- citext = case-insensitive emails; pgcrypto = gen_random_uuid().
CREATE EXTENSION IF NOT EXISTS citext;
CREATE EXTENSION IF NOT EXISTS pgcrypto;
