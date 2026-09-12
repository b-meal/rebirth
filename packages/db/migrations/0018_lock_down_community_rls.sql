-- 0002 와 같은 이유로 새 테이블도 PostgREST 직접 접근을 막음
-- 커뮤니티 글에 작성자 계정 id 가 들어 있어 anon 키로 새면 누가 무엇을 썼는지 드러남
-- 공감과 댓글은 계정 단위라 더 직접적으로 개인의 활동 기록이 됨
ALTER TABLE "community_posts" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "community_post_photos" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "community_comments" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "community_post_likes" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
REVOKE ALL ON TABLE "community_posts" FROM anon, authenticated;
--> statement-breakpoint
REVOKE ALL ON TABLE "community_post_photos" FROM anon, authenticated;
--> statement-breakpoint
REVOKE ALL ON TABLE "community_comments" FROM anon, authenticated;
--> statement-breakpoint
REVOKE ALL ON TABLE "community_post_likes" FROM anon, authenticated;
