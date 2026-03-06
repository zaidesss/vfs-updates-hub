// Mock Supabase client for demo mode — drop-in replacement
// Intercepts all .from(), .rpc(), .functions.invoke(), .auth, .channel(), .storage calls

import { getDemoTableData, getDemoRpcData, getDemoFunctionResponse, DEMO_ACCOUNTS, DEMO_PROFILES } from './demoData';

type FilterOp = { column: string; op: string; value: any };

// In-memory store (mutable copy of demo data)
const store: Record<string, any[]> = {};

function getStore(table: string): any[] {
  if (!store[table]) {
    store[table] = [...getDemoTableData(table)];
  }
  return store[table];
}

function applyFilters(data: any[], filters: FilterOp[]): any[] {
  let result = data;
  for (const f of filters) {
    result = result.filter(row => {
      const val = row[f.column];
      switch (f.op) {
        case 'eq': return val === f.value;
        case 'neq': return val !== f.value;
        case 'gt': return val > f.value;
        case 'gte': return val >= f.value;
        case 'lt': return val < f.value;
        case 'lte': return val <= f.value;
        case 'like': return typeof val === 'string' && val.includes(f.value.replace(/%/g, ''));
        case 'ilike': return typeof val === 'string' && val.toLowerCase().includes(f.value.replace(/%/g, '').toLowerCase());
        case 'in': return Array.isArray(f.value) && f.value.includes(val);
        case 'is': return f.value === null ? val == null : val === f.value;
        case 'not.is': return f.value === null ? val != null : val !== f.value;
        case 'contains': return Array.isArray(val) && f.value.some((v: any) => val.includes(v));
        case 'overlaps': return Array.isArray(val) && f.value.some((v: any) => val.includes(v));
        default: return true;
      }
    });
  }
  return result;
}

