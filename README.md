# `knexhelpers`

Helpers for working with [Knex](https://knexjs.org)

# Changelogs
## 0.0.24
- Added: `pgUtil {}`
- Added: `type DateTimeColumnOpts`
- Deprecated: `_timestampColumns()`. Use `_createdUpdatedAtColumns()`
- Breaking: `_datetimeColumn()` - `knex:Knex` added to arguments.
- Fix: use trigger for sqlite datetime updated_at column