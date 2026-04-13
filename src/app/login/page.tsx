import { Suspense } from "react";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <div className="text-sm text-gray-500">Loading login...</div>
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
