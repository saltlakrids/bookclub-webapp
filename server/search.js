// Book search. Uses Google Books when a key is configured and falls back to
// Open Library (no key needed) when there is no key or Google refuses.

const TIMEOUT_MS = 8000;

function https(url) {
  return url ? url.replace(/^http:\/\//, "https://") : "";
}

async function searchGoogle(query, apiKey) {
  const url = `https://www.googleapis.com/books/v1/volumes?maxResults=20&q=${encodeURIComponent(query)}&key=${encodeURIComponent(apiKey)}`;
  const response = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (!response.ok) {
    throw new Error(`Google Books answered ${response.status}`);
  }
  const data = await response.json();
  return (data.items || []).map((item) => ({
    id: `google:${item.id}`,
    title: item.volumeInfo.title || "",
    authors: item.volumeInfo.authors || [],
    pages: item.volumeInfo.pageCount || null,
    image: https(item.volumeInfo.imageLinks?.smallThumbnail),
  }));
}

export async function searchOpenLibrary(query, limit = 20) {
  const url = `https://openlibrary.org/search.json?limit=${limit}&fields=key,title,author_name,number_of_pages_median,cover_i&q=${encodeURIComponent(query)}`;
  const response = await fetch(url, {
    signal: AbortSignal.timeout(TIMEOUT_MS),
    headers: { "User-Agent": "slow-guys-bookclub/1.0" },
  });
  if (!response.ok) {
    throw new Error(`Open Library answered ${response.status}`);
  }
  const data = await response.json();
  return (data.docs || []).map((doc) => ({
    id: `openlibrary:${doc.key}`,
    title: doc.title || "",
    authors: doc.author_name || [],
    pages: doc.number_of_pages_median || null,
    image: doc.cover_i ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg` : "",
  }));
}

export async function searchBooks(query, apiKey) {
  if (apiKey) {
    try {
      return await searchGoogle(query, apiKey);
    } catch (error) {
      console.warn(`Google Books search failed, using Open Library: ${error.message}`);
    }
  }
  return searchOpenLibrary(query);
}
