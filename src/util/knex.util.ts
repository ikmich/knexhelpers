import { Knex } from 'knex';

export class KnexUtil {
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

let knexUtilInstance: KnexUtil;

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