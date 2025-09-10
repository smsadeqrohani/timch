"use client";
import { useAuthActions } from "@convex-dev/auth/react";
import { useState } from "react";
import { toast } from "sonner";

interface SignUpFormProps {
  onToggleMode: () => void;
}

export function SignUpForm({ onToggleMode }: SignUpFormProps) {
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
          const name = formData.get("name") as string;
          const password = formData.get("password") as string;
          const confirmPassword = formData.get("confirmPassword") as string;
          
          // Validate name
          if (!name || name.trim().length === 0) {
            toast.error("لطفاً نام خود را وارد کنید.");
            setSubmitting(false);
            return;
          }
          
          // Validate password confirmation
          if (password !== confirmPassword) {
            toast.error("رمز عبور و تکرار آن یکسان نیستند.");
            setSubmitting(false);
            return;
          }
          
          formData.set("flow", "signUp");
          void signIn("password", formData).catch((error) => {
            let toastTitle = "";
            if (error.message.includes("User already exists")) {
              toastTitle = "کاربری با این ایمیل قبلاً ثبت نام کرده است.";
            } else if (error.message.includes("Invalid email")) {
              toastTitle = "ایمیل وارد شده معتبر نیست.";
            } else if (error.message.includes("Password too short")) {
              toastTitle = "رمز عبور باید حداقل 8 کاراکتر باشد.";
            } else {
              toastTitle = "ثبت نام ناموفق. لطفاً اطلاعات خود را بررسی کنید.";
            }
            toast.error(toastTitle);
            setSubmitting(false);
          });
        }}
      >
        <input
          className="auth-input-field"
          type="text"
          name="name"
          placeholder="نام کاربر"
          required
        />
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
          minLength={8}
        />
        <input
          className="auth-input-field"
          type="password"
          name="confirmPassword"
          placeholder="تکرار رمز عبور"
          required
        />
        <button className="auth-button mt-2" type="submit" disabled={submitting}>
          ثبت نام
        </button>
      </form>
      <div className="text-center">
        <p className="text-gray-400 text-sm">
          قبلاً ثبت نام کرده‌اید؟{" "}
          <button
            type="button"
            onClick={onToggleMode}
            className="text-blue-400 hover:text-blue-300 underline transition-colors duration-200"
          >
            وارد شوید
          </button>
        </p>
      </div>
    </div>
  );
}
