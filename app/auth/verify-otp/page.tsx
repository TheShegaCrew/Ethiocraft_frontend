import { Suspense } from "react";
import { Header } from "@/components/shared/header";
import { Footer } from "@/components/shared/footer";
import VerifyOtpForm from "./VerifyOtpForm.client";

// Server component page — interactive form lives in a client subcomponent.
export default function VerifyOtpPage() {
  return (
    <div className="min-h-screen bg-[#FAFAF9] text-[#1C1C1C] font-inter flex flex-col">
      <Suspense fallback={<div />}>
        <Header />
      </Suspense>
      <main>
        <VerifyOtpForm />
      </main>
      <Footer />
    </div>
  );
  }
