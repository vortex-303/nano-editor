import { z } from 'zod';

export const passwordChangeSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number")
    .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character"),
  confirmPassword: z.string().min(1, "Please confirm your password")
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"]
});

export type PasswordChangeForm = z.infer<typeof passwordChangeSchema>;

export const calculatePasswordStrength = (password: string): { 
  strength: number; 
  label: string; 
  color: string;
} => {
  if (!password) return { strength: 0, label: "None", color: "bg-gray-300" };
  
  let strength = 0;
  
  // Length check
  if (password.length >= 8) strength += 25;
  if (password.length >= 12) strength += 15;
  
  // Character variety checks
  if (/[a-z]/.test(password)) strength += 15;
  if (/[A-Z]/.test(password)) strength += 15;
  if (/[0-9]/.test(password)) strength += 15;
  if (/[^A-Za-z0-9]/.test(password)) strength += 15;
  
  // Label and color based on strength
  if (strength < 40) return { strength, label: "Weak", color: "bg-red-500" };
  if (strength < 70) return { strength, label: "Medium", color: "bg-yellow-500" };
  return { strength, label: "Strong", color: "bg-green-500" };
};
