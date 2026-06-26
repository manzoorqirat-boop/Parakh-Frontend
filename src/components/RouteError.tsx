import { useRouteError, isRouteErrorResponse, Link } from "react-router-dom";

// Shown by React Router whenever a routed page throws during render (instead of
// the browser going blank). Surfaces the actual error message + stack so a crash
// is diagnosable in place rather than presenting an empty white screen.
export function RouteError() {
  const error = useRouteError();

  let title = "Something went wrong on this page";
  let detail = "";
  let stack = "";

  if (isRouteErrorResponse(error)) {
    title = `${error.status} ${error.statusText}`;
    detail =
      typeof error.data === "string" ? error.data : JSON.stringify(error.data);
  } else if (error instanceof Error) {
    detail = error.message;
    stack = error.stack ?? "";
  } else if (typeof error === "string") {
    detail = error;
  } else {
    detail = JSON.stringify(error);
  }

  return (
    <div className="mx-auto max-w-2xl p-8">
      <div className="rounded-lg border border-red-200 bg-red-50 p-6">
        <h1 className="text-lg font-bold text-red-800">{title}</h1>
        {detail && (
          <p className="mt-2 whitespace-pre-wrap text-sm text-red-700">
            {detail}
          </p>
        )}
        {stack && (
          <pre className="mt-4 max-h-72 overflow-auto rounded bg-white/70 p-3 text-xs text-red-900/80">
            {stack}
          </pre>
        )}
        <div className="mt-5 flex gap-3">
          <button
            onClick={() => window.location.reload()}
            className="rounded-md bg-[var(--pk-navy)] px-3 py-1.5 text-sm font-medium text-white"
          >
            Reload
          </button>
          <Link
            to="/"
            className="rounded-md px-3 py-1.5 text-sm font-medium text-[var(--pk-navy)] ring-1 ring-[var(--pk-line)]"
          >
            Go to dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
