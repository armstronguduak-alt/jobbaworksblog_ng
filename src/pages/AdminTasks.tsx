import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useDialog } from '../contexts/DialogContext';

export function AdminTasks() {
  const { isAdmin, isLoading: authLoading } = useAuth();
  const { showAlert } = useDialog();

  const [tasks] = useState([
    // Empty state for now
  ]);

  if (authLoading) return <div className="p-10 text-center">Loading admin check...</div>;
  if (!isAdmin) return <Navigate to="/dashboard" replace />;

  return (
    <main className="max-w-6xl mx-auto px-4 md:px-6 pt-10 pb-32">
      <div className="flex justify-between items-start mb-10">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-[#0f172a] tracking-tight mb-1 font-headline">
            Task Management
          </h1>
          <p className="text-outline text-sm md:text-base">
            Create daily tasks and bounties for users.
          </p>
        </div>
        
        <button 
          onClick={() => Object(showAlert)('New task modal will open here')}
          className="bg-[#0f172a] hover:bg-[#1e293b] text-white px-5 py-2.5 rounded-[12px] font-bold flex items-center gap-2 transition-transform shadow-sm whitespace-nowrap text-sm"
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          New Task
        </button>
      </div>

      <div className="bg-transparent overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-white rounded-full shadow-sm border border-surface-container-low text-[#49454f]">
                <th className="py-4 px-6 font-black text-[10px] md:text-xs uppercase tracking-[0.15em] rounded-l-full">TASK DETAILS</th>
                <th className="py-4 px-6 font-black text-[10px] md:text-xs uppercase tracking-[0.15em]">TYPE/TARGET</th>
                <th className="py-4 px-6 font-black text-[10px] md:text-xs uppercase tracking-[0.15em]">REWARD</th>
                <th className="py-4 px-6 font-black text-[10px] md:text-xs uppercase tracking-[0.15em]">PLAN / TIME</th>
                <th className="py-4 px-6 font-black text-[10px] md:text-xs uppercase tracking-[0.15em]">STATUS</th>
                <th className="py-4 px-6 font-black text-[10px] md:text-xs uppercase tracking-[0.15em] text-right rounded-r-full">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="before:content-[''] before:block before:h-4">
              {tasks.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center text-outline">
                    <p className="font-bold text-lg">No tasks yet</p>
                  </td>
                </tr>
              ) : (
                tasks.map((task: any) => (
                  <tr key={task.id} className="border-b border-surface-container-low hover:bg-surface-container-low/30 transition-colors">
                    <td className="py-4 px-6">{task.details}</td>
                    <td className="py-4 px-6">{task.type}</td>
                    <td className="py-4 px-6">{task.reward}</td>
                    <td className="py-4 px-6">{task.plan}</td>
                    <td className="py-4 px-6">{task.status}</td>
                    <td className="py-4 px-6 text-right">
                      {/* Actions */}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
