import { createCatchAll } from "@rebirth/core/http";
import {
  createFlagHandler,
  getReportHandler,
  getReportPhotoHandler,
  shareReportHandler,
} from "@rebirth/core/reports";

// 공개 제보 상세와 부수 동작. 함수 하나로 묶어 배포 함수 수를 아낌
export const { GET, POST } = createCatchAll({
  GET: {
    ":id": getReportHandler,
    ":id/photo": getReportPhotoHandler,
  },
  POST: {
    ":id/flag": createFlagHandler,
    ":id/share": shareReportHandler,
  },
});
