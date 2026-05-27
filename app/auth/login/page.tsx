"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/shared/header';
import { Footer } from '@/components/shared/footer';
import { useAuth, useGuestRedirect } from '@/lib/auth-context';
import { dashboardForRole } from '@/lib/permissions';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

// If NEXT_PUBLIC_API_BASE_URL is set (e.g. production), use it.
// Otherwise use the dev proxy path so requests are same-origin.
const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL
  ? `${process.env.NEXT_PUBLIC_API_BASE_URL}`
  : '';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address.'),
  password: z.string().min(1, 'Password is required.'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const { isAuthLoading, isAuthenticated } = useGuestRedirect();

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (values: LoginFormData) => {
    setErrorMessage('');
    setIsLoading(true);

    try {
      const url = BASE_URL ? `${BASE_URL}/auth/login` : `/api/auth/login`;
      const res = await fetch(url, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });

      const json = await res.json();

      if (!res.ok) {
        const msg = json?.message ?? json?.error ?? 'Invalid credentials. Please try again.';
        if (typeof msg === 'string' && msg.toLowerCase().includes('email is not verified')) {
          router.push(`/auth/verify-otp?email=${encodeURIComponent(values.email)}`);
          return;
        }
        setErrorMessage(msg);
        return;
      }

      // ── Extract role and update auth state ───────────────────────────────
      const payload = json?.data ?? json;
      const role: string = (
        payload?.role ?? payload?.user?.role ?? 'CUSTOMER'
      ).toUpperCase();

      login(role as any);

      // ── Redirect by role ──────────────────────────────────────────────────
      const searchParams = new URLSearchParams(window.location.search);
      const redirectUrl = searchParams.get('redirect');
      if (redirectUrl && redirectUrl.startsWith('/')) {
        router.push(redirectUrl);
      } else {
        router.push(dashboardForRole(role));
      }
    } catch {
      setErrorMessage('Unable to reach the server. Please check your connection.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isAuthLoading || isAuthenticated) {
    return null;
  }

  return (
    <div className="relative min-h-screen w-full overflow-hidden text-[#1C1C1C] font-inter flex flex-col">
    {/* Blurred Background Layer (Warm & Natural) */}
    <div 
      className="absolute inset-0 bg-cover bg-center blur-2xl scale-105"
      style={{ 
        backgroundImage: `url('https://i.pinimg.com/1200x/e2/2a/1b/e22a1b62d41b56adfdab68776d40e56f.jpg')`
      }}
    />


    {/* Main Content */}
    <div className="relative z-10 flex flex-col min-h-screen">
      <Header />
      
      <main className="flex-grow flex items-center justify-center p-4 md:p-8 pt-24 md:pt-28">
        {/* Main Card Container */}
        <div 
          className="w-full max-w-[1300px] min-h-[650px] bg-gradient-to-br from-[#f8f9fa] to-[#fbf1d8] rounded-[2.5rem] shadow-2xl flex flex-col md:flex-row overflow-hidden relative"
          style={{ transition: 'opacity 250ms ease, transform 250ms ease' }}
        >
          {/* Left Column - Form */}
          <section className="w-full md:w-1/2 p-8 md:p-14 flex flex-col justify-between relative z-10">
            <div>
              {/* Top Logo / Brand */}
              <div className="font-aeonik inline-block border border-gray-300 rounded-full px-5 py-1.5 text-sm text-gray-600 mb-12">
                EthioCraft
              </div>

              {/* Headings */}
              <div className="mb-8">
                <h1 className="font-druk-medium uppercase tracking-[0.04em] text-3xl md:text-[2.25rem] mb-2 leading-tight">
                  Welcome Back
                </h1>
                <p className="font-aeonik text-sm text-gray-500">
                  Sign in to access your dashboard
                </p>
              </div>

              {/* Form */}
              <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
                <div>
                  <label className="font-aeonik block text-xs text-gray-500 mb-1.5 ml-4">Email</label>
                  <input
                    type="email"
                    {...register('email')}
                    className="w-full bg-white/70 border border-white focus:border-[#d9d2c7] focus:bg-white rounded-full px-5 py-3.5 text-sm outline-none transition-all placeholder:text-gray-400 shadow-sm"
                    placeholder="you@example.com"
                  />
                  {errors.email && <p className="font-aeonik mt-1 ml-4 text-xs text-red-500">{errors.email.message}</p>}
                </div>

                <div className="relative">
                  <div className="flex justify-between items-center mb-1.5 ml-4 mr-4">
                    <label className="font-aeonik text-xs text-gray-500">Password</label>
                  </div>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      {...register('password')}
                      className="w-full bg-white/70 border border-white focus:border-[#d9d2c7] focus:bg-white rounded-full px-5 py-3.5 text-sm outline-none transition-all placeholder:text-gray-400 shadow-sm pr-12"
                      placeholder="••••••••••••••••"
                    />
                    <button 
                      type="button" 
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      {showPassword ? (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                        </svg>
                      ) : (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                      )}
                    </button>
                  </div>
                  {errors.password && <p className="font-aeonik mt-1 ml-4 text-xs text-red-500">{errors.password.message}</p>}
                </div>

                {errorMessage && (
                  <p role="alert" className="font-aeonik bg-red-50 text-red-600 px-4 py-2 rounded-xl text-sm border border-red-100 mt-4">
                    {errorMessage}
                  </p>
                )}

                <div className="text-right mt-2">
                  <a href="/auth/forgot-password" className="text-sm text-[#1C1C1C] hover:underline">Forgot password?</a>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="font-aeonik w-full bg-primary text-primary-foreground hover:bg-primary/90 rounded-full px-5 py-3.5 mt-6 text-sm transition-all duration-300 disabled:opacity-75 disabled:cursor-not-allowed shadow-sm"
                >
                  {isLoading ? 'Signing in…' : 'Sign In'}
                </button>
              </form>

              {/* Social Login */}
              <div className="grid grid-cols-2 gap-4 mt-6">
                <button type="button" className="font-aeonik flex items-center justify-center gap-2 border border-gray-300 rounded-full py-3 text-sm hover:bg-white/50 transition-colors shadow-sm">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.15 2.95.97 3.83 2.32-3.14 1.83-2.6 6.03.53 7.28-.79 1.44-1.63 2.76-3.01 3.41zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/></svg>
                  Apple
                </button>
                <button type="button" className="font-aeonik flex items-center justify-center gap-2 border border-gray-300 rounded-full py-3 text-sm hover:bg-white/50 transition-colors shadow-sm">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                  Google
                </button>
              </div>
            </div>

            {/* Bottom Links */}
            <div className="font-aeonik flex justify-between items-center mt-12 text-xs text-gray-500">
              <p>
                Don't have an account? <a href="/auth/register/customer" className="font-medium text-[#1C1C1C] hover:underline">Sign up</a>
              </p>
              <a href="#" className="hover:underline">Terms & Conditions</a>
            </div>
          </section>

          {/* Right Column - Image */}
          <section className="hidden md:block md:w-1/2 relative p-4 pl-0">
            <div className="w-full h-full relative rounded-[2rem] overflow-hidden">
              <img
                src="https://i.pinimg.com/736x/19/1f/aa/191faa6fe3040fcbde17c6782e2b81bd.jpg"
                alt="Ethiopian artisan crafting textiles"
                className="absolute inset-0 w-full h-full object-cover"
              />
            </div>
          </section>
        </div>
      </main>

      <Footer />

      <style jsx>{`
        .font-druk-medium { font-family: var(--font-druk-medium), sans-serif; }
        .font-aeonik      { font-family: var(--font-aeonik), sans-serif; }
        .font-inter       { font-family: var(--font-inter), sans-serif; }
      `}</style>
    </div>
    </div>
  );
}