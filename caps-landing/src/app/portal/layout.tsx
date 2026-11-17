export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return <div className="flex min-h-svh flex-col bg-canvas">{children}</div>;
}
