"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2 } from "lucide-react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"

import { AuthCard } from "@/components/ui/auth-card"
import { Button } from "@/components/ui/button"
import { Form } from "@/components/ui/form"
import { InputField } from "@/components/ui/input-field"
import { RegisterSchema, RegisterValues } from "@/lib/validations/auth-forms"

export default function RegisterPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

  const form = useForm<RegisterValues>({
    resolver: zodResolver(RegisterSchema),
    defaultValues: {
      full_name: "",
      email: "",
      password: "",
    },
  })

  async function onSubmit(data: RegisterValues) {
    setIsLoading(true)
    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.message || "Registration failed")
      }

      // Auto-login logic
      const { token } = result

      if (token) {
        localStorage.setItem("auth_token", token)
        document.cookie = `auth_token=${token}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax; Secure`
        toast.success("Account created successfully!")
        router.push("/")
        router.refresh()
      } else {
        toast.success("Account created! Please login.")
        router.push("/login")
      }

    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-background px-4">
      <AuthCard
        title="Create an account"
        description="Enter your details to get started"
        footerLink={{
          text: "Already have an account?",
          label: "Login",
          href: "/login",
        }}
      >
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <InputField
              control={form.control}
              name="full_name"
              label="Full Name"
              placeholder="John Doe"
              disabled={isLoading}
            />
            <InputField
              control={form.control}
              name="email"
              label="Email"
              placeholder="name@example.com"
              disabled={isLoading}
            />
            <InputField
              control={form.control}
              name="password"
              label="Password"
              type="password"
              placeholder="••••••"
              disabled={isLoading}
            />
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Account
            </Button>
          </form>
        </Form>
      </AuthCard>
    </div>
  )
}
