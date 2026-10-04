import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import {
  isPageLoading,
  subscribePageLoading,
} from "../../api/pageLoading";

const routeTransitionDuration = 500;
const requestDisplayDelay = 200;

const getTheme = (pathname: string) => {
  if (pathname.startsWith("/orang-tua")) {
    return {
      backdrop: "bg-[#f3f7f5]/85",
      spinner: "border-[#b9ddca] border-t-[#0f766e]",
    };
  }

  if (pathname.startsWith("/petugas") || pathname.startsWith("/admin")) {
    return {
      backdrop: "bg-[#eef6fa]/85",
      spinner: "border-[#bfdbe9] border-t-[#0369a1]",
    };
  }

  return {
    backdrop: "bg-[#f3f7f5]/85",
    spinner: "border-emerald-200 border-t-emerald-700",
  };
};

export default function PagePreloader() {
  const { pathname } = useLocation();
  const [isNavigating, setIsNavigating] = useState(true);
  const [isRequestLoading, setIsRequestLoading] = useState(isPageLoading);
  const [showRequestLoading, setShowRequestLoading] = useState(false);
  const theme = getTheme(pathname);

  useEffect(() => subscribePageLoading(() => setIsRequestLoading(isPageLoading())), []);

  useEffect(() => {
    setIsNavigating(true);
    const timeoutId = window.setTimeout(
      () => setIsNavigating(false),
      routeTransitionDuration
    );

    return () => window.clearTimeout(timeoutId);
  }, [pathname]);

  useEffect(() => {
    if (!isRequestLoading) {
      setShowRequestLoading(false);
      return;
    }

    const timeoutId = window.setTimeout(
      () => setShowRequestLoading(true),
      requestDisplayDelay
    );

    return () => window.clearTimeout(timeoutId);
  }, [isRequestLoading]);

  if (!isNavigating && !showRequestLoading) return null;

  return (
    <div
      className={`fixed inset-0 z-[100] grid place-items-center px-4 backdrop-blur-sm ${theme.backdrop}`}
      role="status"
      aria-live="polite"
      aria-label="Memuat halaman"
    >
      <span
        className={`h-10 w-10 animate-spin rounded-full border-[3px] ${theme.spinner}`}
        aria-hidden="true"
      />
    </div>
  );
}
