# For Example AI - API Documentation

Welcome to the For Example AI API documentation! Our static JSON API provides programmatic access to all our educational content.

## Overview

All endpoints return JSON and are updated automatically when the site builds. No authentication required - all content is freely accessible.

**Base URL:** `https://forexample.ai`

## Endpoints

### 1. All Guides
**Endpoint:** `/api/guides.json`

Returns a complete list of all guides with full metadata.

**Response Format:**
```json
{
  "meta": {
    "generated": "2026-02-12T10:00:00Z",
    "count": 35,
    "version": "1.0"
  },
  "guides": [
    {
      "id": "how-chatgpt-works-a-simple-explanation",
      "title": "How ChatGPT Works: A Simple Explanation",
      "slug": "how-chatgpt-works-a-simple-explanation",
      "url": "https://forexample.ai/guides/how-chatgpt-works-a-simple-explanation/",
      "description": "A beginner-friendly introduction to...",
      "difficulty": "beginner",
      "tags": ["chatgpt", "language-models", "basics"],
      "estimated_time": "9 min read",
      "date_published": "2026-02-12T00:00:00Z",
      "series": {
        "name": "Understanding Transformers",
        "part": 1,
        "total": 4,
        "next": "understanding-transformer-architecture"
      },
      "image": "https://forexample.ai/assets/images/guides/...",
      "content_length": 1850
    }
  ]
}
```

**Use Cases:**
- Build custom frontends
- Create mobile apps
- AI agent content discovery
- Analytics and tracking
- Content aggregation

---

### 2. Learning Series
**Endpoint:** `/api/series.json`

Returns all multi-part learning series with their constituent guides.

**Response Format:**
```json
{
  "meta": {
    "generated": "2026-02-12T10:00:00Z",
    "count": 7
  },
  "series": [
    {
      "name": "Understanding Transformers",
      "slug": "understanding-transformers",
      "total_parts": 4,
      "completed_parts": 4,
      "guides": [
        {
          "part": 1,
          "title": "How ChatGPT Works: A Simple Explanation",
          "slug": "how-chatgpt-works-a-simple-explanation",
          "url": "https://forexample.ai/guides/...",
          "difficulty": "beginner",
          "estimated_time": "9 min read",
          "tags": ["chatgpt", "language-models"]
        }
      ]
    }
  ]
}
```

**Use Cases:**
- Display learning paths
- Track course progress
- Recommend series to users
- Build curriculum planners

---

### 3. Topics/Tags
**Endpoint:** `/api/topics.json`

Returns all topics with guides organized by tag.

**Response Format:**
```json
{
  "meta": {
    "generated": "2026-02-12T10:00:00Z",
    "count": 45
  },
  "topics": [
    {
      "tag": "transformers",
      "slug": "transformers",
      "count": 8,
      "guides": [
        {
          "title": "Understanding Transformer Architecture",
          "slug": "understanding-transformer-architecture",
          "url": "https://forexample.ai/guides/...",
          "difficulty": "intermediate",
          "estimated_time": "15 min read"
        }
      ]
    }
  ]
}
```

**Use Cases:**
- Browse by topic
- Filter guides
- Build tag clouds
- Topic-based navigation

---

### 4. Site Index
**Endpoint:** `/index.json`

Returns site structure, statistics, and navigation.

**Response Format:**
```json
{
  "site": {
    "name": "For Example AI",
    "description": "Learn AI concepts...",
    "url": "https://forexample.ai"
  },
  "statistics": {
    "total_guides": 35,
    "total_series": 7,
    "total_topics": 45,
    "by_difficulty": {
      "beginner": 12,
      "intermediate": 15,
      "advanced": 8
    }
  },
  "endpoints": { ... },
  "navigation": [ ... ]
}
```

---

### 5. RSS Feed
**Endpoint:** `/feed.xml`

Standard RSS/Atom feed of latest guides.

**Format:** XML (RSS/Atom)

**Use Cases:**
- Feed readers
- Content aggregators
- Notification systems

---

### 6. Sitemap
**Endpoint:** `/sitemap.xml`

XML sitemap for search engines.

**Format:** XML (Sitemap Protocol)

---

### 7. AI Site Manifest
**Endpoint:** `/.well-known/ai-site.json`

AI agent discovery manifest describing site structure and capabilities.

**Use Cases:**
- AI agent discovery
- Automated content indexing
- Machine learning dataset creation

---

## Rate Limiting

None! All content is static and served via CDN. Feel free to fetch as often as needed.

## CORS

All API endpoints support Cross-Origin Resource Sharing (CORS). You can access them from any domain.

## Caching

Content is cached at CDN level. Guides are typically updated daily.

## Content License

All content is licensed under **Creative Commons Attribution 4.0 International (CC BY 4.0)**.

**You are free to:**
- Share and redistribute
- Adapt and build upon

**Under these terms:**
- **Attribution Required:** Credit "For Example AI" with a link back
- Commercial use allowed
- Modifications allowed

**Example Attribution:**
```
From "How ChatGPT Works: A Simple Explanation",
For Example AI (https://forexample.ai/guides/how-chatgpt-works-a-simple-explanation/)
```

## Support

Questions? Issues? Contact us via our website: https://forexample.ai

## Examples

### Fetch All Beginner Guides
```javascript
fetch('https://forexample.ai/api/guides.json')
  .then(r => r.json())
  .then(data => {
    const beginnerGuides = data.guides.filter(
      g => g.difficulty === 'beginner'
    );
    console.log(beginnerGuides);
  });
```

### Get All Guides in a Series
```javascript
fetch('https://forexample.ai/api/series.json')
  .then(r => r.json())
  .then(data => {
    const transformerSeries = data.series.find(
      s => s.slug === 'understanding-transformers'
    );
    console.log(transformerSeries.guides);
  });
```

### Find Guides by Topic
```javascript
fetch('https://forexample.ai/api/topics.json')
  .then(r => r.json())
  .then(data => {
    const aiEthicsGuides = data.topics.find(
      t => t.slug === 'ai-ethics'
    );
    console.log(aiEthicsGuides.guides);
  });
```

---

**Last Updated:** 2026-02-12
