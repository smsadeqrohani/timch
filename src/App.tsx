import { Authenticated, Unauthenticated, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { SignInForm } from "./SignInForm";
import { SignOutButton } from "./SignOutButton";
import { Toaster } from "sonner";
import { ChequeCalculator } from "./ChequeCalculator";
import { AdminLayout } from "./components/AdminLayout";

export default function App() {
  return (
    <div className="min-h-screen transition-all duration-300 dark bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white">
      <Content />
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
      <Authenticated>
        <AdminLayout />
      </Authenticated>

      <Unauthenticated>
        <div className="min-h-screen flex flex-col justify-center items-center p-4 sm:p-6 lg:p-8">
          <div className="text-center mb-6 sm:mb-8">
            <div className="mb-4 sm:mb-6">
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-3 sm:mb-4 bg-gradient-to-r bg-clip-text text-transparent from-blue-400 via-purple-400 to-pink-400">
                خوش آمدید
              </h1>
              <div className="w-16 sm:w-20 lg:w-24 h-1 mx-auto rounded-full bg-gradient-to-r from-blue-400 to-purple-400"></div>
            </div>
            <p className="text-lg sm:text-xl mb-6 sm:mb-8 text-gray-300 px-4">
              برای شروع وارد شوید
            </p>
          </div>
          
          <div className="w-full max-w-md sm:max-w-lg lg:max-w-xl">
            <div className="glass-card p-6 sm:p-8 rounded-2xl shadow-xl shadow-gray-900/50">
              <SignInForm />
            </div>
          </div>
        </div>
      </Unauthenticated>
    </div>
  );
}
