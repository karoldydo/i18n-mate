'use client';

import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { PanelLeftIcon } from 'lucide-react';
import * as React from 'react';

import { useIsMobile } from '@/shared/hooks/useMobile';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Separator } from '@/shared/ui/separator';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/shared/ui/sheet';
import { Skeleton } from '@/shared/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/shared/ui/tooltip';
import { cn } from '@/shared/utils';

const SIDEBAR_COOKIE_NAME = 'sidebar_state';
const SIDEBAR_COOKIE_MAX_AGE = 60 * 60 * 24 * 7;
const SIDEBAR_WIDTH = '16rem';
const SIDEBAR_WIDTH_MOBILE = '18rem';
const SIDEBAR_WIDTH_ICON = '3rem';
const SIDEBAR_KEYBOARD_SHORTCUT = 'b';

/**
 * Sidebar context properties interface.
 * Provides sidebar state and control functions to child components.
 */
interface SidebarContextProps {
  isMobile: boolean;
  open: boolean;
  openMobile: boolean;
  setOpen: (open: boolean) => void;
  setOpenMobile: (open: boolean) => void;
  state: 'collapsed' | 'expanded';
  toggleSidebar: () => void;
}

const SidebarContext = React.createContext<null | SidebarContextProps>(null);

/**
 * Sidebar component for navigation sidebar.
 * Supports collapsible modes, side positioning, and responsive mobile behavior.
 *
 * @param {React.ReactNode} children - Sidebar content
 * @param {string} [className] - Additional CSS classes to apply
 * @param {'icon' | 'none' | 'offcanvas'} [collapsible='offcanvas'] - Collapsible behavior mode
 * @param {'left' | 'right'} [side='left'] - Side of the screen where sidebar appears
 * @param {'floating' | 'inset' | 'sidebar'} [variant='sidebar'] - Visual style variant
 * @param {React.ComponentProps<'div'>} props - Standard div element props
 *
 * @returns {React.ReactElement} A sidebar container with responsive behavior and animations
 */
