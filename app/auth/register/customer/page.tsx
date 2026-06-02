"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/shared/header';
import { Footer } from '@/components/shared/footer';
import { useGuestRedirect } from '@/lib/auth-context';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000/api/v1';

const registerSchema = z.object({
  fullName: z.string().min(2, 'Full name is required'),
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string().min(8, 'Password must be at least 8 characters'),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

type RegisterFormData = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const router = useRouter();
  const { isAuthLoading, isAuthenticated } = useGuestRedirect();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      fullName: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
  });

  const onSubmit = async (values: RegisterFormData) => {
    setErrorMessage('');
    setIsSubmitting(true);

    try {
      const [firstName, ...rest] = values.fullName.trim().split(/\s+/);
      const lastName = rest.join(' ') || firstName;
      const res = await fetch(`${BASE_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName,
          lastName,
          email: values.email,
          password: values.password,
          role: 'CUSTOMER',
        }),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = json?.message ?? 'Failed to create account.';
        setErrorMessage(msg);
        return;
      }

      router.push(`/auth/verify-otp?email=${encodeURIComponent(values.email)}`);
    } catch {
      setErrorMessage('Unable to reach the server. Please check your connection.');
    } finally {
      setIsSubmitting(false);
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
      {/* Warm Overlay to add the requested temperature */}
      {/* <div className="absolute inset-0 bg-[#fdf2e9]/80" /> */}

      {/* Main Content */}
      <div className="relative z-10 flex flex-col min-h-screen">
        <Header />

        <main className="flex-grow flex items-center justify-center p-4 md:p-8 pt-24 md:pt-28">
          <div
            className="w-full max-w-[1400px] min-h-[650px] bg-white/70 backdrop-blur-md rounded-[2.5rem] shadow-2xl flex flex-col md:flex-row overflow-hidden relative border border-white/50"
            style={{ transition: 'opacity 250ms ease, transform 250ms ease' }}
          >
            {/* Left Column - Form */}
            <section className="w-full md:w-1/2 p-8 md:p-14 flex flex-col justify-between relative z-10">
              <div>
                <div className="font-aeonik inline-block border border-gray-400 rounded-full px-5 py-1.5 text-sm text-gray-700 mb-12">
                  EthioCraft
                </div>

                <div className="mb-8">
                  <h1 className="font-druk-medium uppercase tracking-[0.04em] text-3xl md:text-[2.25rem] mb-2 leading-tight">
                    Create Your Account
                  </h1>
                  <p className="font-aeonik text-sm text-gray-600">
                    Start exploring handcrafted pieces
                  </p>
                </div>

                <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
                  <div>
                    <label className="font-aeonik block text-xs text-gray-600 mb-1.5 ml-4">Full Name</label>
                    <input
                      type="text"
                      {...register('fullName')}
                      className="w-full bg-white/50 border border-white focus:border-[#d9d2c7] focus:bg-white rounded-full px-5 py-3.5 text-sm outline-none transition-all placeholder:text-gray-400 shadow-sm"
                      placeholder="Alemayehu Bekele"
                    />
                    {errors.fullName && <p className="font-aeonik mt-1 ml-4 text-xs text-red-600">{errors.fullName.message}</p>}
                  </div>

                  <div>
                    <label className="font-aeonik block text-xs text-gray-600 mb-1.5 ml-4">Email</label>
                    <input
                      type="email"
                      {...register('email')}
                      className="w-full bg-white/50 border border-white focus:border-[#d9d2c7] focus:bg-white rounded-full px-5 py-3.5 text-sm outline-none transition-all placeholder:text-gray-400 shadow-sm"
                      placeholder="you@example.com"
                    />
                    {errors.email && <p className="font-aeonik mt-1 ml-4 text-xs text-red-600">{errors.email.message}</p>}
                  </div>

                  {/* Password Field */}
                  <div className="relative">
                    <label className="font-aeonik block text-xs text-gray-600 mb-1.5 ml-4">Password</label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        {...register('password')}
                        className="w-full bg-white/50 border border-white focus:border-[#d9d2c7] focus:bg-white rounded-full px-5 py-3.5 text-sm outline-none transition-all placeholder:text-gray-400 shadow-sm pr-12"
                        placeholder="••••••••"
                      />
                      <button 
                        type="button" 
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-800"
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          {showPassword ? <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" /> : <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />}
                          {!showPassword && <circle cx="12" cy="12" r="3" />}
                        </svg>
                      </button>
                    </div>
                    {errors.password && <p className="font-aeonik mt-1 ml-4 text-xs text-red-600">{errors.password.message}</p>}
                  </div>

                  {/* Confirm Password Field */}
                  <div className="relative">
                    <label className="font-aeonik block text-xs text-gray-600 mb-1.5 ml-4">Confirm Password</label>
                    <div className="relative">
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        {...register('confirmPassword')}
                        className="w-full bg-white/50 border border-white focus:border-[#d9d2c7] focus:bg-white rounded-full px-5 py-3.5 text-sm outline-none transition-all placeholder:text-gray-400 shadow-sm pr-12"
                        placeholder="••••••••"
                      />
                      <button 
                        type="button" 
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-800"
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          {showConfirmPassword ? <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" /> : <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />}
                          {!showConfirmPassword && <circle cx="12" cy="12" r="3" />}
                        </svg>
                      </button>
                    </div>
                    {errors.confirmPassword && <p className="font-aeonik mt-1 ml-4 text-xs text-red-600">{errors.confirmPassword.message}</p>}
                  </div>

                  {errorMessage && (
                    <p role="alert" className="font-aeonik bg-red-50 text-red-600 px-4 py-2 rounded-xl text-sm border border-red-100 mt-4">
                      {errorMessage}
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="font-aeonik w-full bg-primary text-primary-foreground hover:bg-primary/90 rounded-full px-5 py-3.5 mt-6 text-sm transition-all duration-300 shadow-sm"
                  >
                    {isSubmitting ? 'Creating account...' : 'Create Account'}
                  </button>
                </form>

                <div className="mt-8 border-t border-gray-300 pt-6">
                   <p className="font-aeonik text-sm text-gray-700 mb-2">Are you an artisan?</p>
                   <a
                     href="/artisan/landing"
                     className="font-aeonik group inline-flex items-center gap-1 text-[#1C1C1C] hover:opacity-70 transition-opacity"
                   >
                     Start selling your craft
                     <span className="transition-transform duration-300 group-hover:translate-x-1">→</span>
                   </a>
                </div>
              </div>

              <div className="font-aeonik flex justify-between items-center mt-12 text-xs text-gray-600">
                <p>
                  Already have an account?{' '}
                  <a href="/auth/login" className="font-medium text-[#1C1C1C] hover:underline">Sign in</a>
                </p>
                <a href="/terms" className="hover:underline">Terms of Service</a>
                {' · '}
                <a href="/privacy" className="hover:underline">Privacy Policy</a>
              </div>
            </section>

            {/* Right Column - Image */}
            <section className="hidden md:block md:w-1/2 relative p-4 pl-0">
              <div className="w-full h-full relative rounded-[2rem] overflow-hidden">
                <img
                  src="https://i.pinimg.com/736x/19/1f/aa/191faa6fe3040fcbde17c6782e2b81bd.jpg"
                  alt="Ethiopian artisan weaving textile"
                  className="absolute inset-0 w-full h-full object-cover"
                />
              </div>
            </section>
          </div>
        </main>
        <Footer />
      </div>

      <style jsx>{`
        .font-druk-medium { font-family: var(--font-druk-medium), sans-serif; }
        .font-aeonik      { font-family: var(--font-aeonik), sans-serif; }
        .font-inter       { font-family: var(--font-inter), sans-serif; }
      `}</style>
    </div>
  );
}