import { Knex } from 'knex';
import { logInfo } from './util/log.util.js';
import { MigrationTableInitMap } from './index.js';

export const migrationUtil = {
  async migrateUpTableInitMap(knex: Knex, map: MigrationTableInitMap) {
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
  },
  async migrateDownTableInitMap(knex: Knex, map: MigrationTableInitMap) {
    let tables = Object.keys(map).reverse();
    for (let table of tables) {
      await knex.schema.dropTableIfExists(table);
    }
  }
};

export const migrationHelper = migrationUtil;