function Sidebar({
  children,
  className,
  collapsible = 'offcanvas',
  side = 'left',
  variant = 'sidebar',
  ...props
}: React.ComponentProps<'div'> & {
  collapsible?: 'icon' | 'none' | 'offcanvas';
  side?: 'left' | 'right';
  variant?: 'floating' | 'inset' | 'sidebar';
}) {
  const { isMobile, openMobile, setOpenMobile, state } = useSidebar();

  if (collapsible === 'none') {
    return (
      <div
        className={cn('bg-sidebar text-sidebar-foreground flex h-full w-(--sidebar-width) flex-col', className)}
        data-slot="sidebar"
        {...props}
      >
        {children}
      </div>
    );
  }

  if (isMobile) {
    return (
      <Sheet onOpenChange={setOpenMobile} open={openMobile} {...props}>
        <SheetContent
          className="bg-sidebar text-sidebar-foreground w-(--sidebar-width) p-0 [&>button]:hidden"
          data-mobile="true"
          data-sidebar="sidebar"
          data-slot="sidebar"
          side={side}
          style={
            {
              '--sidebar-width': SIDEBAR_WIDTH_MOBILE,
            } as React.CSSProperties
          }
        >
          <SheetHeader className="sr-only">
            <SheetTitle>Sidebar</SheetTitle>
            <SheetDescription>Displays the mobile sidebar.</SheetDescription>
          </SheetHeader>
          <div className="flex h-full w-full flex-col">{children}</div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <div
      className="group peer text-sidebar-foreground hidden md:block"
      data-collapsible={state === 'collapsed' ? collapsible : ''}
      data-side={side}
      data-slot="sidebar"
      data-state={state}
      data-variant={variant}
    >
      {/* This is what handles the sidebar gap on desktop */}
      <div
        className={cn(
          'relative w-(--sidebar-width) bg-transparent transition-[width] duration-200 ease-linear',
          'group-data-[collapsible=offcanvas]:w-0',
          'group-data-[side=right]:rotate-180',
          variant === 'floating' || variant === 'inset'
            ? 'group-data-[collapsible=icon]:w-[calc(var(--sidebar-width-icon)+(--spacing(4)))]'
            : 'group-data-[collapsible=icon]:w-(--sidebar-width-icon)'
        )}
        data-slot="sidebar-gap"
      />
      <div
        className={cn(
          'fixed inset-y-0 z-10 hidden h-svh w-(--sidebar-width) transition-[left,right,width] duration-200 ease-linear md:flex',
          side === 'left'
            ? 'left-0 group-data-[collapsible=offcanvas]:left-[calc(var(--sidebar-width)*-1)]'
            : 'right-0 group-data-[collapsible=offcanvas]:right-[calc(var(--sidebar-width)*-1)]',
          // Adjust the padding for floating and inset variants.
          variant === 'floating' || variant === 'inset'
            ? 'p-2 group-data-[collapsible=icon]:w-[calc(var(--sidebar-width-icon)+(--spacing(4))+2px)]'
            : 'group-data-[collapsible=icon]:w-(--sidebar-width-icon) group-data-[side=left]:border-r group-data-[side=right]:border-l',
          className
        )}
        data-slot="sidebar-container"
        {...props}
      >
        <div
          className="bg-sidebar group-data-[variant=floating]:border-sidebar-border flex h-full w-full flex-col group-data-[variant=floating]:rounded-lg group-data-[variant=floating]:border group-data-[variant=floating]:shadow-sm"
          data-sidebar="sidebar"
          data-slot="sidebar-inner"
        >
          {children}
        </div>
      </div>
    </div>
  );
}

/**
 * SidebarContent component for main sidebar content area.
 * Provides scrollable container that hides overflow when sidebar is collapsed to icon mode.
 *
 * @param {string} [className] - Additional CSS classes to apply
 * @param {React.ComponentProps<'div'>} props - Standard div element props
 *
 * @returns {React.ReactElement} A div element styled for sidebar content with scroll behavior
 */
function SidebarContent({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      className={cn(
        'flex min-h-0 flex-1 flex-col gap-2 overflow-auto group-data-[collapsible=icon]:overflow-hidden',
        className
      )}
      data-sidebar="content"
      data-slot="sidebar-content"
      {...props}
    />
  );
}

/**
 * SidebarFooter component for sidebar footer content.
 * Provides consistent spacing for footer elements like user profile or actions.
 *
 * @param {string} [className] - Additional CSS classes to apply
 * @param {React.ComponentProps<'div'>} props - Standard div element props
 *
 * @returns {React.ReactElement} A div element styled for sidebar footer
 */
function SidebarFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      className={cn('flex flex-col gap-2 p-2', className)}
      data-sidebar="footer"
      data-slot="sidebar-footer"
      {...props}
    />
  );
}

/**
 * SidebarGroup component for grouping sidebar items.
 * Provides consistent spacing and layout for related sidebar content.
 *
 * @param {string} [className] - Additional CSS classes to apply
 * @param {React.ComponentProps<'div'>} props - Standard div element props
 *
 * @returns {React.ReactElement} A div element styled for sidebar groups
 */
function SidebarGroup({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      className={cn('relative flex w-full min-w-0 flex-col p-2', className)}
      data-sidebar="group"
      data-slot="sidebar-group"
      {...props}
    />
  );
}

/**
 * SidebarGroupAction component for group action buttons.
 * Supports polymorphic rendering via the asChild prop using Radix UI Slot.
 *
 * @param {boolean} [asChild=false] - When true, renders as a child component instead of a button element
 * @param {string} [className] - Additional CSS classes to apply
 * @param {React.ComponentProps<'button'>} props - Standard button element props
 *
 * @returns {React.ReactElement} A button element or child component styled for sidebar group actions
 */
