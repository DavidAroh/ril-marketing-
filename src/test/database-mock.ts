export type Query = {
  table: string;
  operation: string;
  columns?: string;
  payload?: Record<string, unknown> | unknown[];
  filters: Array<{ method: string; column: unknown; value: unknown }>;
  head?: boolean;
  single?: boolean;
};

export type QueryResult = { data?: unknown; error?: { message: string } | null; count?: number | null };

export function databaseMock(resolve: (query: Query) => QueryResult) {
  const queries: Query[] = [];
  return {
    queries,
    from(table: string) {
      const query: Query = { table, operation: "select", filters: [] };
      const builder: object = new Proxy({}, {
        get(_target, method: string) {
          if (method === "then") return (fulfilled: (value: QueryResult) => unknown, rejected: (error: unknown) => unknown) => {
            queries.push(query);
            return Promise.resolve().then(() => resolve(query)).then(fulfilled, rejected);
          };
          return (...args: unknown[]) => {
            if (method === "select") {
              query.columns = args[0] as string;
              query.head = Boolean((args[1] as { head?: boolean } | undefined)?.head);
            } else if (["update", "insert", "upsert"].includes(method)) {
              query.operation = method;
              query.payload = args[0] as Query["payload"];
            } else if (["maybeSingle", "single"].includes(method)) query.single = true;
            else query.filters.push({ method, column: args[0], value: args[1] });
            return builder;
          };
        },
      });
      return builder;
    },
    async rpc() { return { error: null }; },
  };
}
