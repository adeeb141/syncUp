import { create } from "zustand";

export interface InviteNotification {
  id: string; // invite_id
  workspace_id: string;
  workspace_name: string;
  invited_by_name: string;
  invited_by_email: string;
}

type Notification = {
  id: string;
  message: string;
  type: string;
};

type StoreType = {
  notifications: Notification[],
  invites: InviteNotification[],
  pushNotification: (value: Notification) => void,
  removeNotification: (id: string) => void,
  setInvites: (invites: InviteNotification[]) => void,
  addInvite: (invite: InviteNotification) => void,
  removeInvite: (id: string) => void,
  clearAll: () => void
};

export const useNotificationStore = create<StoreType>((set) => ({
  notifications: [],
  invites: [],
  pushNotification: (notification) => {
    set((state) => ({ notifications: [...state.notifications, notification] }));
  },
  removeNotification: (id) => {
    set((state) => ({ notifications: state.notifications.filter(val => val.id !== id) }))
  },
  setInvites: (invites) => {
    set({ invites });
  },
  addInvite: (invite) => {
    set((state) => {
      if (state.invites.some((i) => i.id === invite.id)) return state;
      return { invites: [...state.invites, invite] };
    });
  },
  removeInvite: (id) => {
    set((state) => ({ invites: state.invites.filter((val) => val.id !== id) }));
  },
  clearAll: () => {
    set({ notifications: [], invites: [] });
  },
}));