function SidebarGroupAction({
  asChild = false,
  className,
  ...props
}: React.ComponentProps<'button'> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : 'button';

  return (
    <Comp
      className={cn(
        'text-sidebar-foreground ring-sidebar-ring hover:bg-sidebar-accent hover:text-sidebar-accent-foreground absolute top-3.5 right-3 flex aspect-square w-5 items-center justify-center rounded-md p-0 outline-hidden transition-transform focus-visible:ring-2 [&>svg]:size-4 [&>svg]:shrink-0',
        // Increases the hit area of the button on mobile.
        'after:absolute after:-inset-2 md:after:hidden',
        'group-data-[collapsible=icon]:hidden',
        className
      )}
      data-sidebar="group-action"
      data-slot="sidebar-group-action"
      {...props}
    />
  );
}

/**
 * SidebarGroupContent component for group content area.
 * Provides consistent text styling for sidebar group content.
 *
 * @param {string} [className] - Additional CSS classes to apply
 * @param {React.ComponentProps<'div'>} props - Standard div element props
 *
 * @returns {React.ReactElement} A div element styled for sidebar group content
 */
function SidebarGroupContent({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      className={cn('w-full text-sm', className)}
      data-sidebar="group-content"
      data-slot="sidebar-group-content"
      {...props}
    />
  );
}

/**
 * SidebarGroupLabel component for group section labels.
 * Supports polymorphic rendering via the asChild prop using Radix UI Slot.
 * Hides when sidebar is collapsed to icon mode.
 *
 * @param {boolean} [asChild=false] - When true, renders as a child component instead of a div element
 * @param {string} [className] - Additional CSS classes to apply
 * @param {React.ComponentProps<'div'>} props - Standard div element props
 *
 * @returns {React.ReactElement} A div element or child component styled for sidebar group labels
 */
function SidebarGroupLabel({
  asChild = false,
  className,
  ...props
}: React.ComponentProps<'div'> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : 'div';

  return (
    <Comp
      className={cn(
        'text-sidebar-foreground/70 ring-sidebar-ring flex h-8 shrink-0 items-center rounded-md px-2 text-xs font-medium outline-hidden transition-[margin,opacity] duration-200 ease-linear focus-visible:ring-2 [&>svg]:size-4 [&>svg]:shrink-0',
        'group-data-[collapsible=icon]:-mt-8 group-data-[collapsible=icon]:opacity-0',
        className
      )}
      data-sidebar="group-label"
      data-slot="sidebar-group-label"
      {...props}
    />
  );
}

/**
 * SidebarHeader component for sidebar header content.
 * Provides consistent spacing for header elements like logo or title.
 *
 * @param {string} [className] - Additional CSS classes to apply
 * @param {React.ComponentProps<'div'>} props - Standard div element props
 *
 * @returns {React.ReactElement} A div element styled for sidebar headers
 */
function SidebarHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      className={cn('flex flex-col gap-2 p-2', className)}
      data-sidebar="header"
      data-slot="sidebar-header"
      {...props}
    />
  );
}

/**
 * SidebarInput component for search or filter inputs in sidebar.
 * Styled specifically for sidebar context with reduced shadow.
 *
 * @param {string} [className] - Additional CSS classes to apply
 * @param {React.ComponentProps<typeof Input>} props - Input component props
 *
 * @returns {React.ReactElement} An Input element styled for sidebar use
 */
function SidebarInput({ className, ...props }: React.ComponentProps<typeof Input>) {
  return (
    <Input
      className={cn('bg-background h-8 w-full shadow-none', className)}
      data-sidebar="input"
      data-slot="sidebar-input"
      {...props}
    />
  );
}

/**
 * SidebarInset component for main content area next to sidebar.
 * Adjusts layout based on sidebar state and variant (inset mode).
 *
 * @param {string} [className] - Additional CSS classes to apply
 * @param {React.ComponentProps<'main'>} props - Standard main element props
 *
 * @returns {React.ReactElement} A main element styled to work with sidebar layout
 */
function SidebarInset({ className, ...props }: React.ComponentProps<'main'>) {
  return (
    <main
      className={cn(
        'bg-background relative flex w-full flex-1 flex-col',
        'md:peer-data-[variant=inset]:m-2 md:peer-data-[variant=inset]:ml-0 md:peer-data-[variant=inset]:rounded-xl md:peer-data-[variant=inset]:shadow-sm md:peer-data-[variant=inset]:peer-data-[state=collapsed]:ml-2',
        className
      )}
      data-slot="sidebar-inset"
      {...props}
    />
  );
}

