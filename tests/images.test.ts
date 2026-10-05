import test from "node:test";
import assert from "node:assert/strict";
import { normalizeImageUrl } from "../lib/imageUrls";
import { extractImageUrl } from "../lib/articleSummary";
import { imageOfFeedItem } from "../lib/rss";

const PAGE = "https://www.example.com/news/2026/10/article-1";

test("Les adresses relatives sont rendues absolues", () => {
  assert.equal(normalizeImageUrl("/img/photo.jpg", PAGE), "https://www.example.com/img/photo.jpg");
  assert.equal(normalizeImageUrl("//cdn.example.com/p.jpg", PAGE), "https://cdn.example.com/p.jpg");
  assert.equal(normalizeImageUrl("https://cdn.example.com/a/b.jpg?w=800"), "https://cdn.example.com/a/b.jpg?w=800");
});

test("Logos, icônes et formats inadaptés sont écartés, pas les dossiers « default »", () => {
  assert.equal(normalizeImageUrl("https://x.com/assets/logo-white.png"), null);
  assert.equal(normalizeImageUrl("https://x.com/favicon.ico"), null);
  assert.equal(normalizeImageUrl("https://x.com/img/placeholder.jpg"), null);
  assert.equal(normalizeImageUrl("https://x.com/img/banner.svg"), null);
  assert.equal(normalizeImageUrl("javascript:alert(1)"), null);
  assert.equal(normalizeImageUrl("not a url"), null);
  assert.equal(normalizeImageUrl("https://x.com/sites/default/files/photo.jpg"), "https://x.com/sites/default/files/photo.jpg");
});

test("Image de page : og:image, puis image_src, puis JSON-LD", () => {
  assert.equal(
    extractImageUrl('<meta property="og:image" content="/photos/une.jpg">', PAGE),
    "https://www.example.com/photos/une.jpg"
  );
  assert.equal(
    extractImageUrl('<meta property="og:image" content="https://x.com/logo.png"><link rel="image_src" href="https://x.com/vraie.jpg">', PAGE),
    "https://x.com/vraie.jpg"
  );
  assert.equal(
    extractImageUrl('<script type="application/ld+json">{"@type":"NewsArticle","image":["https:\/\/cdn.x.com\/ld.jpg"]}</script>', PAGE),
    "https://cdn.x.com/ld.jpg"
  );
  assert.equal(extractImageUrl("<html></html>", PAGE), null);
});

test("Image de flux : la plus large des media:content, puis miniature, puis enclosure", () => {
  assert.equal(
    imageOfFeedItem(
      {
        "media:content": [
          { "@_url": "https://x.com/petite.jpg", "@_medium": "image", "@_width": "144" },
          { "@_url": "https://x.com/grande.jpg", "@_medium": "image", "@_width": "976" },
          { "@_url": "https://x.com/video.mp4", "@_type": "video/mp4" },
        ],
      },
      PAGE
    ),
    "https://x.com/grande.jpg"
  );
  assert.equal(imageOfFeedItem({ "media:thumbnail": { "@_url": "https://x.com/thumb?id=3" } }, PAGE), "https://x.com/thumb?id=3");
  assert.equal(imageOfFeedItem({ enclosure: { "@_url": "https://x.com/e.jpg", "@_type": "image/jpeg" } }, PAGE), "https://x.com/e.jpg");
  assert.equal(imageOfFeedItem({ enclosure: { "@_url": "https://x.com/podcast.mp3", "@_type": "audio/mpeg" } }, PAGE), null);
});

test("Image de flux : repli sur la première <img> du résumé", () => {
  assert.equal(
    imageOfFeedItem({ description: '<p><img src="/uploads/h.jpg" width="1"/> Texte</p>' }, PAGE),
    "https://www.example.com/uploads/h.jpg"
  );
  assert.equal(imageOfFeedItem({ description: "Texte seul" }, PAGE), null);
});
