import type { Database } from '../database.types';
import type { MakeNullable, PaginatedResponse, PaginationParams } from '../types';

export interface CreateProjectRequest {
  default_locale: string;
  default_locale_label: string;
  description?: null | string;
  name: string;
  prefix: string;
}

export type CreateProjectResponse = MakeNullable<
  Database['public']['Functions']['create_project_with_default_locale']['Returns'][0],
  'description'
>;

export type CreateProjectRpcArgs = Database['public']['Functions']['create_project_with_default_locale']['Args'];

export type ProjectRequest = Database['public']['Functions']['get_project_with_counts']['Args'];

export type ProjectResponse = MakeNullable<
  Database['public']['Functions']['get_project_with_counts']['Returns'][0],
  'description'
>;

export interface ProjectsRequest extends PaginationParams {
  order?: 'created_at.asc' | 'created_at.desc' | 'name.asc' | 'name.desc';
}

export type ProjectsResponse = PaginatedResponse<ProjectsResponseItem>;

export type ProjectsResponseItem = MakeNullable<
  Database['public']['Functions']['list_projects_with_counts']['Returns'][0],
  'description'
>;

export interface UpdateProjectRequest {
  description?: null | string;
  name?: string;
}

export type UpdateProjectResponse = ProjectResponse;
