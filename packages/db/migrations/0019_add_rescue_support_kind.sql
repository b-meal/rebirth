-- 다친 동물 구조 요청을 일반 문의와 구분해 받기 위한 값
-- general 앞에 두어 스키마 파일의 나열 순서와 같게 맞춤
-- 이미 있으면 건너뛰므로 다시 돌려도 깨지지 않음
ALTER TYPE "public"."support_request_kind" ADD VALUE IF NOT EXISTS 'rescue' BEFORE 'general';
