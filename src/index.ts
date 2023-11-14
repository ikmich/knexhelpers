// noinspection JSUnusedGlobalSymbols

import { Knex } from 'knex';
import { logInfo } from './log.util.js';

const DATETIME_PRECISION = 4;
const FUNCTION_UPDATE_UPDATED_AT_COLUMN = 'update_updated_at_column';

export type DateTimeColumnOpts = { useTz?: boolean; precision?: number };

function _fn<T extends any>(f: () => T): T {
  return f();
}

let knexUtilInstance: KnexUtil;

class KnexUtil {
  public readonly client: string;

  public readonly tableUtil;

  constructor(private readonly knex: Knex) {
    this.client = this.knex.client?.config?.client || '';

    const _this = this;

    this.tableUtil = {
      async truncate(knex: Knex, table: string) {
        if (_this.isSqliteClient()) {
          await knex.raw(`delete from ${table}`);
        } else {
          await knex.raw(`truncate ${table}`);
        }
      }
    };
  }

  isMysqlClient() {
    return ['mysql', 'mysql2'].includes(this.client);
  }

  isPostgresClient() {
    return ['postgres', 'postgresql', 'pg'].includes(this.client);
  }

  isSqliteClient() {
    return this.client.includes('sqlite');
  }
}

/**
 * Create KnexUtil class.
 * @param knex
 */
export function _knexUtil(knex: Knex) {
  if (!knexUtilInstance) {
    knexUtilInstance = new KnexUtil(knex);
  }
  return knexUtilInstance;
}

/**
 * Helper to create uuid primary key with default value.
 * @param knex
 * @param b
 * @param column
 */
export function _uuidPrimaryKey(knex: Knex, b: Knex.CreateTableBuilder, column: string = 'id') {
  let defaultValueSql = _fn(() => {
    if (_knexUtil(knex).isPostgresClient()) {
      return `uuid_generate_v4()`;
    }
    return `(uuid())`;
  });

  b.uuid(column).primary().defaultTo(knex.raw(defaultValueSql)).notNullable();
}

/**
 * Helper to create auto-incrementing primary key
 * @param b
 * @param column
 */
export function _intPrimaryKey(b: Knex.CreateTableBuilder, column: string = 'id') {
  b.increments(column).primary().notNullable();
}

/**
 * Helper to create auto-incrementing primary key
 * @param b
 * @param column
 */
export function _serialPrimaryKey(b: Knex.CreateTableBuilder, column: string = 'id') {
  return _intPrimaryKey(b, column);
}

/**
 * Helper to create datetime column.
 * @param column
 * @param knex
 * @param b
 * @param withTimezone
 */
export async function _datetimeColumn(column: string, knex: Knex, b: Knex.CreateTableBuilder, withTimezone?: boolean) {
  const opts: DateTimeColumnOpts = { useTz: withTimezone ?? false, precision: DATETIME_PRECISION };
  const util = _knexUtil(knex);
  if (util.isSqliteClient()) {
    delete opts.precision;
  }

  b.datetime(column, opts);
}

/**
 * CreateTableBuilder columns for created_at and updated_at.
 * @deprecated Use _createdUpdatedAtColumns(...) instead.
 * @param knex
 * @param b
 * @param table
 * @param useTimezone
 */
export async function _timestampColumns(knex: Knex, b: Knex.CreateTableBuilder, table: string, useTimezone: boolean = false) {
  await _createdUpdatedAtColumns(knex, b, table, useTimezone);
}

/**
 * CreateTableBuilder columns for created_at and updated_at.
 * @param knex
 * @param b
 * @param table
 * @param useTimezone
 */
