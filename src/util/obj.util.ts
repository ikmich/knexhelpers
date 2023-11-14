export const objUtil = {
  isEmpty(o: object) {
    if (!o) return true;
    return Object.keys(o).length === 0;
  },

  isObject(o: unknown): boolean {
    if (!o) return false;
    return Object.getPrototypeOf({}) == Object.getPrototypeOf(o) && !Array.isArray(o) && typeof o == 'object';
  },

  /**
   * Walk through all the object property keys recursively and apply a transform to each key.
   * @param obj
   * @param fn
   */
  transformKeys(obj: any, fn: (key: string) => string) {
    if (!this.isObject(obj)) return obj;

    const out: typeof obj = {};
    const keys = Object.keys(obj);

    for (let oldKey of keys) {
      const value = obj[oldKey];
      const transformedKey = fn(oldKey);

      out[transformedKey] = value;

      if (Array.isArray(value)) {
        for (let i = 0; i < value.length; i++) {
          value[i] = this.transformKeys(value[i], fn);
        }
      } else if (this.isObject(value)) {
        out[transformedKey] = this.transformKeys(value, fn);
      }
    }

    return out;
  }
};
