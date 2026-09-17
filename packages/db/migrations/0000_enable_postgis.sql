-- geometry 컬럼과 GiST 반경 검색에 필요. search_path 의존을 없애려 public 에 설치
CREATE EXTENSION IF NOT EXISTS postgis;
