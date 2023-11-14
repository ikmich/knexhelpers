# knexhelpers - Change logs

## 0.0.25

- Breaking: Moved `migrateUpTableInitMap` and `migrateDownTableInitMap` to `migrationHelper {}`

## 0.0.24

- Added: `pgUtil {}`
- Added: `type DateTimeColumnOpts`
- Deprecated: `_timestampColumns()`. Use `_createdUpdatedAtColumns()`
- Breaking: `_datetimeColumn()` - `knex:Knex` added to arguments.
- Fix: use trigger for sqlite datetime updated_at column