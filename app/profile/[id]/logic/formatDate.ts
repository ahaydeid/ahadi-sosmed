export const formatPostDate = (dateString: string): string => {
  const d = new Date(dateString);
  const postYear = d.getUTCFullYear();
  const nowYear = new Date().getUTCFullYear();
  const opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", timeZone: "UTC" };
  if (postYear !== nowYear) opts.year = "numeric";
  return new Intl.DateTimeFormat("id-ID", opts).format(d);
};
