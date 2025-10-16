import { APP_CONFIG } from "@/config/app-config";

export const HOST = APP_CONFIG.host ?? 'metrics.impactium.dev';
export const SERVER_SSR = process.env.NODE_ENV === 'production' ? 'api:1337' : 'localhost:1337';
export const SERVER_CSR = process.env.NODE_ENV === 'production' ? `https://${process.env.HOST}` : `http://${SERVER_SSR}`;
export const Authorization = 'Authorization'
