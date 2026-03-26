import React from 'react';

export function AddTaskModal({ onClose }: { onClose?: () => void }) {
  return (
    <div className="fixed inset-0 bg-inverse-surface/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-surface-container-lowest rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl">
        <div className="p-6 border-b border-outline-variant/10 flex items-center justify-between">
          <h3 className="font-headline font-extrabold text-xl text-on-surface tracking-tight">Add New Task</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-error-container/20 hover:text-error transition-colors">
            <span className="material-symbols-outlined text-sm">close</span>
          </button>
        </div>
        
        <div className="p-6 space-y-6">
          <div>
            <label className="block text-[10px] font-bold uppercase text-on-surface-variant mb-2 tracking-wider">Task Title</label>
            <input type="text" placeholder="e.g., Design homepage hero section" className="w-full bg-surface-container-low border-none rounded-lg px-4 py-3 text-sm text-on-surface font-semibold focus:ring-2 focus:ring-primary/20 transition-all outline-none" />
          </div>
          
          <div>
             <label className="block text-[10px] font-bold uppercase text-on-surface-variant mb-2 tracking-wider">Description</label>
             <textarea rows={4} placeholder="Add more details about this task..." className="w-full bg-surface-container-low border-none rounded-lg px-4 py-3 text-sm text-on-surface focus:ring-2 focus:ring-primary/20 transition-all outline-none resize-none"></textarea>
          </div>
          
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-[10px] font-bold uppercase text-on-surface-variant mb-2 tracking-wider">Status</label>
               <select className="w-full bg-surface-container-low border-none rounded-lg px-4 py-3 text-sm text-on-surface font-semibold focus:ring-2 focus:ring-primary/20 transition-all outline-none appearance-none cursor-pointer">
                  <option>To Do</option>
                  <option>In Progress</option>
                  <option>Done</option>
               </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase text-on-surface-variant mb-2 tracking-wider">Priority</label>
              <select className="w-full bg-surface-container-low border-none rounded-lg px-4 py-3 text-sm text-on-surface font-semibold focus:ring-2 focus:ring-primary/20 transition-all outline-none appearance-none cursor-pointer">
                 <option>Low</option>
                 <option>Medium</option>
                 <option>High</option>
              </select>
            </div>
          </div>
        </div>
        
        <div className="p-6 border-t border-outline-variant/10 flex items-center justify-end gap-3 bg-surface-container-lowest">
          <button onClick={onClose} className="px-6 py-2.5 rounded-lg font-bold text-sm text-on-surface-variant hover:bg-surface-container-low transition-colors">Cancel</button>
          <button className="px-6 py-2.5 bg-gradient-to-br from-primary to-primary-dim rounded-lg font-bold text-sm text-white shadow-sm hover:opacity-90 transition-opacity flex items-center gap-2">
            Create Task
          </button>
        </div>
      </div>
    </div>
  );
}
