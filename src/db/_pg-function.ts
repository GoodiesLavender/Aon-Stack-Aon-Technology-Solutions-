// @appbuilder-pg-function-v1 -- auto-injected by deploy pipeline.
// Extended locally with optional `searchPath` so CREATE FUNCTION can emit
// `SET search_path TO ...` and clear Supabase Security Advisor lint
// "function_search_path_mutable". Safe to keep if the pipeline rewrites
// this file — schema.ts still passes searchPath on each pgFunction call.

export type PgFunctionLanguage = "plpgsql" | "sql";

export interface PgFunctionDef {
  /** Parameter list as plain SQL text, e.g. "user_id uuid, amount integer". Empty for no-arg. */
  args?: string;
  /** Postgres return type, e.g. "integer", "void", "setof todos", "jsonb". */
  returns: string;
  /** Defaults to "plpgsql". */
  language?: PgFunctionLanguage;
  /** Function body. For plpgsql: the inner BEGIN ... END; block. For sql: the inner statement(s). */
  body: string;
  /**
   * Explicit search_path for the function (Supabase Security Advisor).
   * Emitted as: SET search_path TO <value>
   * Use "public" for ordinary app functions that touch public.* tables.
   */
  searchPath?: string;
}

export interface PgFunctionMarker extends PgFunctionDef {
  readonly __pgFunction: true;
  readonly name: string;
  readonly language: PgFunctionLanguage;
}

export function pgFunction(name: string, def: PgFunctionDef): PgFunctionMarker {
  return {
    __pgFunction: true,
    name,
    args: def.args ?? "",
    returns: def.returns,
    language: def.language ?? "plpgsql",
    body: def.body,
    ...(def.searchPath ? { searchPath: def.searchPath } : {}),
  };
}
