# Image Card Visual Example

## Live Chat Display

```
┌─────────────────────────────────────────────────────────────────┐
│ Catalyst Copilot                                          ─  ✕  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  What's MNMD's product pipeline?                      [User] ◄─┐│
│                                                                 ││
│  ✨ Catalyst AI                                                ││
│                                                                 ││
│  ┌───────────────────────────────────────────────────────────┐ ││
│  │ ✨ View thinking process                              ▶   │ ││
│  └───────────────────────────────────────────────────────────┘ ││
│                                                                 ││
│  MNMD has a diverse pipeline of psychedelic medicine           ││
│  candidates targeting various mental health conditions.        ││
│  As shown in their recent 10-K filing, they have multiple      ││
│  compounds in different stages of development.                 ││
│                                                                 ││
│  ┌───────────────────────────────────────────────────────────┐ ││
│  │ [MNMD] [10-K] 📅 12/31/2024                              │ ││
│  │                                                             │ ││
│  │ 📄 Product Candidate Pipeline                              │ ││
│  │                                                             │ ││
│  │ ┌─────────────────────────────────────────────────────────┐│ ││
│  │ │                                                         ││ ││
│  │ │    [Product Pipeline Table/Chart Image]                ││ ││
│  │ │                                                         ││ ││
│  │ │    - Phase 1 candidates                                ││ ││
│  │ │    - Phase 2 trials                                    ││ ││
│  │ │    - Phase 3 development                               ││ ││
│  │ │                                                         ││ ││
│  │ └─────────────────────────────────────────────────────────┘│ ││
│  │                                                             │ ││
│  │ The following table summarizes the status of our           │ ││
│  │ product candidates as of December 31, 2024...              │ ││
│  │                                                             │ ││
│  │ View Full Filing →                                         │ ││
│  │                                                             │ ││
│  │ SEC Filing Image                                           │ ││
│  └───────────────────────────────────────────────────────────┘ ││
│                                                                 ││
│  ┌───────────────────────────────────────────────────────────┐ ││
│  │ 📊 MNMD                                         $2.45  ▲  │ ││
│  │ MindMed Inc.                               +0.15 (+6.5%) │ ││
│  │ [Mini Chart ▁▂▃▅▄▆█]                                     │ ││
│  └───────────────────────────────────────────────────────────┘ ││
│                                                                 ││
└─────────────────────────────────────────────────────────────────┘
```

## Component Breakdown

### Image Card Structure

```
┌─────────────────────────────────────────────────────┐
│ Header Row:                                         │
│   [TICKER BADGE] [FILING BADGE] 📅 Filing Date     │
│                                                     │
│ Title Row:                                          │
│   📄 Image Title                                    │
│                                                     │
│ Image Container:                                    │
│   ┌─────────────────────────────────────────────┐  │
│   │                                             │  │
│   │         Actual SEC Image                    │  │
│   │         (full width)                        │  │
│   │                                             │  │
│   └─────────────────────────────────────────────┘  │
│                                                     │
│ Context Text:                                       │
│   Brief description or excerpt from filing...      │
│   (truncated to 3 lines)                           │
│                                                     │
│ Action Link:                                        │
│   View Full Filing →                               │
│                                                     │
│ Attribution:                                        │
│   SEC Filing Image                                 │
└─────────────────────────────────────────────────────┘
```

## Color & Style Guide

### Badges
```
Ticker Badge:
  - Background: Gradient from #8B5CF6 to rgba(139, 92, 246, 0.8)
  - Text: White
  - Border: None
  - Shadow: Small drop shadow
  - Size: text-xs

Filing Type Badge:
  - Background: Transparent
  - Text: Green (#10B981)
  - Border: 1px solid green
  - Size: text-xs
```

### Image Container
```
Container:
  - Background: White (dark: muted/20)
  - Border: 1px solid border/50
  - Border Radius: 8px (rounded-lg)
  - Overflow: hidden
  
Image:
  - Width: 100%
  - Height: auto
  - Loading: lazy
```

### Typography
```
Title:
  - Font: Semibold
  - Size: text-sm
  - Icon: FileText (4x4, ai-accent color)

Context:
  - Font: Regular
  - Size: text-xs
  - Color: muted-foreground
  - Lines: max 3 (line-clamp-3)

Link:
  - Font: Medium
  - Size: text-xs
  - Color: ai-accent
  - Hover: ai-accent/80
  - Icon: ExternalLink (3x3)

Attribution:
  - Font: Regular
  - Size: 10px
  - Color: muted-foreground/60
```

