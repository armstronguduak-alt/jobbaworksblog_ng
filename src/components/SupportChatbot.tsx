import { useState, useEffect, useRef } from 'react';

const COMMON_RESPONSES: Record<string, string> = {
  'withdraw': 'To withdraw, go to your Wallet tab, ensure you have above ₦1,000, select your default payment method, and click "Submit Withdrawal Request".',
  'password': 'You can change your password in the Settings menu under the Account & Security section.',
  '2fa': 'To secure your account, navigate to Settings and toggle Two-Factor Auth. You will need a Google Authenticator app.',
  'refer': 'Your unique referral code is located in the Referrals tab. Share it to earn commissions on every new active user!',
  'plan': 'Upgrading your plan opens up higher earning multipliers. Head over to the Plans section to view current deals.',
  'hello': 'Hi there! I am the JobbaWorks automated assistant. How can I help you today?',
  'default': "I'm sorry, I didn't quite catch that. For complex issues, please email our support team at support@jobbaworks.com.",
};

export function SupportChatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<{sender: 'user' | 'bot', text: string}[]>([
    { sender: 'bot', text: 'Hello! I am your automated support agent. Do you have any questions about withdrawals, passwords, 2FA, or plans?' }
  ]);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isOpen]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userText = input.trim();
    setMessages(prev => [...prev, { sender: 'user', text: userText }]);
    setInput('');

    // Simulate automated thinking delay
    setTimeout(() => {
      const lowerInput = userText.toLowerCase();
      let botResponse = COMMON_RESPONSES['default'];

      for (const [key, response] of Object.entries(COMMON_RESPONSES)) {
        if (key !== 'default' && lowerInput.includes(key)) {
          botResponse = response;
          break;
        }
      }

      setMessages(prev => [...prev, { sender: 'bot', text: botResponse }]);
    }, 600);
  };

  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col items-end">
      {isOpen && (
        <div className="bg-surface w-[320px] md:w-[380px] h-[450px] rounded-3xl shadow-2xl border border-surface-container-highest/20 mb-4 flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200">
          <div className="bg-emerald-950 p-4 shrink-0 flex items-center justify-between text-white">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary">
                <span className="material-symbols-outlined text-[18px]">smart_toy</span>
              </div>
              <div>
                <h3 className="font-bold text-sm">Automated Support</h3>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                  <span className="text-[10px] uppercase tracking-widest text-emerald-100/60 font-semibold">Online</span>
                </div>
              </div>
            </div>
            <button onClick={() => setIsOpen(false)} className="text-white/60 hover:text-white transition-colors">
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-surface-container-lowest/50">
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${msg.sender === 'user' ? 'bg-primary text-white font-medium rounded-br-sm' : 'bg-surface-container font-medium text-on-surface rounded-bl-sm'}`}>
                  {msg.text}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          <form onSubmit={handleSend} className="p-3 bg-surface border-t border-surface-container flex gap-2 shrink-0">
            <input 
              type="text" 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your question..."
              className="flex-1 bg-surface-container-low px-4 py-2.5 rounded-xl text-sm outline-none focus:ring-1 focus:ring-primary/50"
            />
            <button 
              type="submit" 
              disabled={!input.trim()}
              className="bg-primary hover:bg-emerald-800 text-white w-10 h-10 rounded-xl flex items-center justify-center transition-colors disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-[18px]">send</span>
            </button>
          </form>
        </div>
      )}

      {/* Floating Action Button */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-14 h-14 bg-emerald-950 hover:bg-emerald-900 text-white rounded-2xl shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all flex flex-col items-center justify-center"
      >
        <span className="material-symbols-outlined text-[24px]">
          {isOpen ? 'keyboard_arrow_down' : 'support_agent'}
        </span>
      </button>
    </div>
  );
}
