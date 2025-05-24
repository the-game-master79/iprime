export const LoadingSpinner = () => {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="relative h-16 w-16 flex items-center justify-center">
        {/* Glowing shadow */}
        <div className="absolute inset-0 rounded-full blur-xl opacity-60 bg-gradient-to-tr from-primary to-blue-400 animate-pulse" />
        {/* Main spinner */}
        <div className="h-16 w-16 rounded-full border-4 border-primary border-t-transparent border-b-blue-400 animate-spin" />
        {/* Inner circle */}
        <div className="absolute inset-3 rounded-full bg-background" />
        {/* Center dot */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="h-3 w-3 rounded-full bg-primary shadow-lg" />
        </div>
      </div>
    </div>
  );
};

export default LoadingSpinner;
