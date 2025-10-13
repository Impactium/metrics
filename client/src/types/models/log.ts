export namespace Log {
  export interface Type {
    req_id: string;
    timestamp: number;
    status: number;
    took?: number; // how much time it took to process request
    path: string;
    method: string
    data?: string // json_string
  }
}
