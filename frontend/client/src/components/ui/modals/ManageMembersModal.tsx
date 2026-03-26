import React from "react";

export function ManageMembersModal({ onClose }: { onClose?: () => void }) {
  return (
    <div className="fixed inset-0 bg-inverse-surface/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-surface-container-lowest rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl relative">
        <div className="p-6 border-b border-outline-variant/10 flex items-center justify-between bg-surface-container-lowest">
          <h3 className="font-headline font-extrabold text-xl text-on-surface tracking-tight">Manage Members</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-error-container/20 hover:text-error transition-colors">
            <span className="material-symbols-outlined text-sm">close</span>
          </button>
        </div>
        
        <div className="p-6">
          <div className="flex gap-2 mb-6">
            <input type="email" placeholder="Email address..." className="flex-1 bg-surface-container-low border-none rounded-lg px-4 py-3 text-sm text-on-surface focus:ring-2 focus:ring-primary/20 transition-all outline-none" />
            <select className="bg-surface-container-low border-none rounded-lg px-4 py-3 text-sm text-on-surface font-semibold focus:ring-2 focus:ring-primary/20 transition-all outline-none appearance-none cursor-pointer">
              <option>Editor</option>
              <option>Viewer</option>
              <option>Admin</option>
            </select>
            <button className="bg-primary text-white px-6 py-3 rounded-lg font-bold text-sm hover:opacity-90 transition-opacity">Invite</button>
          </div>
          
          <h4 className="text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-4">Current Members</h4>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-xl hover:bg-surface-container-low transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white font-bold text-sm">AR</div>
                <div>
                  <p className="font-bold text-sm text-on-surface">Alex Rivera</p>
                  <p className="text-xs text-on-surface-variant">alex@example.com <span className="text-outline mx-1">•</span> <span className="text-primary font-bold">Workspace Owner</span></p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center justify-between p-3 rounded-xl hover:bg-surface-container-low transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-white font-bold text-sm">SC</div>
                <div>
                  <p className="font-bold text-sm text-on-surface">Sarah Chen</p>
                  <p className="text-xs text-on-surface-variant">sarah@example.com</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="bg-surface-container-high text-on-surface-variant text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider">Editor</span>
                <button className="w-8 h-8 rounded-full flex items-center justify-center text-on-surface-variant hover:text-error hover:bg-error-container/10 transition-colors"><span className="material-symbols-outlined text-sm">person_remove</span></button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
