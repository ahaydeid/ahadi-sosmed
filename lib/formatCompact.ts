export const formatCompact = (n: number) => {
  if (!Number.isFinite(n)) return "0";
  const sign = n < 0 ? "-" : "";
  const abs = Math.abs(n);
  if (abs < 1000) return sign + String(abs);

  const units = [
    { v: 1e12, s: "T" },
    { v: 1e9, s: "B" },
    { v: 1e6, s: "M" },
    { v: 1e3, s: "k" },
  ];
  const u = units.find((x) => abs >= x.v)!;
  const val = Math.round((abs / u.v) * 10) / 10;

  const nf = new Intl.NumberFormat("id-ID", {
    minimumFractionDigits: Number.isInteger(val) ? 0 : 1,
    maximumFractionDigits: 1,
  });

  return sign + nf.format(val) + u.s;
};
