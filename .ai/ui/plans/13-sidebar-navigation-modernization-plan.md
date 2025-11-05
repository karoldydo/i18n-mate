# Sidebar Navigation Modernization Implementation Plan

## 1. Overview

The sidebar navigation modernization replaces the header-based navigation system with a modern, responsive sidebar navigation that provides intuitive navigation throughout the i18n-mate application. The new system integrates project-specific navigation (Keys, Locales, Translation Jobs, Telemetry, Export) directly into the sidebar, adds breadcrumb navigation for better orientation, and moves logout functionality from the header user menu to the sidebar footer. This creates a more cohesive and scalable navigation experience that scales better on both desktop and mobile devices.

The modernization addresses several key navigation challenges:

- Modern sidebar with collapsible behavior
- Project-specific navigation groups
- Responsive breadcrumb navigation
- User account menu moved to sidebar footer
- Migration from tab-based to sidebar-based navigation

## 2. Navigation Architecture

### Current Navigation Structure

- **Header Navigation**: `ProtectedLayout.tsx` provides top-level navigation with branding, "Projects" link, and user menu with logout
- **Project Navigation**: `ProjectNavigation.tsx` provides tab-based navigation for project sub-views (Keys, Locales, Translation Jobs, Telemetry)
- **Routing**: React Router v7 with nested routes under `/projects/:projectId/*`
- **Layout**: Two-tier layout system with global header and project-specific tab navigation

### Navigation Challenges

1. **Fragmented Navigation**: Navigation logic splits between header (global) and tabs (project-specific)
2. **Limited Scalability**: Adding new navigation items requires modifying both header and tab components
3. **Mobile Experience**: Header navigation doesn't collapse gracefully on smaller screens
4. **Context Awareness**: Tab navigation only appears on project detail pages, creating navigation discontinuity

### Solution Approach

The sidebar navigation modernization addresses these challenges through:

- Unified navigation in a single sidebar component
- Easy to add new navigation items through the navigation library
- Responsive sidebar with collapsible behavior and mobile overlay
- Consistent navigation context across all pages

## 3. Technical Details

### 3.1 Component Installation and Setup

#### Required shadcn/ui Components

The following shadcn/ui components are required:

```bash
npx shadcn@latest add sidebar
npx shadcn@latest add breadcrumb
npx shadcn@latest add avatar
npx shadcn@latest add separator
npx shadcn@latest add sheet
```

#### Keyboard Shortcut Support

- Cmd/Ctrl + B shortcut support is available through the shadcn sidebar component
- Integrated into the SidebarProvider in App.tsx

### 3.2 Sidebar Provider Architecture

#### SidebarProvider Integration

- **Location**: Integrated in `src/app/App.tsx` using shadcn SidebarProvider
- **Purpose**: Global sidebar state management with context
- **Features**:
  - Toggle state management (open/closed)
  - Keyboard shortcut handling (Cmd/Ctrl + B)
  - Responsive behavior (auto-collapse on mobile)
  - Persistent state across navigation

#### Sidebar Context Interface

The sidebar uses shadcn/ui's built-in SidebarProvider context with standard interface.

### 3.3 Navigation Data Structure

#### Navigation Items

**Location**: `src/shared/lib/navigation.ts`

```typescript
export interface NavigationItem {
  badge?: number | string;
  href: string;
  icon: LucideIcon;
  id: string;
  isActive?: boolean;
  label: string;
}

// Global navigation items
export const GLOBAL_NAVIGATION_ITEMS: NavigationItem[] = [
  {
    href: '/projects',
    icon: Home,
    id: 'projects',
    label: 'Projects',
  },
];

// Project-specific navigation items
export function getProjectNavigationItems(id?: string): NavigationItem[] {
  if (!id) return [];

  return [
    {
      href: `/projects/${id}/keys`,
      icon: Key,
      id: 'keys',
      label: 'Keys',
    },
    {
      href: `/projects/${id}/locales`,
      icon: Languages,
      id: 'locales',
      label: 'Locales',
    },
    {
      href: `/projects/${id}/translation-jobs`,
      icon: FileText,
      id: 'translation-jobs',
      label: 'Translation Jobs',
    },
    {
      href: `/projects/${id}/telemetry`,
      icon: BarChart3,
      id: 'telemetry',
      label: 'Telemetry',
    },
    {
      href: `/projects/${id}/export`,
      icon: Download,
      id: 'export',
      label: 'Export',
    },
  ];
}
```

