/**
 * TypeScript types for Madagascar Driver's License System
 */

// Person-related types
export interface Person {
  id: string;
  surname: string;
  first_name: string;
  middle_name?: string;
  person_nature: 'Male' | 'Female';
  birth_date?: string;
  nationality_code: string;
  preferred_language: string;
  email?: string;
  work_phone?: string;
  cell_phone?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by?: string;
  updated_by?: string;
}

// User and authentication types
export interface User {
  id: string;
  username: string;
  email?: string;
  first_name?: string;
  last_name?: string;
  is_active: boolean;
  is_superuser: boolean;
  roles: string[];
  permissions: string[];
  created_at: string;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

// Permission constants for Madagascar system
export const PERMISSIONS = {
  // Person management
  PERSONS_CREATE: 'persons.create',
  PERSONS_READ: 'persons.read',
  PERSONS_UPDATE: 'persons.update',
  PERSONS_DELETE: 'persons.delete',
  PERSONS_SEARCH: 'persons.search',
  PERSONS_CHECK_DUPLICATES: 'persons.check_duplicates',
} as const;

export const ROLES = {
  ADMIN: 'Admin',
  CLERK: 'Clerk',
  SUPERVISOR: 'Supervisor',
  PRINTER: 'Printer',
} as const; 