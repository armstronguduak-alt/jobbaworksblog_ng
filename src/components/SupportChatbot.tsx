import { useState, useEffect, useRef } from 'react';

// ──────────────────────────────────────────────────────────────────────────────
// Comprehensive knowledge base about the JobbaWorks platform
// ──────────────────────────────────────────────────────────────────────────────
const KNOWLEDGE_BASE: { keywords: string[]; response: string }[] = [
  // ─── GREETINGS ────────────────────────────────────────────────────────────
  {
    keywords: ['hello', 'hi', 'hey', 'good morning', 'good afternoon', 'good evening', 'sup', 'howdy'],
    response: 'Hi there! 👋 I\'m the JobbaWorks Support Bot. I can help you with questions about earning, withdrawals, referrals, plans, articles, your wallet, and more. What would you like to know?',
  },
  {
    keywords: ['thank', 'thanks', 'appreciated', 'helpful'],
    response: 'You\'re welcome! 😊 If you have any other questions, feel free to ask. I\'m always here to help!',
  },

  // ─── WHAT IS JOBBAWORKS ───────────────────────────────────────────────────
  {
    keywords: ['what is jobbaworks', 'about jobbaworks', 'what does', 'explain the platform', 'how does the platform work', 'what is this'],
    response: 'JobbaWorks is a Read-to-Earn platform where you get paid for reading premium articles and completing tasks. You can also earn through referrals, writing articles, and engaging with content through comments. It\'s a legitimate way to make money with your spare time!',
  },

  // ─── EARNING / HOW TO EARN ────────────────────────────────────────────────
  {
    keywords: ['earn', 'how to make money', 'how do i earn', 'earning', 'make money', 'income', 'how to get paid'],
    response: 'There are several ways to earn on JobbaWorks:\n\n📖 **Read & Earn** — Read verified articles to earn per-article rewards based on your plan.\n✍️ **Write Articles** — Submit original content; once approved, earn rewards when others read it.\n💬 **Comment Bonus** — Leave thoughtful comments on articles for bonus earnings.\n👥 **Referral Commission** — Earn 25% of your referral\'s plan purchase price.\n\nYour earnings depend on your subscription plan — higher plans unlock higher reward multipliers!',
  },
  {
    keywords: ['read and earn', 'reading reward', 'article reward', 'how much per article'],
    response: 'Your per-article reward depends on your subscription plan. Each plan has a different earning rate per article read. Go to the **Tasks** page to see available articles. Once you read and complete an article task, the reward is automatically credited to your wallet balance.',
  },
  {
    keywords: ['comment', 'comment bonus', 'comment reward'],
    response: 'When you leave a meaningful comment on an article, you can earn a bonus reward! The comment reward rate depends on your current plan. Go to the **Tasks** page, read an article, and leave a comment to earn your bonus.',
  },

  // ─── WITHDRAWAL ───────────────────────────────────────────────────────────
  {
    keywords: ['withdraw', 'withdrawal', 'cash out', 'payout', 'get money', 'bank', 'transfer'],
    response: 'To withdraw your earnings:\n\n1. Go to your **Wallet** page\n2. Make sure your balance is above the minimum threshold of ₦1,000\n3. Set up your preferred payment method (bank account or USDT wallet)\n4. Set a 4-digit payout PIN in Settings if you haven\'t already\n5. Click "Submit Withdrawal Request"\n\nWithdrawals are processed by the admin team and you\'ll be notified once completed.',
  },
  {
    keywords: ['minimum withdrawal', 'min withdraw', 'least amount'],
    response: 'The minimum withdrawal amount is **₦1,000**. Make sure your available balance is at least this amount before requesting a withdrawal.',
  },
  {
    keywords: ['payout pin', 'pin', 'set pin', 'withdrawal pin'],
    response: 'You need a 4-digit Payout PIN to request withdrawals. To set it:\n\n1. Go to **Settings**\n2. Look for the "Payout PIN" section\n3. Set a 4-digit PIN you\'ll remember\n\nThis PIN protects your funds from unauthorized withdrawals.',
  },

  // ─── WALLET & BALANCE ─────────────────────────────────────────────────────
  {
    keywords: ['wallet', 'balance', 'my money', 'account balance', 'funds'],
    response: 'Your **Wallet** page shows your available balance, total earnings, and recent transactions. From there you can:\n\n💰 View your current balance\n📊 See your transaction history\n💸 Initiate a withdrawal\n🔄 Swap Naira to USDT\n\nYour balance updates in real-time as you complete tasks and earn rewards.',
  },
  {
    keywords: ['transaction', 'history', 'transaction history'],
    response: 'Your **Transaction History** page shows all your account activity including:\n\n• Reading rewards\n• Comment bonuses\n• Referral commissions\n• Swap transactions\n• Withdrawals\n\nYou can filter by transaction type and view detailed breakdowns.',
  },

  // ─── SWAP ─────────────────────────────────────────────────────────────────
  {
    keywords: ['swap', 'usdt', 'convert', 'exchange', 'currency'],
    response: 'The **Swap** feature lets you convert your Naira (₦) balance to USDT (US Dollar Tether). Go to the Swap page, enter the amount you want to convert, and confirm. The exchange rate is displayed in real-time. Your USDT balance is shown on your dashboard.',
  },

  // ─── PLANS & SUBSCRIPTION ─────────────────────────────────────────────────
  {
    keywords: ['plan', 'subscription', 'upgrade', 'pricing', 'premium', 'free plan', 'pro', 'platinum'],
    response: 'JobbaWorks offers multiple subscription plans:\n\n🆓 **Free Plan** — Basic access with limited earning potential\n⭐ **Pro Plan** — Higher per-article rewards, more daily tasks\n💎 **Platinum Plan** — Maximum earning multiplier, priority support\n\nHigher plans = higher earnings per article. Go to the **Plans** page to view prices and upgrade. Your plan fee is a one-time investment that unlocks higher earning potential.',
  },

  // ─── REFERRALS ────────────────────────────────────────────────────────────
  {
    keywords: ['refer', 'referral', 'invite', 'friend', 'commission', 'referral code', 'referral link', 'share'],
    response: 'Our referral program pays you **25% commission** on every plan purchase your referrals make!\n\n📋 **How it works:**\n1. Go to the **Referrals** page\n2. Copy your unique referral link\n3. Share it via WhatsApp, Twitter, or any platform\n4. When someone signs up using your link and upgrades their plan, you earn 25% of that plan\'s price!\n\nEarnings are unlimited — the more people you refer, the more you earn!',
  },

  // ─── ARTICLES ─────────────────────────────────────────────────────────────
  {
    keywords: ['article', 'write', 'publish', 'create article', 'submit article', 'blog', 'content'],
    response: 'You can write and publish articles on JobbaWorks!\n\n✍️ Go to **My Articles** → Click "Create Article"\n📝 Write your content with a title, featured image, and body\n📤 Submit for review — our moderators will review it\n✅ Once approved, your article goes live and you earn when others read it\n\nArticles must be original and high-quality to be approved.',
  },

  // ─── LEADERBOARD ──────────────────────────────────────────────────────────
  {
    keywords: ['leaderboard', 'rank', 'ranking', 'top earner', 'wall of wealth', 'position'],
    response: 'The **Leaderboard** (Wall of Wealth) shows the top earners on the platform. Rankings are based on total earnings and update in real-time. You can also see the top referral earners. Keep reading, earning, and referring to climb the ranks! 🏆',
  },

  // ─── ACCOUNT & SETTINGS ───────────────────────────────────────────────────
  {
    keywords: ['password', 'change password', 'reset password', 'forgot password'],
    response: 'To change your password:\n\n1. Go to **Settings**\n2. Click "Change Password"\n3. Enter your current password, then your new password\n4. Click Save\n\nIf you forgot your password, use the "Forgot Password" link on the login page to reset via email.',
  },
  {
    keywords: ['2fa', 'two factor', 'security', 'authenticator', 'two-factor'],
    response: 'To enable Two-Factor Authentication:\n\n1. Go to **Settings**\n2. Look for "Two-Factor Auth" toggle\n3. Scan the QR code with Google Authenticator or a similar app\n4. Enter the verification code to confirm\n\nThis adds an extra layer of security to your account.',
  },
  {
    keywords: ['profile', 'avatar', 'name', 'username', 'edit profile', 'update profile'],
    response: 'To update your profile:\n\n1. Click your avatar or go to **Profile** from the sidebar\n2. You can change your display name, bio, and avatar\n3. Your username and email are set during registration\n\nYour public profile shows your articles, badges, and community activity.',
  },
  {
    keywords: ['settings', 'account settings', 'preferences'],
    response: 'In **Settings** you can:\n\n🔐 Change your password\n📱 Enable/disable Two-Factor Auth\n💳 Set your payout PIN\n🏦 Configure payment methods\n👤 Update profile information\n\nAccess Settings from the sidebar menu.',
  },

  // ─── SUPPORT & HELP ───────────────────────────────────────────────────────
  {
    keywords: ['support', 'help', 'contact', 'email', 'reach', 'agent', 'human', 'speak to someone'],
    response: 'For complex issues that I can\'t resolve, you can:\n\n📧 Email us at **support@jobbaworks.com**\n💬 Join our community channels (link in the sidebar)\n\nI can help with most common questions about earnings, withdrawals, plans, referrals, and account settings!',
  },

  // ─── STORIES FEATURE ──────────────────────────────────────────────────────
  {
    keywords: ['story', 'stories', 'write story', 'fiction', 'chapter'],
    response: 'JobbaWorks has a **Stories** feature where you can write and publish serialized stories!\n\n📚 Go to **My Stories** from the sidebar\n✍️ Create multi-chapter stories with rich text\n📖 Readers can discover your stories on the Stories Hub\n\nStories are a great way to showcase your creative writing!',
  },

  // ─── PAYMENT METHODS ──────────────────────────────────────────────────────
  {
    keywords: ['payment method', 'bank account', 'opay', 'minipay', 'how to receive'],
    response: 'JobbaWorks supports multiple payment methods for withdrawals:\n\n🏦 **Bank Transfer** — Withdraw directly to your Nigerian bank account\n📱 **OPay** — Instant transfer to your OPay wallet\n💰 **USDT** — Withdraw in cryptocurrency\n\nSet up your preferred payment method in the Wallet page before requesting a withdrawal.',
  },

  // ─── PROMOTIONS ───────────────────────────────────────────────────────────
  {
    keywords: ['promotion', 'promo', 'offer', 'deal', 'discount'],
    response: 'Check the **Promotions** page for the latest deals and offers! Promotions may include bonuses on plan upgrades, special referral rewards, or limited-time earning boosts. Keep an eye on the promotional banners on your dashboard!',
  },

  // ─── COMMUNITY ────────────────────────────────────────────────────────────
  {
    keywords: ['community', 'telegram', 'whatsapp', 'group', 'chat group', 'join'],
    response: 'Join our vibrant community! Click on "Join Our Community" in the sidebar to find links to our official Telegram and WhatsApp groups. Connect with fellow earners, share tips, and stay updated on platform news!',
  },

  // ─── VERIFICATION ─────────────────────────────────────────────────────────
  {
    keywords: ['verify', 'email verification', 'confirm email', 'not verified'],
    response: 'After signing up, you\'ll receive a verification email. Click the link to verify your email address. If you didn\'t receive the email:\n\n1. Check your spam/junk folder\n2. Try resending from the email confirmation page\n3. Contact support if the issue persists\n\nEmail verification is required to access all platform features.',
  },

  // ─── ANALYTICS ────────────────────────────────────────────────────────────
  {
    keywords: ['analytics', 'stats', 'statistics', 'my earnings', 'earning breakdown'],
    response: 'The **Analytics** page gives you a detailed breakdown of your earnings:\n\n📊 Total earnings over time\n📈 Reading rewards vs referral income\n📉 Daily/weekly trends\n🎯 Tasks completed count\n\nUse this data to optimize your earning strategy!',
  },
];