function createQueryBuilder(tableName: string, mode: 'select' | 'insert' | 'update' | 'delete' | 'upsert', payload?: any) {
  let filters: FilterOp[] = [];
  let selectColumns = '*';
  let orderCol: string | null = null;
  let orderAsc = true;
  let limitCount: number | null = null;
  let rangeFrom: number | null = null;
  let rangeTo: number | null = null;
  let isSingle = false;
  let isMaybeSingle = false;
  let isCount = false;
  let headOnly = false;

  const builder: any = {
    select(cols?: string, opts?: any) {
      if (cols) selectColumns = cols;
      if (opts?.count) isCount = true;
      if (opts?.head) headOnly = true;
      return builder;
    },
    eq(col: string, val: any) { filters.push({ column: col, op: 'eq', value: val }); return builder; },
    neq(col: string, val: any) { filters.push({ column: col, op: 'neq', value: val }); return builder; },
    gt(col: string, val: any) { filters.push({ column: col, op: 'gt', value: val }); return builder; },
    gte(col: string, val: any) { filters.push({ column: col, op: 'gte', value: val }); return builder; },
    lt(col: string, val: any) { filters.push({ column: col, op: 'lt', value: val }); return builder; },
    lte(col: string, val: any) { filters.push({ column: col, op: 'lte', value: val }); return builder; },
    like(col: string, val: any) { filters.push({ column: col, op: 'like', value: val }); return builder; },
    ilike(col: string, val: any) { filters.push({ column: col, op: 'ilike', value: val }); return builder; },
    in(col: string, val: any[]) { filters.push({ column: col, op: 'in', value: val }); return builder; },
    is(col: string, val: any) { filters.push({ column: col, op: 'is', value: val }); return builder; },
    not(col: string, op: string, val: any) { filters.push({ column: col, op: `not.${op}`, value: val }); return builder; },
    contains(col: string, val: any) { filters.push({ column: col, op: 'contains', value: val }); return builder; },
    overlaps(col: string, val: any) { filters.push({ column: col, op: 'overlaps', value: val }); return builder; },
    or(_expr: string) { return builder; }, // simplified — no-op for demo
    filter(col: string, op: string, val: any) { filters.push({ column: col, op, value: val }); return builder; },
    order(col: string, opts?: { ascending?: boolean }) { orderCol = col; orderAsc = opts?.ascending !== false; return builder; },
    limit(count: number) { limitCount = count; return builder; },
    range(from: number, to: number) { rangeFrom = from; rangeTo = to; return builder; },
    single() { isSingle = true; return builder; },
    maybeSingle() { isMaybeSingle = true; return builder; },
    textSearch(_col: string, _query: string) { return builder; },
    match(criteria: Record<string, any>) {
      for (const [k, v] of Object.entries(criteria)) {
        filters.push({ column: k, op: 'eq', value: v });
      }
      return builder;
    },
    // Terminal — returns promise
    then(resolve: (val: any) => void, reject?: (err: any) => void) {
      try {
        const result = execute();
        resolve(result);
      } catch (e) {
        if (reject) reject(e);
      }
    },
  };

  function execute() {
    const data = getStore(tableName);

    if (mode === 'select') {
      let result = applyFilters(data, filters);
      if (orderCol) {
        result.sort((a, b) => {
          const av = a[orderCol!], bv = b[orderCol!];
          if (av == null) return 1;
          if (bv == null) return -1;
          return orderAsc ? (av > bv ? 1 : -1) : (av < bv ? 1 : -1);
        });
      }
      if (rangeFrom !== null && rangeTo !== null) {
        result = result.slice(rangeFrom, rangeTo + 1);
      }
      if (limitCount !== null) {
        result = result.slice(0, limitCount);
      }
      if (headOnly) {
        return { data: null, error: null, count: result.length };
      }
      if (isSingle) {
        return { data: result[0] || null, error: result.length === 0 ? { message: 'No rows found', code: 'PGRST116' } : null, count: result.length };
      }
      if (isMaybeSingle) {
        return { data: result[0] || null, error: null, count: result.length };
      }
      return { data: result, error: null, count: result.length };
    }

    if (mode === 'insert') {
      const items = Array.isArray(payload) ? payload : [payload];
      const inserted = items.map(item => ({
        id: item.id || crypto.randomUUID(),
        ...item,
        created_at: item.created_at || new Date().toISOString(),
      }));
      store[tableName] = [...data, ...inserted];
      if (isSingle || isMaybeSingle) {
        return { data: inserted[0], error: null };
      }
      return { data: inserted, error: null };
    }

    if (mode === 'update') {
      const filtered = applyFilters(data, filters);
      for (const row of filtered) {
        Object.assign(row, payload, { updated_at: new Date().toISOString() });
      }
      if (isSingle || isMaybeSingle) {
        return { data: filtered[0] || null, error: null };
      }
      return { data: filtered, error: null };
    }

    if (mode === 'upsert') {
      const items = Array.isArray(payload) ? payload : [payload];
      for (const item of items) {
        const idx = data.findIndex(d => d.id === item.id);
        if (idx >= 0) {
          Object.assign(data[idx], item, { updated_at: new Date().toISOString() });
        } else {
          data.push({ id: item.id || crypto.randomUUID(), ...item, created_at: new Date().toISOString() });
        }
      }
      return { data: items, error: null };
    }

    if (mode === 'delete') {
      const filtered = applyFilters(data, filters);
      store[tableName] = data.filter(d => !filtered.includes(d));
      return { data: filtered, error: null };
    }

    return { data: null, error: null };
  }

  return builder;
}

// Mock session state
let currentSession: any = null;
let authCallbacks: ((event: string, session: any) => void)[] = [];

function setSession(email: string) {
  const profile = DEMO_PROFILES.find(p => p.email === email);
  currentSession = {
    user: {
      id: profile?.id || crypto.randomUUID(),
      email,
      user_metadata: { name: profile?.full_name || email },
    },
    access_token: 'demo-token',
    refresh_token: 'demo-refresh',
  };
}

function clearSession() {
  currentSession = null;
}

