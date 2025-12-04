import React, { useState } from 'react';
import { useStore } from '../context/Store';
import { dataService } from '../services/dataService';

const Login: React.FC = () => {
  const { dispatch } = useStore();
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!email || !password || (!isLoginMode && !name)) {
        setError('すべての必須項目を入力してください。');
        return;
    }

    setIsLoading(true);
    try {
        // In a real app, you would have separate endpoints for register/login
        // Here we send everything to login, and the server handles logic
        const user = await dataService.login(isLoginMode ? '' : name, email, password);
        dispatch({ type: 'LOGIN', payload: user });
    } catch (e: any) {
        console.error(e);
        setError(isLoginMode ? 'ログインに失敗しました。メールアドレスまたはパスワードを確認してください。' : 'アカウント作成に失敗しました。');
    } finally {
        setIsLoading(false);
    }
  };

  const handleOAuthLogin = (provider: string) => {
      // 本来は window.location.href = '/api/auth/google' 等へリダイレクト
      alert(`${provider}ログイン機能は現在準備中です（サーバー側のClient ID設定が必要です）。メールアドレス認証をご利用ください。`);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-dark-bg p-4 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-primary-600/20 rounded-full blur-[100px]"></div>
      <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] bg-purple-600/20 rounded-full blur-[100px]"></div>

      <div className="bg-dark-surface/80 backdrop-blur-xl border border-dark-border p-8 rounded-2xl w-full max-w-md shadow-2xl z-10 transition-all duration-300">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary-500 to-purple-500">
            Nexus Chat AI
          </h1>
          <p className="text-gray-400 mt-2 text-sm">次世代のAI統合チャットプラットフォーム</p>
        </div>

        <div className="space-y-3 mb-6">
            <button 
                type="button"
                onClick={() => handleOAuthLogin('Google')}
                className="w-full bg-white text-gray-900 font-medium py-3 px-4 rounded-xl flex items-center justify-center gap-3 hover:bg-gray-100 transition-colors"
            >
                <img src="https://www.svgrepo.com/show/475656/google-color.svg" className="w-5 h-5" alt="Google" />
                Googleで続行
            </button>
            <button 
                type="button"
                onClick={() => handleOAuthLogin('GitHub')}
                className="w-full bg-[#24292F] text-white font-medium py-3 px-4 rounded-xl flex items-center justify-center gap-3 hover:bg-[#24292F]/90 transition-colors"
            >
                <img src="https://www.svgrepo.com/show/512317/github-142.svg" className="w-5 h-5 invert" alt="GitHub" />
                GitHubで続行
            </button>
        </div>

        <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-dark-border"></div>
            </div>
            <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-dark-surface text-gray-500">またはメールアドレスで</span>
            </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLoginMode && (
              <div className="animate-fade-in-down">
                <label className="block text-sm font-medium text-gray-400 mb-1">表示名</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-dark-bg border border-dark-border rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-primary-500 placeholder-gray-600"
                  placeholder="例: 山田 太郎"
                />
              </div>
          )}
          
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">メールアドレス</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-dark-bg border border-dark-border rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-primary-500 placeholder-gray-600"
              placeholder="name@example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">パスワード</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-dark-bg border border-dark-border rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-primary-500 placeholder-gray-600"
              placeholder="••••••••"
            />
          </div>
          
          {error && (
              <p className="text-red-400 text-sm text-center">{error}</p>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-primary-600 to-purple-600 hover:from-primary-500 hover:to-purple-500 text-white font-bold py-3 px-4 rounded-xl shadow-lg transform transition-all active:scale-[0.98] mt-2 disabled:opacity-50"
          >
            {isLoading ? '処理中...' : (isLoginMode ? 'ログイン' : 'アカウント作成')}
          </button>
        </form>

        <div className="mt-6 text-center">
            <button 
                onClick={() => {
                    setIsLoginMode(!isLoginMode);
                    setError('');
                }}
                className="text-sm text-primary-400 hover:text-primary-300 transition-colors"
            >
                {isLoginMode ? "アカウントをお持ちでない方はこちら" : "すでにアカウントをお持ちの方はこちら"}
            </button>
        </div>
      </div>
    </div>
  );
};

export default Login;