export async function _createdUpdatedAtColumns(knex: Knex, b: Knex.CreateTableBuilder, table: string, useTimezone: boolean = false) {
  const util = _knexUtil(knex);

  const createdAtDefaultSql = _fn(() => {
    if (util.isSqliteClient()) {
      return 'CURRENT_TIMESTAMP';
    }
    return `CURRENT_TIMESTAMP(${DATETIME_PRECISION})`;
  });

  const updatedAtDefaultSql = _fn(() => {
    if (util.isSqliteClient()) {
      return `CURRENT_TIMESTAMP}`;
    }

    if (util.isMysqlClient()) {
      return `CURRENT_TIMESTAMP(${DATETIME_PRECISION}) ON UPDATE CURRENT_TIMESTAMP}`;
    }

    return `CURRENT_TIMESTAMP(${DATETIME_PRECISION})`;
  });

  const opts: DateTimeColumnOpts = _fn(() => {
    const base: DateTimeColumnOpts = { useTz: useTimezone };
    if (util.isSqliteClient()) {
      return base;
    }
    return {
      ...base,
      precision: DATETIME_PRECISION
    };
  }) || {};

  b.datetime('created_at', opts).defaultTo(knex.raw(createdAtDefaultSql));
  b.datetime('updated_at', opts).defaultTo(knex.raw(updatedAtDefaultSql));

  if (util.isPostgresClient()) {
    // create trigger function if not exists...
    await pgUtil.createFunction_updateUpdatedAtColumn(knex);

    // set trigger for postgres
    await knex.raw(`CREATE TRIGGER update_${table}_updated_at
BEFORE UPDATE
ON
  "${table}"
FOR EACH ROW
EXECUTE PROCEDURE ${FUNCTION_UPDATE_UPDATED_AT_COLUMN}();
`);
  } else if (util.isSqliteClient()) {
    // todo - test sqlite trigger
    // set trigger for sqlite
    await knex.raw(`
CREATE TRIGGER update_${table}_updated_at
  BEFORE UPDATE
  ON "${table}"
  FOR EACH ROW
BEGIN
  UPDATE ${table} SET updated_at = CURRENT_TIMESTAMP
END;
`); /* WHERE id = OLD.id*/
  }
}

/**
 * Utils for mysql.
 */
export const mysqlUtil = {
  async foreignKeyChecks(knex: Knex, state: 'on' | 'off') {
    const map = {
      on: 1,
      off: 0
    };
    await knex.raw(`SET foreign_key_checks = ${map[state]}`);
  }
};

/**
 * Utils for postgres.
 */
export const pgUtil = {
  async createExtension_uuidOssp(knex: Knex) {
    if (_knexUtil(knex).isPostgresClient()) {
      await knex.raw(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`);
    }
  },

  async createFunction_updateUpdatedAtColumn(knex: Knex, functionName: string = FUNCTION_UPDATE_UPDATED_AT_COLUMN) {
    await knex.raw(`
CREATE OR REPLACE FUNCTION ${functionName}()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = now(); 
   RETURN NEW;
END;
$$ language 'plpgsql';`);
  }
};

export interface TableInit {
  // table: string;
  create?: (knex: Knex) => Promise<void>;
  seed?: (knex: Knex) => Promise<void>;
}

export type MigrationTableInitMap = { [table: string]: TableInit };

export async function migrateUpTableInitMap(knex: Knex, map: MigrationTableInitMap) {
  const t0 = performance.now();

  let tables = Object.keys(map);
  for (let table of tables) {
    logInfo(`-> Running table-init migration for ${table} table ...`);
    const init = map[table];
    await init.create?.(knex);
    await init.seed?.(knex);
    logInfo(`-> Done: table-init migration for ${table} table.`);
  }

  const t1 = performance.now();
  const tDiff = t1 - t0;
  logInfo(`Migration completed in: ${(tDiff / 1000).toFixed(2)} seconds`);
  console.log('');
}

export async function migrateDownTableInitMap(knex: Knex, map: MigrationTableInitMap) {
  let tables = Object.keys(map).reverse();
  for (let table of tables) {
    await knex.schema.dropTableIfExists(table);
  }
}
