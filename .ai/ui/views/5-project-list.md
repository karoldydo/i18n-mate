# Project List

- **View Path**: `/projects`
- **Main Purpose**: Display all user projects with management capabilities
- **Key Information to Display**: Card list with project name, description, prefix, default language, number of languages, number of keys, actions (edit, delete)
- **Key View Components**: CardList with pagination, create project button (actionButton)
- **UX, Accessibility and Security Considerations**:
  - UX: Sort by name, 50 items pagination, quick inline actions, card-based layout for better mobile experience
  - Accessibility: Card layout with ARIA labels, keyboard navigation, screen reader support
  - Security: RLS policies - only own projects, deletion confirmation
