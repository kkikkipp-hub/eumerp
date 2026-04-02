import { useState } from "react";
import { api } from "../../lib/api";

interface LoginPageProps {
  onLogin: (username: string, password: string) => Promise<any>;
}

export default function LoginPage({ onLogin }: LoginPageProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [setupMode, setSetupMode] = useState(false);
  const [email, setEmail] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (setupMode) {
        try {
          await api.fetch("/auth/setup", { method: "POST", body: { username, password, email } });
        } catch {
          // Setup failed (already exists), switch to login mode
          setSetupMode(false);
        }
      }
      await onLogin(username, password);
    } catch (err: any) {
      setError(err.message || "로그인 실패");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
      <div className="bg-white rounded-[16px] shadow-card p-8 w-full max-w-[360px]">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-3">
            <svg width="40" height="40" viewBox="0 0 32 32">
              <rect width="32" height="32" rx="8" fill="#3182f6"/>
              <path d="M8 16c0-2.2 1.8-4 4-4h2c2.2 0 4 1.8 4 4s-1.8 4-4 4" stroke="white" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
              <path d="M14 16c0 2.2 1.8 4 4 4h2c2.2 0 4-1.8 4-4s-1.8-4-4-4" stroke="white" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
            </svg>
          </div>
          <h1 className="text-[20px] font-bold text-neutral-900">이음 ERP</h1>
          <p className="text-[13px] text-neutral-500 mt-1">{setupMode ? "관리자 계정 생성" : "로그인하여 시작하세요"}</p>
        </div>

        {error && (
          <div className="bg-error-50 border border-error-100 text-error-600 text-[13px] rounded-[10px] p-3 mb-4">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-[13px] font-medium text-neutral-700 mb-1.5">사용자명</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-neutral-50 border border-neutral-200 rounded-[10px] px-3.5 py-2.5 text-[14px] text-neutral-800 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-colors"
              placeholder="아이디를 입력하세요"
              required
              autoFocus
            />
          </div>
          {setupMode && (
            <div>
              <label className="block text-[13px] font-medium text-neutral-700 mb-1.5">이메일</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-neutral-50 border border-neutral-200 rounded-[10px] px-3.5 py-2.5 text-[14px] text-neutral-800 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-colors"
                placeholder="이메일을 입력하세요"
                required
              />
            </div>
          )}
          <div>
            <label className="block text-[13px] font-medium text-neutral-700 mb-1.5">비밀번호</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-neutral-50 border border-neutral-200 rounded-[10px] px-3.5 py-2.5 text-[14px] text-neutral-800 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-colors"
              placeholder="비밀번호를 입력하세요"
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary-500 text-white py-3 rounded-[10px] text-[14px] font-semibold hover:bg-primary-600 active:bg-primary-700 disabled:opacity-50 transition-colors mt-2"
          >
            {loading ? "처리중..." : setupMode ? "관리자 생성 및 로그인" : "로그인"}
          </button>
        </form>

        <button
          onClick={() => setSetupMode(!setupMode)}
          className="w-full text-center text-[12px] text-neutral-400 mt-5 hover:text-neutral-600 transition-colors"
        >
          {setupMode ? "로그인으로 돌아가기" : "초기 설정 (관리자 계정 생성)"}
        </button>
      </div>
    </div>
  );
}
