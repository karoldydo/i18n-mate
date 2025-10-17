/**
 * Projects API
 *
 * This module provides TanStack Query hooks for managing translation projects.
 * All hooks use the shared Supabase client from context and follow React Query best practices.
 *
 * @module features/projects/api
 */

// Error Utilities
export { createDatabaseErrorResponse } from './projects.errors';

// Query Keys
export { projectsKeys } from './projects.keys';

// Validation Schemas
export * from './projects.schemas';

// Mutation Hooks
export { useCreateProject } from './useCreateProject/useCreateProject';
export { useDeleteProject } from './useDeleteProject/useDeleteProject';

// Query Hooks
export { useProject } from './useProject/useProject';
export { useProjects } from './useProjects/useProjects';
export { useUpdateProject } from './useUpdateProject/useUpdateProject';