/**
 * SidebarMenu component for sidebar navigation menu.
 * Provides list container for sidebar menu items.
 *
 * @param {string} [className] - Additional CSS classes to apply
 * @param {React.ComponentProps<'ul'>} props - Standard ul element props
 *
 * @returns {React.ReactElement} A ul element styled for sidebar menus
 */
function SidebarMenu({ className, ...props }: React.ComponentProps<'ul'>) {
  return (
    <ul
      className={cn('flex w-full min-w-0 flex-col gap-1', className)}
      data-sidebar="menu"
      data-slot="sidebar-menu"
      {...props}
    />
  );
}

/**
 * SidebarMenuItem component for individual sidebar menu items.
 * Provides container for menu buttons and sub-menus.
 *
 * @param {string} [className] - Additional CSS classes to apply
 * @param {React.ComponentProps<'li'>} props - Standard li element props
 *
 * @returns {React.ReactElement} A li element styled for sidebar menu items
 */
function SidebarMenuItem({ className, ...props }: React.ComponentProps<'li'>) {
  return (
    <li
      className={cn('group/menu-item relative', className)}
      data-sidebar="menu-item"
      data-slot="sidebar-menu-item"
      {...props}
    />
  );
}

/**
 * SidebarProvider component for sidebar context and state management.
 * Manages sidebar open/closed state, mobile behavior, keyboard shortcuts, and cookie persistence.
 *
 * @param {React.ReactNode} children - Child components that can access sidebar context
 * @param {string} [className] - Additional CSS classes to apply
 * @param {boolean} [defaultOpen=true] - Default open state for uncontrolled usage
 * @param {(open: boolean) => void} [onOpenChange] - Callback when sidebar open state changes (controlled usage)
 * @param {boolean} [open] - Controlled open state
 * @param {React.CSSProperties} [style] - Inline styles for the wrapper
 * @param {React.ComponentProps<'div'>} props - Standard div element props
 *
 * @returns {React.ReactElement} A sidebar provider wrapper with context and keyboard shortcut support
 */
function SidebarProvider({
  children,
  className,
  defaultOpen = true,
  onOpenChange: setOpenProp,
  open: openProp,
  style,
  ...props
}: React.ComponentProps<'div'> & {
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  open?: boolean;
}) {
  const isMobile = useIsMobile();
  const [openMobile, setOpenMobile] = React.useState(false);

  // This is the internal state of the sidebar.
  // We use openProp and setOpenProp for control from outside the component.
  const [_open, _setOpen] = React.useState(defaultOpen);
  const open = openProp ?? _open;
  const setOpen = React.useCallback(
    (value: ((value: boolean) => boolean) | boolean) => {
      const openState = typeof value === 'function' ? value(open) : value;
      if (setOpenProp) {
        setOpenProp(openState);
      } else {
        _setOpen(openState);
      }

      // This sets the cookie to keep the sidebar state.
      // eslint-disable-next-line react-compiler/react-compiler
      document.cookie = `${SIDEBAR_COOKIE_NAME}=${openState}; path=/; max-age=${SIDEBAR_COOKIE_MAX_AGE}`;
    },
    [setOpenProp, open]
  );

  // Helper to toggle the sidebar.
  const toggleSidebar = React.useCallback(() => {
    return isMobile ? setOpenMobile((open) => !open) : setOpen((open) => !open);
  }, [isMobile, setOpen, setOpenMobile]);

  // Adds a keyboard shortcut to toggle the sidebar.
  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === SIDEBAR_KEYBOARD_SHORTCUT && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        toggleSidebar();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleSidebar]);

  // We add a state so that we can do data-state="expanded" or "collapsed".
  // This makes it easier to style the sidebar with Tailwind classes.
  const state = open ? 'expanded' : 'collapsed';

  const contextValue = React.useMemo<SidebarContextProps>(
    () => ({
      isMobile,
      open,
      openMobile,
      setOpen,
      setOpenMobile,
      state,
      toggleSidebar,
    }),
    [state, open, setOpen, isMobile, openMobile, setOpenMobile, toggleSidebar]
  );

  return (
    <SidebarContext.Provider value={contextValue}>
      <TooltipProvider delayDuration={0}>
        <div
          className={cn('group/sidebar-wrapper has-data-[variant=inset]:bg-sidebar flex min-h-svh w-full', className)}
          data-slot="sidebar-wrapper"
          style={
            {
              '--sidebar-width': SIDEBAR_WIDTH,
              '--sidebar-width-icon': SIDEBAR_WIDTH_ICON,
              ...style,
            } as React.CSSProperties
          }
          {...props}
        >
          {children}
        </div>
      </TooltipProvider>
    </SidebarContext.Provider>
  );
}

