import React from "react";
import ReactDOM from "react-dom/client";
import {
  createBrowserRouter,
  RouterProvider,
  Navigate,
  Outlet,
} from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "./index.css";
import { AuthProvider, useAuth } from "@/auth/AuthContext";
import { ToastProvider } from "@/components/ui/overlay";
import { Spinner } from "@/components/ui/status";
import { AppLayout } from "@/components/AppLayout";
import { RouteError } from "@/components/RouteError";
import { LoginPage } from "@/pages/LoginPage";
import { DashboardPage } from "@/pages/DashboardPage";
import { AuditeesPage } from "@/pages/AuditeesPage";
import { AuditeeDetailPage } from "@/pages/AuditeeDetailPage";
import { AuditsPage } from "@/pages/AuditsPage";
import { AuditDetailPage } from "@/pages/AuditDetailPage";
import { CapasPage } from "@/pages/CapasPage";
import { CapaDetailPage } from "@/pages/CapaDetailPage";
import { SuppliersPage } from "@/pages/SuppliersPage";
import { SupplierDetailPage } from "@/pages/SupplierDetailPage";
import { SiteDetailPage } from "@/pages/SiteDetailPage";
import { MaterialsPage } from "@/pages/MaterialsPage";
import { ScarsPage } from "@/pages/ScarsPage";
import { ScarDetailPage } from "@/pages/ScarDetailPage";
import { ScorecardsPage } from "@/pages/ScorecardsPage";
import { SncrsPage } from "@/pages/SncrsPage";
import { CoaInspectionsPage } from "@/pages/CoaInspectionsPage";
import { ChangeNotificationsPage } from "@/pages/ChangeNotificationsPage";
import { QualityAgreementsPage } from "@/pages/QualityAgreementsPage";
import { AuditorsPage } from "@/pages/AuditorsPage";
import { RegistersPage } from "@/pages/RegistersPage";
import { VendorRegistrationsPage } from "@/pages/VendorRegistrationsPage";
import { VendorFormPublicPage } from "@/pages/VendorFormPublicPage";
import { MasterDataPage } from "@/pages/MasterDataPage";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: false },
  },
});

// Gate: wait for auth boot, then require a session.
function Protected() {
  const { user, ready } = useAuth();
  if (!ready)
    return (
      <div className="flex h-full items-center justify-center">
        <Spinner />
      </div>
    );
  if (!user) return <Navigate to="/login" replace />;
  return <Outlet />;
}

// Redirect away from login if already authenticated.
function LoginGate() {
  const { user, ready } = useAuth();
  if (!ready) return null;
  if (user) return <Navigate to="/" replace />;
  return <LoginPage />;
}

const router = createBrowserRouter([
  { path: "/login", element: <LoginGate /> },
  { path: "/vendor-form/:token", element: <VendorFormPublicPage /> },
  {
    element: <Protected />,
    children: [
      {
        element: <AppLayout />,
        errorElement: <RouteError />,
        children: [
          { path: "/", element: <DashboardPage /> },
          { path: "/suppliers", element: <SuppliersPage /> },
          { path: "/suppliers/:id", element: <SupplierDetailPage /> },
          { path: "/suppliers/:parentId/sites/:siteId", element: <SiteDetailPage /> },
          { path: "/materials", element: <MaterialsPage /> },
          { path: "/scars", element: <ScarsPage /> },
          { path: "/scars/:id", element: <ScarDetailPage /> },
          { path: "/scorecards", element: <ScorecardsPage /> },
          { path: "/sncrs", element: <SncrsPage /> },
          { path: "/coa-inspections", element: <CoaInspectionsPage /> },
          { path: "/change-control", element: <ChangeNotificationsPage /> },
          { path: "/quality-agreements", element: <QualityAgreementsPage /> },
          { path: "/auditors", element: <AuditorsPage /> },
          { path: "/registers", element: <RegistersPage /> },
          { path: "/vendor-registrations", element: <VendorRegistrationsPage /> },
          { path: "/master-data", element: <MasterDataPage /> },
          { path: "/auditees", element: <AuditeesPage /> },
          { path: "/auditees/:id", element: <AuditeeDetailPage /> },
          { path: "/audits", element: <AuditsPage /> },
          { path: "/audits/:id", element: <AuditDetailPage /> },
          { path: "/capas", element: <CapasPage /> },
          { path: "/capas/:id", element: <CapaDetailPage /> },
        ],
      },
    ],
  },
  { path: "*", element: <Navigate to="/" replace /> },
]);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ToastProvider>
          <RouterProvider router={router} />
        </ToastProvider>
      </AuthProvider>
    </QueryClientProvider>
  </React.StrictMode>
);
