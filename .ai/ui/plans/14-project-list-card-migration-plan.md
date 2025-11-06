# Card-Based List Migration Implementation Plan

## 1. Overview

This implementation plan outlines a generic migration strategy from table-based layouts to modern card-based list layouts. The pattern improves mobile user experience, provides better visual appeal, and creates reusable generic components that can be applied across any feature in the application.

**Key Objectives:**

- Create two generic, reusable components: `CardList` and `CardItem`
- Provide a migration pattern for converting table-based lists to card-based layouts
- Maintain all existing functionality: navigation, edit/delete actions, pagination, and empty states
- Improve mobile responsiveness and visual design
- Follow established design patterns using Shadcn UI and Tailwind CSS

**User Value:**

- Enhanced mobile experience with card layouts that are easier to interact with on touch devices
- Better visual hierarchy and information density
- Improved accessibility with semantic HTML structure
- Consistent design language across the application

**Technical Scope:**

- Create generic `CardList` and `CardItem` components in `src/shared/components/`
- Provide migration pattern for any table-based list component
- Remove old table implementations and update all references
- Update documentation and implementation plans

## 2. Current Implementation Analysis

### Example: Table-Based List Component

This implementation plan can be applied to migrate any table-based list component to a card-based layout. As an example, consider a typical table-based list implementation:

```typescript
// Example: src/features/example/components/ExampleTable.tsx
interface ExampleTableProps {
  onCreateClick: () => void;
  onDeleteClick: (item: ExampleItem) => void;
  onEditClick: (item: ExampleItem) => void;
}
```

**Typical Table Features:**

- **Data Display**: Shows item name, metadata, and metrics in tabular columns
- **Actions**: Dropdown menu with Edit/Delete actions (MoreVertical icon)
- **Navigation**: Row clicks navigate to detail views
- **Pagination**: Previous/Next buttons with page info display
- **Empty State**: Custom empty state with create action button
- **Responsive**: Hides text labels on smaller screens

**Typical Table Styling:**

- Uses Shadcn Table components with standard table styling
- Table cells with right-aligned numeric data
- Code styling for identifiers or metadata
- Muted text for secondary information

### KPICard Styling Reference

The reference styling from `TelemetryKPIs.tsx` provides the design pattern:

```typescript
// Styling pattern to follow
<div className="bg-card text-card-foreground rounded-lg border p-6 shadow-sm">
  <div className="flex items-center justify-between">
    <div>
      <p className="muted-foreground text-sm font-medium">{title}</p>
      <p className="text-2xl font-bold">{value}</p>
      <p className="muted-foreground mt-1 text-xs">{description}</p>
    </div>
  </div>
</div>
```

**Key Styling Elements:**

- `bg-card text-card-foreground` for theme-aware colors
- `rounded-lg border p-6 shadow-sm` for card appearance
- Clean typography hierarchy with title, value, and description

## 3. Component Structure

```markdown
FeatureListPage (main route component - example)
├── HeaderSection (title, description - existing)
├── CardList (new generic component)
│ ├── CardListHeader (optional title/description + action button)
│ ├── CardItem[] (feature-specific cards)
│ │ ├── CardContent (feature information layout)
│ │ └── CardActions (edit/delete buttons via content projection)
│ └── CardListPagination (existing pagination logic)
├── EmptyState (existing empty state adapted)
└── ActionDialogs (existing create/edit/delete dialogs)
```

**New Generic Components:**

- `CardList`: Reusable container for card-based lists
- `CardItem`: Reusable individual card component with content projection

## 4. Component Details

### CardList Component

**Location**: `src/shared/components/CardList.tsx`

**Purpose**: Generic container component for displaying lists of cards with optional header and pagination.

**Component Interface:**

- `title?: string` - Optional page title
- `description?: string` - Optional page description
- `actionButton?: React.ReactNode` - Optional primary action button
- `pagination?: { metadata, params, onPageChange }` - Pagination configuration using shared types
- `emptyState?: React.ReactNode` - Empty state display when no children
- `children: React.ReactNode` - Card item components
- `className?: string` - Additional CSS classes

**Features:**

- **Optional Header**: Displays `<h1>` title and `<p>` description when provided
- **Action Button**: Conditionally shows action button (e.g., "Create Project") via content projection
- **Content Projection**: Renders child `CardItem` components
- **Pagination**: Integrated pagination using Shadcn UI Pagination component with `PaginationParams` and `PaginationMetadata` types
- **Empty State**: Optional empty state display
- **Responsive**: Full-width layout with proper spacing

**Styling**: Uses flexbox layout with gap spacing, responsive grid fallback for very small screens.

### CardItem Component

**Location**: `src/shared/components/CardItem.tsx`

**Purpose**: Generic card component equivalent to table rows, with content projection for actions and click handling.

```typescript
interface CardItemProps {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  actions?: React.ReactNode;
}
```

**Features:**

- **Full Width**: Expands to fill container width like table rows
- **Hover Effects**: Subtle background change on hover for interactivity
- **Click Handling**: Triggers navigation (equivalent to table row clicks)
- **Content Projection**: Uses `children` for main content layout
- **Action Projection**: `actions` prop for right-aligned edit/delete buttons
- **Responsive**: Adapts to different screen sizes

