# Cleanup Plan for Unused Component Files

## Files Safe to Delete (Unused/Old Versions)

Based on analysis of imports in `App.tsx` and `main-app.tsx`, these files can be safely removed:

### Catalyst Timeline Files
- ❌ `components/catalyst-timeline-clean.tsx` (not imported anywhere)

### Dashboard Files  
- ❌ `components/dashboard.tsx` (old version)
- ❌ `components/dashboard-updated.tsx` (old version)  
- ❌ `components/dashboard-with-events.tsx` (old version)
- ❌ `components/dashboard-with-events-fixed.tsx` (old version)

### Focus Stocks Files
- ❌ `components/focus-stocks-list-simple.tsx` (not imported anywhere)

### Onboarding Files
- ❌ `components/onboarding-screen.tsx` (old version)

## Files to Keep (Currently Used)

### Active Components
- ✅ `components/catalyst-timeline.tsx` (imported in dashboard-with-events-clean.tsx line 11)
- ✅ `components/dashboard-with-events-clean.tsx` (imported in main-app.tsx line 2)
- ✅ `components/focus-stocks-list.tsx` (imported in dashboard-with-events-clean.tsx line 14)  
- ✅ `components/onboarding-screen-fixed.tsx` (imported in App.tsx line 2)

### All Other Components
All other .tsx files in the components folder are actively used by the application.

## Manual Cleanup Required

Since I cannot directly delete files, you'll need to manually remove the files marked with ❌ from your project.

## Additional Cleanup

You can also remove:
- ❌ `temp-dashboard-cleanup.md` 
- ❌ `temp-end.txt`
- ❌ Any other temp files

This will clean up your components folder and remove the confusion between old and new versions.