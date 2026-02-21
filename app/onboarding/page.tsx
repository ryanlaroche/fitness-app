import { Dumbbell } from "lucide-react";
import { ProfileForm } from "@/components/onboarding/profile-form";

export const metadata = {
  title: "Setup Your Profile — FitAI",
};

export default function OnboardingPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-[#00d4ff] rounded-xl mb-5">
            <Dumbbell className="h-6 w-6 text-black" />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Welcome to FitAI</h1>
          <p className="text-[#666] mt-2">
            Build your personalized fitness plan in about 2 minutes.
          </p>
        </div>
        <ProfileForm />
      </div>
    </div>
  );
}