/**
 * SidebarRail component for sidebar toggle rail/edge.
 * Provides a clickable area on the sidebar edge for toggling visibility.
 *
 * @param {string} [className] - Additional CSS classes to apply
 * @param {React.ComponentProps<'button'>} props - Standard button element props
 *
 * @returns {React.ReactElement} A button element styled as sidebar rail for toggling
 */
function SidebarRail({ className, ...props }: React.ComponentProps<'button'>) {
  const { toggleSidebar } = useSidebar();

  return (
    <button
      aria-label="Toggle Sidebar"
      className={cn(
        'hover:after:bg-sidebar-border absolute inset-y-0 z-20 hidden w-4 -translate-x-1/2 transition-all ease-linear group-data-[side=left]:-right-4 group-data-[side=right]:left-0 after:absolute after:inset-y-0 after:left-1/2 after:w-[2px] sm:flex',
        'in-data-[side=left]:cursor-w-resize in-data-[side=right]:cursor-e-resize',
        '[[data-side=left][data-state=collapsed]_&]:cursor-e-resize [[data-side=right][data-state=collapsed]_&]:cursor-w-resize',
        'hover:group-data-[collapsible=offcanvas]:bg-sidebar group-data-[collapsible=offcanvas]:translate-x-0 group-data-[collapsible=offcanvas]:after:left-full',
        '[[data-side=left][data-collapsible=offcanvas]_&]:-right-2',
        '[[data-side=right][data-collapsible=offcanvas]_&]:-left-2',
        className
      )}
      data-sidebar="rail"
      data-slot="sidebar-rail"
      onClick={toggleSidebar}
      tabIndex={-1}
      title="Toggle Sidebar"
      {...props}
    />
  );
}

/**
 * SidebarSeparator component for visual separation in sidebar.
 * Styled specifically for sidebar context with sidebar border color.
 *
 * @param {string} [className] - Additional CSS classes to apply
 * @param {React.ComponentProps<typeof Separator>} props - Separator component props
 *
 * @returns {React.ReactElement} A Separator element styled for sidebar use
 */
function SidebarSeparator({ className, ...props }: React.ComponentProps<typeof Separator>) {
  return (
    <Separator
      className={cn('bg-sidebar-border mx-2 w-auto', className)}
      data-sidebar="separator"
      data-slot="sidebar-separator"
      {...props}
    />
  );
}

/**
 * SidebarTrigger component for sidebar toggle button.
 * Displays a panel icon button that toggles sidebar visibility.
 *
 * @param {string} [className] - Additional CSS classes to apply
 * @param {(event: React.MouseEvent<HTMLButtonElement>) => void} [onClick] - Additional click handler
 * @param {React.ComponentProps<typeof Button>} props - Button component props
 *
 * @returns {React.ReactElement} A Button element styled as sidebar trigger
 */
function SidebarTrigger({ className, onClick, ...props }: React.ComponentProps<typeof Button>) {
  const { toggleSidebar } = useSidebar();

  return (
    <Button
      className={cn('size-7', className)}
      data-sidebar="trigger"
      data-slot="sidebar-trigger"
      onClick={(event) => {
        onClick?.(event);
        toggleSidebar();
      }}
      size="icon"
      variant="ghost"
      {...props}
    >
      <PanelLeftIcon />
      <span className="sr-only">Toggle Sidebar</span>
    </Button>
  );
}

