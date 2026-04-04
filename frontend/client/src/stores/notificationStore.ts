import { create } from "zustand";

type Notification = {
  id: string;
  message: string;
  type: string;
};

type StoreType = {
  notifications:Notification[],
  pushNotification:(value:Notification)=>void,
  removeNotification:(id:string)=>void
};

export const useNotificationStore = create<StoreType>((set) => ({
  notifications:[],
  pushNotification:(notification:Notification)=>{
    set((state)=>({notifications:[...state.notifications,notification]}));
  },
  removeNotification:(id:string)=>{
    set((state)=>({notifications:state.notifications.filter(val=>val.id!==id)}))
  }
}));