import Sidebar, { MobileNav } from "../../components/Sidebar";

export default function AppLayout({ children }) {
  return (
    <div className="min-h-screen flex">
      <Sidebar />
      <main className="flex-1 overflow-y-auto pb-16 sm:pb-0">{children}</main>
      <MobileNav />
    </div>
  );
}
