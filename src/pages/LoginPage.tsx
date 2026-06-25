import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/auth/AuthContext";
import { Button, Field, Input } from "@/components/ui/primitives";
import { ErrorNote } from "@/components/ui/status";
import { apiError } from "@/lib/api";

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [tenantCode, setTenantCode] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(tenantCode, email, password);
      navigate("/");
    } catch (err) {
      setError(apiError(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex h-full items-center justify-center bg-[var(--pk-navy)] p-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-[var(--pk-navy-700)] text-2xl font-bold text-[var(--pk-gold)] ring-1 ring-white/10">
            ق
          </div>
          <h1 className="text-2xl font-bold tracking-wide text-white">PARAKH</h1>
          <p className="mt-1 text-sm text-white/50">
            Vendor &amp; service-provider audit management
          </p>
        </div>

        <form
          onSubmit={submit}
          className="space-y-4 rounded-xl bg-white p-6 shadow-xl"
        >
          {error && <ErrorNote message={error} />}
          <Field label="Organisation code">
            <Input
              value={tenantCode}
              onChange={(e) => setTenantCode(e.target.value)}
              placeholder="e.g. acme-pharma"
              autoFocus
              required
            />
          </Field>
          <Field label="Email">
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              required
            />
          </Field>
          <Field label="Password">
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </Field>
          <Button type="submit" loading={loading} className="w-full">
            Sign in
          </Button>
        </form>

        <p className="mt-6 text-center text-xs text-white/40">
          A QMSofts product · GxP / 21 CFR Part 11 aligned
        </p>
      </div>
    </div>
  );
}
