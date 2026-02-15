# Mobile Testing Checklist

## Overview
This checklist ensures VTrustX provides an optimal experience across mobile devices and viewports. Test against multiple device sizes and orientations to catch responsive issues early.

---

## Test Devices/Viewports

### Priority Devices
- [ ] **iPhone 14 Pro** (390x844) - iOS Safari
- [ ] **Samsung Galaxy S21** (360x800) - Chrome Android
- [ ] **iPad Air** (820x1180) - Safari iPad

### Additional Testing
- [ ] **Desktop** (1920x1080) - Baseline
- [ ] **Small tablet** (768x1024) - Landscape/Portrait
- [ ] **Large phone** (414x896) - iPhone Pro Max equivalent

---

## Layout Verification

### General Layout
- [ ] All touch targets are ≥44x44px (WCAG 2.5.5 requirement)
- [ ] No horizontal scroll on body (only within table containers)
- [ ] Text is readable at minimum 16px font size
- [ ] Cards and containers stack vertically on mobile (<768px)
- [ ] Buttons are full-width or appropriately sized on mobile
- [ ] Images scale responsively without breaking layout
- [ ] Content remains centered and properly aligned
- [ ] White space/padding scales appropriately

### Navigation
- [ ] Bottom navigation visible on mobile (<768px)
- [ ] Sidebar hidden with hamburger menu on mobile
- [ ] Hamburger menu opens/closes smoothly
- [ ] All navigation items accessible in mobile menu
- [ ] Active navigation state clearly visible
- [ ] Back buttons work correctly on mobile views

### Tables
- [ ] Tables scroll horizontally (not causing body scroll)
- [ ] Table containers have `-webkit-overflow-scrolling: touch`
- [ ] Table headers remain visible while scrolling (if sticky)
- [ ] Row actions (edit, delete) are touch-friendly
- [ ] Empty table states display properly
- [ ] Pagination controls are touch-friendly

### Forms
- [ ] Forms stack vertically on mobile
- [ ] All input fields have proper touch targets (≥44px)
- [ ] Labels are clearly associated with inputs
- [ ] Error messages display without breaking layout
- [ ] Submit buttons are full-width on mobile
- [ ] Dropdowns/selects are touch-friendly
- [ ] Date pickers work on mobile devices
- [ ] File upload works on mobile browsers
- [ ] Multi-step forms indicate progress clearly

### Modals & Dialogs
- [ ] Modals are full-screen on mobile
- [ ] Close button is easily accessible (top-right)
- [ ] Modal content scrolls if needed
- [ ] Backdrop prevents interaction with background
- [ ] Confirmation dialogs are clear and actionable

### Cards & Dashboards
- [ ] Dashboard cards stack on mobile
- [ ] Card content remains readable when stacked
- [ ] Charts/graphs scale to mobile width
- [ ] Metric cards show all important info
- [ ] Empty states display properly on mobile

---

## Interaction Testing

### Touch Interactions
- [ ] All buttons respond to touch correctly
- [ ] No accidental double-tap zoom on buttons
- [ ] Swipe gestures work if implemented
- [ ] Pull-to-refresh works if implemented
- [ ] Long-press doesn't trigger unintended actions
- [ ] Drag-and-drop works on touch devices (if applicable)

### Navigation
- [ ] Hamburger menu toggles correctly
- [ ] Bottom nav navigation works
- [ ] Tab navigation switches views
- [ ] Back button behavior is correct
- [ ] Deep links work on mobile browsers
- [ ] External links open in new tab

### Forms & Input
- [ ] Keyboard appears for text inputs
- [ ] Number keyboard appears for number inputs
- [ ] Email keyboard appears for email inputs
- [ ] Date picker is mobile-friendly
- [ ] Autocomplete suggestions work
- [ ] Form validation shows on blur/submit
- [ ] Submit buttons disable during submission

### Tables
- [ ] Tables swipe to scroll horizontally
- [ ] Row actions (edit, delete) work on touch
- [ ] Sorting works on mobile
- [ ] Filtering works on mobile
- [ ] Pagination works on mobile

### Modals & Overlays
- [ ] Modals open/close smoothly
- [ ] Backdrop dismiss works
- [ ] Confirm dialogs respond to touch
- [ ] Toasts/notifications are visible
- [ ] Loading spinners display correctly

---

## Performance Testing

### Load Time
- [ ] Pages load in <3 seconds on 3G
- [ ] Images load progressively
- [ ] Critical content visible quickly (above fold)
- [ ] No blocking JavaScript on load

