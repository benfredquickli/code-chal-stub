import { signIn } from "next-auth/react";
import { useState } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import Fingerprint from "~/components/fingerprint";

export default function SignIn() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [fingerprint, setFingerprint] = useState<string | null>(null);
  const [showWarning, setShowWarning] = useState(false);
  const [formData, setFormData] = useState<{
    email: string;
    password: string;
  } | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    try {
      const result = await signIn("credentials", {
        email,
        password,
        fingerprint,
        redirect: false,
      });

      if (result?.error === "MAX_FINGERPRINTS_REACHED") {
        setShowWarning(true);
        setFormData({ email, password });
      } else if (result?.error === "MAX_FINGERPRINTS_ENFORCED") {
        setError(
          "You have reached the maximum number of devices (3) that can be registered to your account. Please remove a device before signing in from a new one.",
        );
      } else if (result?.error) {
        setError("Invalid credentials");
      } else {
        const callbackUrl = router.query.callbackUrl as string;
        await router.push(callbackUrl || "/");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleAcknowledgeWarning = async () => {
    if (!formData || !fingerprint) return;

    setIsLoading(true);
    setError(null);

    try {
      const result = await signIn("credentials", {
        email: formData.email,
        password: formData.password,
        fingerprint,
        acknowledgeWarning: true,
        redirect: false,
      });

      if (result?.error) {
        setError("Invalid credentials");
      } else {
        const callbackUrl = router.query.callbackUrl as string;
        await router.push(callbackUrl || "/");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>Sign In - Quickli Code Challenge</title>
        <meta name="description" content="Sign in to Quickli Code Challenge" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-[#2e026d] to-[#15162c]">
        <div className="w-full max-w-md space-y-8 rounded-lg bg-white/10 p-8 backdrop-blur-sm">
          <div>
            <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-white">
              Sign in to your account
            </h2>
          </div>
          <Fingerprint onFingerprint={setFingerprint} />
          {showWarning ? (
            <div className="rounded-md bg-yellow-50 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg
                    className="h-5 w-5 text-yellow-400"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-yellow-800">
                    Maximum Devices Reached
                  </h3>
                  <div className="mt-2 text-sm text-yellow-700">
                    <p>
                      You have reached the maximum number of devices (3) that
                      can be registered to your account. By continuing, you
                      acknowledge that you are accessing your account from a new
                      device.
                    </p>
                  </div>
                  <div className="mt-4">
                    <div className="-mx-2 -my-1.5 flex">
                      <button
                        type="button"
                        onClick={handleAcknowledgeWarning}
                        disabled={isLoading}
                        className="rounded-md bg-yellow-50 px-2 py-1.5 text-sm font-medium text-yellow-800 hover:bg-yellow-100 focus:outline-none focus:ring-2 focus:ring-yellow-600 focus:ring-offset-2 focus:ring-offset-yellow-50 disabled:opacity-50"
                      >
                        {isLoading ? "Processing..." : "I Understand, Continue"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
              <div className="-space-y-px rounded-md shadow-sm">
                <div>
                  <label htmlFor="email" className="sr-only">
                    Email address
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    className="relative block w-full rounded-t-md border-0 py-1.5 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:z-10 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                    placeholder="Email address"
                  />
                </div>
                <div>
                  <label htmlFor="password" className="sr-only">
                    Password
                  </label>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    required
                    className="relative block w-full rounded-b-md border-0 py-1.5 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:z-10 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                    placeholder="Password"
                  />
                </div>
              </div>

              {error && (
                <div className="text-center text-sm text-red-500">{error}</div>
              )}

              <div>
                <button
                  type="submit"
                  disabled={isLoading || !fingerprint}
                  className="group relative flex w-full justify-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:opacity-50"
                >
                  {isLoading ? "Signing in..." : "Sign in"}
                </button>
              </div>
            </form>
          )}
        </div>
      </main>
    </>
  );
}
