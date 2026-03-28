// Stub for convex generated server module
// This file will be replaced when running `npx convex dev`

interface QueryCtx {
  db: {
    query: (table: string) => any;
    insert: (table: string, data: any) => Promise<any>;
    patch: (id: string, data: any) => Promise<any>;
  };
}

interface ActionCtx {
  db: QueryCtx['db'];
}

type Handler<Ctx, Args, Return> = (ctx: Ctx, args: Args) => Promise<Return>;

export const query = <Args, Return>(config: { 
  args: any; 
  handler: Handler<QueryCtx, Args, Return>;
}) => config.handler;

export const mutation = <Args, Return>(config: { 
  args: any; 
  handler: Handler<QueryCtx, Args, Return>;
}) => config.handler;

export const action = <Args, Return>(config: { 
  args: any; 
  handler: Handler<ActionCtx, Args, Return>;
}) => config.handler;
