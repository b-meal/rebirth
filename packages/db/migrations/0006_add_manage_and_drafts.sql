-- 공개 여부와 진행 상태 분리, 익명 관리 권한, 초안 세션, 문의·법적 고지
-- 기존 status 를 두 축으로 옮기는 데이터 이관이 필요해 손으로 작성함
-- 0000~0005 는 배포된 스키마라 수정하지 않고 여기에만 붙임

CREATE TYPE "public"."visibility" AS ENUM('public', 'hidden', 'deleted');--> statement-breakpoint
CREATE TYPE "public"."lifecycle" AS ENUM('active', 'closed', 'searching', 'resolved');--> statement-breakpoint
CREATE TYPE "public"."location_source" AS ENUM('gps', 'place', 'manual_area');--> statement-breakpoint
CREATE TYPE "public"."area_code_system" AS ENUM('H', 'B');--> statement-breakpoint
CREATE TYPE "public"."close_reason" AS ENUM('found', 'duplicate', 'canceled', 'outdated', 'other');--> statement-breakpoint
CREATE TYPE "public"."upload_status" AS ENUM('processing', 'ready', 'failed');--> statement-breakpoint
CREATE TYPE "public"."consent_kind" AS ENUM('required_terms', 'required_privacy', 'optional_ai', 'optional_location');--> statement-breakpoint
CREATE TYPE "public"."support_request_kind" AS ENUM('manage_token_lost', 'deletion', 'correction', 'privacy_exposure', 'general');--> statement-breakpoint
CREATE TYPE "public"."support_status" AS ENUM('received', 'reviewing', 'need_more_info', 'answered', 'closed');--> statement-breakpoint
CREATE TYPE "public"."legal_doc_type" AS ENUM('privacy', 'terms', 'location', 'notice', 'safety_guide');--> statement-breakpoint
CREATE TYPE "public"."legal_doc_status" AS ENUM('draft', 'reviewing', 'scheduled', 'published', 'retired');--> statement-breakpoint

-- 신고 사유 7종과 판정 4종으로 확장. 기존 값은 그대로 유효함
ALTER TYPE "public"."flag_reason" ADD VALUE IF NOT EXISTS 'inappropriate';--> statement-breakpoint
ALTER TYPE "public"."flag_reason" ADD VALUE IF NOT EXISTS 'impersonation';--> statement-breakpoint
ALTER TYPE "public"."flag_resolution" ADD VALUE IF NOT EXISTS 'request_edit';--> statement-breakpoint
ALTER TYPE "public"."flag_resolution" ADD VALUE IF NOT EXISTS 'escalate';--> statement-breakpoint

/* reports. 두 축 분리와 위치 출처, 종료 기록 */

ALTER TABLE "reports" ADD COLUMN "visibility" "visibility" DEFAULT 'public' NOT NULL;--> statement-breakpoint
ALTER TABLE "reports" ADD COLUMN "lifecycle" "lifecycle" DEFAULT 'active' NOT NULL;--> statement-breakpoint
ALTER TABLE "reports" ADD COLUMN "version" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "reports" ADD COLUMN "manage_token_hash" text;--> statement-breakpoint
ALTER TABLE "reports" ADD COLUMN "manage_token_issued_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "reports" ADD COLUMN "manage_token_rotated_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "reports" ADD COLUMN "location_source" "location_source" DEFAULT 'manual_area' NOT NULL;--> statement-breakpoint
ALTER TABLE "reports" ADD COLUMN "location_accuracy_m" integer;--> statement-breakpoint
ALTER TABLE "reports" ADD COLUMN "area_code_system" "area_code_system";--> statement-breakpoint
ALTER TABLE "reports" ADD COLUMN "area_code_version" text;--> statement-breakpoint
ALTER TABLE "reports" ADD COLUMN "landmark_note" text;--> statement-breakpoint
ALTER TABLE "reports" ADD COLUMN "closed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "reports" ADD COLUMN "close_reason" "close_reason";--> statement-breakpoint
ALTER TABLE "reports" ADD COLUMN "close_note" text;--> statement-breakpoint

-- 기존 status 를 두 축으로 이관. hidden 만 비공개이고 나머지는 공개였음
-- draft 는 저장 전 상태가 남은 것이라 공개하지 않음
UPDATE "reports" SET "visibility" = CASE
  WHEN "status" = 'hidden' THEN 'hidden'::"visibility"
  WHEN "status" = 'draft' THEN 'hidden'::"visibility"
  ELSE 'public'::"visibility"
END;--> statement-breakpoint

-- matched 는 후보 있음이라는 계산값이었으므로 진행 상태로 옮기지 않음
-- 실종은 searching, 찾음은 resolved, 나머지는 active
UPDATE "reports" SET "lifecycle" = CASE
  WHEN "kind" = 'lost' AND "status" = 'resolved' THEN 'resolved'::"lifecycle"
  WHEN "kind" = 'lost' THEN 'searching'::"lifecycle"
  WHEN "status" = 'resolved' THEN 'closed'::"lifecycle"
  ELSE 'active'::"lifecycle"
