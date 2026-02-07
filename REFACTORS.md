# Refactoring Opportunities

A prioritized list of refactoring opportunities to improve code simplicity, readability, and maintainability.

---

## 8. Create Shared Hooks Directory

**Priority**: Low
**Impact**: Reduces duplication, improves reusability

Custom hooks are scattered. Create `/src/hooks/`:

- `useLocalStorage`
- `usePlatform`
- `useWindowEvent`
- `useOnboardingFlow`

---

## 9. Add React Error Boundary

**Priority**: Low
**Impact**: Better error recovery for users

No error boundaries exist - crashes propagate to user.

**Fix**: Add `ErrorBoundary` component wrapping main app sections.

---

## Verification After Each Refactor

1. Run `pnpm run build` to verify TypeScript compilation
2. Run the app to verify functionality
3. Test key flows: profile switching, layer editing, kanata start/stop
