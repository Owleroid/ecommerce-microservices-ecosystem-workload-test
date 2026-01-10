import { pool } from '../config/database';
import { UserProfile, UpdateProfileDto } from '../models/profile.model';

export class ProfileRepository {
  async findByUserId(userId: number): Promise<UserProfile | null> {
    const result = await pool.query<UserProfile>(
      'SELECT * FROM user_profiles WHERE user_id = $1',
      [userId]
    );
    return result.rows[0] || null;
  }

  async create(userId: number): Promise<UserProfile> {
    const result = await pool.query<UserProfile>(
      `INSERT INTO user_profiles (user_id) 
       VALUES ($1) 
       RETURNING *`,
      [userId]
    );
    return result.rows[0];
  }

  async update(userId: number, data: UpdateProfileDto): Promise<UserProfile | null> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    // Build dynamic UPDATE query based on provided fields
    if (data.first_name !== undefined) {
      fields.push(`first_name = $${paramCount++}`);
      values.push(data.first_name);
    }
    if (data.last_name !== undefined) {
      fields.push(`last_name = $${paramCount++}`);
      values.push(data.last_name);
    }
    if (data.bio !== undefined) {
      fields.push(`bio = $${paramCount++}`);
      values.push(data.bio);
    }
    if (data.avatar_url !== undefined) {
      fields.push(`avatar_url = $${paramCount++}`);
      values.push(data.avatar_url);
    }
    if (data.phone !== undefined) {
      fields.push(`phone = $${paramCount++}`);
      values.push(data.phone);
    }

    if (fields.length === 0) {
      return this.findByUserId(userId);
    }

    fields.push(`updated_at = NOW()`);
    values.push(userId);

    const query = `
      UPDATE user_profiles 
      SET ${fields.join(', ')} 
      WHERE user_id = $${paramCount}
      RETURNING *
    `;

    const result = await pool.query<UserProfile>(query, values);
    return result.rows[0] || null;
  }

  async delete(userId: number): Promise<void> {
    await pool.query('DELETE FROM user_profiles WHERE user_id = $1', [userId]);
  }
}
