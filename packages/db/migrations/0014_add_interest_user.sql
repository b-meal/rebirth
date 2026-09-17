-- 로그인 상태로 누른 관심을 마이페이지에서 모아 보기 위한 계정 열
-- 0013 스냅숏에 user_profiles 가 빠져 있어 생성문이 함께 나왔고 이미 있는 것은 지움
ALTER TABLE "report_interests" ADD COLUMN "user_id" uuid;--> statement-breakpoint
CREATE INDEX "report_interests_user_idx" ON "report_interests" USING btree ("user_id","created_at" DESC NULLS LAST);
