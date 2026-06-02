"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, UserPlus, Shield, Mail, Phone, Lock, CheckCircle2, AlertCircle, MapPin } from 'lucide-react';
import { apiFetch } from '@/lib/api';

const agentSchema = z.object({
  firstName: z.string().min(2, 'First name is required'),
  lastName: z.string().min(2, 'Last name is required'),
  email: z.string().email('Please enter a valid email'),
  phone: z.string().min(7, 'Phone is required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  region: z.string().min(2, 'Region is required'),
  city: z.string().min(2, 'City is required'),
  addressLine1: z.string().min(3, 'Address line is required'),
});

type AgentFormData = z.infer<typeof agentSchema>;

export default function NewAgentPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset
  } = useForm<AgentFormData>({
    resolver: zodResolver(agentSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      password: Math.random().toString(36).slice(-10) + '!', // Random initial password
      region: '',
      city: '',
      addressLine1: '',
    },
  });

  const onSubmit = async (values: AgentFormData) => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch('/admin/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          firstName: values.firstName,
          lastName: values.lastName,
          email: values.email,
          phone: values.phone,
          password: values.password,
          role: 'VERIFICATION_AGENT',
          address: {
            label: 'Primary',
            recipientName: `${values.firstName} ${values.lastName}`.trim(),
            phone: values.phone,
            region: values.region,
            city: values.city,
            line1: values.addressLine1,
          },
        }),
      });

      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.message || 'Failed to create agent account');
      }

      setSuccess(true);
      setTimeout(() => {
        router.push('/admin/dashboard');
      }, 2000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAFAF9] text-[#1C1C1C] flex flex-col font-inter">
      {/* Background Mesh */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.4]" 
           style={{ background: 'radial-gradient(circle at 50% 50%, #fdfbf7 0%, #FAFAF9 100%)' }} />

      <header className="relative z-10 px-6 py-6 border-b border-[#e8dece]/50 bg-white/50 backdrop-blur-md">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <button 
            onClick={() => router.back()}
            className="flex items-center gap-2 text-sm font-medium text-[#6d645e] hover:text-[#3E2723] transition-colors group"
          >
            <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
            Back to Dashboard
          </button>
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 bg-[#3E2723] rounded-lg flex items-center justify-center text-white font-bold text-sm">E</div>
            <span className="font-druk-medium uppercase tracking-wider text-sm">EthioCraft Admin</span>
          </div>
        </div>
      </header>

      <main className="relative z-10 flex-grow flex items-center justify-center p-6 md:p-12">
        <div className="w-full max-w-4xl bg-white rounded-[2.5rem] shadow-2xl shadow-[#3E2723]/5 border border-[#e8dece]/60 overflow-hidden flex flex-col md:flex-row">
          
          {/* Side Info */}
          <div className="w-full md:w-1/3 bg-[#3E2723] p-10 text-[#FAFAF9] flex flex-col justify-between relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 blur-3xl" />
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-[#C6A75E]/10 rounded-full -ml-16 -mb-16 blur-3xl" />
            
            <div className="relative z-10">
              <div className="h-12 w-12 bg-white/10 rounded-2xl flex items-center justify-center mb-8">
                <Shield className="h-6 w-6 text-[#C6A75E]" />
              </div>
              <h2 className="text-2xl font-druk-medium uppercase tracking-tight leading-tight mb-4">
                Register New Verification Agent
              </h2>
              <p className="text-[#FAFAF9]/70 text-sm leading-relaxed">
                Add a new member to the verification team. They will be responsible for reviewing artisan samples and maintaining platform quality.
              </p>
            </div>

            <div className="relative z-10 pt-12">
              <div className="flex items-start gap-4 mb-6">
                <div className="h-1 w-8 bg-[#C6A75E] mt-2.5" />
                <p className="text-xs uppercase tracking-widest font-bold text-[#C6A75E]">Agent Privileges</p>
              </div>
              <ul className="space-y-4 text-xs text-[#FAFAF9]/60 font-medium">
                <li className="flex items-center gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-[#C6A75E]" />
                  Review submitted samples
                </li>
                <li className="flex items-center gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-[#C6A75E]" />
                  Update verification status
                </li>
                <li className="flex items-center gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-[#C6A75E]" />
                  Access agent dashboard
                </li>
              </ul>
            </div>
          </div>

          {/* Form Area */}
          <div className="w-full md:w-2/3 p-10 md:p-16">
            {success ? (
              <div className="h-full flex flex-col items-center justify-center text-center animate-in fade-in zoom-in duration-500">
                <div className="h-20 w-20 bg-emerald-50 rounded-full flex items-center justify-center mb-6">
                  <CheckCircle2 className="h-10 w-10 text-emerald-500" />
                </div>
                <h3 className="text-2xl font-bold mb-2">Account Created!</h3>
                <p className="text-[#6d645e]">The agent account has been successfully registered. Redirecting to dashboard...</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-[#85786d] ml-1">First Name</label>
                    <div className="relative">
                      <input
                        type="text"
                        {...register('firstName')}
                        className="w-full bg-[#F8F8F7] border border-[#e8dece]/60 focus:border-[#C6A75E] focus:bg-white rounded-2xl px-5 py-4 text-sm outline-none transition-all placeholder:text-gray-400"
                        placeholder="e.g. Samuel"
                      />
                    </div>
                    {errors.firstName && <p className="text-[10px] text-red-500 font-bold uppercase tracking-tighter ml-1">{errors.firstName.message}</p>}
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-[#85786d] ml-1">Last Name</label>
                    <div className="relative">
                      <input
                        type="text"
                        {...register('lastName')}
                        className="w-full bg-[#F8F8F7] border border-[#e8dece]/60 focus:border-[#C6A75E] focus:bg-white rounded-2xl px-5 py-4 text-sm outline-none transition-all placeholder:text-gray-400"
                        placeholder="e.g. Bekele"
                      />
                    </div>
                    {errors.lastName && <p className="text-[10px] text-red-500 font-bold uppercase tracking-tighter ml-1">{errors.lastName.message}</p>}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-[#85786d] ml-1">Email Address</label>
                  <div className="relative group">
                    <Mail className="absolute left-5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#85786d] group-focus-within:text-[#C6A75E] transition-colors" />
                    <input
                      type="email"
                      {...register('email')}
                      className="w-full bg-[#F8F8F7] border border-[#e8dece]/60 focus:border-[#C6A75E] focus:bg-white rounded-2xl pl-12 pr-5 py-4 text-sm outline-none transition-all placeholder:text-gray-400"
                      placeholder="agent.name@ethiocraft.com"
                    />
                  </div>
                  {errors.email && <p className="text-[10px] text-red-500 font-bold uppercase tracking-tighter ml-1">{errors.email.message}</p>}
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-[#85786d] ml-1">Phone</label>
                  <div className="relative group">
                    <Phone className="absolute left-5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#85786d] group-focus-within:text-[#C6A75E] transition-colors" />
                    <input
                      type="tel"
                      {...register('phone')}
                      className="w-full bg-[#F8F8F7] border border-[#e8dece]/60 focus:border-[#C6A75E] focus:bg-white rounded-2xl pl-12 pr-5 py-4 text-sm outline-none transition-all placeholder:text-gray-400"
                      placeholder="+251 ..."
                    />
                  </div>
                  {errors.phone && <p className="text-[10px] text-red-500 font-bold uppercase tracking-tighter ml-1">{errors.phone.message}</p>}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-[#85786d] ml-1">Region</label>
                    <div className="relative group">
                      <MapPin className="absolute left-5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#85786d] group-focus-within:text-[#C6A75E] transition-colors" />
                      <input
                        type="text"
                        {...register('region')}
                        className="w-full bg-[#F8F8F7] border border-[#e8dece]/60 focus:border-[#C6A75E] focus:bg-white rounded-2xl pl-12 pr-5 py-4 text-sm outline-none transition-all placeholder:text-gray-400"
                        placeholder="e.g. Addis Ababa"
                      />
                    </div>
                    {errors.region && <p className="text-[10px] text-red-500 font-bold uppercase tracking-tighter ml-1">{errors.region.message}</p>}
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-[#85786d] ml-1">City</label>
                    <input
                      type="text"
                      {...register('city')}
                      className="w-full bg-[#F8F8F7] border border-[#e8dece]/60 focus:border-[#C6A75E] focus:bg-white rounded-2xl px-5 py-4 text-sm outline-none transition-all placeholder:text-gray-400"
                      placeholder="e.g. Addis Ababa"
                    />
                    {errors.city && <p className="text-[10px] text-red-500 font-bold uppercase tracking-tighter ml-1">{errors.city.message}</p>}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-[#85786d] ml-1">Address</label>
                  <input
                    type="text"
                    {...register('addressLine1')}
                    className="w-full bg-[#F8F8F7] border border-[#e8dece]/60 focus:border-[#C6A75E] focus:bg-white rounded-2xl px-5 py-4 text-sm outline-none transition-all placeholder:text-gray-400"
                    placeholder="House number, street, landmark"
                  />
                  {errors.addressLine1 && <p className="text-[10px] text-red-500 font-bold uppercase tracking-tighter ml-1">{errors.addressLine1.message}</p>}
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-[#85786d] ml-1">Account Password</label>
                  <div className="relative group">
                    <Lock className="absolute left-5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#85786d] group-focus-within:text-[#C6A75E] transition-colors" />
                    <input
                      type="text"
                      {...register('password')}
                      className="w-full bg-[#F8F8F7] border border-[#e8dece]/60 focus:border-[#C6A75E] focus:bg-white rounded-2xl pl-12 pr-5 py-4 text-sm outline-none transition-all placeholder:text-gray-400 font-mono"
                    />
                  </div>
                  <p className="text-[10px] text-[#85786d] ml-1 italic font-medium">An initial password has been generated. The agent should change this after first login.</p>
                  {errors.password && <p className="text-[10px] text-red-500 font-bold uppercase tracking-tighter ml-1">{errors.password.message}</p>}
                </div>

                {error && (
                  <div className="bg-red-50 border border-red-100 rounded-2xl px-5 py-4 flex items-center gap-3 text-red-700 text-xs font-medium animate-shake">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#3E2723] text-white rounded-2xl py-4 text-sm font-bold uppercase tracking-widest hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-xl shadow-[#3E2723]/10 flex items-center justify-center gap-3"
                >
                  {loading ? (
                    <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <UserPlus className="h-4 w-4" />
                      Create Agent Account
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      </main>

      <footer className="relative z-10 px-6 py-8 text-center text-[#85786d] text-xs font-medium">
        &copy; 2026 EthioCraft Platform Administration. All rights reserved.
      </footer>

      <style jsx>{`
        .font-druk-medium { font-family: var(--font-druk-medium), sans-serif; }
        .font-aeonik      { font-family: var(--font-aeonik), sans-serif; }
        .font-inter       { font-family: var(--font-inter), sans-serif; }
        
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-4px); }
          75% { transform: translateX(4px); }
        }
        .animate-shake { animation: shake 0.2s ease-in-out 0s 2; }
      `}</style>
    </div>
  );
}
