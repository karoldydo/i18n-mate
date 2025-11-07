# Project Details

- **View Path**: `/projects/:id`
- **Main Purpose**: Display project details and provide project management actions
- **Key Information to Display**: Project name, description, prefix, default language, statistics (languages count, keys count), timestamps, edit/delete actions
- **Key View Components**: Project header with actions, card-based metadata display
- **UX, Accessibility and Security Considerations**:
  - UX: Central hub for project management, card-based metadata layout for better visual hierarchy
  - Accessibility: Semantic HTML, ARIA labels, keyboard navigation, tooltips for immutable fields
  - Security: Ownership validation through RLS