/**
 * useSidebar hook for accessing sidebar context.
 * Provides sidebar state and control functions to components.
 *
 * @returns {SidebarContextProps} Sidebar context including state, mobile detection, and control functions
 *
 * @throws {Error} If used outside of SidebarProvider component
 */
function useSidebar() {
  const context = React.useContext(SidebarContext);
  if (!context) {
    throw new Error('useSidebar must be used within a SidebarProvider.');
  }

  return context;
}

/**
 * Sidebar menu button variant styles configuration using class-variance-authority.
 * Defines size and variant options for sidebar menu button components.
 */
const sidebarMenuButtonVariants = cva(
  'peer/menu-button flex w-full items-center gap-2 overflow-hidden rounded-md p-2 text-left text-sm outline-hidden ring-sidebar-ring transition-[width,height,padding] hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 active:bg-sidebar-accent active:text-sidebar-accent-foreground disabled:pointer-events-none disabled:opacity-50 group-has-data-[sidebar=menu-action]/menu-item:pr-8 aria-disabled:pointer-events-none aria-disabled:opacity-50 data-[active=true]:bg-sidebar-accent data-[active=true]:font-medium data-[active=true]:text-sidebar-accent-foreground data-[state=open]:hover:bg-sidebar-accent data-[state=open]:hover:text-sidebar-accent-foreground group-data-[collapsible=icon]:size-8! group-data-[collapsible=icon]:p-2! [&>span:last-child]:truncate [&>svg]:size-4 [&>svg]:shrink-0',
  {
    defaultVariants: {
      size: 'default',
      variant: 'default',
    },
    variants: {
      size: {
        default: 'h-8 text-sm',
        lg: 'h-12 text-sm group-data-[collapsible=icon]:p-0!',
        sm: 'h-7 text-xs',
      },
      variant: {
        default: 'hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
        outline:
          'bg-background shadow-[0_0_0_1px_hsl(var(--sidebar-border))] hover:bg-sidebar-accent hover:text-sidebar-accent-foreground hover:shadow-[0_0_0_1px_hsl(var(--sidebar-accent))]',
      },
    },
  }
);

/**
 * SidebarMenuAction component for menu item action buttons.
 * Supports polymorphic rendering and optional hover-only visibility.
 *
 * @param {boolean} [asChild=false] - When true, renders as a child component instead of a button element
 * @param {string} [className] - Additional CSS classes to apply
 * @param {boolean} [showOnHover=false] - Whether to show the action only on hover (desktop only)
 * @param {React.ComponentProps<'button'>} props - Standard button element props
 *
 * @returns {React.ReactElement} A button element or child component styled for sidebar menu actions
 */
function SidebarMenuAction({
  asChild = false,
  className,
  showOnHover = false,
  ...props
}: React.ComponentProps<'button'> & {
  asChild?: boolean;
  showOnHover?: boolean;
}) {
  const Comp = asChild ? Slot : 'button';

  return (
    <Comp
      className={cn(
        'text-sidebar-foreground ring-sidebar-ring hover:bg-sidebar-accent hover:text-sidebar-accent-foreground peer-hover/menu-button:text-sidebar-accent-foreground absolute top-1.5 right-1 flex aspect-square w-5 items-center justify-center rounded-md p-0 outline-hidden transition-transform focus-visible:ring-2 [&>svg]:size-4 [&>svg]:shrink-0',
        // Increases the hit area of the button on mobile.
        'after:absolute after:-inset-2 md:after:hidden',
        'peer-data-[size=sm]/menu-button:top-1',
        'peer-data-[size=default]/menu-button:top-1.5',
        'peer-data-[size=lg]/menu-button:top-2.5',
        'group-data-[collapsible=icon]:hidden',
        showOnHover &&
          'peer-data-[active=true]/menu-button:text-sidebar-accent-foreground group-focus-within/menu-item:opacity-100 group-hover/menu-item:opacity-100 data-[state=open]:opacity-100 md:opacity-0',
        className
      )}
      data-sidebar="menu-action"
      data-slot="sidebar-menu-action"
      {...props}
    />
  );
}

