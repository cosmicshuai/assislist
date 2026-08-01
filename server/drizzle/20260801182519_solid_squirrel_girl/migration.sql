CREATE TYPE "priority_level" AS ENUM('low', 'medium', 'high', 'urgent');--> statement-breakpoint
CREATE TYPE "task_source" AS ENUM('manual', 'whatsapp');--> statement-breakpoint
CREATE TYPE "task_status" AS ENUM('active', 'completed');--> statement-breakpoint
CREATE TABLE "task_dependencies" (
	"task_id" integer,
	"depends_on_task_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "task_dependencies_pkey" PRIMARY KEY("task_id","depends_on_task_id"),
	CONSTRAINT "ck_no_self_dependency" CHECK (task_id <> depends_on_task_id)
);
--> statement-breakpoint
CREATE TABLE "tasks" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "tasks_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"title" text NOT NULL,
	"context" text DEFAULT '' NOT NULL,
	"status" "task_status" DEFAULT 'active'::"task_status" NOT NULL,
	"priority" "priority_level" DEFAULT 'medium'::"priority_level" NOT NULL,
	"urgency" "priority_level" DEFAULT 'medium'::"priority_level" NOT NULL,
	"due_date" timestamp,
	"parent_id" integer,
	"source" "task_source" DEFAULT 'manual'::"task_source" NOT NULL,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "uq_task_dependencies" ON "task_dependencies" ("task_id","depends_on_task_id");--> statement-breakpoint
CREATE INDEX "idx_tasks_status" ON "tasks" ("status");--> statement-breakpoint
CREATE INDEX "idx_tasks_priority" ON "tasks" ("priority");--> statement-breakpoint
CREATE INDEX "idx_tasks_urgency" ON "tasks" ("urgency");--> statement-breakpoint
CREATE INDEX "idx_tasks_parent" ON "tasks" ("parent_id");--> statement-breakpoint
CREATE INDEX "idx_tasks_due" ON "tasks" ("due_date");--> statement-breakpoint
ALTER TABLE "task_dependencies" ADD CONSTRAINT "task_dependencies_task_id_tasks_id_fkey" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "task_dependencies" ADD CONSTRAINT "task_dependencies_depends_on_task_id_tasks_id_fkey" FOREIGN KEY ("depends_on_task_id") REFERENCES "tasks"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_parent_id_tasks_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "tasks"("id") ON DELETE CASCADE;