### 3.4 Active State Management

#### Route-Based Active Detection

**Location**: `src/shared/hooks/useActiveNavigation.ts`

```typescript
export function useActiveNavigation(items: NavigationItem[]): NavigationItem[] {
  const location = useLocation();

  return useMemo(
    () =>
      items.map((item) => ({
        ...item,
        isActive: location.pathname === item.href || location.pathname.startsWith(`${item.href}/`),
      })),
    [items, location.pathname]
  );
}
```

### 3.5 Responsive Design Implementation

#### Breakpoint-Based Behavior

- **Desktop (lg+)**: Sidebar open by default, collapsible with `collapsible="offcanvas"`
- **Tablet (md)**: Sidebar collapsed to icons by default
- **Mobile (sm)**: Sidebar as overlay/drawer, closed by default

#### CSS Custom Properties

Integrated through shadcn/ui sidebar component with custom properties in `src/app/App.tsx`:

```typescript
<SidebarProvider
  style={
    {
      '--header-height': 'calc(var(--spacing) * 12)',
      '--sidebar-width': 'calc(var(--spacing) * 72)',
    } as React.CSSProperties
  }
>
```

## 4. Component Structure

```markdown
App (root) - src/app/App.tsx
├── SidebarProvider (shadcn/ui - global sidebar state)
│ ├── AppSidebar (main sidebar component) - src/shared/components/AppSidebar.tsx
│ │ ├── SidebarHeader (branding/logo with link to projects)
│ │ ├── SidebarContent
│ │ │ ├── AppSidebarGlobalGroup (global navigation) - src/shared/components/AppSidebarGlobalGroup.tsx
│ │ │ └── AppSidebarProjectGroup (project navigation) - src/shared/components/AppSidebarProjectGroup.tsx
│ │ └── SidebarFooter
│ │ └── AppSidebarMenu (user menu/logout) - src/shared/components/AppSidebarMenu.tsx
│ ├── SidebarInset (main content area)
│ │ ├── header (with SidebarTrigger and BreadcrumbNavigation)
│ │ └── main (page content with Outlet)
```

### 4.1 AppSidebar Component

**Location**: `src/shared/components/AppSidebar.tsx`

- **Component description**: Main sidebar component containing all navigation elements
- **Main elements**: Header with branding, navigation groups, and footer with user menu
- **Handled interactions**: Navigation item clicks, logout action
- **Handled validation**: Active state calculation via hooks
- **Types**: ComponentProps<typeof Sidebar>
- **Props**: Forwarded to shadcn Sidebar component

#### SidebarHeader Sub-component

- **Component description**: Branding section with logo and app name
- **Main elements**: Logo icon ("i18n") and "i18n-mate" text with link to projects
- **Handled interactions**: Click to navigate to projects (home)
- **Props**: None

#### AppSidebarGlobalGroup Sub-component

**Location**: `src/shared/components/AppSidebarGlobalGroup.tsx`

- **Component description**: Global navigation group for app-wide navigation
- **Main elements**: "Navigation" label and global navigation items (Projects)
- **Handled interactions**: Item selection and routing
- **Types**: Uses NavigationItem[] from navigation library
- **Props**: None (uses useActiveNavigation hook)

#### AppSidebarProjectGroup Sub-component

**Location**: `src/shared/components/AppSidebarProjectGroup.tsx`

- **Component description**: Project-specific navigation group
- **Main elements**: "Project" label and project navigation items (Keys, Locales, etc.)
- **Handled interactions**: Item selection and routing when project context exists
- **Types**: NavigationItem[], projectId string
- **Props**: projectId?: string

#### AppSidebarMenu Sub-component

**Location**: `src/shared/components/AppSidebarMenu.tsx`

- **Component description**: User account menu in sidebar footer
- **Main elements**: Avatar, user email, dropdown with profile (disabled) and logout
- **Handled interactions**: Logout action via auth context
- **Types**: Uses auth context user data
- **Props**: None

