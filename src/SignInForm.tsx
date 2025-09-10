"use client";
import { useAuthActions } from "@convex-dev/auth/react";
import { useState } from "react";
import { toast } from "sonner";

interface SignInFormProps {
  onToggleMode: () => void;
}

export function SignInForm({ onToggleMode }: SignInFormProps) {
  const { signIn } = useAuthActions();
  const [submitting, setSubmitting] = useState(false);

  return (
    <div className="w-full space-y-6">
      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          setSubmitting(true);
          const formData = new FormData(e.target as HTMLFormElement);
          formData.set("flow", "signIn");
          void signIn("password", formData).catch((error) => {
            let toastTitle = "";
            if (error.message.includes("Invalid password")) {
              toastTitle = "رمز عبور اشتباه است. لطفاً دوباره تلاش کنید.";
            } else {
              toastTitle = "ورود ناموفق. لطفاً اطلاعات خود را بررسی کنید.";
            }
            toast.error(toastTitle);
            setSubmitting(false);
          });
        }}
      >
        <input
          className="auth-input-field"
          type="email"
          name="email"
          placeholder="ایمیل"
          required
        />
        <input
          className="auth-input-field"
          type="password"
          name="password"
          placeholder="رمز عبور"
          required
        />
        <button className="auth-button mt-2" type="submit" disabled={submitting}>
          ورود
        </button>
      </form>
      <div className="text-center">
        <p className="text-gray-400 text-sm">
          حساب کاربری ندارید؟{" "}
          <button
            type="button"
            onClick={onToggleMode}
            className="text-blue-400 hover:text-blue-300 underline transition-colors duration-200"
          >
            ثبت نام کنید
          </button>
        </p>
      </div>
    </div>
  );
}
