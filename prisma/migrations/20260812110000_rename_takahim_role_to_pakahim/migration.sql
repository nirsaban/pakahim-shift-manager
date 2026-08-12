-- Rename the UserRole enum value TAKAHIM -> PAKAHIM in place.
-- Postgres RENAME VALUE preserves every existing row's data (no drop/recreate,
-- no data loss) - contrast with adding/removing enum values, which has real
-- restrictions. Every row currently role='TAKAHIM' becomes role='PAKAHIM'
-- automatically; nothing else changes.
ALTER TYPE "UserRole" RENAME VALUE 'TAKAHIM' TO 'PAKAHIM';
