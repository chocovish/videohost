# Taste
- Models state (e.g. a "deleted" state) with an explicit boolean status field (e.g. `originalDeleted Boolean @default(false)`) rather than overloading a key column as nullable; explicitly asked to revert a `originalKey String?` nullable approach in favor of a dedicated flag. Confidence: 0.9
- Expects deleted state to preserve the related data (keep the key/name) and record deletion via the flag, rather than nulling out the column. Confidence: 0.85
- When asking for a change of approach, expects all traces of the abandoned approach reverted everywhere it was applied ("wherever you made X, change that"). Confidence: 0.7
- Prefers schema/DB changes that are purely additive (e.g. adding a boolean column with a default) over altering or dropping existing constraints like NOT NULL. Confidence: 0.6
- Rejects writing code to migrate/backfill or defensively normalize existing bad data when the impacted row count is small; prefers to correct those rows manually in the DB and keep the code change minimal ("no need to write code to add fix for existing data ... I will correct in db"). Confidence: 0.85
- Prefers that fixes prevent the bad state going forward rather than papering over it at read time; explicitly asked to just stop persisting an absolute URL instead of adding runtime normalization. Confidence: 0.8
- Prefers storing relative in-app paths (not environment-dependent absolute URLs) in the database, resolving to absolute only where required (e.g. outbound emails). Confidence: 0.75
- Never hardcode environment-specific base URLs/hosts (e.g. `taped.in`, `localhost:3000`) or fall back to them: server-side should assume an env var (`APP_URL`) is always configured, and client-side should derive the base URL automatically from the browser host (`window.location.origin`). Confidence: 0.9
- Prefers failing loudly with a clear error when required configuration (e.g. a missing `APP_URL`) is absent rather than silently falling back to a default value. Confidence: 0.7
