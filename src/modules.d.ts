/* Needed so that typescript doesn't complain about properties on process.env */
declare namespace NodeJS {
  export interface ProcessEnv {
    DB_SECRET: string;
    DB_URL: string;
  }
}
