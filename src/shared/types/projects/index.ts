// Projects Feature Types

import type { Database } from '../database.types';
import type { PaginatedResponse, PaginationParams } from '../types';

// ============================================================================
// List Operations (CRUD: Read Many)
// ============================================================================

/**
 * User-facing request interface for creating projects
 * Matches the frontend form structure
 */
export interface CreateProjectRequest {
  default_locale: string;
  default_locale_label: string;
  description?: null | string;
  name: string;
  prefix: string;
}

/**
 * Response type for create project operation
 * Derived from RPC function: create_project_with_default_locale
 */
export type CreateProjectResponse = Database['public']['Functions']['create_project_with_default_locale']['Returns'][0];

// ============================================================================
// Single Item Operations (CRUD: Read One)
// ============================================================================

/**
 * RPC arguments for create_project_with_default_locale
 * Used internally for validation and transformation
 */
export type CreateProjectRpcArgs = Database['public']['Functions']['create_project_with_default_locale']['Args'];

/**
 * Request parameters for getting a single project
 * Derived from RPC function: get_project_with_counts
 */
export type ProjectRequest = Database['public']['Functions']['get_project_with_counts']['Args'];

// ============================================================================
// Create Operations (CRUD: Create)
// ============================================================================

/**
 * Response type for single project operation with counts
 * Derived from RPC function: get_project_with_counts
 */
export type ProjectResponse = Database['public']['Functions']['get_project_with_counts']['Returns'][0];

/**
 * Query parameters for listing projects with pagination and sorting
 */
export interface ProjectsRequest extends PaginationParams {
  order?: 'created_at.asc' | 'created_at.desc' | 'name.asc' | 'name.desc';
}

/**
 * Response type for list projects operation
 * Derived from RPC function: list_projects_with_counts
 */
export type ProjectsResponse = PaginatedResponse<
  Database['public']['Functions']['list_projects_with_counts']['Returns'][0]
>;

// ============================================================================
// Update Operations (CRUD: Update)
// ============================================================================

/**
 * Request interface for updating projects
 * Only name and description are mutable after creation
 */
export interface UpdateProjectRequest {
  description?: null | string;
  name?: string;
}

/**
 * Response type for update project operation
 * Returns the same structure as single project read
 */
export type UpdateProjectResponse = ProjectResponse;
