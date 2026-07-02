type MainContentProps = {
  children: React.ReactNode;
  className?: string;
};

export function MainContent({ children, className = "" }: MainContentProps) {
  return (
    <div
      className={`mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 ${className}`}
    >
      {children}
    </div>
  );
}
