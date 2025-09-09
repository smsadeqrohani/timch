import { Authenticated, Unauthenticated, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { SignInForm } from "./SignInForm";
import { SignOutButton } from "./SignOutButton";
import { Toaster } from "sonner";
import { ChequeCalculator } from "./ChequeCalculator";

export default function App() {
  return (
    <div className="min-h-screen flex flex-col transition-all duration-300 dark bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white">
      <header className="sticky top-0 z-10 backdrop-blur-md h-16 flex justify-between items-center border-b shadow-lg px-6 no-print bg-gray-800/70 border-gray-700/50">
        <h2 className="text-xl font-bold bg-gradient-to-r bg-clip-text text-transparent from-blue-400 to-purple-400">
          سامانه تیمچه فرش
        </h2>
        <div className="flex items-center gap-4">
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

  if (loggedInUser === undefined) {
    return (
      <div className="flex justify-center items-center">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-t-transparent border-blue-400"></div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="text-center mb-8 no-print">
        <div className="mb-6">
          <h1 className="text-6xl font-bold mb-4 bg-gradient-to-r bg-clip-text text-transparent from-blue-400 via-purple-400 to-pink-400">
            خوش آمدید
          </h1>
          <div className="w-24 h-1 mx-auto rounded-full bg-gradient-to-r from-blue-400 to-purple-400"></div>
        </div>
        
        <Unauthenticated>
          <p className="text-xl mb-8 text-gray-300">
            برای شروع وارد شوید یا ثبت نام کنید
          </p>
        </Unauthenticated>
      </div>
      
      <Authenticated>
        <ChequeCalculator />
      </Authenticated>

      <Unauthenticated>
        <div className="glass-card p-8 rounded-2xl shadow-xl shadow-gray-900/50">
          <SignInForm />
        </div>
      </Unauthenticated>
    </div>
  );
}
