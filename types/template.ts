// Template — presets for project generation.

export interface Template {
  id: string;
  name: string;
  description: string;
  niche: string;
  default_audience: string;
  default_tone: string;
  cover_color: string;
  is_system: boolean;
}

export interface TemplateList {
  system: Template[];
  user: Template[];
}
