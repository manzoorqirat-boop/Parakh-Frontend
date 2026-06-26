import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Building2,
  ClipboardCheck,
  Wrench,
  Package,
  AlertTriangle,
  Gauge,
  LogOut,
} from "lucide-react";
import { useAuth } from "@/auth/AuthContext";
import { cn } from "@/lib/utils";

const nav = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/suppliers", label: "Suppliers", icon: Building2 },
  { to: "/materials", label: "Materials", icon: Package },
  { to: "/scars", label: "SCARs", icon: AlertTriangle },
  { to: "/scorecards", label: "Scorecards", icon: Gauge },
  { to: "/audits", label: "Audits", icon: ClipboardCheck },
  { to: "/capas", label: "CAPAs", icon: Wrench },
];

export function AppLayout() {
  const { fullName, user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate("/login");
  }

  return (
    <div className="flex h-full">
      {/* Sidebar */}
      <aside className="flex w-60 shrink-0 flex-col border-r border-[var(--pk-line)] bg-white">
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
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-6xl px-8 py-8">
          <Outlet />
        </div>
      </main>
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
    <div className="mb-6 flex items-end justify-between">
      <div>
        <h1 className="text-xl font-bold text-[var(--pk-navy)]">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-gray-500">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
