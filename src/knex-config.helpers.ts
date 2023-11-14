import { objUtil } from './util/obj.util.js';
import { _snakeCase } from './util/str.util.js';
import Case from 'case';

// const config: Knex.Config = {
//   postProcessResponse: (result, queryContext) => {
//     return result;
//   },
//   wrapIdentifier: (value, origImpl, queryContext) => {
//     return origImpl(value);
//   }
// };

function toSnakeCase(s: string): string {
  return _snakeCase(s);
}

function toCamelCase(s: string): string {
  return Case.camel(s);
}

export type TKnexConfigPostProcessResponse = (result: any, queryContext: any) => any;
export type TKnexConfigWrapIdentifier = (value: string, origImpl: (value: string) => string, queryContext: any) => string;

export type TKnexConfigHelper = {
  caseTransforms: {
    postProcessResponse: TKnexConfigPostProcessResponse;
    wrapIdentifier: TKnexConfigWrapIdentifier;
  }
}

export const knexConfigHelper: TKnexConfigHelper = {
  caseTransforms: {
    postProcessResponse: (result: any, queryContext: any) => {
      if (Array.isArray(result)) {
        const out = [];
        for (let i = 0; i < result.length; i++) {
          out[i] = objUtil.transformKeys(result[i], (key: string) => toCamelCase(key));
        }
        return out;
      } else {
        return objUtil.transformKeys(result, (key: string) => toCamelCase(key));
      }
    },
    wrapIdentifier: (value: string, origImpl: (value: string) => string, queryContext: any) => {
      let transformed = toSnakeCase(value);
      if (transformed && transformed.length > 0) {
        return origImpl(transformed);
      }
      return origImpl(value);
    }
  }
};
