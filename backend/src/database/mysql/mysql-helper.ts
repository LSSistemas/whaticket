import mysql from "mysql2/promise";

export const MySqlHelper = {
  connection: null as unknown as mysql.Connection,

  async connect(): Promise<void> {
    this.connection = await mysql.createConnection({
      host: process.env.MYSQL_HOST ?? "10.10.10.1",
      user: process.env.MYSQL_USER ?? "root",
      password: process.env.MYSQL_PASSWORD ?? "password",
      database: process.env.MYSQL_DATABASE ?? "database",
      charset: "utf8mb4",
      debug: true,
      flags: ['--no-named-keys']
    });
  },

  async disconnect(): Promise<void> {
    if (this.connection) {
      await this.connection.end();
    }
  },

  async exec(query: string, values?: any): Promise<any> {
    const result = await this.connection.execute(query, values);
    return result;
  },

  async query(query: string, values?: any): Promise<any> {
    const result = await this.connection.query(query, values);
    return result;
  }
};
