"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "../../components/auth-provider";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState("admin@exetron.local");
  const [password, setPassword] = useState("ChangeMe123!");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);

    try {
      await login({ email, password });
      router.replace("/dashboard");
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Login failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-shell">
      <section className="auth-card">
        <div>
          <span className="eyebrow">Exetron</span>
          <h1>Platform Core Login</h1>
          <p className="muted-copy">
            Use the seeded platform admin credentials to manage tenants, stores, users,
            roles and devices.
          </p>
        </div>
        {error ? <p className="error-banner">{error}</p> : null}
        <form
          className="auth-form"
          onSubmit={(event) => {
            void handleSubmit(event);
          }}
        >
          <label className="field">
            <span>Email</span>
            <input value={email} onChange={(event) => setEmail(event.target.value)} />
          </label>
          <label className="field">
            <span>Password</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>
          <button className="primary-button" type="submit" disabled={busy}>
            {busy ? "Authorizing..." : "Sign in"}
          </button>
        </form>
      </section>
    </div>
  );
}
