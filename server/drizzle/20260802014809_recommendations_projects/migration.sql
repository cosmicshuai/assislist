ALTER TABLE "recommendations" ADD COLUMN "project_id" integer;--> statement-breakpoint
ALTER TABLE "recommendations" ALTER COLUMN "task_id" DROP NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "uq_recommendations_kind_project" ON "recommendations" ("kind","project_id");--> statement-breakpoint
ALTER TABLE "recommendations" ADD CONSTRAINT "recommendations_project_id_projects_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "recommendations" ADD CONSTRAINT "ck_recommendation_target" CHECK ((task_id IS NOT NULL) OR (project_id IS NOT NULL));