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
    <div className="w-full">
      <form
        className="flex flex-col gap-form-field"
        onSubmit={(e) => {
          e.preventDefault();
          setSubmitting(true);
          const formData = new FormData(e.target as HTMLFormElement);
          const password = formData.get("password") as string;
          const confirmPassword = formData.get("confirmPassword") as string;
          
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
        <button className="auth-button" type="submit" disabled={submitting}>
          ثبت نام
        </button>
      </form>
      <div className="mt-4 text-center">
        <p className="text-gray-400 text-sm">
          قبلاً ثبت نام کرده‌اید؟{" "}
          <button
            type="button"
            onClick={onToggleMode}
            className="text-blue-400 hover:text-blue-300 underline"
          >
            وارد شوید
          </button>
        </p>
      </div>
    </div>
  );
}
