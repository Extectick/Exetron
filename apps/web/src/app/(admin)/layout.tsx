import { AdminRoot } from "../../refine/app/admin-root";

export default function AppLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <AdminRoot>{children}</AdminRoot>;
}
