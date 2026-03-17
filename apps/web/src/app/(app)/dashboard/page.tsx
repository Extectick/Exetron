export default function DashboardPage() {
  const cards = [
    {
      label: "Foundation",
      value: "PHASE 0",
      copy: "Repo structure, Prisma schema, Swagger, Docker stack and shared contracts are in place."
    },
    {
      label: "Platform Core",
      value: "PHASE 1",
      copy: "Auth, tenants, stores, users, roles, devices, settings and feature flags are exposed as REST resources."
    },
    {
      label: "Isolation",
      value: "App + RLS",
      copy: "Tenant-aware access control is enforced in services and prepared for PostgreSQL RLS policies."
    },
    {
      label: "Clients",
      value: "Web + Expo",
      copy: "Admin control plane is functional now; Expo remains a scaffold for POS and kiosk phases."
    }
  ];

  return (
    <>
      <section className="panel">
        <span className="eyebrow">Overview</span>
        <h2>Exetron platform core cockpit</h2>
        <p className="muted-copy">
          This workspace is the operator-facing shell for early SaaS foundation work.
          The first objective is to lock architecture and platform entities before
          catalog, orders and device-specific flows.
        </p>
      </section>
      <section className="dashboard-grid">
        {cards.map((card) => (
          <article className="stat-card" key={card.label}>
            <span className="eyebrow">{card.label}</span>
            <strong>{card.value}</strong>
            <p className="muted-copy">{card.copy}</p>
          </article>
        ))}
      </section>
    </>
  );
}
