"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from '@/components/ui/button'
import { Footer } from '@/components/shared/footer'

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000/api/v1";

export default function VerifyOtpForm({ initialEmail = "" }: { initialEmail?: string }) {
  const router = useRouter();
  const [email, setEmail] = useState(initialEmail);
  const [code, setCode] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);

  const isValidCode = useMemo(() => /^\d{6}$/.test(code), [code]);

  const handleVerify = async (event: React.FormEvent) => {
    event.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    if (!email.trim()) {
      setErrorMessage("Email is required.");
      return;
    }

    if (!isValidCode) {
      setErrorMessage("Please enter a valid 6-digit OTP code.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`${BASE_URL}/auth/verify-otp`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code }),
      });
      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        setErrorMessage(json?.message ?? "OTP verification failed.");
        return;
      }

      setSuccessMessage('Email verified successfully. Redirecting to sign in...');
      setTimeout(() => {
        router.push('/auth/login');
      }, 1500);
    } catch {
      setErrorMessage("Unable to reach the server. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResend = async () => {
    setErrorMessage("");
    setSuccessMessage("");

    if (!email.trim()) {
      setErrorMessage("Email is required to resend OTP.");
      return;
    }

    setIsResending(true);
    try {
      const res = await fetch(`${BASE_URL}/auth/resend-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        setErrorMessage(json?.message ?? "Failed to resend OTP.");
        return;
      }

      setSuccessMessage("OTP sent successfully. Please check your email.");
    } catch {
      setErrorMessage("Unable to reach the server. Please try again.");
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="flex-grow flex items-center justify-center px-4 py-24">
      <div className="w-full max-w-md rounded-2xl border border-[#e9e3d8] bg-white p-8 shadow-md">
        <h1 className="font-druk-medium text-3xl uppercase tracking-[0.04em] mb-3">Verify Email</h1>
        <p className="text-sm text-gray-600 mb-6">Enter the 6-digit OTP sent to your email address.</p>

        <form className="space-y-4" onSubmit={handleVerify}>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-[#ddd6c9] rounded-lg px-3 py-2 text-sm outline-none focus:border-[#C6A75E]"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">OTP Code</label>
            <input
              type="text"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              className="w-full border border-[#ddd6c9] rounded-lg px-3 py-2 text-sm tracking-[0.3em] outline-none focus:border-[#C6A75E]"
              placeholder="123456"
            />
          </div>

          {errorMessage && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-100 px-3 py-2 rounded-lg">{errorMessage}</p>
          )}
          {successMessage && (
            <p className="text-sm text-green-700 bg-green-50 border border-green-100 px-3 py-2 rounded-lg">{successMessage}</p>
          )}

          <button type="submit" disabled={isSubmitting} className="w-full bg-[#1C1C1C] text-white rounded-lg px-4 py-2 text-sm disabled:opacity-70">
            {isSubmitting ? "Verifying..." : "Verify OTP"}
          </button>
        </form>

        <button type="button" disabled={isResending} onClick={handleResend} className="w-full mt-3 border border-[#ddd6c9] rounded-lg px-4 py-2 text-sm">
          {isResending ? "Resending..." : "Resend OTP"}
        </button>
      </div>
    </div>
  );
}
