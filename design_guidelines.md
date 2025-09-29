# QR Code Generator - Design Guidelines

## Design Approach
**Selected Approach:** Design System (Material Design-inspired)
**Justification:** Utility-focused mobile app requiring clear navigation, form interactions, and step-by-step workflow. Prioritizes usability and accessibility over visual differentiation.

## Core Design Elements

### Color Palette
**Light Mode:**
- Primary: 219 91% 60% (Modern blue for buttons and active states)
- Surface: 0 0% 98% (Off-white backgrounds)
- Text Primary: 222 84% 5% (Near-black for readability)
- Text Secondary: 215 16% 47% (Medium gray for labels)
- Border: 214 32% 91% (Light gray borders)
- Success: 142 76% 36% (Green for validation)
- Error: 0 84% 60% (Red for errors)

**Dark Mode:**
- Primary: 219 91% 60% (Same blue, works in dark)
- Surface: 222 84% 5% (Dark background)
- Text Primary: 210 40% 98% (Near-white)
- Text Secondary: 215 16% 65% (Light gray)
- Border: 217 19% 27% (Dark gray borders)

### Typography
**Font Family:** Inter (Google Fonts)
- **Headings:** 600 weight, sizes 24px-32px
- **Body:** 400 weight, 16px base
- **Labels:** 500 weight, 14px
- **Buttons:** 500 weight, 16px

### Layout System
**Spacing Units:** Tailwind classes p-4, p-6, p-8 for consistent rhythm
- Container: max-width 400px on mobile, centered
- Section spacing: mb-8 between major sections
- Component spacing: mb-4 between form elements
- Button spacing: mt-6 for primary actions

### Component Library

**Navigation:**
- Step indicator at top showing progress (1/4, 2/4, etc.)
- Back button (arrow) in top-left on steps 2-4
- Minimal header with app title

**Buttons:**
- Primary: Full-width rounded-lg with primary color
- Secondary: Outline style with border
- Height: 48px minimum for touch targets
- Loading states with subtle spinner

**Form Elements:**
- Input fields: 48px height, rounded borders
- Upload area: Dashed border, 120px height, centered icon
- URL validation with real-time feedback
- Error states with red border and message

**QR Model Selection:**
- Grid layout: 2 columns on mobile
- Each option: 80px square preview with label
- Selected state: primary border, checkmark overlay
- Options: Classic, Rounded corners, Logo center, Gradient

**QR Code Display:**
- Centered 280px square on mobile
- White background with subtle shadow
- Download and share buttons below

### Page-Specific Guidelines

**Page 1 - Model Selection:**
- Hero section with app title and subtitle
- Grid of 4-6 QR style options
- Large Continue button at bottom

**Page 2 - Image Upload:**
- Upload dropzone with "Tap to upload" text
- Image preview (120px) when uploaded
- File type validation (.png, .jpg, .svg)

**Page 3 - URL Input:**
- Large URL input field
- Real-time validation indicator
- Example placeholder: "https://example.com"

**Page 4 - Generated QR:**
- QR code prominently displayed
- Share button with native sharing API
- Option to "Generate Another"

### Interactions
- **Loading states:** Subtle spinners, no skeleton screens
- **Transitions:** 200ms ease-in-out between steps
- **Touch targets:** Minimum 44px for all interactive elements
- **Haptic feedback:** On successful actions (mobile)

### Accessibility
- High contrast ratios (4.5:1 minimum)
- Screen reader labels for all form elements
- Keyboard navigation support
- Focus indicators on all interactive elements
- Error messages announced to screen readers

## Images
No large hero images required. Small preview thumbnails for QR style selection (80px squares showing different QR code styles). Upload preview shows user's uploaded image at 120px square. Generated QR codes display at 280px for mobile viewing.