### 4.2 BreadcrumbNavigation Component

**Location**: `src/shared/components/BreadcrumbNavigation.tsx`

- **Component description**: Responsive breadcrumb navigation for page orientation
- **Main elements**: Breadcrumb list with home icon, project link, and current page
- **Handled interactions**: Breadcrumb link clicks for navigation
- **Handled validation**: Dynamic breadcrumb generation based on route via useBreadcrumbs hook
- **Types**: Uses internal BreadcrumbItem interface
- **Props**: projectName?: string

#### BreadcrumbItem Interface

```typescript
interface BreadcrumbItem {
  href?: string;
  isActive?: boolean;
  label: string;
}
```

#### useBreadcrumbs Hook

**Location**: `src/shared/hooks/useBreadcrumbs.ts`

- Generates breadcrumbs based on current route
- Handles project context and sub-page navigation
- Formats URL segments to readable labels

#### Responsive Behavior

- **Desktop**: Full breadcrumb display
- **Mobile**: Full breadcrumb display (responsive via shadcn breadcrumb component)
- Skips breadcrumbs on root projects page (single-level path)

### 4.3 App Layout Integration

**Location**: `src/app/App.tsx`

- **Component description**: Main app layout using shadcn SidebarProvider and SidebarInset
- **Main elements**: SidebarProvider wrapper, AppSidebar, SidebarInset with header and main content
- **Handled interactions**: Sidebar toggle via SidebarTrigger, responsive layout adjustments
- **Types**: Uses shadcn/ui sidebar components
- **Props**: None

#### SidebarProvider Integration

- Wraps entire app with sidebar context
- Provides custom CSS properties for sidebar dimensions
- Enables keyboard shortcuts and responsive behavior

#### SidebarInset Layout

- Contains header with SidebarTrigger and BreadcrumbNavigation
- Contains main content area with Outlet for page routing
- Responsive padding and spacing

### 4.4 SidebarTrigger Component

**Location**: Integrated via shadcn/ui SidebarTrigger in App.tsx header

- **Component description**: Mobile-friendly sidebar toggle button
- **Main elements**: Hamburger menu icon button
- **Handled interactions**: Sidebar toggle action via sidebar context
- **Props**: className for styling

## 5. Implementation Steps

### Implementation Approach

1. **Install shadcn/ui components**

   ```bash
   npx shadcn@latest add sidebar
   npx shadcn@latest add breadcrumb
   npx shadcn@latest add avatar
   npx shadcn@latest add separator
   npx shadcn@latest add sheet
   ```

2. **Create navigation data structures**
   - **Location**: `src/shared/lib/navigation.ts`
   - Define NavigationItem interface
   - Create GLOBAL_NAVIGATION_ITEMS and getProjectNavigationItems function
   - Added Export navigation item to project navigation

3. **Implement navigation hooks**
   - **useActiveNavigation**: `src/shared/hooks/useActiveNavigation.ts`
   - **useBreadcrumbs**: `src/shared/hooks/useBreadcrumbs.ts`
   - **useMobile**: `src/shared/hooks/useMobile.ts`

4. **Create sidebar components**
   - **AppSidebar**: `src/shared/components/AppSidebar.tsx` - Main sidebar with header, navigation groups, and footer
   - **AppSidebarGlobalGroup**: `src/shared/components/AppSidebarGlobalGroup.tsx` - Global navigation (Projects)
   - **AppSidebarProjectGroup**: `src/shared/components/AppSidebarProjectGroup.tsx` - Project-specific navigation
   - **AppSidebarMenu**: `src/shared/components/AppSidebarMenu.tsx` - User menu with logout in footer

5. **Implement BreadcrumbNavigation component**
   - **Location**: `src/shared/components/BreadcrumbNavigation.tsx`
   - Route-based breadcrumb generation
   - Responsive design with shadcn/ui breadcrumb components

6. **Update App.tsx layout**
   - Integrated SidebarProvider with custom CSS properties
   - Replaced old layout with SidebarInset containing header and main content
   - Added SidebarTrigger and BreadcrumbNavigation to header

