import { Knex } from 'knex';
import { _knexUtil } from './util/knex.util.js';
import { FUNCTION_UPDATE_UPDATED_AT_COLUMN } from './constants.js';

/**
 * Utils for postgres.
 */
export const pgHelper = {
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