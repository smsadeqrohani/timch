import { Authenticated, Unauthenticated, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { SignInForm } from "./SignInForm";
import { SignOutButton } from "./SignOutButton";
import { Toaster } from "sonner";
import { DarkModeToggle } from "./DarkModeToggle";
import { useDarkMode } from "./hooks/useDarkMode";
import { ChequeCalculator } from "./ChequeCalculator";

export default function App() {
  const { isDark } = useDarkMode();

  return (
    <div className={`min-h-screen flex flex-col transition-all duration-300 ${
      isDark ? 'dark bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white' : 'bg-gradient-to-br from-blue-50 via-white to-indigo-50 text-gray-900'
    }`}>
      <header className={`sticky top-0 z-10 backdrop-blur-md h-16 flex justify-between items-center border-b shadow-lg px-6 no-print ${
        isDark ? 'bg-gray-800/70 border-gray-700/50' : 'bg-white/70 border-gray-200/50'
      }`}>
        <h2 className={`text-xl font-bold bg-gradient-to-r bg-clip-text text-transparent ${
          isDark ? 'from-blue-400 to-purple-400' : 'from-blue-600 to-purple-600'
        }`}>
          سامانه تیمچه فرش
        </h2>
        <div className="flex items-center gap-4">
          <DarkModeToggle />
          <SignOutButton />
        </div>
      </header>
      <main className="flex-1 p-8">
        <Content />
      </main>
      <Toaster />
    </div>
  );
}

function Content() {
  const loggedInUser = useQuery(api.auth.loggedInUser);
  const { isDark } = useDarkMode();

  if (loggedInUser === undefined) {
    return (
      <div className="flex justify-center items-center">
        <div className={`animate-spin rounded-full h-10 w-10 border-4 border-t-transparent ${
          isDark ? 'border-blue-400' : 'border-blue-600'
        }`}></div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="text-center mb-8">
        <div className="mb-6">
          <h1 className={`text-6xl font-bold mb-4 bg-gradient-to-r bg-clip-text text-transparent ${
            isDark ? 'from-blue-400 via-purple-400 to-pink-400' : 'from-blue-600 via-purple-600 to-pink-600'
          }`}>
            خوش آمدید
          </h1>
          <div className={`w-24 h-1 mx-auto rounded-full bg-gradient-to-r ${
            isDark ? 'from-blue-400 to-purple-400' : 'from-blue-600 to-purple-600'
          }`}></div>
        </div>
        
        <Authenticated>
          <ChequeCalculator />
        </Authenticated>
        
        <Unauthenticated>
          <p className={`text-xl mb-8 ${
            isDark ? 'text-gray-300' : 'text-gray-600'
          }`}>
            برای شروع وارد شوید یا ثبت نام کنید
          </p>
        </Unauthenticated>
      </div>

      <Unauthenticated>
        <div className={`glass-card p-8 rounded-2xl shadow-xl ${
          isDark ? 'shadow-gray-900/50' : 'shadow-gray-200/50'
        }`}>
          <SignInForm />
        </div>
      </Unauthenticated>
    </div>
  );
}
