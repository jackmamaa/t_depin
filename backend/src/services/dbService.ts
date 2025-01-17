import mysql from 'mysql2/promise';

const pool = mysql.createPool({
  host: process.env.MYSQL_HOST,
  port: Number(process.env.MYSQL_PORT),
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE,
  waitForConnections: true,
  connectionLimit: 100,
  maxIdle: 100,
  idleTimeout: 60000,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
  connectTimeout: 30000
});

export type EntityType = 'user' | 'instance' | 'deposit' | 'vpn' | 'ssh_key' | 'launch_script';
interface TableConfig {
  tableName: string;
  primaryKey: string | string[];
}

const TABLE_CONFIG: Record<string, TableConfig> = {
  user: {
    tableName: 'users',
    primaryKey: 'wallet_address'
  },
  instance: {
    tableName: 'instances',
    primaryKey: ['agreement_id', 'network']
  },
  deposit: {
    tableName: 'deposits',
    primaryKey: ['deposit_id', 'network']
  },
  vpn: {
    tableName: 'vpns',
    primaryKey: ['vpn_id', 'network']
  },
  ssh_key: {
    tableName: 'ssh_keys',
    primaryKey: ['key_id', 'network']
  },
  launch_script: {
    tableName: 'launch_scripts',
    primaryKey: ['script_id', 'network']
  }
};

export class DatabaseService {

  private serializeValue(value: any): string | number | null {
    if (value === null || value === undefined) {
      return null;
    }
    
    if (typeof value === 'number' || typeof value === 'string') {
      return value;
    }
    if (Array.isArray(value) || typeof value === 'object') {
      return JSON.stringify(value);
    }
    return String(value);
  }

  private deserializeValue(value: any, key: string): any {
    if (value === null) {
      return null;
    }
    // known fields to be deserialized
    const jsonFields = ['capabilities', 'forward_ports', 'used_providers'];
    
    if (jsonFields.includes(key)) {
      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    }
    return value;
  }

  // update generic method
  public async update<T extends object>(
    entityType: EntityType,
    id: string | Record<string, any>,
    updates: Partial<T>
  ) {
    const { tableName, primaryKey } = TABLE_CONFIG[entityType];
    
    try {
      const updateFields = Object.keys(updates)
        .map(field => `${field} = ?`)
        .join(', ');
      
      const values = Object.keys(updates).map(key => 
        this.serializeValue(updates[key as keyof T])
      );

      let whereClause: string;
      let whereValues: any[];

      if (typeof id === 'string') {
        whereClause = `${Array.isArray(primaryKey) ? primaryKey[0] : primaryKey} = ?`;
        whereValues = [id];
      } else {
        whereClause = Object.keys(id)
          .map(key => `${key} = ?`)
          .join(' AND ');
        whereValues = Object.values(id);
      }

      const sql = `UPDATE ${tableName} SET ${updateFields} WHERE ${whereClause}`;
      const connection = await pool.getConnection();
      
      try {
        const [result] = await connection.execute(sql, [...values, ...whereValues]);
        return result;
      } finally {
        connection.release();
      }
    } catch (error) {
      console.error(`Error updating ${entityType}:`, error);
      throw error;
    }
  }

  // get generic method
  public async get<T>(
    entityType: EntityType,
    id?: string | Record<string, any>,
    conditions?: Partial<T>
  ): Promise<T[]> {
    const { tableName, primaryKey } = TABLE_CONFIG[entityType];
    
    try {
      const connection = await pool.getConnection();
      try {
        let publicData: any[] = [];
        let userData: any[] = [];

        let publicSql = `SELECT * FROM ${tableName} WHERE wallet_address IS NULL`;
        const [publicRows] = await connection.execute(publicSql);
        publicData = (publicRows as any[]).map(row => {
          const deserializedRow: any = {};
          for (const [key, value] of Object.entries(row)) {
            deserializedRow[key] = this.deserializeValue(value, key);
          }
          return deserializedRow as T;
        });
  
        if (id || conditions) {
          let userSql = `SELECT * FROM ${tableName}`;
          const userParams: any[] = [];
  
          if (id) {
            if (typeof id === 'string') {
              userSql += ` WHERE ${Array.isArray(primaryKey) ? primaryKey[0] : primaryKey} = ?`;
              userParams.push(id);
            } else {
              const whereClause = Object.keys(id)
                .map(key => `${key} = ?`)
                .join(' AND ');
              userSql += ` WHERE ${whereClause}`;
              userParams.push(...Object.values(id));
            }
          } else if (conditions) {
            const whereClause = Object.entries(conditions)
              .map(([key]) => `${key} = ?`)
              .join(' AND ');
            if (whereClause) {
              userSql += ` WHERE ${whereClause}`;
              userParams.push(...Object.values(conditions).map(value => this.serializeValue(value)));
            }
          }
  
          const [userRows] = await connection.execute(userSql, userParams);
          userData = (userRows as any[]).map(row => {
            const deserializedRow: any = {};
            for (const [key, value] of Object.entries(row)) {
              deserializedRow[key] = this.deserializeValue(value, key);
            }
            return deserializedRow as T;
          });
        }
        
        return [...publicData, ...userData] as T[];
      } finally {
        connection.release();
      }
    } catch (error) {
      console.error(`Error getting ${entityType}:`, error);
      throw error;
    }
  }

  // delete generic method
  public async delete(
    entityType: EntityType, 
    id: string | Record<string, any>
  ) {
    const { tableName, primaryKey } = TABLE_CONFIG[entityType];
    
    try {
      let whereClause: string;
      let values: any[];

      if (typeof id === 'string') {
        whereClause = `${Array.isArray(primaryKey) ? primaryKey[0] : primaryKey} = ?`;
        values = [id];
      } else {
        whereClause = Object.keys(id)
          .map(key => `${key} = ?`)
          .join(' AND ');
        values = Object.values(id);
      }

      const sql = `DELETE FROM ${tableName} WHERE ${whereClause}`;
      const connection = await pool.getConnection();
      
      try {
        const [result] = await connection.execute(sql, values);
        return result;
      } finally {
        connection.release();
      }
    } catch (error) {
      console.error(`Error deleting ${entityType}:`, error);
      throw error;
    }
  }

  // insert generic method
  public async insert<T extends object>(
    entityType: EntityType,
    data: T
  ) {
    const { tableName } = TABLE_CONFIG[entityType];
    
    try {
      const fields = Object.keys(data).join(', ');
      const placeholders = Object.keys(data).map(() => '?').join(', ');
      const values = Object.entries(data).map(([key, value]) => 
        this.serializeValue(value)
      );

      const sql = `INSERT INTO ${tableName} (${fields}) VALUES (${placeholders})`;
      const connection = await pool.getConnection();
      
      try {
        const [result] = await connection.execute(sql, values);
        return result;
      } finally {
        connection.release();
      }
    } catch (error) {
      console.error(`Error inserting ${entityType}:`, error);
      throw error;
    }
  }
}

export const dbService = new DatabaseService();