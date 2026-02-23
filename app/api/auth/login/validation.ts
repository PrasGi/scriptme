import { z } from 'zod';

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .min(1, 'Email is required')
    .email('Please enter a valid email address'),

  password: z
    .string()
    .min(1, 'Password is required'),
});

export type LoginInput = z.infer<typeof loginSchema>;

export function validateLogin(body: unknown) {
  const result = loginSchema.safeParse(body);
  if (!result.success) {
    const errors: Record<string, string[]> = {};
    result.error.issues.forEach((issue) => {
      const key = issue.path[0] as string;
      if (!errors[key]) errors[key] = [];
      errors[key].push(issue.message);
    });
    return { ok: false as const, errors };
  }
  return { ok: true as const, data: result.data };
}