**Styling**: Follows KPICard pattern with `bg-card text-card-foreground rounded-lg border p-6 shadow-sm`

### Example: Feature List Page Integration

**Changes to feature list page (example pattern):**

- Replace table component import with `CardList` and `CardItem`
- Remove table-specific logic
- Adapt existing handlers for card-based interactions
- Maintain all dialog management logic

## 5. Migration Strategy

### Phase 1: Component Creation (Generic Components)

1. **Create CardList Component**
   - Implement basic structure with optional header
   - Add action button content projection
   - Add pagination support
   - Add empty state support
   - Style with responsive layout

2. **Create CardItem Component**
   - Implement card structure following KPICard styling
   - Add hover effects and click handling
   - Add actions content projection
   - Ensure proper spacing and typography

### Phase 2: Feature List Migration (Example)

1. **Update Feature List Page**
   - Replace table component with CardList/CardItem
   - Adapt existing props and handlers
   - Update data-testid attributes
   - Test navigation and dialog interactions

2. **Create Feature Card Content**
   - Design card layout for feature-specific information
   - Map table columns to card content sections
   - Implement responsive content distribution
   - Add action buttons via content projection

### Phase 3: Cleanup and Testing

1. **Remove Old Implementation**
   - Delete old table component
   - Remove table imports and references
   - Update barrel exports
   - Clean up unused imports

2. **Comprehensive Testing**
   - Test all existing functionality
   - Verify responsive behavior
   - Check accessibility compliance
   - Validate TypeScript types

## 6. Implementation Steps

### Prerequisites

**Install Shadcn UI Pagination Component:**

```bash
npx shadcn@latest add pagination
```

This will install the pagination components to `src/shared/ui/pagination.tsx` and add the necessary dependencies.

### Step 1: Create Generic CardList Component

**Implementation Approach:**

- Create the component in `src/shared/components/CardList.tsx`
- Import Shadcn UI Pagination components and shared types
- Implement conditional header rendering with title and description
- Add action button support positioned right-aligned in header
- Implement pagination using Shadcn UI components with proper page calculation from offset/limit
- Add empty state rendering when no children are provided
- Ensure responsive layout with proper spacing and alignment

**Pagination Implementation:**

- Calculate current page from `offset / limit + 1`
- Calculate total pages from `total / limit`
- Handle Previous/Next button states based on current position
- Render page numbers with ellipsis for large page ranges (>7 pages)
- Use `onPageChange` callback to update parent component's pagination state
- Maintain proper accessibility with ARIA labels and keyboard navigation

### Step 2: Create Generic CardItem Component

**Implementation Approach:**

- Create the component in `src/shared/components/CardItem.tsx`
- Use the same styling pattern as KPICard component (`bg-card text-card-foreground rounded-lg border p-6 shadow-sm`)
- Implement click handling with proper event delegation
- Add hover effects for better user feedback
- Position actions (buttons) on the right side using content projection
- Ensure responsive layout that works on all screen sizes
- Add proper cursor styling for clickable cards

### Step 3: Create Feature Card Layout (Example)

**Implementation Approach:**

- Create feature-specific card component (e.g., `ProjectCard`, `KeyCard`)
- Map existing table columns to card content sections
- Use CardItem as the wrapper component
- Implement proper content hierarchy: primary info, secondary metadata, metrics
- Add action buttons (Edit/Delete) positioned on the right
- Ensure navigation on card click (excluding action buttons)
- Maintain responsive design for mobile and desktop

### Step 4: Update Feature List Page (Example)

**Implementation Approach:**

- Replace existing table component import with CardList and CardItem
- Update the page component to use the new card-based layout
- Connect pagination props: metadata from API, current params state, and page change handler
- Map existing data to feature-specific card components
- Preserve all existing functionality: create actions, edit/delete dialogs, navigation
- Maintain proper loading states and error handling

### Step 5: Preserve Existing Functionality

- **Navigation**: Card clicks navigate to detail views
- **Actions**: Edit/Delete buttons trigger existing dialogs
- **Pagination**: Previous/Next buttons with page information
- **Empty State**: Custom empty state with create button
- **Loading States**: Integration with existing loading logic

### Step 6: Responsive Design Implementation

**Mobile (< 640px):**

- Single column card layout
- Stacked content within cards
- Touch-friendly action buttons

**Tablet (640px - 1024px):**

- Two-column grid layout
- Balanced content distribution
- Optimized button placement

**Desktop (> 1024px):**

- Full-width cards
- Multi-line content layout
- Efficient space utilization

### Step 7: Accessibility Enhancements

- **Semantic HTML**: Proper heading hierarchy and landmark roles
- **Keyboard Navigation**: Tab order through cards and actions
- **Screen Reader**: Descriptive labels and status announcements
- **Focus Management**: Visible focus indicators and logical tab order
- **ARIA Labels**: Action button descriptions and card navigation

## 7. Testing Strategy

### Unit Tests

**CardList Component Tests:**

- Header rendering with/without title and description
- Action button conditional display
- Children rendering and layout
- Empty state display
- Pagination positioning

**CardItem Component Tests:**

- Card styling and layout
- Hover effects application
- Click handler execution
- Actions content projection
- Responsive behavior

**FeatureCard Component Tests:**

- Data display accuracy
- Action button functionality
- Navigation handling
- Responsive layout

### Integration Tests

**Feature List Page Integration:**

- Full page rendering with CardList
- Data fetching and display
- Dialog interactions
- Navigation behavior
- Pagination functionality

**Cross-Component Interactions:**

- Card clicks and navigation
- Action button triggers
- Dialog state management
- Form submissions

### End-to-End Tests

**User Journey Tests:**

- Project list loading and display
- Card navigation to project details
- Create project workflow
- Edit project workflow
- Delete project workflow
- Pagination interaction

**Responsive Tests:**

- Mobile card interactions
- Tablet layout verification
- Desktop layout optimization

### Accessibility Testing

**Screen Reader Tests:**

- Card content announcement
- Action button descriptions
- Navigation feedback
- Form dialog accessibility

**Keyboard Navigation Tests:**

- Tab order through cards
- Enter/Space activation
- Escape dialog closure
- Arrow key navigation

## 8. Accessibility

### ARIA Implementation

**CardList Component:**

- `role="main"` for primary content areas
- Proper heading hierarchy (h1, h2)
- `aria-label` for action buttons
- `aria-live` for dynamic content updates

**CardItem Component:**

- `role="button"` for clickable cards
- `aria-label` describing card content and actions
- `aria-describedby` linking to detailed information
- Keyboard event handling (Enter, Space)

**FeatureCard Content:**

- Semantic structure with proper headings
- Descriptive button labels
- Status information accessibility
- Form control associations

### Keyboard Navigation

**Card Navigation:**

- Tab through individual cards
- Enter/Space to activate card navigation
- Arrow keys for card-to-card navigation
- Logical tab order preservation

**Action Buttons:**

- Tab to action buttons within cards
- Enter/Space activation
- Proper focus management
- Visual focus indicators

### Screen Reader Support

**Content Announcements:**

- Card content read in logical order
- Action availability announced
- Status changes communicated
- Error states described

**Navigation Feedback:**

- Current location announcements
- Action result feedback
- Loading state announcements
- Page change notifications

### Focus Management

**Dialog Interactions:**

- Focus trapping in modal dialogs
- Focus restoration after dialog close
- Initial focus on primary action
- Logical tab order within dialogs

**Page Navigation:**

- Skip links for main navigation
- Focus indicators following design system
- Consistent focus behavior across components

## 9. Migration and Cleanup

### Files Created

- `src/shared/components/CardList.tsx` - Generic card list container
- `src/shared/components/CardItem.tsx` - Generic card item component
- `src/features/[feature]/components/[Feature]Card.tsx` - Feature-specific card layout

### Files Modified

- `src/features/[feature]/routes/[Feature]ListPage.tsx` - Replace table with cards
- `src/shared/components/index.ts` - Export new CardList and CardItem components

### Files Removed

- `src/features/[feature]/components/tables/[Feature]Table.tsx` - Old table implementation

### Code Cleanup

**Import Updates:**

- Remove Table-related imports from feature list page
- Update component barrel exports
- Clean up unused type imports

**Reference Updates:**

- Update any documentation referencing old table component
- Remove table-specific styling or configurations
- Update test file references

**Documentation Updates:**

- Update `.ai/ui/plans/5-project-list-view-implementation-plan.md`
- Update component documentation in code comments
- Update README and architecture documentation
- Update API documentation if affected

### Migration Checklist

- [ ] Generic CardList component created and tested
- [ ] Generic CardItem component created and tested
- [ ] FeatureCard component implements table functionality
- [ ] Feature list page updated to use card components
- [ ] All existing functionality preserved (navigation, actions, pagination)
- [ ] Responsive design verified across breakpoints
- [ ] Accessibility compliance verified
- [ ] Unit tests added for new components
- [ ] Integration tests updated and passing
- [ ] Old table component removed
- [ ] All references to old component cleaned up
- [ ] Documentation updated in `.ai/` folder
- [ ] Component exports updated in barrel files
- [ ] TypeScript compilation successful
- [ ] Linting and formatting applied

### Rollback Plan

If issues arise during migration:

1. **Component-Level Rollback**: Temporarily revert feature list page to use old table component
2. **Feature Flags**: Implement feature flag to toggle between table and card layouts
3. **Gradual Migration**: Migrate one section at a time with testing between steps
4. **Backup Creation**: Maintain backup of old table component during transition

### Success Criteria Verification

- [ ] Card list visually replaces table while maintaining all functionality
- [ ] Generic components can be reused across other features
- [ ] Improved mobile experience and modern UI appearance
- [ ] All existing tests pass and new tests added
- [ ] Documentation fully updated to reflect changes
- [ ] No references to old table implementation remain in codebase
- [ ] Accessibility score maintained or improved
- [ ] Performance benchmarks met or exceeded
- [ ] User acceptance testing completed successfully
