// User role type (replacing deleted UserRole enum)
export type UserRole = 'ADMIN' | 'ACCOUNTANT' | 'VIEWER';

// This is kept for backward compatibility with existing code
// New code should use isAdmin flag and permissions instead
