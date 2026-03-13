import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';
import { 
  Send, User, Activity, ShieldCheck, 
  MessageSquarePlus, Compass, Zap, 
  Lock, Mail, LogOut, Key, Menu, X
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import './App.css';

function App() {
  const [isAuth, setIsAuth] = useState(!!localStorage.getItem('token'));
  const [userName, setUserName] = useState(localStorage.getItem('userName') || '');
  const [authMode, setAuthMode] = useState('login'); // login or register
  const [authData, setAuthData] = useState({ email: '', password: '', name: '' });
  const [messages, setMessages] = useState([
    { role: 'ai', content: `Access Granted. Welcome back, **${localStorage.getItem('userName') || 'Commander'}**. I am the Health Intelligence Kernel. State your query.` }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const viewportRef = useRef(null);

  useEffect(() => {
    if (viewportRef.current) {
      viewportRef.current.scrollTop = viewportRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const handleAuth = async (e) => {
    e.preventDefault();
    
    // Client-side validation
    if (!authData.email || !authData.password || (authMode === 'register' && !authData.name)) {
      toast.error('All strategic data fields must be populated.');
      return;
    }

    const endpoint = authMode === 'login' ? '/api/login' : '/api/register';
    const loadingToast = toast.loading(authMode === 'login' ? 'Authenticating...' : 'Registering...');
    
    try {
      const { data } = await axios.post(`http://localhost:5000${endpoint}`, authData);
      toast.dismiss(loadingToast);
      
      if (authMode === 'login') {
        localStorage.setItem('token', data.token);
        localStorage.setItem('userName', data.name);
        setUserName(data.name);
        setIsAuth(true);
        toast.success(`Welcome back, ${data.name}`);
      } else {
        setAuthMode('login');
        toast.success('Registration successful. Access granted to login phase.');
      }
    } catch (err) {
      toast.dismiss(loadingToast);
      toast.error(err.response?.data?.error || 'Authorization failed');
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userName');
    setIsAuth(false);
  };

  const onSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg = { role: 'user', content: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const token = localStorage.getItem('token');
      const { data } = await axios.post('http://localhost:5000/api/chat', 
        { message: input, history: messages },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setMessages(prev => [...prev, { role: 'ai', content: data.reply }]);
    } catch (err) {
      if (err.response?.status === 401) {
        logout();
        toast.error("Session Expired. Secure Link Terminated.");
      } else {
        toast.error("AI Kernel Link Interrupted.");
      }
      setMessages(prev => [...prev, { role: 'ai', content: "CRITICAL_ERROR: Unauthorized access or AI Kernel offline." }]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isAuth) {
    return (
      <div className="auth-screen">
        <div className="auth-card">
          <div className="brand-header">
            <Zap size={32} color="var(--primary)" />
            <h1>HEALTH_AI KERNEL</h1>
          </div>
          <form onSubmit={handleAuth}>
            {authMode === 'register' && (
              <div className="input-field">
                <User size={18} />
                <input type="text" placeholder="Full Name" onChange={e => setAuthData({...authData, name: e.target.value})} required />
              </div>
            )}
            <div className="input-field">
              <Mail size={18} />
              <input type="email" placeholder="Email Address" onChange={e => setAuthData({...authData, email: e.target.value})} required />
            </div>
            <div className="input-field">
              <Lock size={18} />
              <input type="password" placeholder="Access Password" onChange={e => setAuthData({...authData, password: e.target.value})} required />
            </div>
            {/* removed locally displayed error */}
            <button type="submit" className="auth-submit">
              {authMode === 'login' ? 'INITIALIZE LINK' : 'CREATE PROTOCOL'}
            </button>
          </form>
          <p className="auth-toggle">
            {authMode === 'login' ? "New operative?" : "Already indexed?"}
            <span onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}>
              {authMode === 'login' ? ' Register here' : ' Login here'}
            </span>
          </p>
        </div>
        <Toaster position="top-right" toastOptions={{ className: 'cyber-toast' }} />
      </div>
    );
  }

  return (
    <div className="app-wrapper">
      <div className="content-container">
        <aside className={`glass-sidebar ${sidebarOpen ? 'sidebar-open' : ''}`}>
          <div className="sidebar-header">
            <div className="brand">
              <div className="icon-box" style={{ background: 'var(--primary)', color: '#050b18' }}>
                <Zap size={20} />
              </div>
              <h1>HEALTH_AI</h1>
            </div>
            <button className="close-sidebar-btn" onClick={() => setSidebarOpen(false)}>
              <X size={24} />
            </button>
          </div>

          <nav className="nav-section">
            <button className="nav-btn active">
              <div className="icon-box"><Compass size={18} /></div>
              Explorer
            </button>
            {/* <button className="nav-btn">
              <div className="icon-box"><Activity size={18} /></div>
              Vital Monitor
            </button> */}
            <button className="nav-btn" onClick={() => setMessages([{ role: 'ai', content: `Kernel Purged. Ready for new input, **${userName}**.` }])}>
              <div className="icon-box"><MessageSquarePlus size={18} /></div>
              Reset Kernel
            </button>
            <button className="nav-btn" onClick={logout} style={{ marginTop: 'auto', color: '#f87171' }}>
              <div className="icon-box" style={{ background: 'rgba(248, 113, 113, 0.1)' }}><LogOut size={18} /></div>
              Terminate Session
            </button>
          </nav>

          <div className="user-info-card">
            <div className="avatar-small">{userName.charAt(0)}</div>
            <div>
              <p className="user-name">{userName}</p>
              <p className="user-role">Secured Operative</p>
            </div>
          </div>
        </aside>

        {sidebarOpen && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)}></div>}

        <main className="chat-canvas">
          <button className="mobile-menu-btn" onClick={() => setSidebarOpen(true)}>
            <Menu size={24} />
          </button>
          <div className="chat-viewport" ref={viewportRef}>
            {messages.map((m, i) => (
              <div key={i} className={`cyber-msg ${m.role}`}>
                <div className="avatar-sphere">
                  {m.role === 'ai' ? <Zap size={22} color="var(--primary)" /> : <User size={22} color="var(--secondary)" />}
                </div>
                <div className="msg-bubble">
                  <ReactMarkdown>{m.content}</ReactMarkdown>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="cyber-msg ai">
                <div className="avatar-sphere"><Activity size={22} color="var(--primary)" className="pulse-icon" /></div>
                <div className="msg-bubble" style={{ fontStyle: 'italic', opacity: 0.7 }}>Analyzing healthcare vectors...</div>
              </div>
            )}
          </div>

          <footer className="input-dock">
            <input 
              type="text" 
              placeholder="Query Health Kernel..." 
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && onSend()}
              disabled={isLoading}
            />
            <button className="circle-btn send" onClick={onSend} disabled={isLoading || !input.trim()}>
              <Send size={20} />
            </button>
          </footer>
        </main>
      </div>
      <Toaster 
        position="top-right"
        toastOptions={{
          className: 'cyber-toast',
          duration: 4000,
        }}
      />
    </div>
  );
}

export default App;
