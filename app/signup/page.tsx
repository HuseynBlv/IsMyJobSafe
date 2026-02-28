import Navbar from "@/components/Navbar";
import AuthForm from "@/components/AuthForm";

export default function SignupPage() {
    return (
        <div className="min-h-dvh flex flex-col hero-glow">
            <Navbar />
            <main className="flex-1 px-4 py-10 sm:px-6 sm:py-14 flex items-center justify-center">
                <AuthForm mode="signup" />
            </main>
        </div>
    );
}
