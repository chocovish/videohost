export type Role = "OWNER" | "ADMIN" | "MEMBER" | "VIEWER";

export type Action =
  | "org.delete"
  | "org.manage_billing"
  | "members.manage"
  | "apikeys.manage"
  | "webhooks.manage"
  | "videos.upload"
  | "videos.delete_any"
  | "videos.delete_own"
  | "org.edit_settings"
  | "videos.view";

export interface MembershipContext {
  userId: string;
  role: Role;
}

export function can(
  action: Action,
  membership: MembershipContext,
  resourceOwnerId?: string
): boolean {
  const { role, userId } = membership;

  switch (action) {
    case "org.delete":
    case "org.manage_billing":
      return role === "OWNER";

    case "members.manage":
    case "apikeys.manage":
    case "webhooks.manage":
    case "org.edit_settings":
    case "videos.delete_any":
      return role === "OWNER" || role === "ADMIN";

    case "videos.upload":
      return role === "OWNER" || role === "ADMIN" || role === "MEMBER";

    case "videos.delete_own":
      if (role === "OWNER" || role === "ADMIN") return true;
      if (role === "MEMBER" && resourceOwnerId && resourceOwnerId === userId) return true;
      return false;

    case "videos.view":
      return true; // All org members can view & play videos

    default:
      return false;
  }
}
