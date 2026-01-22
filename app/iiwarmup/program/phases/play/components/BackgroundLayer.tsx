'use client';

interface BackgroundLayerProps {
  theme?: string;
}

export function BackgroundLayer({ theme = 'default' }: BackgroundLayerProps) {
  const getGradient = () => {
    switch(theme) {
      case 'kitchen':
        return 'from-orange-900 via-red-900 to-pink-900';
      case 'beach':
        return 'from-blue-900 via-cyan-900 to-teal-900';
      case 'forest':
        return 'from-green-900 via-emerald-900 to-lime-900';
      default:
        return 'from-purple-900 via-indigo-900 to-blue-900';
    }
  };

  return (
    <div className={`fixed inset-0 bg-gradient-to-br ${getGradient()} -z-10`}>
      {/* 애니메이션 배경 효과 */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute top-10 left-10 w-96 h-96 bg-white rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-10 right-10 w-96 h-96 bg-white rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>
    </div>
  );
}
