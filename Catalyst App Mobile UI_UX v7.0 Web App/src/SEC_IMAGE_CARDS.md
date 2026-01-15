# SEC Filing Image Cards - Implementation Guide

## Overview
The Catalyst Copilot chat now supports displaying images extracted from SEC filings (10-K, 10-Q, 8-K, etc.). These images appear as data cards alongside stock cards and event cards, providing visual context for AI-generated insights.

## Use Cases

### Common SEC Filing Images
1. **Product Pipelines** - Drug development stages, product roadmaps
2. **Financial Tables** - Revenue breakdowns, segment performance
3. **Organizational Charts** - Corporate structure, board composition
4. **Geographic Maps** - Market presence, facility locations
5. **Process Diagrams** - Manufacturing flows, business models
6. **Competitive Analysis** - Market position, competitor comparisons
7. **Timeline Graphics** - Historical milestones, future projections

## Backend Data Structure

### Image Card Format
```json
{
  "type": "image",
  "data": {
    "id": "sec-image-MNMD-0001437749-24-032891-0",
    "ticker": "MNMD",
    "source": "sec_filing",
    "title": "Product Candidate Pipeline",
    "imageUrl": "https://www.sec.gov/Archives/edgar/data/1860016/000143774924032891/img001.jpg",
    "context": "The following table summarizes the status of our product candidates as of December 31, 2024",
    "filingType": "10-K",
    "filingDate": "12/31/2024",
    "filingUrl": "https://www.sec.gov/Archives/edgar/data/1860016/000143774924032891/mnmd20241231_10k.htm"
  }
}
```

### Field Descriptions

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | ✅ | Unique identifier for the image (e.g., `sec-image-{ticker}-{filing-id}-{index}`) |
| `ticker` | string | ✅ | Stock ticker symbol |
| `source` | string | ✅ | Always `"sec_filing"` for SEC images |
| `title` | string | ✅ | Descriptive title of the image content |
| `imageUrl` | string | ✅ | Direct URL to the image on SEC servers |
| `context` | string | ❌ | Text surrounding the image in the filing (helps AI understand context) |
| `filingType` | string | ❌ | Type of SEC filing (10-K, 10-Q, 8-K, etc.) |
| `filingDate` | string | ❌ | Date of the filing (format: MM/DD/YYYY) |
| `filingUrl` | string | ❌ | URL to the full filing document |

## Frontend Implementation

### TypeScript Interface
```typescript
interface ImageCardData {
  id: string;
  ticker: string;
  source: string;
  title: string;
  imageUrl: string;
  context?: string;
  filingType?: string;
  filingDate?: string;
  filingUrl?: string;
}
```

### Card Component Features

1. **Header Section**
   - Ticker badge (gradient blue, prominent)
   - Filing type badge (green outline)
   - Filing date with calendar icon

2. **Image Display**
   - Full-width image with rounded corners
   - Border for contrast
   - White background for dark mode compatibility
   - Lazy loading for performance

3. **Context Section**
   - Image title with document icon
   - Truncated context text (3 lines max)
   - Subtle styling to not overpower image

4. **Action Link**
   - "View Full Filing" link with external icon
   - Opens in new tab
   - Hover effects for interactivity

5. **Data Attribution**
   - Small footer text: "SEC Filing Image"
   - Matches other card styles

6. **PDF Export Support**
   - Image cards included in chat PDF exports
   - Format: `🖼️ [TICKER] - [TITLE] ([FILING_TYPE])`
   - Filing URL included as clickable link
   - Maintains visual consistency with stock and event cards

### Styling Details

```css
- Card: Gradient background, hover lift effect
- Ticker Badge: ai-accent gradient, white text, shadow
- Filing Badge: Green outline, small text
- Image Container: White background, border, rounded corners
- Link: ai-accent color, hover transition
- Attribution: Muted, 10px font size
```

## Backend Integration

### SSE Metadata Event
```javascript
res.write(`data: ${JSON.stringify({
  type: 'metadata',
  dataCards: [
    {
      type: 'stock',
      data: { ticker: 'MNMD', price: 2.50, ... }
    },
    {
      type: 'image',
      data: {
        id: 'sec-image-MNMD-001',
        ticker: 'MNMD',
        source: 'sec_filing',
        title: 'Product Pipeline',
        imageUrl: 'https://www.sec.gov/Archives/...',
        context: 'Pipeline overview...',
        filingType: '10-K',
        filingDate: '12/31/2024',
        filingUrl: 'https://www.sec.gov/...'
      }
    }
  ]
})}\n\n`);
```

### Image Extraction Process

1. **Fetch Recent Filings**
   ```sql
   SELECT filing_url, filing_type, filing_date
   FROM sec_filings
   WHERE ticker = $1
   ORDER BY filing_date DESC
   LIMIT 5
   ```

