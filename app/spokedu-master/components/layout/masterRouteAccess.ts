export function isProtectedMasterRoute(pathname: string, basePath: string) {
  if (basePath.startsWith('/admin')) return false;

  const publicRoutes = [
    `${basePath}/landing`,
    `${basePath}/terms`,
    `${basePath}/privacy`,
    `${basePath}/onboarding`,
    `${basePath}/parent`,
  ];
  if (publicRoutes.some((route) => pathname === route || pathname.startsWith(`${route}/`))) {
    return false;
  }
  if (pathname === `${basePath}/payment` || pathname.startsWith(`${basePath}/payment/`)) {
    return false;
  }
  return pathname === basePath || pathname.startsWith(`${basePath}/`);
}
