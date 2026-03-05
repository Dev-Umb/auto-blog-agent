import {
  pgTable,
  serial,
  text,
  integer,
  boolean,
  timestamp,
  jsonb,
  real,
  date,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const persona = pgTable("persona", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  avatarUrl: text("avatar_url"),
  config: jsonb("config").notNull(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const posts = pgTable("posts", {
  id: serial("id").primaryKey(),
  personaId: integer("persona_id").references(() => persona.id),
  title: text("title").notNull(),
  slug: text("slug").unique().notNull(),
  content: text("content").notNull(),
  summary: text("summary"),
  tags: text("tags").array(),
  mood: text("mood"),
  wordCount: integer("word_count"),
  readTime: integer("read_time"),
  status: text("status").default("published"),
  feelReport: jsonb("feel_report"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const comments = pgTable("comments", {
  id: serial("id").primaryKey(),
  postId: integer("post_id")
    .references(() => posts.id)
    .notNull(),
  parentId: integer("parent_id"),
  authorName: text("author_name").notNull(),
  authorEmail: text("author_email"),
  content: text("content").notNull(),
  isAgent: boolean("is_agent").default(false),
  isReplied: boolean("is_replied").default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const agentStatus = pgTable("agent_status", {
  id: serial("id").primaryKey(),
  cycleName: text("cycle_name").notNull(),
  status: text("status").notNull(),
  currentTask: text("current_task"),
  details: jsonb("details"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const metaMemory = pgTable("meta_memory", {
  id: serial("id").primaryKey(),
  category: text("category").notNull(),
  key: text("key").notNull(),
  value: jsonb("value").notNull(),
  version: integer("version").default(1),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const tokenUsage = pgTable(
  "token_usage",
  {
    id: serial("id").primaryKey(),
    date: date("date").notNull(),
    cycleName: text("cycle_name").notNull(),
    model: text("model"),
    inputTokens: integer("input_tokens").default(0),
    outputTokens: integer("output_tokens").default(0),
    totalTokens: integer("total_tokens").default(0),
    estimatedCost: real("estimated_cost").default(0),
    runCount: integer("run_count").default(1),
    details: jsonb("details"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [uniqueIndex("idx_token_usage_date_cycle_model").on(table.date, table.cycleName, table.model)]
);

export const systemHealth = pgTable("system_health", {
  id: serial("id").primaryKey(),
  service: text("service").notNull(),
  status: text("status").notNull(),
  responseTimeMs: integer("response_time_ms"),
  errorMessage: text("error_message"),
  details: jsonb("details"),
  checkedAt: timestamp("checked_at", { withTimezone: true }).defaultNow(),
});

export const alerts = pgTable("alerts", {
  id: serial("id").primaryKey(),
  severity: text("severity").notNull(),
  category: text("category").notNull(),
  message: text("message").notNull(),
  details: jsonb("details"),
  acknowledged: boolean("acknowledged").default(false),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export type Post = typeof posts.$inferSelect;
export type NewPost = typeof posts.$inferInsert;
export type Comment = typeof comments.$inferSelect;
export type NewComment = typeof comments.$inferInsert;
export type AgentStatus = typeof agentStatus.$inferSelect;
export type TokenUsage = typeof tokenUsage.$inferSelect;
export type SystemHealth = typeof systemHealth.$inferSelect;
export type Alert = typeof alerts.$inferSelect;