7. **Migrate all feature pages**
   - Removed ProjectNavigation tab components from all project detail pages
   - Updated all route pages to work with new sidebar navigation
   - Maintained existing functionality while removing tab-based navigation

8. **Move logout functionality**
   - Removed UserMenu from ProtectedLayout header
   - Integrated logout into AppSidebarMenu in sidebar footer
   - Maintained existing logout behavior and styling

9. **Update routing and layouts**
   - All project detail pages now use breadcrumbs instead of tabs
   - Proper active state indication through sidebar navigation
   - Responsive behavior with offcanvas mobile sidebar

## 6. Styling Considerations

### CSS Variables and Theme Integration

```css
:root {
  --sidebar-width: 280px;
  --sidebar-collapsed-width: 64px;
  --sidebar-transition: all 0.2s ease-in-out;
}

.dark {
  --sidebar-background: hsl(var(--background));
  --sidebar-foreground: hsl(var(--foreground));
  --sidebar-border: hsl(var(--border));
  --sidebar-accent: hsl(var(--accent));
}
```

### Responsive Breakpoints

- **Mobile (< 640px)**: Sidebar as full-screen overlay
- **Tablet (640px - 1024px)**: Sidebar collapsed to icons
- **Desktop (> 1024px)**: Sidebar expanded with full labels

### Animation and Transitions

- Smooth sidebar expand/collapse animations
- Fade transitions for navigation state changes
- Mobile drawer slide animations

## 7. Accessibility

### ARIA Labels and Roles

- `role="navigation"` for sidebar
- `aria-label` for navigation groups
- `aria-current="page"` for active navigation items
- `aria-expanded` for collapsible sections

### Keyboard Navigation

- **Tab navigation**: Full keyboard accessibility through sidebar items
- **Enter/Space**: Activate navigation items and buttons
- **Escape**: Close mobile sidebar overlay
- **Cmd/Ctrl + B**: Toggle sidebar (documented shortcut)

### Screen Reader Support

- Semantic HTML structure with proper headings
- Descriptive labels for icons and buttons
- Announcement of navigation state changes
- Skip links for main content

### Focus Management

- Proper focus trapping in mobile overlay
- Logical tab order through navigation items
- Focus restoration after sidebar interactions

## 8. Testing Strategy

### Unit Tests

#### SidebarProvider Tests

- Toggle state management
- Keyboard shortcut handling
- Context value provision
- Responsive behavior hooks

#### Navigation Components Tests

- Active state calculation
- Navigation item rendering
- Click event handling
- Responsive behavior

#### Breadcrumb Tests

- Route-based breadcrumb generation
- Responsive display modes
- Navigation functionality
- Overflow handling

### Integration Tests

#### Layout Integration

- Sidebar and content area coordination
- Responsive layout changes
- Navigation state synchronization

#### Routing Integration

- Active state updates on navigation
- Breadcrumb updates on route changes
- Project context handling

### End-to-End Tests

#### User Journeys

- Desktop navigation flow
- Mobile navigation experience
- Keyboard-only navigation
- Logout functionality

#### Responsive Behavior

- Breakpoint transitions
- Touch interactions
- Overlay behavior

### Accessibility Testing

#### Screen Reader Tests

- Navigation announcement
- Focus management
- ARIA compliance

#### Keyboard Navigation Tests

- Tab order verification
- Shortcut functionality
- Focus trapping

## 9. Migration Approach

### Migration Strategy

The sidebar navigation modernization is implemented as a comprehensive replacement of the existing navigation system. All components are migrated simultaneously to ensure consistency and avoid partial states.

#### Files Created

