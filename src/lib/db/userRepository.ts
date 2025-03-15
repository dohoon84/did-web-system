import { v4 as uuidv4 } from 'uuid';
import db from './index';

export interface User {
  id: string;
  name: string;
  email?: string;
  birth_date: string;
  created_at?: string;
  updated_at?: string;
}

/**
 * 새 사용자를 생성합니다.
 */
export function createUser(user: Omit<User, 'id' | 'created_at' | 'updated_at'>): User {
  const id = uuidv4();
  const now = new Date().toISOString();
  
  const stmt = db.prepare(`
    INSERT INTO users (id, name, email, birth_date, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  
  stmt.run(id, user.name, user.email || null, user.birth_date, now, now);
  
  return {
    id,
    name: user.name,
    email: user.email,
    birth_date: user.birth_date,
    created_at: now,
    updated_at: now
  };
}

/**
 * ID로 사용자를 조회합니다.
 */
export function getUserById(id: string): User | null {
  const stmt = db.prepare('SELECT * FROM users WHERE id = ?');
  return stmt.get(id) as User | null;
}

/**
 * 이메일로 사용자를 조회합니다.
 */
export function getUserByEmail(email: string): User | null {
  const stmt = db.prepare('SELECT * FROM users WHERE email = ?');
  return stmt.get(email) as User | null;
}

/**
 * 생년월일로 사용자의 나이를 계산합니다.
 */
export function calculateAge(birthDate: string): number {
  const today = new Date();
  const birth = new Date(birthDate);
  
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  
  // 아직 생일이 지나지 않았으면 나이에서 1을 뺍니다
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  
  return age;
}

/**
 * 사용자가 특정 연령 이상인지 확인합니다.
 */
export function isUserOverAge(userId: string, requiredAge: number): boolean {
  const user = getUserById(userId);
  if (!user) return false;
  
  const age = calculateAge(user.birth_date);
  return age >= requiredAge;
}

/**
 * 모든 사용자를 조회합니다.
 */
export function getAllUsers(): User[] {
  const stmt = db.prepare('SELECT * FROM users ORDER BY created_at DESC');
  return stmt.all() as User[];
}

/**
 * 사용자 정보를 업데이트합니다.
 */
export function updateUser(id: string, updates: Partial<Omit<User, 'id' | 'created_at' | 'updated_at'>>): User | null {
  const user = getUserById(id);
  if (!user) return null;
  
  const now = new Date().toISOString();
  const fields: string[] = [];
  const values: any[] = [];
  
  if (updates.name !== undefined) {
    fields.push('name = ?');
    values.push(updates.name);
  }
  
  if (updates.email !== undefined) {
    fields.push('email = ?');
    values.push(updates.email);
  }
  
  if (updates.birth_date !== undefined) {
    fields.push('birth_date = ?');
    values.push(updates.birth_date);
  }
  
  fields.push('updated_at = ?');
  values.push(now);
  values.push(id);
  
  const stmt = db.prepare(`
    UPDATE users
    SET ${fields.join(', ')}
    WHERE id = ?
  `);
  
  stmt.run(...values);
  
  return getUserById(id);
}

/**
 * 사용자를 삭제합니다.
 * @param id 삭제할 사용자의 ID
 * @returns 삭제 성공 여부
 */
export async function deleteUser(id: string): Promise<boolean> {
  try {
    const user = getUserById(id);
    if (!user) return false;
    
    const stmt = db.prepare('DELETE FROM users WHERE id = ?');
    stmt.run(id);
    
    return true;
  } catch (error) {
    console.error('사용자 삭제 중 오류 발생:', error);
    return false;
  }
} 