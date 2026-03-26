import React from 'react';

export function DeleteTaskModal({ onClose }: { onClose?: () => void }) {
  return (
    <div className="fixed inset-0 bg-inverse-surface/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-surface-container-lowest rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
        <div className="p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-error-container/30 flex items-center justify-center mx-auto mb-6">
            <span className="material-symbols-outlined text-error text-3xl">warning</span>
          </div>
          <h3 className="font-headline font-extrabold text-xl text-on-surface mb-3">Delete this task?</h3>
          <p className="text-sm text-on-surface-variant leading-relaxed mb-8">This action cannot be undone. The task and all its associated data will be permanently removed from this project.</p>
          
          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 px-4 py-3 rounded-lg font-bold text-sm text-on-surface hover:bg-surface-container-low transition-colors border border-outline-variant/20">Cancel</button>
            <button className="flex-1 px-4 py-3 bg-error rounded-lg font-bold text-sm text-white hover:bg-error/90 transition-colors shadow-sm">Delete Task</button>
          </div>
        </div>
      </div>
    </div>
  );
}