### Responsiveness
- [ ] UI responds to touch within 100ms
- [ ] Scrolling is smooth (60fps)
- [ ] Animations don't lag
- [ ] Form submission is responsive
- [ ] No janky transitions

### Battery & Data
- [ ] App doesn't drain battery excessively
- [ ] Images are optimized for mobile
- [ ] API calls are minimized
- [ ] Unnecessary polling is avoided

---

## Orientation Testing

### Portrait Mode
- [ ] Layout adapts correctly
- [ ] Navigation is accessible
- [ ] Content is readable
- [ ] Forms are usable

### Landscape Mode
- [ ] Layout uses horizontal space effectively
- [ ] Bottom nav hidden (uses side nav if applicable)
- [ ] Forms remain usable
- [ ] Modals don't overflow screen

---

## Browser-Specific Testing

### iOS Safari
- [ ] Inputs don't zoom on focus (font-size ≥16px)
- [ ] Fixed positioning works correctly
- [ ] Overflow scrolling works (momentum scrolling)
- [ ] Date pickers are native iOS style
- [ ] File upload works

### Chrome Android
- [ ] Material design elements render correctly
- [ ] Pull-to-refresh doesn't conflict with app
- [ ] Overflow menu accessible
- [ ] Navigation bar doesn't cover content
- [ ] Back button behavior is correct

### Samsung Internet
- [ ] All features work as expected
- [ ] No Samsung-specific rendering issues
- [ ] Touch interactions work smoothly

---

## Accessibility on Mobile

### Screen Readers
- [ ] VoiceOver (iOS) can navigate all content
- [ ] TalkBack (Android) can navigate all content
- [ ] Form labels are properly announced
- [ ] Buttons have descriptive labels
- [ ] Loading states are announced

### Zoom & Magnification
- [ ] Text remains readable when zoomed 200%
- [ ] Layout doesn't break when zoomed
- [ ] Pinch-to-zoom works (not disabled)
- [ ] Interactive elements remain accessible when zoomed

### Color & Contrast
- [ ] Text has sufficient contrast on mobile
- [ ] Dark mode works correctly (if supported)
- [ ] Color isn't sole indicator of state

---

## Common Issues Checklist

### Layout Issues
- [ ] No horizontal scroll on body
- [ ] Content doesn't overflow containers
- [ ] Text wraps correctly
- [ ] Images scale proportionally
- [ ] Fixed elements don't cover content

### Touch Issues
- [ ] Touch targets aren't too small (<44px)
- [ ] Touch targets aren't too close together
- [ ] Accidental touches minimized
- [ ] Double-tap zoom doesn't interfere

### Performance Issues
- [ ] No layout shift during load
- [ ] Images load efficiently
- [ ] Animations are smooth
- [ ] No memory leaks

---

## Testing Tools

### Browser DevTools
- **Chrome DevTools**: Device toolbar (Cmd/Ctrl + Shift + M)
- **Firefox DevTools**: Responsive Design Mode (Cmd/Ctrl + Shift + M)
- **Safari DevTools**: Enter Responsive Design Mode

### Mobile Testing Apps
- **BrowserStack**: Test on real devices remotely
- **LambdaTest**: Cross-browser mobile testing
- **Sauce Labs**: Automated mobile testing

### Accessibility Tools
- **axe DevTools**: Automated accessibility testing
- **VoiceOver**: iOS screen reader testing
- **TalkBack**: Android screen reader testing

---

## Testing Workflow

1. **Desktop First**: Verify feature works on desktop
2. **Responsive Preview**: Test in browser dev tools (all breakpoints)
3. **Real Device Testing**: Test on actual mobile devices
4. **Orientation Testing**: Test portrait and landscape modes
5. **Touch Testing**: Verify all touch interactions
6. **Performance Testing**: Check load times and responsiveness
7. **Accessibility Testing**: Test with screen readers and zoom
8. **Cross-Browser**: Test on iOS Safari, Chrome Android, Samsung Internet

---

## Breakpoints Reference

VTrustX uses the following breakpoints (from `responsive.css`):

```css
/* Mobile */
@media (max-width: 480px) { }

/* Small tablet */
@media (max-width: 768px) { }

/* Tablet */
@media (max-width: 1024px) { }

/* Desktop */
@media (min-width: 1025px) { }

/* Large desktop */
@media (min-width: 1440px) { }
```

---

## Sign-off

### Tested By: _________________
### Date: _________________
### Device(s) Used: _________________
### Issues Found: _________________

**Pass Criteria**: All critical items checked, no blocking issues.