// The mock supabase client
export const supabase: any = {
  from(table: string) {
    return {
      select(cols?: string, opts?: any) { return createQueryBuilder(table, 'select').select(cols, opts); },
      insert(data: any) { return createQueryBuilder(table, 'insert', data); },
      update(data: any) { return createQueryBuilder(table, 'update', data); },
      upsert(data: any) { return createQueryBuilder(table, 'upsert', data); },
      delete() { return createQueryBuilder(table, 'delete'); },
    };
  },

  rpc(fnName: string, args?: any) {
    const data = getDemoRpcData(fnName, args);
    // rpc can return scalar or array
    const result = data;
    return {
      data: result,
      error: null,
      // chain methods that are sometimes used after rpc
      then(resolve: any, reject?: any) {
        try { resolve({ data: result, error: null }); } catch (e) { if (reject) reject(e); }
      },
      single() {
        return {
          data: Array.isArray(result) ? result[0] || null : result,
          error: null,
          then(resolve: any) { resolve({ data: Array.isArray(result) ? result[0] || null : result, error: null }); },
        };
      },
      maybeSingle() {
        return {
          data: Array.isArray(result) ? result[0] || null : result,
          error: null,
          then(resolve: any) { resolve({ data: Array.isArray(result) ? result[0] || null : result, error: null }); },
        };
      },
    };
  },

  functions: {
    invoke(fnName: string, opts?: { body?: any }) {
      const response = getDemoFunctionResponse(fnName, opts?.body);
      return Promise.resolve(response);
    },
  },

  auth: {
    async signInWithPassword({ email, password }: { email: string; password: string }) {
      const normalizedEmail = email.toLowerCase().trim();
      const account = Object.values(DEMO_ACCOUNTS).find(
        a => a.email === normalizedEmail && a.password === password
      );
      if (!account) {
        return { data: { session: null, user: null }, error: { message: 'Invalid login credentials' } };
      }
      setSession(normalizedEmail);
      // Notify listeners
      setTimeout(() => {
        authCallbacks.forEach(cb => cb('SIGNED_IN', currentSession));
      }, 0);
      return { data: { session: currentSession, user: currentSession.user }, error: null };
    },

    async getSession() {
      return { data: { session: currentSession }, error: null };
    },

    async getUser() {
      return { data: { user: currentSession?.user || null }, error: null };
    },

    async signOut() {
      clearSession();
      authCallbacks.forEach(cb => cb('SIGNED_OUT', null));
      return { error: null };
    },

    async resetPasswordForEmail(_email: string) {
      return { data: {}, error: null };
    },

    async updateUser(_updates: any) {
      return { data: { user: currentSession?.user }, error: null };
    },

    onAuthStateChange(callback: (event: string, session: any) => void) {
      authCallbacks.push(callback);
      // Immediately call with current state
      if (currentSession) {
        setTimeout(() => callback('INITIAL_SESSION', currentSession), 0);
      }
      return {
        data: {
          subscription: {
            unsubscribe: () => {
              authCallbacks = authCallbacks.filter(cb => cb !== callback);
            },
          },
        },
      };
    },
  },

  channel(_name: string) {
    const ch: any = {
      on(_type: string, _filter: any, _callback?: any) { return ch; },
      subscribe(_callback?: any) {
        if (typeof _callback === 'function') _callback('SUBSCRIBED');
        return ch;
      },
      unsubscribe() { return ch; },
    };
    return ch;
  },

  removeChannel(_channel: any) {
    return Promise.resolve();
  },

  storage: {
    from(_bucket: string) {
      return {
        upload(_path: string, _file: any) {
          return Promise.resolve({ data: { path: _path }, error: null });
        },
        getPublicUrl(path: string) {
          return { data: { publicUrl: `https://demo.storage/${path}` } };
        },
        download(_path: string) {
          return Promise.resolve({ data: new Blob(), error: null });
        },
        list(_prefix?: string) {
          return Promise.resolve({ data: [], error: null });
        },
        remove(_paths: string[]) {
          return Promise.resolve({ data: [], error: null });
        },
      };
    },
  },
};
