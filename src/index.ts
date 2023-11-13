import { Knex } from 'knex';
import { logInfo } from './log.util.js';

const DATETIME_PRECISION = 4;
const FUNCTION_UPDATE_UPDATED_AT_COLUMN = 'update_updated_at_column';

function _fn<T extends any>(f: () => T): T {
  return f();
}

class KnexUtil {
  private readonly client: string;

  constructor(private readonly knex: Knex) {
    this.client = this.knex.client?.config?.client || '';
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
  return new KnexUtil(knex);
}

export const tableUtils = {
  async truncate(knex: Knex, table: string) {
    if (_knexUtil(knex).isSqliteClient()) {
      await knex.raw(`delete from ${table}`);
    } else {
      await knex.raw(`truncate ${table}`);
    }
  }
};

export function _uuidPrimaryKey(knex: Knex, b: Knex.CreateTableBuilder, column: string = 'id') {
  let defaultValueSql = _fn(() => {
    if (_knexUtil(knex).isPostgresClient()) {
      return `uuid_generate_v4()`;
    }
    return `(uuid())`;
  });

  b.uuid(column).primary().defaultTo(knex.raw(defaultValueSql)).notNullable();
}

export function _intPrimaryKey(b: Knex.CreateTableBuilder, column: string = 'id') {
  b.increments(column).primary().notNullable();
}

export function _serialPrimaryKey(b: Knex.CreateTableBuilder, column: string = 'id') {
  return _intPrimaryKey(b, column);
}

export async function _datetimeColumn(columnName: string, b: Knex.CreateTableBuilder) {
  b.datetime(columnName, { precision: DATETIME_PRECISION });
}

export async function _timestampColumns(knex: Knex, b: Knex.CreateTableBuilder, table: string) {
  const knexUtil = new KnexUtil(knex);

  const createdAtDefaultSql = _fn(() => {
    if (knexUtil.isSqliteClient()) {
      return 'CURRENT_TIMESTAMP';
    }
    return `CURRENT_TIMESTAMP(${DATETIME_PRECISION})`;
  });

  const updatedAtDefaultSql = _fn(() => {
    if (knexUtil.isSqliteClient()) {
      return `CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP}`;
    }

    if (knexUtil.isMysqlClient()) {
      return `CURRENT_TIMESTAMP(${DATETIME_PRECISION}) ON UPDATE CURRENT_TIMESTAMP}`;
    }

    return `CURRENT_TIMESTAMP(${DATETIME_PRECISION})`;
  });

  type TOpts = { useTz?: boolean; precision?: number };
  const opts: TOpts = _fn(() => {
    const base: TOpts = { useTz: false };
    if (knexUtil.isSqliteClient()) {
      return base;
    }
    return {
      ...base,
      precision: DATETIME_PRECISION
    };
  }) || {};

  b.datetime('created_at', opts).defaultTo(knex.raw(createdAtDefaultSql));
  b.datetime('updated_at', opts).defaultTo(knex.raw(updatedAtDefaultSql));

  if (knexUtil.isPostgresClient()) {
    // trigger
    await knex.raw(`CREATE TRIGGER update_${table}_updated_at
    BEFORE UPDATE
    ON
        "${table}"
    FOR EACH ROW
EXECUTE PROCEDURE ${FUNCTION_UPDATE_UPDATED_AT_COLUMN}();
`);
  }
}

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
  table: string;
  create?: (knex: Knex) => Promise<void>;
  seed?: (knex: Knex) => Promise<void>;
}

export type TableInitMap = { [table: string]: TableInit };

export async function migrateUpTableInitMap(knex: Knex, map: TableInitMap) {
  const t0 = performance.now();

  let tables = Object.keys(map);
  for (let table of tables) {
    logInfo(`-> Running table-init migration for ${table} ...`);
    const init = map[table];
    await init.create?.(knex);
    await init.seed?.(knex);
    logInfo(`-> Completed table-init migration for ${table}.`);
  }

  const t1 = performance.now();
  const tDiff = t1 - t0;
  logInfo(`Migration completed in: ${(tDiff / 1000).toFixed(2)} seconds`);
  console.log('');
}

export async function migrateDownTableInitMap(knex: Knex, map: TableInitMap) {
  let tables = Object.keys(map).reverse();
  for (let table of tables) {
    await knex.schema.dropTableIfExists(table);
  }
}

//
// export abstract class DbTableReader<T, O = { [k: string]: T }, P = { [k: string]: T[] }> {
//   protected constructor(private readonly knex: Knex) {
//   }
//
//   abstract indexItems(columns: string[]): Promise<O>
//
//   abstract mapItemGroups(columns: string[]): Promise<P>
// }