export type User={
    id:string
    name:string,
    email:string,
    is_verified:boolean,
    created_at:Date
}
export type workspace={
    id:string,
    name:string,
    slug:string,
    owner_id:string,
    created_at:string,
}
export type workspacePageInfo={
    workspace_id:string,
    name:string,
    slug:string,
    description:string,
    owner_id:string,
    created_at:string,
    role:"owner" |"admin" |"member"
}
export type project={
    id:string,
    workspace_id:string,
    name:string,
    description:string,
    status:"active" | "completed",
    created_by:string,
    created_at:string,
}
export type workspace_member={
    workspace_id:string,
    user_id:string,
    role:"admin" | "owner" | "member",
    joined_at:Date,
    name?:string,
}
export type tasks={
    id:string,
    project_id:string,
    parent_task_id?:string,
    title:string,
    description:string,
    status:"todo" | "in_progress" | "in_review" |"done",
    priority:"low" | "medium" | "high",
    assignee_id:string,
    created_by:string,
    due_date:string,
    position:number,
    review_remarks?:string | null,
    created_at:string
}

export type WebsocketServerMessages={
    type:string,
    category:string,
    payload?:any,
    [key: string]: any
}


export type FileRecord = {
  id: string;
  name: string;
  url: string;
  key: string;
  size: number | null;
  type: string | null;
  uploaded_by: string;
  workspace_id: string;
  project_id: string | null;
  task_id: string | null;
  created_at: string;
};