
import DashboardAppLayout from "@/app/dashboard-layout";

// This layout is responsible for handling top-level page props
// like `params` and `searchParams`. It then passes only the `children`
// to the actual app layout, preventing prop-drilling issues.
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <DashboardAppLayout>
      {children}
    </DashboardAppLayout>
  );
}
