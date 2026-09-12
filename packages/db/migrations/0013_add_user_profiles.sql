-- SNS 로그인 계정의 서비스 측 프로필. 0000~0007 은 배포된 스키마라 손대지 않고 여기에만 붙임
-- 신원 확인과 토큰 갱신은 Supabase Auth(auth.users)가 맡고 이 테이블은 표시 정보만 둠
-- auth.users 에 FK 를 걸지 않음. Supabase 관리 스키마에 마이그레이션이 묶이지 않게 함

CREATE TYPE "public"."auth_provider" AS ENUM('google', 'kakao');--> statement-breakpoint

CREATE TABLE "user_profiles" (
  "id" uuid PRIMARY KEY NOT NULL,
  "provider" "auth_provider" NOT NULL,
  "display_name" text,
  "avatar_url" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "last_signed_in_at" timestamp with time zone DEFAULT now() NOT NULL,
  "deleted_at" timestamp with time zone
);--> statement-breakpoint

CREATE INDEX "user_profiles_last_signed_in_idx" ON "user_profiles" ("last_signed_in_at");--> statement-breakpoint

-- 0002·0007 과 같은 이유로 PostgREST 직접 접근을 막음
-- 서비스 접근은 Next.js 서버가 DATABASE_URL 로만 수행함
ALTER TABLE "user_profiles" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
REVOKE ALL ON TABLE "user_profiles" FROM anon, authenticated;
