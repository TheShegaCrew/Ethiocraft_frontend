'use client'

import React from 'react'
import { useState } from 'react'
import Link from 'next/link'
import { Header } from '@/components/shared/header'
import { Footer } from '@/components/shared/footer'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle, Shield } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

type AdminRole = 'agent' | 'admin'
const adminLoginSchema = z.object({
  email: z.string().email('Please enter a valid email'),
  employeeId: z.string().min(1, 'Employee ID is required'),
  password: z.string().min(1, 'Password is required'),
})

type AdminLoginFormData = z.infer<typeof adminLoginSchema>

export default function AdminLoginPage() {
  const [role, setRole] = useState<AdminRole>('agent')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<AdminLoginFormData>({
    resolver: zodResolver(adminLoginSchema),
    defaultValues: {
      email: '',
      employeeId: '',
      password: '',
    },
  })

  const handleLogin = async (values: AdminLoginFormData) => {
    setError('')

    setIsLoading(true)

    // Simulate login with additional security check
    setTimeout(() => {
      console.log(`Admin login attempt: ${values.email}, Role: ${role}, Employee ID: ${values.employeeId}`)
      setIsLoading(false)

      // Redirect based on role
      const dashboardMap: Record<AdminRole, string> = {
        agent: '/verification_agent/dashboard',
        admin: '/admin/dashboard',
      }
      window.location.href = dashboardMap[role]
    }, 1000)
  }

  return (
    <div className="min-h-screen bg-background flex flex-col font-inter">
      <Header />

      <main className="flex-1 flex items-center justify-center py-12 px-4">
        <Card className="w-full max-w-md border-primary/30">
          <div className="p-8">
            {/* Header */}
            <div className="text-center mb-8">
              <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center mx-auto mb-4">
                <Shield className="w-6 h-6 text-primary-foreground" />
              </div>
              <h1 className="text-2xl font-bold mb-2 font-druk-medium uppercase tracking-tight">Staff & Admin Portal</h1>
              <p className="text-muted-foreground text-sm">Secure login for authorized personnel</p>
            </div>

            {/* Security Notice */}
            <Alert className="mb-6 bg-primary/5 border-primary/20">
              <AlertCircle className="h-4 w-4 text-primary" />
              <AlertDescription className="text-sm text-foreground">
                This is a restricted area. Only authorized staff and administrators can access.
              </AlertDescription>
            </Alert>

            {/* Error Alert */}
            {error && (
              <Alert variant="destructive" className="mb-6">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Role Selection */}
            <div className="mb-6">
              <Label className="text-sm font-semibold mb-3 block font-aeonik">I am a:</Label>
              <div className="grid grid-cols-2 gap-2">
                {(['agent', 'admin'] as const).map((r) => (
                  <button
                    key={r}
                    onClick={() => setRole(r)}
                    className={`p-3 rounded-lg border-2 text-sm font-medium transition capitalize font-aeonik ${
                      role === r
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit(handleLogin)} className="space-y-4">
              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="email" className="font-aeonik">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="staff@ethiopian-handcraft.com"
                  {...register('email')}
                />
                {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
              </div>

              {/* Employee ID */}
              <div className="space-y-2">
                <Label htmlFor="employeeId" className="font-aeonik">Employee ID</Label>
                <Input
                  id="employeeId"
                  type="text"
                  placeholder="EMP-0001"
                  {...register('employeeId')}
                />
                {errors.employeeId && <p className="text-xs text-destructive">{errors.employeeId.message}</p>}
              </div>

              {/* Password */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="font-aeonik">Password</Label>
                  <Link href="#" className="text-xs text-primary hover:underline">
                    Forgot password?
                  </Link>
                </div>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  {...register('password')}
                />
                {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
              </div>

              {/* Submit Button */}
              <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-aeonik" disabled={isLoading}>
                {isLoading ? 'Verifying credentials...' : 'Access Portal'}
              </Button>
            </form>

            {/* Divider */}
            <div className="my-6 relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border"></div>
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">Or continue with</span>
              </div>
            </div>

            {/* SSO Login */}
            <div className="grid grid-cols-2 gap-3">
              <Button variant="outline" className="w-full bg-transparent font-aeonik">
                Microsoft SSO
              </Button>
              <Button variant="outline" className="w-full bg-transparent font-aeonik">
                Google SSO
              </Button>
            </div>

            {/* Navigation Links */}
            <p className="text-center text-xs text-muted-foreground mt-6">
              <Link href="/auth" className="text-primary hover:underline">
                Back to login options
              </Link>
            </p>
            <p className="text-center text-xs text-muted-foreground mt-2">
              Lost access?{' '}
              <Link href="#" className="text-primary font-semibold hover:underline">
                Contact IT Support
              </Link>
            </p>
          </div>
        </Card>
      </main>

      <Footer />
      <style jsx>{`
        .font-druk-medium { font-family: var(--font-druk-medium), sans-serif; }
        .font-aeonik { font-family: var(--font-aeonik), sans-serif; }
        .font-inter { font-family: var(--font-inter), sans-serif; }
      `}</style>
    </div>
  )
}
