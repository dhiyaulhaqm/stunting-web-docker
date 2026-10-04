type AppLogoMarkProps = {
  className?: string;
};

export default function AppLogoMark({ className = "" }: AppLogoMarkProps) {
  return (
    <span
      aria-hidden="true"
      className={`block shrink-0 overflow-hidden rounded-lg shadow-sm ${className}`}
    >
      <img
        className="h-full w-full object-cover object-center"
        src="/logo-banting.png"
        alt=""
      />
    </span>
  );
}
