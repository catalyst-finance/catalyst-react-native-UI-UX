# Next Steps - Week 2 Implementation

## Immediate Tasks (This Week)

### 1. Complete Base UI Components (2-3 hours)

#### Switch Component
Create `src/components/ui/Switch.tsx`:
- Use React Native's built-in Switch
- Add theme-aware colors
- Match web app styling

#### Avatar Component
Create `src/components/ui/Avatar.tsx`:
- Support image URLs
- Support fallback initials
- Support different sizes
- Add loading state

#### Separator Component
Create `src/components/ui/Separator.tsx`:
- Horizontal and vertical variants
- Theme-aware colors
- Configurable thickness

### 2. Set Up Custom Fonts (1-2 hours)

1. Download Gotham font family (if available)
2. Add fonts to `assets/fonts/` directory
3. Update `app.json` to include fonts
4. Use `expo-font` to load fonts
5. Update design tokens with font family names
6. Test fonts in all components

### 3. Test Current Implementation (1 hour)

Run the app on multiple platforms:
```bash
# iOS Simulator
npm run ios

# Android Emulator
npm run android

# Web Browser
npm run web
```

Test checklist:
- [ ] Navigation works on all platforms
- [ ] Theme toggle works
- [ ] All components render correctly
- [ ] No console errors
- [ ] Dark mode looks good
- [ ] Light mode looks good

### 4. Create Component Examples (2 hours)

Create `src/screens/ComponentShowcaseScreen.tsx`:
- Show all UI components
- Demonstrate variants
- Test interactions
- Useful for development and QA

### 5. Documentation (1 hour)

Update documentation:
- [ ] Add component usage examples to README
- [ ] Document component props
- [ ] Add screenshots to docs
- [ ] Update PROGRESS.md

## Week 3 Preparation

### Research & Planning

1. **Study Victory Native**
   - Read documentation
   - Review examples
   - Understand performance considerations

2. **Analyze Web Chart Implementation**
   - Read `src/components/charts/stock-line-chart.tsx` from web app
   - Understand dual-section design
   - Document all features to port

3. **Plan Chart Architecture**
   - Decide on component structure
   - Plan data flow
   - Design interaction handlers

### Set Up Chart Development Environment

```bash
# Install additional chart dependencies if needed
npm install d3-scale d3-shape d3-array
```

## Common Issues & Solutions

### Issue: NativeWind classes not working
**Solution**: 
1. Restart Metro bundler with cache clear: `npm start -- --clear`
2. Verify `metro.config.js` has NativeWind plugin
3. Check `babel.config.js` has NativeWind preset

### Issue: Navigation not working
**Solution**:
1. Ensure `@react-navigation/native` is installed
2. Check `NavigationContainer` wraps the app
3. Verify screen components are imported correctly

### Issue: Theme not persisting
**Solution**:
1. Check AsyncStorage permissions
2. Verify ThemeContext is wrapping the app
3. Test on physical device (not just simulator)

### Issue: TypeScript errors
**Solution**:
1. Run `npx tsc --noEmit` to see all errors
2. Add missing type definitions
3. Update `tsconfig.json` if needed

## Code Quality Checklist

Before moving to Week 3:
- [ ] All TypeScript errors resolved
- [ ] No console warnings
- [ ] Code follows project conventions
- [ ] Components are properly typed
- [ ] All imports are organized
- [ ] No unused variables or imports
- [ ] Comments added for complex logic
- [ ] README is up to date

## Testing Checklist

- [ ] App runs on iOS
- [ ] App runs on Android
- [ ] App runs on Web
- [ ] Navigation works
- [ ] Theme toggle works
- [ ] All components render
- [ ] No crashes
- [ ] Performance is good (60fps)

## Resources for Week 3

### Victory Native
- [Documentation](https://formidable.com/open-source/victory/docs/native/)
- [Examples](https://github.com/FormidableLabs/victory-native-xl)
- [API Reference](https://formidable.com/open-source/victory/docs/api/)

### React Native Gesture Handler
- [Documentation](https://docs.swmansion.com/react-native-gesture-handler/)
- [Pan Gesture](https://docs.swmansion.com/react-native-gesture-handler/docs/gestures/pan-gesture/)

### React Native Reanimated
- [Documentation](https://docs.swmansion.com/react-native-reanimated/)
- [Worklets](https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/worklets/)

### SVG in React Native
- [react-native-svg](https://github.com/software-mansion/react-native-svg)
- [SVG Tutorial](https://www.w3schools.com/graphics/svg_intro.asp)

## Questions to Answer Before Week 3

1. **Chart Data Format**: What format does Victory Native expect?
2. **Performance**: How to handle 1000+ data points?
3. **Interactions**: How to implement crosshair with gestures?
4. **Animations**: How to animate chart updates?
5. **Responsiveness**: How to handle different screen sizes?

## Week 2 Success Criteria

By end of Week 2, you should have:
- ✅ All base UI components complete
- ✅ Custom fonts loaded
- ✅ Component showcase screen
- ✅ Documentation updated
- ✅ App tested on all platforms
- ✅ No TypeScript errors
- ✅ No console warnings
- ✅ Ready to start chart implementation

## Getting Help

If you get stuck:
1. Check the spec documents in `.kiro/specs/expo-native-conversion/`
2. Review the web app implementation
3. Search Expo/React Native documentation
4. Check GitHub issues for similar problems
5. Ask in Expo Discord community

## Time Estimate

**Week 2 Remaining Work**: 8-10 hours
- Base components: 2-3 hours
- Custom fonts: 1-2 hours
- Testing: 1 hour
- Component showcase: 2 hours
- Documentation: 1 hour
- Buffer: 1-2 hours

**Recommended Schedule**:
- Day 1: Complete base components
- Day 2: Set up custom fonts
- Day 3: Create component showcase
- Day 4: Testing and documentation
- Day 5: Week 3 preparation

Good luck! 🚀
