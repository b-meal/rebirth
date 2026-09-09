import { createCatchAll } from "@rebirth/core/http";
import {
  closeManagedReportHandler,
  deleteManagedReportHandler,
  exchangeManageTokenHandler,
  getManagedReportHandler,
  listManagedReportsHandler,
  recordResolutionHandler,
  rotateManageTokenHandler,
  signOutManageHandler,
  updateManagedReportHandler,
} from "@rebirth/core/manage";

// 관리 경로. 모든 핸들러가 관리 세션 쿠키를 먼저 확인함
export const { GET, POST, PATCH, DELETE } = createCatchAll({
  GET: {
    reports: listManagedReportsHandler,
    "reports/:id": getManagedReportHandler,
  },
  POST: {
    exchange: exchangeManageTokenHandler,
    signout: signOutManageHandler,
    "reports/:id/close": closeManagedReportHandler,
    "reports/:id/rotate": rotateManageTokenHandler,
    "reports/:id/resolution": recordResolutionHandler,
  },
  PATCH: {
    "reports/:id": updateManagedReportHandler,
  },
  DELETE: {
    "reports/:id": deleteManagedReportHandler,
  },
});
