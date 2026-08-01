CREATE TYPE "recommendation_kind" AS ENUM('top_next', 'long_term');--> statement-breakpoint
CREATE TYPE "recommendation_source" AS ENUM('engine', 'agent');--> statement-breakpoint
CREATE TABLE "recommendations" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "recommendations_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"task_id" integer NOT NULL,
	"kind" "recommendation_kind" NOT NULL,
	"rank" integer DEFAULT 0 NOT NULL,
	"reason" text DEFAULT '' NOT NULL,
	"source" "recommendation_source" DEFAULT 'engine'::"recommendation_source" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "uq_recommendations_kind_task" ON "recommendations" ("kind","task_id");--> statement-breakpoint
CREATE INDEX "idx_recommendations_kind_rank" ON "recommendations" ("kind","rank");--> statement-breakpoint
ALTER TABLE "recommendations" ADD CONSTRAINT "recommendations_task_id_tasks_id_fkey" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE CASCADE;