# Taste

- Models state (e.g. a "deleted" state) with an explicit boolean status field (e.g. `originalDeleted Boolean @default(false)`) rather than overloading a key column as nullable; explicitly asked to revert a `originalKey String?` nullable approach in favor of a dedicated flag. Confidence: 0.9
- Expects deleted state to preserve the related data (keep the key/name) and record deletion via the flag, rather than nulling out the column. Confidence: 0.85
- When asking for a change of approach, expects all traces of the abandoned approach reverted everywhere it was applied ("wherever you made X, change that"). Confidence: 0.7
- Prefers schema/DB changes that are purely additive (e.g. adding a boolean column with a default) over altering or dropping existing constraints like NOT NULL. Confidence: 0.6
