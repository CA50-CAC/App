/** Pages only signed-in staff may open: /admin/** and the wizard steps after "sign in". */
export function isStaffOnlyPath(pathname: string): boolean {
  return pathname === "/admin" || pathname.startsWith("/admin/") || /^\/setup\/[2-7](\/|$)/.test(pathname);
}
