import { useState } from 'react';
import { supabase } from '../lib/supabase';

interface SendMessageModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedUsers: any[];
  onSuccess: () => void;
}

export function SendMessageModal({ isOpen, onClose, selectedUsers, onSuccess }: SendMessageModalProps) {
  const [message, setMessage] = useState('');
  const [type, setType] = useState('info');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSend = async () => {
    if (!message.trim()) {
      setError('Message cannot be empty.');
      return;
    }
    if (selectedUsers.length === 0) {
      setError('No users selected.');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const updates = selectedUsers.map(u => ({
        user_id: u.id || u.user_id, // depends on profiles schema
        message: message.trim(),
        type: type,
        is_read: false
      }));

      const { error: insertError } = await supabase
        .from('notifications')
        .insert(updates);

      if (insertError) throw insertError;

      onSuccess();
      onClose();
      setMessage('');
    } catch (err: any) {
      setError(err.message || 'Failed to send messages.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-surface rounded-3xl p-6 w-full max-w-lg shadow-xl border border-surface-container relative">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-on-surface-variant hover:text-error transition-colors"
        >
          <span className="material-symbols-outlined">close</span>
        </button>
        
        <h3 className="text-xl font-headline font-bold text-emerald-950 mb-1">Send Broadcast</h3>
        <p className="text-xs text-on-surface-variant mb-6">
          Sending notification to <span className="font-bold text-primary">{selectedUsers.length}</span> selected {selectedUsers.length === 1 ? 'user' : 'users'}.
        </p>
        
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider pl-1">Notification Type</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full bg-surface-container py-3 px-4 rounded-xl text-on-surface font-semibold focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all border border-transparent focus:border-primary/30"
            >
              <option value="info">Information Update</option>
              <option value="alert">Critical Alert</option>
              <option value="success">Success / Reward</option>
              <option value="warning">Warning</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider pl-1">Message Body</label>
            <textarea 
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              placeholder="Enter the notification message..."
              className="w-full bg-surface-container py-3 px-4 rounded-xl text-on-surface text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all border border-transparent focus:border-primary/30 resize-none"
            />
          </div>

          {error && <p className="text-error text-sm font-semibold">{error}</p>}

          <button 
            onClick={handleSend}
            disabled={isLoading || !message.trim()}
            className="w-full bg-primary text-white py-3 rounded-xl font-bold mt-4 hover:bg-emerald-800 transition-colors active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isLoading ? 'Dispatching...' : (
              <>
                <span className="material-symbols-outlined text-[18px]">send</span>
                Send to {selectedUsers.length} Users
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
