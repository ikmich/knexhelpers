// noinspection JSUnusedGlobalSymbols

import { Knex } from 'knex';
import { DATETIME_PRECISION, FUNCTION_UPDATE_UPDATED_AT_COLUMN } from './constants.js';
import { _knexUtil } from './util/knex.util.js';
import { pgHelper } from './postgres.helpers.js';

export type DateTimeColumnOpts = { useTz?: boolean; precision?: number };

function _fn<T extends any>(f: () => T): T {
  return f();
}

/**
 * Helper to create uuid primary key with default value. If using postgres, ensure the uuid-ossp extension is
 * installed or an error will be thrown. You can do this by calling `pgUtil.createExtension_uuidOssp(knex)`
 * before any migrations run.
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
    await pgHelper.createFunction_updateUpdatedAtColumn(knex);

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


export interface TableInit {
  // table: string;
  create?: (knex: Knex) => Promise<void>;
  seed?: (knex: Knex) => Promise<void>;
}

export type MigrationTableInitMap = { [table: string]: TableInit };

export * from './migration.helpers.js';
export * from './postgres.helpers.js';
export * from './knex-config.helpers.js';