/**
 * SidebarMenuBadge component for displaying badges on menu items.
 * Positioned absolutely relative to menu button, hidden when sidebar is collapsed.
 *
 * @param {string} [className] - Additional CSS classes to apply
 * @param {React.ComponentProps<'div'>} props - Standard div element props
 *
 * @returns {React.ReactElement} A div element styled for sidebar menu badges
 */
function SidebarMenuBadge({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      className={cn(
        'text-sidebar-foreground pointer-events-none absolute right-1 flex h-5 min-w-5 items-center justify-center rounded-md px-1 text-xs font-medium tabular-nums select-none',
        'peer-hover/menu-button:text-sidebar-accent-foreground peer-data-[active=true]/menu-button:text-sidebar-accent-foreground',
        'peer-data-[size=sm]/menu-button:top-1',
        'peer-data-[size=default]/menu-button:top-1.5',
        'peer-data-[size=lg]/menu-button:top-2.5',
        'group-data-[collapsible=icon]:hidden',
        className
      )}
      data-sidebar="menu-badge"
      data-slot="sidebar-menu-badge"
      {...props}
    />
  );
}

/**
 * SidebarMenuButton component for sidebar navigation menu buttons.
 * Supports variants, sizes, active states, tooltips, and polymorphic rendering.
 *
 * @param {boolean} [asChild=false] - When true, renders as a child component instead of a button element
 * @param {string} [className] - Additional CSS classes to apply
 * @param {boolean} [isActive=false] - Whether the menu button is in active state
 * @param {'default' | 'lg' | 'sm'} [size='default'] - Size variant of the menu button
 * @param {React.ComponentProps<typeof TooltipContent> | string} [tooltip] - Tooltip content (string or TooltipContent props)
 * @param {'default' | 'outline'} [variant='default'] - Visual style variant
 * @param {React.ComponentProps<'button'>} props - Standard button element props
 *
 * @returns {React.ReactElement} A button element or child component styled for sidebar menu buttons, optionally with tooltip
 */
function SidebarMenuButton({
  asChild = false,
  className,
  isActive = false,
  size = 'default',
  tooltip,
  variant = 'default',
  ...props
}: React.ComponentProps<'button'> &
  VariantProps<typeof sidebarMenuButtonVariants> & {
    asChild?: boolean;
    isActive?: boolean;
    tooltip?: React.ComponentProps<typeof TooltipContent> | string;
  }) {
  const Comp = asChild ? Slot : 'button';
  const { isMobile, state } = useSidebar();

  const button = (
    <Comp
      className={cn(sidebarMenuButtonVariants({ size, variant }), className)}
      data-active={isActive}
      data-sidebar="menu-button"
      data-size={size}
      data-slot="sidebar-menu-button"
      {...props}
    />
  );

  if (!tooltip) {
    return button;
  }

  if (typeof tooltip === 'string') {
    tooltip = {
      children: tooltip,
    };
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>{button}</TooltipTrigger>
      <TooltipContent align="center" hidden={state !== 'collapsed' || isMobile} side="right" {...tooltip} />
    </Tooltip>
  );
}

/**
 * SidebarMenuSkeleton component for loading state placeholders.
 * Displays animated skeleton placeholders for menu items with optional icon.
 *
 * @param {string} [className] - Additional CSS classes to apply
 * @param {boolean} [showIcon=false] - Whether to show a skeleton icon placeholder
 * @param {React.ComponentProps<'div'>} props - Standard div element props
 *
 * @returns {React.ReactElement} A div element with skeleton loading animation for menu items
 */
