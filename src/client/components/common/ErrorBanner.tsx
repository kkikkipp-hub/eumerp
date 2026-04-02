import { AlertTriangleIcon } from "./Icons";

interface ErrorBannerProps {
  message: string;
  onRetry?: () => void;
}

export default function ErrorBanner({ message, onRetry }: ErrorBannerProps) {
  return (
    <div className="bg-error-50 border border-error-100 rounded-[10px] p-4 flex items-center justify-between mb-4">
      <div className="flex items-center gap-2.5">
        <AlertTriangleIcon className="w-4 h-4 text-error-500 flex-shrink-0" />
        <p className="text-error-600 text-[13px]">{message}</p>
      </div>
      {onRetry && (
        <button onClick={onRetry} className="text-[13px] text-error-500 hover:text-error-700 font-medium flex-shrink-0 ml-4">
          재시도
        </button>
      )}
    </div>
  );
}