## Hover States

### Card Hover
```
Default → Hover:
  - Scale: 1 → 1.01
  - Y Position: 0 → -2px
  - Border: border/50 → ai-accent/30
  - Shadow: md → lg
  - Duration: 0.2s
```

### Link Hover
```
Default → Hover:
  - Color: ai-accent → ai-accent/80
  - Text Decoration: none → underline
```

## Responsive Behavior

### Desktop (> 1024px)
```
- Card width: Matches chat container
- Image: Full width of card
- All elements visible
```

### Tablet (640px - 1024px)
```
- Card width: Adapts to container
- Image: Full width of card
- Text wrapping enabled
```

### Mobile (< 640px)
```
- Card width: Full width
- Image: Full width with aspect ratio preserved
- Context: Truncated more aggressively
- Badges: May wrap to multiple lines
```

## Dark Mode Differences

### Light Mode
```
Card Background: white → muted/20 gradient
Image Container: white background
Text: foreground (near black)
Borders: gray-200
```

### Dark Mode
```
Card Background: dark → darker gradient
Image Container: muted/20 background (lighter than card)
Text: foreground (near white)
Borders: gray-700
```

## Example Variations

### Minimal Image Card (No Context)
```
┌─────────────────────────────────────┐
│ [TSLA] [10-Q] 📅 09/30/2024        │
│                                     │
│ 📄 Revenue by Segment               │
│                                     │
│ [Image]                             │
│                                     │
│ View Full Filing →                 │
│                                     │
│ SEC Filing Image                   │
└─────────────────────────────────────┘
```

### Full Image Card (With All Fields)
```
┌─────────────────────────────────────┐
│ [AMZN] [10-K] 📅 12/31/2024        │
│                                     │
│ 📄 Global Infrastructure Map        │
│                                     │
│ [Image]                             │
│                                     │
│ The following map shows our         │
│ distribution centers and data       │
│ centers worldwide as of...          │
│                                     │
│ View Full Filing →                 │
│                                     │
│ SEC Filing Image                   │
└─────────────────────────────────────┘
```

### Multiple Image Cards
```
Message:
  "Amazon's infrastructure has grown significantly..."

Cards:
  [Stock Card: AMZN]
  [Image Card: Global Infrastructure Map]
  [Image Card: Revenue Growth Chart]
  [Image Card: Employee Distribution]
```

## Implementation Notes

### Image Loading States
```typescript
// Show skeleton while loading
<div className="animate-pulse bg-muted h-48" />

// Show image when loaded
<img 
  src={imageUrl}
  onLoad={() => setLoaded(true)}
  className={loaded ? 'opacity-100' : 'opacity-0'}
/>
```

### Error Fallback
```typescript
<img 
  src={imageUrl}
  onError={(e) => {
    e.currentTarget.src = '/placeholder.png';
    console.error('Failed to load SEC image');
  }}
/>
```

### Accessibility
```typescript
<img 
  src={imageUrl}
  alt={`${title} from ${ticker} ${filingType} filing`}
  role="img"
  aria-label={title}
/>
```

## PDF Export Format

```
💬 User: What's MNMD's product pipeline?

🤖 Catalyst AI

💭 Thinking Process:
• Found pipeline diagram in recent 10-K filing
• Analyzing development stages

MNMD has a diverse pipeline of psychedelic medicine
candidates targeting various mental health conditions...

🖼️ MNMD - Product Candidate Pipeline (10-K)
   View: https://www.sec.gov/Archives/edgar/data/...

📊 MNMD: $2.45 (+6.5%)
```

## Performance Considerations

### Optimization Checklist
- ✅ Lazy loading enabled
- ✅ Images from SEC CDN (no bandwidth cost)
- ✅ No image transformations (preserve original)
- ✅ Context text truncated (reduce payload)
- ✅ Hover effects use GPU acceleration (transform)
- ✅ Loading states prevent layout shift

### Metrics
```
Typical Image Card:
  - HTML Size: ~500 bytes
  - Image Size: 20-200 KB (from SEC)
  - Render Time: <50ms
  - First Paint: Immediate (skeleton)
  - Image Load: 200-500ms (network dependent)
```
