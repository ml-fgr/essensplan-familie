declare module 'node:sqlite' {
  export interface StatementResultingChanges {
    changes: number;
    lastInsertRowid: number | bigint;
  }

  export interface StatementSync {
    all(...params: unknown[]): unknown[];
    get(...params: unknown[]): unknown;
    run(...params: unknown[]): StatementResultingChanges;
    iterate(...params: unknown[]): Iterator<unknown>;
    setAllowBareNamedParameters(allowed: boolean): void;
    setReadBigInts(enabled: boolean): void;
    expandedSQL: string;
    sourceSQL: string;
  }

  export interface DatabaseSyncOptions {
    open?: boolean;
    readOnly?: boolean;
    enableForeignKeyConstraints?: boolean;
    enableLoadExtension?: boolean;
    allowExtension?: boolean;
  }

  export class DatabaseSync {
    constructor(location: string, options?: DatabaseSyncOptions);
    close(): void;
    exec(sql: string): void;
    prepare(sql: string): StatementSync;
    open(): void;
    isOpen: boolean;
  }
}
