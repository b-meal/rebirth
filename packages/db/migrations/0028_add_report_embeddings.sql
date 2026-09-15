-- 의미 벡터 열과 HNSW 코사인 검색에 필요. 0000 의 postgis 와 같은 이유로 public 에 설치
CREATE EXTENSION IF NOT EXISTS vector;--> statement-breakpoint
CREATE TABLE "report_embeddings" (
	"report_id" uuid PRIMARY KEY NOT NULL,
	"embedding" vector(384) NOT NULL,
	"source_text" text NOT NULL,
	"model" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "report_embeddings" ADD CONSTRAINT "report_embeddings_report_id_reports_id_fk" FOREIGN KEY ("report_id") REFERENCES "public"."reports"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "report_embeddings_cos_idx" ON "report_embeddings" USING hnsw ("embedding" vector_cosine_ops);