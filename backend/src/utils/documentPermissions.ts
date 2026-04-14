export type DocumentAccess = "view_only" | "open_collab" | "selective";

export function canUserEditDocument(params: {
  access: DocumentAccess;
  createdBy: string;
  userId: string;
  isCollaborator: boolean;
}): boolean {
  const { access, createdBy, userId, isCollaborator } = params;

  if (createdBy === userId) return true;
  if (access === "open_collab") return true;
  if (access === "selective" && isCollaborator) return true;

  return false;
}
