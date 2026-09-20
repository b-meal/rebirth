export {
  AUTH_PROVIDERS,
  findProvider,
  type ProviderDescriptor,
  type SnsProvider,
} from "./providers";

export {
  toIdentity,
  type Identity,
  type SupabaseUserLike,
} from "./identity";

export {
  IDLE_LIMIT_DAYS,
  LAST_SEEN_COOKIE,
  LAST_SEEN_MAX_AGE_SECONDS,
  isIdleExpired,
  shouldRefreshSeenAt,
} from "./idle-session";

export {
  AUTO_SIGN_IN_ENV,
  isAutoSignInEnabled,
  shouldAutoSignIn,
  type AutoSignInRequest,
} from "./auto-sign-in";

export {
  AUTH_CALLBACK_PATH,
  AUTH_GUEST_PATH,
  HOME_PATH,
  NEXT_PARAM,
  SIGN_IN_PATH,
  isAuthFlowPath,
  isProtectedPath,
  isPublicPath,
  safeNextPath,
} from "./route-policy";
