# Project List

- **View Path**: `/projects`
- **Main Purpose**: Display all user projects with management capabilities
- **Key Information to Display**: Table with columns: name, default language, number of languages, number of keys, actions (edit, delete)
- **Key View Components**: DataTable with pagination, create project button, search/filter
- **UX, Accessibility and Security Considerations**:
  - UX: Sort by name, 50 items pagination, quick inline actions
  - Accessibility: Table with ARIA labels, keyboard navigation, screen reader support
  - Security: RLS policies - only own projects, deletion confirmation
