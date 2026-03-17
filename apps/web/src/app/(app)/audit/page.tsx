"use client";

import { useEffect, useState } from "react";
import { listResource } from "../../../lib/api";
import { useAuth } from "../../../components/auth-provider";

export default function AuditPage() {
  const { session } = useAuth();
  const [items, setItems] = useState<string>("[]");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!session?.accessToken) {
      return;
    }

    void listResource<Record<string, unknown>>("/audit", session.accessToken)
      .then((response) => setItems(JSON.stringify(response.items, null, 2)))
      .catch((caughtError) =>
        setError(caughtError instanceof Error ? caughtError.message : "Audit load failed.")
      );
  }, [session?.accessToken]);

  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <span className="eyebrow">Audit Trail</span>
          <h2>Platform core activity feed</h2>
        </div>
      </div>
      {error ? <p className="error-banner">{error}</p> : null}
      <pre>{items}</pre>
    </section>
  );
}
