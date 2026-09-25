import { fetchFeed } from "../lib/rss";
import { ZONE_RSS_FEEDS } from "../lib/rssFeeds";
async function main() {
 const urls = [...new Set(Object.values(ZONE_RSS_FEEDS).flat())];
 let failures = 0;
 await Promise.all(urls.map(async (url) => {
   const items = await fetchFeed(url);
   if (!items.length) failures++;
   console.log(JSON.stringify({ url, count: items.length, latest: items.map((item) => item.publishedAt).filter(Boolean).sort().at(-1) ?? null }));
 }));
 console.log(`${urls.length - failures}/${urls.length} flux avec articles`);
 process.exitCode = failures ? 1 : 0;
}
void main();
