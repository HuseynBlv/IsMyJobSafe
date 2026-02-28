import Navbar from "@/components/Navbar";
import AuthForm from "@/components/AuthForm";
import { Suspense } from "react";

export default function SignupPage() {
    return (
        <div className="min-h-dvh flex flex-col hero-glow">
            <Navbar />
            <main className="flex-1 px-4 py-10 sm:px-6 sm:py-14 flex items-center justify-center">
                <Suspense fallback={<div className="w-full max-w-md h-[400px] rounded-[28px] border border-white/10 bg-white/[0.04] p-8 shadow-2xl shadow-black/35 backdrop-blur-xl animate-pulse" />}>
                    <AuthForm mode="signup" />
                </Suspense>
            </main>
        </div>
    );
}
