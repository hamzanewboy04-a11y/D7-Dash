/**
 * Validation schemas for API endpoints using Zod
 * 
 * This file contains shared validation schemas that can be used across
 * different API routes to ensure data consistency and type safety.
 */

import { z } from 'zod';

/**
 * Common validation schemas
 */

export const uuidSchema = z.string().uuid('Invalid UUID format');

export const dateSchema = z.string().datetime('Invalid date format. Use ISO 8601 format');

export const positiveNumberSchema = z.number().positive('Must be a positive number');

export const nonNegativeNumberSchema = z.number().min(0, 'Must be zero or positive');

/**
 * Metrics API validation schemas
 */

export const metricsQuerySchema = z.object({
  countryId: uuidSchema.optional(),
  date: dateSchema.optional(),
  startDate: dateSchema.optional(),
  endDate: dateSchema.optional(),
  limit: z.string().regex(/^\d+$/).transform(Number).pipe(z.number().int().min(1).max(1000)).optional(),
  filterZeroSpend: z.enum(['true', 'false']).transform(val => val === 'true').optional(),
}).refine(
  data => {
    // If startDate is provided, endDate must also be provided
    if (data.startDate && !data.endDate) return false;
    if (data.endDate && !data.startDate) return false;
    return true;
  },
  {
    message: 'startDate and endDate must be provided together',
  }
);

// Default constants
export const DEFAULT_PAYROLL_HEAD_DESIGNER = 10;

export const adSpendSchema = z.object({
  adAccountId: uuidSchema,
  spend: nonNegativeNumberSchema.optional().default(0),
  deposit: nonNegativeNumberSchema.optional().default(0),
  balance: nonNegativeNumberSchema.optional().default(0),
});

export const createMetricsSchema = z.object({
  date: dateSchema,
  countryId: uuidSchema,
  // Ad spends
  adSpends: z.array(adSpendSchema).optional(),
  // Revenue
  revenueLocalPriemka: nonNegativeNumberSchema.optional().default(0),
  revenueUsdtPriemka: nonNegativeNumberSchema.optional().default(0),
  revenueLocalOwn: nonNegativeNumberSchema.optional().default(0),
  revenueUsdtOwn: nonNegativeNumberSchema.optional().default(0),
  // FD data
  fdCount: z.number().int().min(0).optional().default(0),
  fdSumLocal: nonNegativeNumberSchema.optional().default(0),
  // Payroll
  payrollContent: nonNegativeNumberSchema.optional().default(0),
  payrollReviews: nonNegativeNumberSchema.optional().default(0),
  payrollDesigner: nonNegativeNumberSchema.optional().default(0),
  payrollHeadDesigner: nonNegativeNumberSchema.optional().default(DEFAULT_PAYROLL_HEAD_DESIGNER),
  // Additional
  chatterfyCost: nonNegativeNumberSchema.optional().default(0),
  additionalExpenses: nonNegativeNumberSchema.optional().default(0),
  // Balance facts
  adAccountBalanceFact: z.number().optional().default(0),
  balancePriemkaFact: z.number().optional().default(0),
  balanceOwnFact: z.number().optional().default(0),
});

/**
 * Authentication validation schemas
 */

export const loginSchema = z.object({
  username: z.string().min(1, 'Username is required').max(50),
  password: z.string().min(1, 'Password is required'),
});

/**
 * Password validation schema for password changes
 * Ensures strong password requirements
 */
export const passwordRequirementsSchema = z.string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password must be less than 128 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number');

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: passwordRequirementsSchema,
});

/**
 * Country validation schemas
 */

export const createCountrySchema = z.object({
  name: z.string().min(1, 'Country name is required').max(100),
  code: z.string().length(2, 'Country code must be 2 characters').toUpperCase(),
  currency: z.string().length(3, 'Currency code must be 3 characters').toUpperCase(),
  isActive: z.boolean().optional().default(true),
});

export const updateCountrySchema = createCountrySchema.partial().extend({
  id: uuidSchema,
});

/**
 * Expense validation schemas
 */

export const expenseTypeSchema = z.enum(['payroll', 'commission', 'chatterfy', 'tools', 'other']);

export const createExpenseSchema = z.object({
  date: dateSchema,
  amount: positiveNumberSchema,
  category: expenseTypeSchema,
  description: z.string().max(500).optional(),
  countryId: uuidSchema.optional(),
});

/**
 * Employee validation schemas
 */

export const employeeRoleSchema = z.enum([
  'buyer',
  'content',
  'designer',
  'reviewer',
  'rd_handler',
  'fd_handler',
  'head_designer',
]);

export const paymentScheduleSchema = z.enum([
  'buffer',
  'day_to_day',
  'twice_monthly',
  'weekly',
  'monthly',
]);

export const createEmployeeSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  role: employeeRoleSchema,
  countryId: uuidSchema,
  paymentSchedule: paymentScheduleSchema,
  fixedRate: nonNegativeNumberSchema.optional().default(0),
  percentageRate: z.number().min(0).max(100).optional().default(0),
  isActive: z.boolean().optional().default(true),
});

/**
 * Payroll validation schemas
 */

export const createPayrollSchema = z.object({
  employeeId: uuidSchema,
  amount: positiveNumberSchema,
  paymentDate: dateSchema,
  periodStart: dateSchema,
  periodEnd: dateSchema,
  notes: z.string().max(500).optional(),
});

/**
 * Pagination validation schema
 */

export const paginationSchema = z.object({
  page: z.string().regex(/^\d+$/).transform(Number).pipe(z.number().int().min(1)).optional().default('1'),
  limit: z.string().regex(/^\d+$/).transform(Number).pipe(z.number().int().min(1).max(100)).optional().default('50'),
});

/**
 * Helper function to validate request body
 */

export function validateBody<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; error: string } {
  try {
    const validated = schema.parse(data);
    return { success: true, data: validated };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessages = error.errors.map(err => `${err.path.join('.')}: ${err.message}`).join(', ');
      return { success: false, error: errorMessages };
    }
    return { success: false, error: 'Validation failed' };
  }
}

/**
 * Helper function to validate query parameters
 */

export function validateQuery<T>(
  schema: z.ZodSchema<T>,
  searchParams: URLSearchParams
): { success: true; data: T } | { success: false; error: string } {
  try {
    const params: Record<string, string> = {};
    searchParams.forEach((value, key) => {
      params[key] = value;
    });
    const validated = schema.parse(params);
    return { success: true, data: validated };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessages = error.errors.map(err => `${err.path.join('.')}: ${err.message}`).join(', ');
      return { success: false, error: errorMessages };
    }
    return { success: false, error: 'Validation failed' };
  }
}