function findBestResponse(input: string): string {
  const lowerInput = input.toLowerCase().trim();
  
  // Score each knowledge entry by keyword matches
  let bestScore = 0;
  let bestResponse = '';

  for (const entry of KNOWLEDGE_BASE) {
    let score = 0;
    for (const keyword of entry.keywords) {
      if (lowerInput.includes(keyword)) {
        // Longer keyword matches get higher scores (more specific)
        score += keyword.length;
      }
    }
    if (score > bestScore) {
      bestScore = score;
      bestResponse = entry.response;
    }
  }

  if (bestScore > 0) return bestResponse;

  // Fallback response
  return "I appreciate your question! I can help with topics like:\n\n• **Earning** — How to make money on the platform\n• **Withdrawals** — How to cash out your earnings\n• **Plans** — Subscription tiers and benefits\n• **Referrals** — How to earn through invites\n• **Wallet** — Balance, transactions, and swaps\n• **Articles** — Reading and writing content\n• **Settings** — Account security and preferences\n\nTry asking about any of these topics, or email **support@jobbaworks.com** for complex issues!";
}

export function SupportChatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<{sender: 'user' | 'bot', text: string}[]>([
    { sender: 'bot', text: 'Hello! 👋 I\'m the JobbaWorks Support Bot. I know everything about the platform — ask me about earning, withdrawals, referrals, plans, or anything else!' }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
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
    setIsTyping(true);

    // Simulate a more natural thinking delay
    const delay = 400 + Math.random() * 600;
    setTimeout(() => {
      const botResponse = findBestResponse(userText);
      setMessages(prev => [...prev, { sender: 'bot', text: botResponse }]);
      setIsTyping(false);
    }, delay);
  };

  const quickActions = [
    { label: '💰 How to earn', query: 'how do i earn money' },
    { label: '📤 Withdraw', query: 'how to withdraw' },
    { label: '👥 Referrals', query: 'referral program' },
    { label: '📋 Plans', query: 'subscription plans' },
  ];

  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col items-end">
      {isOpen && (
        <div className="bg-surface w-[320px] md:w-[380px] h-[500px] rounded-3xl shadow-2xl border border-surface-container-highest/20 mb-4 flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200">
          <div className="bg-emerald-950 p-4 shrink-0 flex items-center justify-between text-white">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary">
                <span className="material-symbols-outlined text-[18px]">smart_toy</span>
              </div>
              <div>
                <h3 className="font-bold text-sm">JobbaWorks Support</h3>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                  <span className="text-[10px] uppercase tracking-widest text-emerald-100/60 font-semibold">Always Online</span>
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
                <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-line ${msg.sender === 'user' ? 'bg-primary text-white font-medium rounded-br-sm' : 'bg-surface-container font-medium text-on-surface rounded-bl-sm'}`}>
                  {msg.text}
                </div>
              </div>
            ))}
            
            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-surface-container rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-on-surface-variant/40 animate-bounce" style={{ animationDelay: '0ms' }}></span>
                  <span className="w-2 h-2 rounded-full bg-on-surface-variant/40 animate-bounce" style={{ animationDelay: '150ms' }}></span>
                  <span className="w-2 h-2 rounded-full bg-on-surface-variant/40 animate-bounce" style={{ animationDelay: '300ms' }}></span>
                </div>
              </div>
            )}

            {/* Quick Actions (show only at start) */}
            {messages.length <= 1 && (
              <div className="flex flex-wrap gap-2 pt-2">
                {quickActions.map((qa, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setMessages(prev => [...prev, { sender: 'user', text: qa.query }]);
                      setIsTyping(true);
                      setTimeout(() => {
                        setMessages(prev => [...prev, { sender: 'bot', text: findBestResponse(qa.query) }]);
                        setIsTyping(false);
                      }, 500);
                    }}
                    className="text-xs bg-surface-container-low hover:bg-surface-container text-on-surface-variant font-semibold px-3 py-1.5 rounded-xl transition-colors border border-surface-container-highest/20"
                  >
                    {qa.label}
                  </button>
                ))}
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          <form onSubmit={handleSend} className="p-3 bg-surface border-t border-surface-container flex gap-2 shrink-0">
            <input 
              type="text" 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask anything about JobbaWorks..."
              className="flex-1 bg-surface-container-low px-4 py-2.5 rounded-xl text-sm outline-none focus:ring-1 focus:ring-primary/50"
            />
            <button 
              type="submit" 
              disabled={!input.trim() || isTyping}
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
