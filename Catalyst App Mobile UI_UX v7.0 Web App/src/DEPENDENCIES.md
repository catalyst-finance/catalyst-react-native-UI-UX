# Figma Make Dependencies

This document lists all the code base dependencies used in the Figma Make stock portfolio tracking application.

## Core Framework Dependencies

### Build Tools & Development
- **Vite** (`^5.2.0`) - Fast build tool and dev server
- **TypeScript** (`^5.2.2`) - Type-safe JavaScript
- **@vitejs/plugin-react** (`^4.2.1`) - React plugin for Vite

### React Ecosystem
- **React** (`^18.2.0`) - UI framework
- **React DOM** (`^18.2.0`) - React rendering
- **@types/react** (`^18.2.66`) - TypeScript types for React
- **@types/react-dom** (`^18.2.22`) - TypeScript types for React DOM

## Backend & Database

### Supabase
- **@supabase/supabase-js** (`^2.39.0`) - Supabase client library for:
  - PostgreSQL database queries
  - Real-time subscriptions
  - Authentication
  - Edge Functions
  - Storage

## UI Component Libraries

### Radix UI Primitives
High-quality, accessible component primitives:

- **@radix-ui/react-accordion** (`@1.2.3`)
- **@radix-ui/react-alert-dialog** (`@1.1.6`)
- **@radix-ui/react-aspect-ratio** (`@1.1.2`)
- **@radix-ui/react-avatar** (`@1.1.3`)
- **@radix-ui/react-checkbox** (`@1.1.4`)
- **@radix-ui/react-collapsible** (`@1.1.3`)
- **@radix-ui/react-context-menu** (`@2.2.6`)
- **@radix-ui/react-dialog** (`@1.1.6`)
- **@radix-ui/react-dropdown-menu** (`@2.1.6`)
- **@radix-ui/react-hover-card** (`@1.1.6`)
- **@radix-ui/react-label** (`@2.1.2`)
- **@radix-ui/react-menubar** - Navigation menus
- **@radix-ui/react-navigation-menu** - Navigation components
- **@radix-ui/react-popover** - Popover menus
- **@radix-ui/react-progress** - Progress bars
- **@radix-ui/react-radio-group** - Radio buttons
- **@radix-ui/react-scroll-area** - Custom scrollbars
- **@radix-ui/react-select** - Select dropdowns
- **@radix-ui/react-separator** - Visual separators
- **@radix-ui/react-slider** - Slider inputs
- **@radix-ui/react-slot** (`@1.1.2`) - Composition utility
- **@radix-ui/react-switch** - Toggle switches
- **@radix-ui/react-tabs** - Tab components
- **@radix-ui/react-toast** - Toast notifications
- **@radix-ui/react-toggle** - Toggle buttons
- **@radix-ui/react-toggle-group** - Toggle button groups
- **@radix-ui/react-tooltip** - Tooltips

### Icons
- **lucide-react** (`@0.487.0`) - Icon library with 1000+ icons

### Charts & Data Visualization
- **recharts** - Declarative chart library for React
  - Line charts
  - Area charts
  - Bar charts
  - Reference lines
  - Tooltips

### Animation
- **motion/react** (formerly Framer Motion) - Animation library for:
  - Component animations
  - Page transitions
  - Gesture-based interactions
  - Spring physics animations

### Notifications
- **sonner** (`@2.0.3`) - Toast notification library

### Calendar & Date Pickers
- **react-day-picker** (`@8.10.1`) - Date picker component

### Carousels
- **embla-carousel-react** (`@8.6.0`) - Carousel/slider component

### Drawers/Modals
- **vaul** (`@1.1.2`) - Drawer component library

### Financial Integrations
- **react-plaid-link** - Plaid Link integration for:
  - Bank account connections
  - Investment account data
  - Transaction history

### Theme Management
- **next-themes** (`@0.4.6`) - Dark mode/theme switching

## Utility Libraries

### Styling Utilities
- **class-variance-authority** (`@0.7.1`) - CVA for component variants
- **clsx** - Conditional className utility
- **tailwind-merge** - Merge Tailwind CSS classes intelligently

### CSS Framework
- **Tailwind CSS v4.0** - Utility-first CSS framework
  - Custom design tokens in `/styles/globals.css`
  - Responsive utilities
  - Dark mode support

## API Integration Notes

### External APIs Used (via Backend)
While not direct dependencies, the app integrates with:

1. **Finnhub API** - Real-time stock data
   - Price quotes
   - Company information
   - Market data

2. **Plaid API** - Financial account data
   - Investment holdings
   - Transaction history
   - Account balances

3. **OpenAI API** - AI-powered features
   - Catalyst analysis
   - Event summaries
   - Recommendations

4. **MongoDB** - Document storage
   - Email templates
   - User preferences
   - Analytics data

## Import Pattern

Figma Make uses a special import syntax for versioned packages:

```typescript
// Standard imports (version managed by Figma Make)
import { Button } from './components/ui/button';

// Versioned imports (explicit version)
import { Toaster } from "sonner@2.0.3";
import { ChevronLeft } from "lucide-react@0.487.0";
import * as Accordion from "@radix-ui/react-accordion@1.2.3";
```

This ensures consistent package versions across all environments.

## Browser APIs Used

The application also uses native browser APIs:
- **WebSocket** - Real-time price updates
- **localStorage** - Client-side data persistence
- **IntersectionObserver** - Lazy loading and scroll effects
- **ResizeObserver** - Responsive component sizing
- **Geolocation** (optional) - Location-based features

## Development Tools

### Code Quality
- **ESLint** (implicit) - Code linting
- **Prettier** (recommended) - Code formatting

### Type Checking
- **TypeScript** - Static type checking throughout

## Architecture Notes

### Frontend Stack
```
React 18 + TypeScript
├── Vite (build tool)
├── Tailwind CSS v4 (styling)
├── Radix UI (component primitives)
├── Motion (animations)
├── Recharts (data visualization)
└── Supabase Client (backend connection)
```

### Backend Stack
```
Supabase Edge Functions (Deno runtime)
├── Hono (web framework)
├── PostgreSQL (database)
├── Supabase Auth (authentication)
└── External APIs (Finnhub, Plaid, OpenAI)
```

## Package Management

Figma Make automatically manages package installations. No need to run `npm install` or `yarn install` - packages are resolved and loaded on-demand during build time.

## Version Policy

- **Major versions**: Locked to prevent breaking changes
- **Minor/Patch versions**: Flexible (^) to get updates
- **UI components**: Explicit versioning for consistency
- **Core dependencies**: Conservative updates for stability

## Total Dependency Count

- **Core**: 6 packages
- **UI Components**: 30+ Radix UI primitives
- **Utilities**: 10+ helper libraries
- **Total**: ~50+ direct dependencies

All dependencies are optimized for:
✅ Bundle size efficiency
✅ Tree-shaking support
✅ TypeScript compatibility
✅ Production stability
