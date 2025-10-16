export namespace Log {
  export interface Type {
    req_id: string;
    timestamp: number; // Unix timestamp in milliseconds
    status: number;
    took?: number; // how much time it took to process request in ms
    path: string;
    method: string
    data?: Record<string, any> // optional additional data
  }

  export namespace Statistics {
    export type Key = 'provisional' | 'success' | 'redirect' | 'badRequest' | 'error';

    export interface Point extends Record<Key, number> {
      date: number; // ms
    }

    export type Type = Point[];
  }
}
