// catch-all 은 빈 경로를 잡지 않으므로 목록과 등록은 여기서 받음
export {
  createReportHandler as POST,
  listReportsHandler as GET,
} from "@rebirth/core/reports";