- `src/shared/components/AppSidebar.tsx` - Main sidebar component
- `src/shared/components/AppSidebarGlobalGroup.tsx` - Global navigation group
- `src/shared/components/AppSidebarProjectGroup.tsx` - Project navigation group
- `src/shared/components/AppSidebarMenu.tsx` - User menu component
- `src/shared/components/BreadcrumbNavigation.tsx` - Breadcrumb navigation
- `src/shared/hooks/useActiveNavigation.ts` - Active navigation state hook
- `src/shared/hooks/useBreadcrumbs.ts` - Breadcrumb generation hook
- `src/shared/hooks/useMobile.ts` - Mobile detection hook
- `src/shared/lib/navigation.ts` - Navigation data structures
- `src/shared/ui/sidebar.tsx` - shadcn/ui sidebar component
- `src/shared/ui/breadcrumb.tsx` - shadcn/ui breadcrumb component
- `src/shared/ui/avatar.tsx` - shadcn/ui avatar component
- `src/shared/ui/separator.tsx` - shadcn/ui separator component
- `src/shared/ui/sheet.tsx` - shadcn/ui sheet component

#### Files Modified

- `src/app/App.tsx` - Updated to use SidebarProvider and new layout
- `src/app/routes.tsx` - Routes unchanged, layout updated
- `src/features/*/routes/*.tsx` - All feature pages updated to remove tab navigation
- `src/features/*/components/layouts/*.tsx` - Layout components updated
- `src/features/*/components/views/*.tsx` - View components updated
- `src/shared/components/index.ts` - Added new component exports
- `src/shared/hooks/index.ts` - Added new hook exports
- `src/shared/styles/index.css` - Updated for sidebar theming

#### Files Deleted

- `src/features/auth/components/common/UserMenu.tsx` - Moved to sidebar footer
- `src/features/auth/components/layouts/ProtectedLayout.tsx` - Replaced by sidebar layout
- `src/features/projects/components/layouts/ProjectNavigation.tsx` - Replaced by sidebar navigation
- `src/shared/lib/.gitkeep` - Removed empty directory placeholder

#### Migration Approach

Instead of gradual migration, a comprehensive replacement was implemented:

1. **Complete Sidebar System**: Built entire sidebar navigation system
2. **Layout Replacement**: Replaced ProtectedLayout with sidebar-based layout in App.tsx
3. **Feature Page Updates**: Updated all feature pages simultaneously to use breadcrumbs
4. **Component Removal**: Removed old navigation components entirely
5. **Testing & Validation**: Ensured all navigation paths work correctly

#### Benefits

- Unified navigation in single sidebar component
- Consistent user experience across all pages
- Responsive design with mobile overlay support
- Improved accessibility with proper ARIA labels
- Keyboard navigation support (Cmd/Ctrl + B)
- Clean component architecture with reusable hooks

## 10. Migration Cleanup

After successful implementation and testing, the following deprecated code is removed:

### Files to Delete

- `src/features/auth/components/layouts/ProtectedLayout.tsx` - Replaced by sidebar layout
- `src/features/projects/components/layouts/ProjectNavigation.tsx` - Replaced by sidebar navigation
- `src/features/auth/components/common/UserMenu.tsx` - Functionality moved to sidebar footer
- `src/shared/lib/.gitkeep` - Removed empty directory placeholder

### Code to Remove

- Header navigation logic from `App.tsx` - Replaced with SidebarProvider
- Tab-based navigation from all project detail layouts - Replaced with breadcrumbs
- User menu integration from layout components - Moved to sidebar footer

### Imports to Update

- Removed `ProtectedLayout` imports from `App.tsx`
- Removed `ProjectNavigation` imports from project layouts
- Updated all component index files to export new sidebar components
- Added new hook exports to shared hooks index

### CSS Cleanup

- Updated `src/shared/styles/index.css` for sidebar theming support
- Removed header-specific styles (handled by shadcn/ui components)
- Removed tab navigation styles (handled by shadcn/ui components)
- Integrated sidebar-specific CSS variables through component system

## Summary

The sidebar navigation modernization provides a modern, responsive navigation experience that addresses key navigation challenges in the i18n-mate application. The solution offers:

- **Unified Navigation**: Single sidebar component managing all navigation
- **Responsive Design**: Mobile-first approach with offcanvas sidebar
- **Accessibility**: Full keyboard navigation and screen reader support
- **Scalability**: Easy to add new navigation items through the navigation library
- **Consistency**: Uniform navigation experience across all pages
- **Modern UX**: Clean, intuitive interface using shadcn/ui components

The implementation follows modern React patterns with proper component composition, custom hooks for state management, and comprehensive TypeScript typing.
