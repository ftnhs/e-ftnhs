import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import {
  LogIn,
  AlertCircle,
  ArrowLeft,
  User,
  Lock,
  Eye,
  EyeOff,
} from "lucide-react";

interface LoginViewProps {
  onBackToHome?: () => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onBackToHome }) => {
  const { login } = useAuth();
  const [identifier, setIdentifier] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const handleCredentialSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim() || !password) {
      setErrorMsg("Please enter both your username or email and password.");
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMsg(null);
      await login(identifier, password);
    } catch (err: unknown) {
      console.error("[Login] Credential Error:", err);
      let message = "Failed to sign in. Please check your credentials.";
      if (err instanceof Error) {
        if (
          err.message.includes("Invalid login credentials") ||
          err.message.includes("invalid_grant")
        ) {
          message = "Incorrect username/email or password. Please verify your credentials.";
        } else {
          message = err.message;
        }
      }
      setErrorMsg(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-linen-textured flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        {onBackToHome && (
          <div className="mb-5 flex justify-center">
            <button
              type="button"
              onClick={onBackToHome}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 min-h-[40px] rounded-lg bg-[#FFFFFF] border border-[#E3DDD1] hover:bg-[#FAF8F5] text-xs font-semibold text-[#0F3D2E] transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Back to Public Home</span>
            </button>
          </div>
        )}

        <div className="mx-auto w-14 h-14 rounded-full bg-[#FFFFFF] border border-[#E3DDD1] p-1.5 flex items-center justify-center shadow-xs">
          <img
            src="/images/Official Logos/Fermin_logo.png"
            alt="Fermin Tayabas National High School Seal"
            className="w-full h-full object-contain"
          />
        </div>

        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-[#1C2420] font-editorial">
          e-FTNHS Portal
        </h1>
        <p className="mt-1 text-sm text-[#5C6660] font-medium">
          Fermin Tayabas National High School • ID 302851
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-[#FFFFFF] py-8 px-6 sm:px-8 shadow-sm rounded-2xl border border-[#E3DDD1] space-y-5">
          {errorMsg && (
            <div
              role="alert"
              className="p-3 bg-[#FBECEF] border border-[#F3B8C2] text-[#9E1B32] text-xs rounded-lg flex items-center gap-2"
            >
              <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleCredentialSignIn} className="space-y-4">
            <div>
              <label
                htmlFor="login-identifier"
                className="block text-xs font-semibold text-[#1C2420] mb-1.5"
              >
                DepEd Email or Username
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-[#5C6660] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="login-identifier"
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="name@deped.gov.ph"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck="false"
                  required
                  className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-[#E3DDD1] bg-[#FFFFFF] text-sm text-[#1C2420] placeholder:text-[#939C96] focus-visible:ring-2 focus-visible:ring-[#9E1B32] focus-visible:border-transparent transition-colors"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="login-password"
                className="block text-xs font-semibold text-[#1C2420] mb-1.5"
              >
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#5C6660] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  className="w-full pl-9 pr-10 py-2.5 rounded-lg border border-[#E3DDD1] bg-[#FFFFFF] text-sm text-[#1C2420] placeholder:text-[#939C96] focus-visible:ring-2 focus-visible:ring-[#9E1B32] focus-visible:border-transparent transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="p-1 text-[#5C6660] hover:text-[#1C2420] absolute right-2.5 top-1/2 -translate-y-1/2 cursor-pointer"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full mt-2 py-2.5 px-4 bg-[#0F3D2E] hover:bg-[#0A2E22] text-[#FFFFFF] text-sm font-semibold rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-2 disabled:opacity-60"
            >
              <LogIn className="w-4 h-4" />
              <span>{isSubmitting ? "Signing In..." : "Sign In"}</span>
            </button>
          </form>
        </div>

        <div className="mt-6 text-center text-xs text-[#5C6660] space-y-1">
          <p>Fermin Tayabas National High School • Cabayugan, Calape, Bohol</p>
        </div>
      </div>
    </div>
  );
};
