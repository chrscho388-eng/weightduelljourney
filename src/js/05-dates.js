  // ---- dates (all YYYY-MM-DD, Berlin calendar) ----
  const todayStr = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Berlin", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  const toUTC = (s) => { const [y, m, d] = s.split("-").map(Number); return Date.UTC(y, m - 1, d); };
  const fromUTC = (t) => new Date(t).toISOString().slice(0, 10);
  const addDays = (s, n) => fromUTC(toUTC(s) + n * 86400000);
  const weekday = (s) => (new Date(toUTC(s)).getUTCDay() + 6) % 7; // 0 = Mo
  const mondayOf = (s) => addDays(s, -weekday(s));
  // balance weeks run from weigh day to weigh day (weighed in the morning, so that day belongs to the new week); meal plans stay Mon–Sun
  const wkPos = (s) => (weekday(s) - (S.weighDay ?? 1) + 7) % 7;
  const wkStart = (s) => addDays(s, -wkPos(s));
  const WD = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];
  const WDL = ["Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag", "Sonntag"];
  const dm = (s) => { const [, m, d] = s.split("-"); return `${d}.${m}.`; };
  const weekNo = (mon) => S.startDate ? Math.floor((toUTC(mon) - toUTC(S.startDate)) / (7 * 86400000)) + 1 : 1;