END;--> statement-breakpoint

-- 기존 contact_token 을 관리 토큰 해시 자리로 옮김
-- 원문 토큰은 해시할 수 없으므로 값을 옮기지 않고 버림. 재발급으로만 복구됨
ALTER TABLE "reports" DROP COLUMN "contact_token";--> statement-breakpoint
ALTER TABLE "reports" DROP COLUMN "status";--> statement-breakpoint
DROP TYPE "public"."report_status";--> statement-breakpoint

ALTER TABLE "reports" ADD CONSTRAINT "reports_manageTokenHash_unique" UNIQUE("manage_token_hash");--> statement-breakpoint

-- 발견에 resolved, 실종에 active 가 들어오는 것을 DB 가 거부함
ALTER TABLE "reports" ADD CONSTRAINT "reports_lifecycle_by_kind" CHECK (("reports"."kind" = 'lost' and "reports"."lifecycle" in ('searching', 'resolved', 'closed'))
          or ("reports"."kind" <> 'lost' and "reports"."lifecycle" in ('active', 'closed')));--> statement-breakpoint
-- 수동 지역 선택은 정확 좌표를 만들어내지 않음. 허위 정밀도 방지
ALTER TABLE "reports" ADD CONSTRAINT "reports_manual_area_has_no_exact_point" CHECK ("reports"."location_source" <> 'manual_area' or "reports"."exact_point" is null);--> statement-breakpoint
-- 개 제보에 귀 끝 값이 들어오면 의미가 없음
ALTER TABLE "reports" ADD CONSTRAINT "reports_ear_tip_only_for_cats" CHECK ("reports"."animal_type" = 'cat' or "reports"."ear_tip" is null);--> statement-breakpoint

-- 같은 이름의 status 기반 인덱스는 열이 사라지며 함께 지워짐. 남아 있어도 지움
DROP INDEX IF EXISTS "reports_feed_idx";--> statement-breakpoint
CREATE INDEX "reports_feed_idx" ON "reports" USING btree ("kind","visibility","lifecycle","occurred_at" DESC NULLS LAST);--> statement-breakpoint

/* 초안 세션. 제출 전 사진·위치·AI 작업을 세션에 묶음 */

CREATE TABLE "draft_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"token_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	CONSTRAINT "draft_sessions_tokenHash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "draft_uploads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"status" "upload_status" DEFAULT 'processing' NOT NULL,
	"failure_code" text,
	"storage_path" text,
	"content_type" text,
	"bytes" integer,
	"width" integer,
	"height" integer,
	"revision" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"claimed_at" timestamp with time zone,
	"claimed_by_report_id" uuid,
	CONSTRAINT "draft_uploads_ready_has_path" CHECK ("draft_uploads"."status" <> 'ready' or "draft_uploads"."storage_path" is not null)
);
--> statement-breakpoint
CREATE TABLE "draft_locations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"source" "location_source" NOT NULL,
	"lat" text,
	"lng" text,
	"accuracy_m" integer,
	"area_code_system" "area_code_system",
	"area_code" text,
	"area_name" text,
	"area_code_version" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	CONSTRAINT "draft_locations_manual_area_has_no_point" CHECK ("draft_locations"."source" <> 'manual_area' or ("draft_locations"."lat" is null and "draft_locations"."lng" is null)),
	CONSTRAINT "draft_locations_point_pairs" CHECK (("draft_locations"."lat" is null) = ("draft_locations"."lng" is null))
);
--> statement-breakpoint
CREATE TABLE "analysis_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"upload_id" uuid NOT NULL,
	"revision" integer NOT NULL,
	"status" text DEFAULT 'running' NOT NULL,
	"result" jsonb,
	"failure_code" text,
	"model" text,
	"prompt_version" text,
	"latency_ms" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finished_at" timestamp with time zone,
	CONSTRAINT "analysis_jobs_upload_revision_uk" UNIQUE("upload_id","revision")
);
--> statement-breakpoint
CREATE TABLE "idempotency_keys" (
	"key" text PRIMARY KEY NOT NULL,
	"session_id" uuid NOT NULL,
	"report_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint

/* 익명 관리 권한 */

CREATE TABLE "manage_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"token_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone,
	CONSTRAINT "manage_sessions_tokenHash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "manage_grants" (
	"session_id" uuid NOT NULL,
	"report_id" uuid NOT NULL,
	"granted_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "manage_grants_session_id_report_id_pk" PRIMARY KEY("session_id","report_id")
);
--> statement-breakpoint
CREATE TABLE "consent_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"report_id" uuid NOT NULL,
	"kind" "consent_kind" NOT NULL,
	"document_version" text NOT NULL,
	"agreed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"withdrawn_at" timestamp with time zone
);
--> statement-breakpoint

/* 문의와 법적 고지 */

