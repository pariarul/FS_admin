"use client";

import { useState, useEffect, ChangeEvent } from "react";
import {
  Eye,
  EyeOff,
  RefreshCcw,
  Shield,
  Lock,
  User,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import axios, { AxiosError } from "axios";

interface FormData {
  adminId: string;
  password: string;
  captcha: string;
}

interface Message {
  type: "success" | "error";
  text: string;
}

interface LoginResponse {
  success: boolean;
  token?: string;
  message?: string;
}

export default function AdminLogin(): React.JSX.Element {
  const [formData, setFormData] = useState<FormData>({
    adminId: "",
    password: "",
    captcha: "",
  });

  const [captchaText, setCaptchaText] = useState<string>("------");
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [message, setMessage] = useState<Message | null>(null);

  const router = useRouter();

  // Generate Captcha
  const generateCaptcha = (): void => {
    const chars =
      "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
    let captcha = "";

    for (let i = 0; i < 6; i++) {
      captcha += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    setCaptchaText(captcha);
  };

  // Input Change Handler
  const handleChange = (e: ChangeEvent<HTMLInputElement>): void => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  // Login Handler
  const handleLogin = async (): Promise<void> => {
    if (!formData.adminId || !formData.password || !formData.captcha) {
      setMessage({
        type: "error",
        text: "All fields are required",
      });
      return;
    }

    // captcha validation
    if (formData.captcha.toLowerCase() !== captchaText.toLowerCase()) {
      setMessage({
        type: "error",
        text: "Invalid captcha! Please try again.",
      });

      generateCaptcha();
      setFormData({ ...formData, captcha: "" });
      return;
    }

    try {
      setIsLoading(true);
      setMessage(null);

      const response = await axios.post<LoginResponse>(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/login`,
        {
          email: formData.adminId,
          password: formData.password,
        }
      );

      const data = response.data;

      if (data.success) {
        localStorage.setItem("fs_admin_token", data.token || "");

        setMessage({
          type: "success",
          text: "Login successful! Redirecting...",
        });

        setTimeout(() => {
          router.push("/dashboard");
        }, 800);
      } else {
        setMessage({
          type: "error",
          text: data.message || "Invalid credentials",
        });

        generateCaptcha();
        setFormData({ ...formData, captcha: "" });
      }
    } catch (error) {
      const err = error as AxiosError<{ message?: string }>;

      setMessage({
        type: "error",
        text:
          err.response?.data?.message ||
          "Server error. Please try again later.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    generateCaptcha();
  }, []);

  return (
    <div
      className="min-h-screen bg-cover bg-center bg-no-repeat flex items-center justify-center p-4 relative overflow-hidden"
      style={{ backgroundImage: "url('/assets/login-bg.jpg')" }}
    >
      {/* Gradient Orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-0 w-96 h-96 bg-primary/40 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-primary/40 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse animation-delay-2000"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-primary/30 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse animation-delay-4000"></div>
      </div>

      {/* Dark Overlay */}
      <div className="absolute inset-0 bg-black/40"></div>

      {/* Toast Message */}
      {message && (
        <div
          className={`fixed top-6 right-6 px-6 py-3 rounded-xl shadow-2xl flex items-center gap-3 z-50 transition-all duration-300 ${message.type === "success"
            ? "bg-green-600 text-white"
            : "bg-red-600 text-white"
            }`}
        >
          <AlertCircle className="w-5 h-5" />
          <span className="font-medium">{message.text}</span>
        </div>
      )}

      {/* Login Card */}
      <div className="relative z-10 w-full max-w-md">
        <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl overflow-hidden border border-white/20">
          <div className="p-8 md:p-10">
            {/* Logo */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-24 h-24 bg-primary rounded-2xl shadow-lg mb-4">
                <img
                  src="/assets/logo.png"
                  alt="FS Traders"
                  className="w-full h-full object-contain"
                />
              </div>
              <h1 className="text-3xl font-bold text-slate-800">FS Traders</h1>
            </div>

            {/* Form */}
            <div className="space-y-5">
              {/* Admin ID */}
              <div>
                <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-2">
                  <User className="w-4 h-4" />
                  Admin ID
                </label>
                <input
                  type="text"
                  placeholder="Enter your Admin ID"
                  value={formData.adminId}
                  onChange={(e) =>
                    setFormData({ ...formData, adminId: e.target.value })
                  }
                  className="w-full pl-11 pr-4 py-3.5 bg-white/70 border border-slate-300 rounded-xl text-slate-900 placeholder-slate-500 focus:ring-2 focus:ring-primary focus:border-primary"
                />
              </div>

              {/* Password */}
              <div>
                <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-2">
                  <Lock className="w-4 h-4" />
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={formData.password}
                    onChange={(e) =>
                      setFormData({ ...formData, password: e.target.value })
                    }
                    className="w-full pl-11 pr-12 py-3.5 bg-white/70 border border-slate-300 rounded-xl text-slate-900 placeholder-slate-500 focus:ring-2 focus:ring-primary focus:border-primary"
                  />

                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>

                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                </div>


              </div>

              {/* Captcha */}
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex items-center gap-2 bg-white/80 border border-slate-300 rounded-xl px-3 py-2.5 shadow-sm">
                  <span className="font-mono text-xl tracking-wider text-slate-700 font-bold select-none">
                    {captchaText}
                  </span>
                  <button
                    type="button"
                    onClick={generateCaptcha}
                    className="p-1.5 rounded-lg hover:bg-slate-200"
                  >
                    <RefreshCcw className="w-4 h-4 text-slate-600" />
                  </button>
                </div>

                <input
                  type="text"
                  placeholder="Enter captcha"
                  value={formData.captcha}
                  onChange={(e) =>
                    setFormData({ ...formData, captcha: e.target.value })
                  }
                  className="flex-1 px-4 py-3.5 bg-white/70 border border-slate-300 rounded-xl text-slate-900 placeholder-slate-500 focus:ring-2 focus:ring-primary focus:border-primary"
                />
              </div>

              {/* Login Button */}
              <button
                onClick={handleLogin}
                disabled={isLoading}
                className="w-full mt-6 py-3.5 bg-primary hover:bg-primary/90 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl focus:ring-2 focus:ring-primary transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Authenticating...
                  </>
                ) : (
                  <>
                    <Shield className="w-5 h-5" />
                    Access Admin Portal
                  </>
                )}
              </button>
            </div>

            <div className="mt-8 text-center">
              <p className="text-xs text-slate-500">
                © 2025 FS Traders. All rights reserved.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
