export function dashboardUrl(decisionId?: string | null, error?: string | null): string {
  const params: string[] = [];
  if (decisionId) params.push(`decision=${encodeURIComponent(decisionId)}`);
  if (error) params.push(`error=${encodeURIComponent(error)}`);
  return params.length > 0 ? `/dashboard?${params.join("&")}` : "/dashboard";
}