CREATE TABLE "support_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reference" text NOT NULL,
	"token_hash" text NOT NULL,
	"kind" "support_request_kind" NOT NULL,
	"status" "support_status" DEFAULT 'received' NOT NULL,
	"body" text NOT NULL,
	"related_report_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"due_at" timestamp with time zone,
	"closed_at" timestamp with time zone,
	CONSTRAINT "support_requests_reference_unique" UNIQUE("reference"),
	CONSTRAINT "support_requests_tokenHash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "support_replies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"request_id" uuid NOT NULL,
	"public_body" text,
	"internal_note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "flag_receipts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"flag_id" uuid NOT NULL,
	"reference" text NOT NULL,
	"token_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "flag_receipts_reference_unique" UNIQUE("reference"),
	CONSTRAINT "flag_receipts_tokenHash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "legal_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"doc_type" "legal_doc_type" NOT NULL,
	"version" text NOT NULL,
	"status" "legal_doc_status" DEFAULT 'draft' NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"change_summary" text,
	"effective_at" timestamp with time zone,
	"last_verified_at" timestamp with time zone,
	"source_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"published_at" timestamp with time zone,
	"retired_at" timestamp with time zone,
	CONSTRAINT "legal_documents_published_has_effective_at" CHECK ("legal_documents"."status" <> 'published' or "legal_documents"."effective_at" is not null)
);
--> statement-breakpoint

/* 외래키 */

ALTER TABLE "draft_uploads" ADD CONSTRAINT "draft_uploads_session_id_draft_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."draft_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "draft_uploads" ADD CONSTRAINT "draft_uploads_claimed_by_report_id_reports_id_fk" FOREIGN KEY ("claimed_by_report_id") REFERENCES "public"."reports"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "draft_locations" ADD CONSTRAINT "draft_locations_session_id_draft_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."draft_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "analysis_jobs" ADD CONSTRAINT "analysis_jobs_session_id_draft_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."draft_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "analysis_jobs" ADD CONSTRAINT "analysis_jobs_upload_id_draft_uploads_id_fk" FOREIGN KEY ("upload_id") REFERENCES "public"."draft_uploads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "idempotency_keys" ADD CONSTRAINT "idempotency_keys_session_id_draft_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."draft_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "idempotency_keys" ADD CONSTRAINT "idempotency_keys_report_id_reports_id_fk" FOREIGN KEY ("report_id") REFERENCES "public"."reports"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "manage_grants" ADD CONSTRAINT "manage_grants_session_id_manage_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."manage_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "manage_grants" ADD CONSTRAINT "manage_grants_report_id_reports_id_fk" FOREIGN KEY ("report_id") REFERENCES "public"."reports"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consent_records" ADD CONSTRAINT "consent_records_report_id_reports_id_fk" FOREIGN KEY ("report_id") REFERENCES "public"."reports"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_replies" ADD CONSTRAINT "support_replies_request_id_support_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."support_requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "flag_receipts" ADD CONSTRAINT "flag_receipts_flag_id_report_flags_id_fk" FOREIGN KEY ("flag_id") REFERENCES "public"."report_flags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint

/* 인덱스 */

CREATE INDEX "draft_sessions_expiry_idx" ON "draft_sessions" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "draft_uploads_session_idx" ON "draft_uploads" USING btree ("session_id","created_at");--> statement-breakpoint
CREATE INDEX "draft_uploads_sweep_idx" ON "draft_uploads" USING btree ("claimed_at","expires_at");--> statement-breakpoint
CREATE INDEX "draft_locations_session_idx" ON "draft_locations" USING btree ("session_id","created_at");--> statement-breakpoint
CREATE INDEX "draft_locations_sweep_idx" ON "draft_locations" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "analysis_jobs_session_idx" ON "analysis_jobs" USING btree ("session_id","created_at");--> statement-breakpoint
CREATE INDEX "idempotency_keys_sweep_idx" ON "idempotency_keys" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "manage_sessions_expiry_idx" ON "manage_sessions" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "manage_grants_report_idx" ON "manage_grants" USING btree ("report_id");--> statement-breakpoint
CREATE INDEX "consent_records_report_idx" ON "consent_records" USING btree ("report_id","kind");--> statement-breakpoint
CREATE INDEX "support_requests_queue_idx" ON "support_requests" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "support_requests_report_idx" ON "support_requests" USING btree ("related_report_id");--> statement-breakpoint
CREATE INDEX "support_replies_request_idx" ON "support_replies" USING btree ("request_id","created_at");--> statement-breakpoint
CREATE INDEX "flag_receipts_flag_idx" ON "flag_receipts" USING btree ("flag_id");--> statement-breakpoint
CREATE UNIQUE INDEX "legal_documents_type_version_uk" ON "legal_documents" USING btree ("doc_type","version");--> statement-breakpoint
CREATE INDEX "legal_documents_lookup_idx" ON "legal_documents" USING btree ("doc_type","status","effective_at");
