export const HOST = process.env.HOST // production only usage
export const SERVER_SSR = process.env.NODE_ENV === 'production' ? 'api:1337' : 'localhost:1337';
export const SERVER_CSR = process.env.NODE_ENV === 'production' ? `https://${process.env.HOST}` : `http://${SERVER_SSR}`;
export const Authorization = 'Authorization'
