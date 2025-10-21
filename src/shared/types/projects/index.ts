// Projects Feature Types

import type { Database, Tables, TablesInsert, TablesUpdate } from '../database.types';
import type { PaginatedResponse, PaginationParams } from '../types';

export type CreateProjectRpcArgs = Database['public']['Functions']['create_project_with_default_locale']['Args'];

// Primary interface for creating projects with atomic RPC approach
export interface CreateProjectWithDefaultLocaleRequest {
  default_locale: string;
  default_locale_label: string;
  description?: null | string;
  name: string;
  prefix: string;
}

// Query parameters for listing projects
export interface ListProjectsParams extends PaginationParams {
  order?: 'created_at.asc' | 'created_at.desc' | 'name.asc' | 'name.desc';
}

// RPC function arguments
export interface ListProjectsWithCountsArgs {
  limit?: number;
  offset?: number;
}

// Project entity
export type Project = Tables<'projects'>;

// Telemetry event emitted when a new project is created
export interface ProjectCreatedEvent {
  created_at: string;
  event_name: 'project_created';
  project_id: string;
  properties: ProjectCreatedProperties;
}

export interface ProjectCreatedProperties {
  locale_count: number;
}

// Branded type for project IDs
export type ProjectId = string & { readonly __brand: 'ProjectId' };

export type ProjectInsert = TablesInsert<'projects'>;

// List of projects with pagination metadata
export type ProjectListResponse = PaginatedResponse<ProjectWithCounts>;

// Standard project representation
export type ProjectResponse = Pick<
  Project,
  'created_at' | 'default_locale' | 'description' | 'id' | 'name' | 'prefix' | 'updated_at'
>;

export type ProjectUpdate = TablesUpdate<'projects'>;

// Enhanced project with aggregated counts
export type ProjectWithCounts = ProjectResponse & {
  key_count: number;
  locale_count: number;
};

// Only name and description are mutable
export type UpdateProjectRequest = Pick<ProjectUpdate, 'description' | 'name'>;
