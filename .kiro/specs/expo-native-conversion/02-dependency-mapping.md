# Dependency Mapping: Web → Native

## Core Dependencies

### Build & Framework
| Web Package | Native Replacement | Notes |
|------------|-------------------|-------|
| vite | expo | Expo handles bundling with Metro |
| react-dom | react-native | Core rendering engine |
| @vitejs/plugin-react-swc | N/A | Not needed with Expo |

### UI Components (Radix UI → Native)
| Web Package | Native Replacement | Complexity |
|------------|-------------------|------------|
| @radix-ui/react-dialog | react-native-modal | Medium |
| @radix-ui/react-dropdown-menu | Custom + react-native-paper | High |
| @radix-ui/react-popover | react-native-popover-view | Medium |
| @radix-ui/react-scroll-area | ScrollView/FlatList | Low |
| @radix-ui/react-select | react-native-picker-select | Medium |
| @radix-ui/react-slider | @react-native-community/slider | Low |
| @radix-ui/react-switch | react-native-switch | Low |
| @radix-ui/react-tabs | react-native-tab-view | Medium |
| @radix-ui/react-tooltip | react-native-tooltip | Low |
| @radix-ui/react-accordion | Custom with Animated | Medium |
| @radix-ui/react-checkbox | expo-checkbox | Low |
| @radix-ui/react-progress | react-native-progress | Low |
| @radix-ui/react-avatar | react-native-elements | Low |

### Charts & Visualization
| Web Package | Native Replacement | Complexity |
|------------|-------------------|------------|
| recharts | victory-native | High |
| N/A | react-native-svg | Required for charts |
| N/A | react-native-chart-kit | Alternative option |

### Styling
| Web Package | Native Replacement | Complexity |
|------------|-------------------|------------|
| tailwindcss | nativewind | Medium |
| class-variance-authority | clsx + custom | Low |
| tailwind-merge | clsx | Low |

### Drag & Drop
| Web Package | Native Replacement | Complexity |
|------------|-------------------|------------|
| react-dnd | react-native-draggable-flatlist | High |
| react-dnd-html5-backend | N/A | Not needed |
| react-dnd-touch-backend | N/A | Built into native |

### Backend & Data
| Web Package | Native Replacement | Complexity |
|------------|-------------------|------------|
| @supabase/supabase-js | @supabase/supabase-js | Low (same) |
| mongodb | mongodb | Low (same) |
| hono | N/A | Server-side only |

### Utilities
| Web Package | Native Replacement | Complexity |
|------------|-------------------|------------|
| lucide-react | react-native-vector-icons | Medium |
| react-hook-form | react-hook-form | Low (same) |
| react-day-picker | @react-native-community/datetimepicker | Medium |
| sonner | react-native-toast-message | Low |
| vaul | react-native-bottom-sheet | Medium |
| cmdk | Custom search | Medium |
| embla-carousel-react | react-native-snap-carousel | Medium |
| next-themes | Custom theme context | Low |
| motion | react-native-reanimated | High |

### Navigation
| Web Package | Native Replacement | Complexity |
|------------|-------------------|------------|
| Custom routing | @react-navigation/native | High |
| N/A | @react-navigation/bottom-tabs | Medium |
| N/A | @react-navigation/stack | Medium |

### Storage
| Web Package | Native Replacement | Complexity |
|------------|-------------------|------------|
| localStorage | @react-native-async-storage/async-storage | Low |

### Platform APIs
| Web API | Native Replacement | Complexity |
|---------|-------------------|------------|
| window | Dimensions, Platform | Low |
| document | N/A | Refactor needed |
| fetch | fetch (same) | Low |
| WebSocket | WebSocket (same) | Low |

## New Dependencies Required

```json
{
  "expo": "~51.0.0",
  "react-native": "0.74.0",
  "nativewind": "^4.0.0",
  "@react-navigation/native": "^6.1.0",
  "@react-navigation/bottom-tabs": "^6.5.0",
  "@react-navigation/stack": "^6.3.0",
  "react-native-svg": "^15.0.0",
  "victory-native": "^37.0.0",
  "@react-native-async-storage/async-storage": "^1.23.0",
  "react-native-reanimated": "^3.10.0",
  "react-native-gesture-handler": "^2.16.0",
  "react-native-safe-area-context": "^4.10.0",
  "react-native-screens": "^3.31.0",
  "react-native-modal": "^13.0.0",
  "react-native-paper": "^5.12.0",
  "react-native-vector-icons": "^10.0.0",
  "react-native-toast-message": "^2.2.0",
  "react-native-bottom-sheet": "^4.6.0",
  "react-native-draggable-flatlist": "^4.0.0",
  "@react-native-community/slider": "^4.5.0",
  "@react-native-community/datetimepicker": "^8.0.0",
  "expo-checkbox": "^3.0.0",
  "react-native-progress": "^5.0.0"
}
```
