CREATE TYPE "project_status" AS ENUM('active', 'completed', 'abandoned', 'archived');--> statement-breakpoint
CREATE TABLE "projects" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "projects_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"title" text NOT NULL,
	"context" text DEFAULT '' NOT NULL,
	"status" "project_status" DEFAULT 'active'::"project_status" NOT NULL,
	"priority" "priority_level" DEFAULT 'medium'::"priority_level" NOT NULL,
	"urgency" "priority_level" DEFAULT 'medium'::"priority_level" NOT NULL,
	"due_date" timestamp,
	"source" "task_source" DEFAULT 'manual'::"task_source" NOT NULL,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "project_id" integer NOT NULL;--> statement-breakpoint
CREATE INDEX "idx_projects_status" ON "projects" ("status");--> statement-breakpoint
CREATE INDEX "idx_projects_priority" ON "projects" ("priority");--> statement-breakpoint
CREATE INDEX "idx_projects_urgency" ON "projects" ("urgency");--> statement-breakpoint
CREATE INDEX "idx_projects_due" ON "projects" ("due_date");--> statement-breakpoint
CREATE INDEX "idx_tasks_project" ON "tasks" ("project_id");--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_project_id_projects_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE;