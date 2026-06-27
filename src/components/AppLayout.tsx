import { useState, useEffect } from "react";
import { NavLink, Outlet, useNavigate, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Building2,
  ClipboardCheck,
  Wrench,
  Package,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { useAuth } from "@/auth/AuthContext";
import { cn } from "@/lib/utils";

const nav = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/suppliers", label: "Suppliers", icon: Building2 },
  { to: "/materials", label: "Materials", icon: Package },
  { to: "/audits", label: "Audits", icon: ClipboardCheck },
  { to: "/capas", label: "CAPAs", icon: Wrench },
];

export function AppLayout() {
  const { fullName, user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Close the mobile drawer whenever the route changes.
  useEffect(() => {
    setDrawerOpen(false);
  }, [location.pathname]);

  function handleLogout() {
    logout();
    navigate("/login");
  }

  const sidebarContent = (
    <>
      <div className="flex items-center gap-2.5 px-5 py-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--pk-navy)] text-base font-bold text-[var(--pk-gold)]">
          ق
        </div>
        <div>
          <div className="text-sm font-bold tracking-wide text-[var(--pk-navy)]">
            PARAKH
          </div>
          <div className="text-[10px] uppercase tracking-wider text-gray-400">
            Audit Management
          </div>
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-2">
        {nav.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-[var(--pk-navy)] text-white"
                  : "text-gray-600 hover:bg-gray-100"
              )
            }
          >
            <item.icon size={18} />
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-[var(--pk-line)] p-3">
        <div className="mb-2 px-2">
          <div className="text-sm font-medium text-[var(--pk-navy)]">
            {fullName ?? user?.email ?? "User"}
          </div>
          <div className="truncate text-xs text-gray-400">{user?.email}</div>
        </div>
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100"
        >
          <LogOut size={18} />
          Sign out
        </button>
      </div>
    </>
  );

  return (
    <div className="flex h-full">
      {/* Desktop / tablet sidebar — always visible from md up */}
      <aside className="hidden w-60 shrink-0 flex-col border-r border-[var(--pk-line)] bg-white md:flex">
        {sidebarContent}
      </aside>

      {/* Mobile drawer + backdrop */}
      {drawerOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setDrawerOpen(false)}
          />
          <aside className="absolute left-0 top-0 flex h-full w-64 flex-col bg-white shadow-xl">
            <button
              onClick={() => setDrawerOpen(false)}
              className="absolute right-3 top-3 rounded-md p-1 text-gray-500 hover:bg-gray-100"
              aria-label="Close menu"
            >
              <X size={20} />
            </button>
            {sidebarContent}
          </aside>
        </div>
      )}

      {/* Main column */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile top bar with hamburger — hidden from md up */}
        <header className="flex items-center gap-3 border-b border-[var(--pk-line)] bg-white px-4 py-3 md:hidden">
          <button
            onClick={() => setDrawerOpen(true)}
            className="rounded-md p-1 text-[var(--pk-navy)] hover:bg-gray-100"
            aria-label="Open menu"
          >
            <Menu size={22} />
          </button>
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-[var(--pk-navy)] text-sm font-bold text-[var(--pk-gold)]">
              ق
            </div>
            <span className="text-sm font-bold tracking-wide text-[var(--pk-navy)]">
              PARAKH
            </span>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 md:px-8 md:py-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-lg font-bold text-[var(--pk-navy)] sm:text-xl">
          {title}
        </h1>
        {subtitle && <p className="mt-1 text-sm text-gray-500">{subtitle}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}