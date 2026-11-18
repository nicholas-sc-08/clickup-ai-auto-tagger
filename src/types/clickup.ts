export interface ClickUpCustomFieldOption {
  id: string;
  name: string;
  color?: string | null;
  orderindex?: number;
}

export interface ClickUpCustomField {
  id: string;
  name: string;
  type: string;
  type_config?: { options?: ClickUpCustomFieldOption[]; [key: string]: unknown };
  date_created?: string;
  hide_from_guests?: boolean;
  required?: boolean;
  value?: string | number | boolean | null;
}

export interface ClickUpTask {
  id: string;
  name: string;
  description?: string | null;
  text_content?: string | null;
  url?: string;
  custom_fields?: ClickUpCustomField[];
  [key: string]: unknown;
}

export interface ClickUpWebhookEvent {
  event: string;
  task_id?: string;
  webhook_id?: string;
  history_items?: Array<{ id?: string; type?: number; date?: string; field?: { id?: string; name?: string }; [key: string]: unknown }>;
  [key: string]: unknown;
}

export interface ClickUpWebhook {
  id: string;
  userid?: number;
  team_id: string;
  endpoint: string;
  events: string[];
  health?: { status: string; fail_count?: number };
  secret?: string;
}

export interface ClickUpApiError {
  err?: string;
  ECODE?: string;
}
