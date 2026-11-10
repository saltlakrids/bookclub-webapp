// Numbers about finished books, shared by the Rate Book and My Books pages.
// Only books in "Read and rated" count: scores on books still being read stay hidden.

const DAY = 24 * 60 * 60 * 1000;

export function readingDays(book) {
  if (!book.startedAt || !book.finishedAt) return null;
  const days = Math.round((new Date(book.finishedAt) - new Date(book.startedAt)) / DAY);
  return days >= 0 ? Math.max(days, 1) : null;
}

export function formatDuration(days) {
  if (days === null) return "";
  if (days < 14) return `${days} day${days === 1 ? "" : "s"}`;
  if (days < 60) return `${Math.round(days / 7)} weeks`;
  return `${Math.round(days / 30.4)} months`;
}

export function scores(book) {
  return (book.ratings || []).map((r) => r.score).filter((s) => typeof s === "number");
}

// Only the ratings that carry a score (skipped rows have null)
export function ratersOf(book) {
  return (book.ratings || []).filter((r) => typeof r.score === "number");
}

// Every finished book: the ones the member scored first (highest first), then the rest by club average
export function myBookList(rated, member) {
  const { top } = memberStats(rated, member);
  const scoredIds = new Set(top.map((entry) => entry.book.id));
  const others = rated
    .filter((book) => !scoredIds.has(book.id))
    .sort((a, b) => (b.average ?? -1) - (a.average ?? -1))
    .map((book) => ({ book, score: null, skipped: scoreOf(book, member) === null }));
  return [...top, ...others];
}

export function scoreOf(book, member) {
  const rating = (book.ratings || []).find((r) => r.member === member);
  return rating ? rating.score : undefined;
}

// How much the club agreed: the gap between the highest and lowest score
export function spread(book) {
  const s = scores(book);
  return s.length > 1 ? Math.max(...s) - Math.min(...s) : null;
}

export function agreementLabel(book) {
  const gap = spread(book);
  if (gap === null) return "";
  if (gap <= 1) return "Everyone agreed";
  if (gap >= 4) return "Split opinions";
  return "";
}

export function mean(numbers) {
  return numbers.length ? numbers.reduce((sum, n) => sum + n, 0) / numbers.length : null;
}

export function clubSummary(rated) {
  const days = rated.map(readingDays).filter((d) => d !== null);
  return {
    books: rated.length,
    pages: rated.reduce((sum, b) => sum + (b.pages || 0), 0),
    averageDays: days.length ? Math.round(mean(days)) : null,
    averageScore: mean(rated.map((b) => b.average).filter((a) => a !== null)),
  };
}

// One member's view of the finished books
export function memberStats(rated, member) {
  const mine = rated
    .map((book) => ({ book, score: scoreOf(book, member) }))
    .filter((entry) => entry.score !== undefined);
  const scored = mine.filter((entry) => entry.score !== null);
  const top = [...scored].sort((a, b) => b.score - a.score || (b.book.average ?? 0) - (a.book.average ?? 0));
  const suggested = rated.filter((b) => b.suggester === member);

  // How far this member's scores sit from the club average, on average
  const differences = scored
    .filter((entry) => entry.book.average !== null)
    .map((entry) => entry.score - entry.book.average);

  return {
    rated: scored.length,
    skipped: mine.length - scored.length,
    pages: scored.reduce((sum, entry) => sum + (entry.book.pages || 0), 0),
    averageGiven: mean(scored.map((entry) => entry.score)),
    comparedToClub: mean(differences),
    top,
    lowest: top.length ? top[top.length - 1] : null,
    suggested: suggested.length,
    suggestedAverage: mean(suggested.map((b) => b.average).filter((a) => a !== null)),
    bestSuggested: [...suggested].filter((b) => b.average !== null).sort((a, b) => b.average - a.average)[0] || null,
  };
}