2. **Parse HTML/XML**
   - Download filing HTML
   - Extract `<img>` tags and `<GRAPHIC>` tags
   - Filter out logos, headers, and small images
   - Keep charts, tables, diagrams

3. **Extract Context**
   - Get surrounding text (before/after image)
   - Look for captions, table titles
   - Truncate to ~200 characters

4. **Generate Metadata**
   ```javascript
   {
     id: `sec-image-${ticker}-${filingId}-${imageIndex}`,
     ticker: ticker,
     source: 'sec_filing',
     title: extractedTitle || 'SEC Filing Image',
     imageUrl: resolveImageUrl(imgSrc, filingUrl),
     context: extractedContext,
     filingType: filing.type,
     filingDate: filing.date,
     filingUrl: filing.url
   }
   ```

5. **Store in Database**
   ```sql
   INSERT INTO sec_filing_images
   (id, ticker, title, image_url, context, filing_type, filing_date, filing_url)
   VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
   ```

## AI Integration

### Context Injection
When images are found, inject them into the AI prompt:

```javascript
const systemPrompt = `You are Catalyst AI. The user is asking about ${ticker}.

Available SEC Filing Images:
${images.map(img => `- ${img.title} (${img.filingType}, ${img.filingDate})`).join('\n')}

Reference these images naturally in your response when relevant.`;
```

### Natural Referencing
The AI can mention images like:
- "As shown in the product pipeline diagram from their 10-K..."
- "According to the revenue breakdown table in their latest filing..."
- "The organizational chart reveals..."

## Example Flow

### User Query
```
"What's MNMD's drug pipeline status?"
```

### Backend Response

**Step 1: Metadata Event**
```json
{
  "type": "metadata",
  "dataCards": [
    {
      "type": "stock",
      "data": { "ticker": "MNMD", ... }
    },
    {
      "type": "image",
      "data": {
        "title": "Product Candidate Pipeline",
        "imageUrl": "https://www.sec.gov/.../pipeline.jpg",
        "filingType": "10-K"
      }
    }
  ]
}
```

**Step 2: Thinking Event**
```json
{
  "type": "thinking",
  "content": "Found pipeline diagram in recent 10-K filing..."
}
```

**Step 3: Content Stream**
```
"MNMD has several drug candidates in development. 
As shown in the product pipeline diagram from their 
10-K filing, they have compounds in Phase 2 and 
Phase 3 trials..."
```

### Frontend Display
```
┌─────────────────────────────────────────┐
│ ✨ Catalyst AI                          │
│                                         │
│ MNMD has several drug candidates...     │
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │ [MNMD] [10-K] 📅 12/31/2024        │ │
│ │                                     │ │
│ │ 📄 Product Candidate Pipeline       │ │
│ │                                     │ │
│ │ [IMAGE: Pipeline diagram]           │ │
│ │                                     │ │
│ │ View Full Filing →                  │ │
│ └─────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

## Best Practices

### Image Selection
✅ **Include:**
- Charts and graphs
- Tables with data
- Process diagrams
- Organizational structures
- Geographic maps
- Product timelines

❌ **Exclude:**
- Company logos
- Header/footer images
- Signatures
- Small icons
- Decorative images

### Performance
- Use lazy loading (`loading="lazy"`)
- Compress images if hosting yourself
- Cache image metadata
- Limit to 3-5 images per response

### Accessibility
- Always provide `alt` text (use title)
- Ensure images have sufficient contrast borders
- Make links keyboard navigable

### Error Handling
```javascript
<img 
  src={imageUrl}
  alt={title}
  onError={(e) => {
    e.currentTarget.src = '/placeholder-chart.png';
    e.currentTarget.alt = 'Image unavailable';
  }}
/>
```

## Troubleshooting

### Common Issues

**1. Images Not Loading**
- Check CORS headers on SEC servers
- Verify image URL is absolute, not relative
- Test URL directly in browser

**2. Context Too Long**
- Truncate to 200 characters max
- Focus on immediate surrounding text
- Use `...` to indicate truncation

**3. Wrong Filing Type**
- Validate filing type against SEC list
- Default to "Filing" if unknown
- Map variations (10-K/A → 10-K)

**4. Dark Mode Issues**
- Add white background to image container
- Use border for contrast
- Test with dark theme enabled

## Future Enhancements

Potential additions:
- [ ] Image zoom/lightbox on click
- [ ] OCR text extraction for searchability
- [ ] Image caching/CDN hosting
- [ ] Multiple images in carousel
- [ ] Image comparison (year-over-year)
- [ ] Download image button
- [ ] Share image separately
