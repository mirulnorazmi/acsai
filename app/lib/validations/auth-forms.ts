import { z } from "zod"

export const LoginSchema = z.object({
  email: z.string().email({ message: "Invalid email address" }),
  password: z.string().min(1, { message: "Password is required" }),
})

export type LoginValues = z.infer<typeof LoginSchema>

export const RegisterSchema = z.object({
  email: z.string().email({ message: "Invalid email address" }),
  full_name: z.string().min(2, { message: "Full name must be at least 2 characters" }),
  password: z.string().min(6, { message: "Password must be at least 6 characters" }),
})

export type RegisterValues = z.infer<typeof RegisterSchema>
