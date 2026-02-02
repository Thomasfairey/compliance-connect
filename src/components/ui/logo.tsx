interface LogoProps {
  size?: number;
  className?: string;
}

export function Logo({ size = 32, className = "" }: LogoProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 100 100"
      width={size}
      height={size}
      className={className}
    >
      {/* Outer teal ring */}
      <circle cx="50" cy="50" r="46" fill="none" stroke="#0097A7" strokeWidth="4"/>
      {/* Inner teal circle */}
      <circle cx="50" cy="50" r="36" fill="#0097A7"/>
      {/* White T - crossbar */}
      <rect x="28" y="26" width="44" height="12" fill="#FFFFFF"/>
      {/* White T - stem that cuts through inner circle to merge with white ring */}
      <rect x="44" y="26" width="12" height="62" fill="#FFFFFF"/>
    </svg>
  );
}