function SidebarMenuSkeleton({
  className,
  showIcon = false,
  ...props
}: React.ComponentProps<'div'> & {
  showIcon?: boolean;
}) {
  // random width between 50 to 90%
  const width = React.useMemo(() => {
    return `${Math.floor(Math.random() * 40) + 50}%`;
  }, []);

  return (
    <div
      className={cn('flex h-8 items-center gap-2 rounded-md px-2', className)}
      data-sidebar="menu-skeleton"
      data-slot="sidebar-menu-skeleton"
      {...props}
    >
      {showIcon && <Skeleton className="size-4 rounded-md" data-sidebar="menu-skeleton-icon" />}
      <Skeleton
        className="h-4 max-w-(--skeleton-width) flex-1"
        data-sidebar="menu-skeleton-text"
        style={
          {
            '--skeleton-width': width,
          } as React.CSSProperties
        }
      />
    </div>
  );
}

/**
 * SidebarMenuSub component for nested sub-menu lists.
 * Hidden when sidebar is collapsed to icon mode.
 *
 * @param {string} [className] - Additional CSS classes to apply
 * @param {React.ComponentProps<'ul'>} props - Standard ul element props
 *
 * @returns {React.ReactElement} A ul element styled for sidebar sub-menus
 */
function SidebarMenuSub({ className, ...props }: React.ComponentProps<'ul'>) {
  return (
    <ul
      className={cn(
        'border-sidebar-border mx-3.5 flex min-w-0 translate-x-px flex-col gap-1 border-l px-2.5 py-0.5',
        'group-data-[collapsible=icon]:hidden',
        className
      )}
      data-sidebar="menu-sub"
      data-slot="sidebar-menu-sub"
      {...props}
    />
  );
}

/**
 * SidebarMenuSubButton component for sub-menu navigation buttons.
 * Supports polymorphic rendering, active states, and size variants.
 *
 * @param {boolean} [asChild=false] - When true, renders as a child component instead of an anchor element
 * @param {string} [className] - Additional CSS classes to apply
 * @param {boolean} [isActive=false] - Whether the sub-button is in active state
 * @param {'md' | 'sm'} [size='md'] - Size variant of the sub-button
 * @param {React.ComponentProps<'a'>} props - Standard anchor element props
 *
 * @returns {React.ReactElement} An anchor element or child component styled for sidebar sub-menu buttons
 */
function SidebarMenuSubButton({
  asChild = false,
  className,
  isActive = false,
  size = 'md',
  ...props
}: React.ComponentProps<'a'> & {
  asChild?: boolean;
  isActive?: boolean;
  size?: 'md' | 'sm';
}) {
  const Comp = asChild ? Slot : 'a';

  return (
    <Comp
      className={cn(
        'text-sidebar-foreground ring-sidebar-ring hover:bg-sidebar-accent hover:text-sidebar-accent-foreground active:bg-sidebar-accent active:text-sidebar-accent-foreground [&>svg]:text-sidebar-accent-foreground flex h-7 min-w-0 -translate-x-px items-center gap-2 overflow-hidden rounded-md px-2 outline-hidden focus-visible:ring-2 disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 [&>span:last-child]:truncate [&>svg]:size-4 [&>svg]:shrink-0',
        'data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-accent-foreground',
        size === 'sm' && 'text-xs',
        size === 'md' && 'text-sm',
        'group-data-[collapsible=icon]:hidden',
        className
      )}
      data-active={isActive}
      data-sidebar="menu-sub-button"
      data-size={size}
      data-slot="sidebar-menu-sub-button"
      {...props}
    />
  );
}

/**
 * SidebarMenuSubItem component for individual sub-menu items.
 * Provides container for sub-menu buttons.
 *
 * @param {string} [className] - Additional CSS classes to apply
 * @param {React.ComponentProps<'li'>} props - Standard li element props
 *
 * @returns {React.ReactElement} A li element styled for sidebar sub-menu items
 */
function SidebarMenuSubItem({ className, ...props }: React.ComponentProps<'li'>) {
  return (
    <li
      className={cn('group/menu-sub-item relative', className)}
      data-sidebar="menu-sub-item"
      data-slot="sidebar-menu-sub-item"
      {...props}
    />
  );
}

export {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInput,
  SidebarInset,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSkeleton,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarProvider,
  SidebarRail,
  SidebarSeparator,
  SidebarTrigger,
  // eslint-disable-next-line react-refresh/only-export-components
  useSidebar,
};
