import type { ReactNode } from 'react';

interface IconProps {
  size?: number;
  className?: string;
  strokeWidth?: number;
}

function Svg({
  size = 18,
  className,
  strokeWidth = 1.7,
  children,
}: IconProps & { children: ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

export function LogoMark({ size = 30, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" className={className} aria-hidden="true">
      <rect x="2" y="2" width="28" height="28" rx="9" fill="#b2653f" />
      <path d="M8 22.5V12.2L16 7l8 5.2v10.3" stroke="#faece2" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <path d="M12.5 22.5v-5.7h7v5.7" stroke="#faece2" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <circle cx="23.4" cy="8.6" r="1.7" fill="#f2c89f" />
    </svg>
  );
}

export function CursorIcon(p: IconProps) {
  return <Svg {...p}><path d="M5 3.5 19 12l-6.2 1.9L9.9 20 5 3.5Z" /></Svg>;
}

export function DoorIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <rect x="5" y="3.5" width="14" height="17" rx="1.5" />
      <path d="M14.8 12h.01" />
    </Svg>
  );
}

export function WindowIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <rect x="4" y="4.5" width="16" height="15" rx="1.5" />
      <path d="M12 4.5v15M4 12h16" />
    </Svg>
  );
}

export function OpeningIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M5 20.5V5.5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v15" />
      <path d="M5 20.5h14M9 3.5v17M15 3.5v17" />
    </Svg>
  );
}

export function RulerIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="m4.2 15.6 11.4-11.4 3.6 3.6L7.8 19.2z" />
      <path d="m8.2 11.6 1.8 1.8M11 8.8l1.8 1.8M13.8 6l1.8 1.8" />
    </Svg>
  );
}

export function DimIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M4 8v8M20 8v8M4 12h16" />
      <path d="m7 9-3 3 3 3M17 9l3 3-3 3" />
    </Svg>
  );
}

export function AlertIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M12 4 2.8 20h18.4L12 4Z" />
      <path d="M12 9.5v4.5M12 17.2h.01" />
    </Svg>
  );
}

export function PlusIcon(p: IconProps) {
  return <Svg {...p}><path d="M12 5v14M5 12h14" /></Svg>;
}

export function MinusIcon(p: IconProps) {
  return <Svg {...p}><path d="M5 12h14" /></Svg>;
}

export function FitIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M9 4H4v5M15 4h5v5M9 20H4v-5M15 20h5v-5" />
    </Svg>
  );
}

export function UndoIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M9 7 4 12l5 5" />
      <path d="M4 12h9.5a5.5 5.5 0 0 1 0 11H11" />
    </Svg>
  );
}

export function RedoIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="m15 7 5 5-5 5" />
      <path d="M20 12h-9.5a5.5 5.5 0 0 0 0 11H13" />
    </Svg>
  );
}

export function CubeIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="m12 2.8 8.5 4.9v9.6L12 22.2l-8.5-4.9V7.7L12 2.8Z" />
      <path d="m3.7 7.8 8.3 4.7 8.3-4.7M12 12.5v9.4" />
    </Svg>
  );
}

export function PlanIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <rect x="3.5" y="3.5" width="17" height="17" rx="1.5" />
      <path d="M3.5 10.5h7v10M10.5 3.5v5M16.5 10.5v10" />
    </Svg>
  );
}

export function DownloadIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M12 3.5v11M7.5 10.5 12 15l4.5-4.5" />
      <path d="M4 17v2.5A1.5 1.5 0 0 0 5.5 21h13a1.5 1.5 0 0 0 1.5-1.5V17" />
    </Svg>
  );
}

export function UploadIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M12 15V4M7.5 8 12 3.5 16.5 8" />
      <path d="M4 17v2.5A1.5 1.5 0 0 0 5.5 21h13a1.5 1.5 0 0 0 1.5-1.5V17" />
    </Svg>
  );
}

export function SparklesIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="m12 3 1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Z" />
      <path d="m18.5 16 .8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8.8-2.2Z" />
    </Svg>
  );
}

export function NewFileIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M14 3.5H7A1.5 1.5 0 0 0 5.5 5v14A1.5 1.5 0 0 0 7 20.5h10a1.5 1.5 0 0 0 1.5-1.5V8L14 3.5Z" />
      <path d="M14 3.5V8h4.5M12 11v6M9 14h6" />
    </Svg>
  );
}

export function TrashIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M4 6.5h16M9.5 6.5V4h5v2.5M6.5 6.5l.8 13A1.5 1.5 0 0 0 8.8 21h6.4a1.5 1.5 0 0 0 1.5-1.5l.8-13" />
      <path d="M10 10.5v6M14 10.5v6" />
    </Svg>
  );
}

export function CopyIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <rect x="9" y="9" width="11" height="11" rx="1.5" />
      <path d="M15 9V5.5A1.5 1.5 0 0 0 13.5 4h-8A1.5 1.5 0 0 0 4 5.5v8A1.5 1.5 0 0 0 5.5 15H9" />
    </Svg>
  );
}

export function RotateIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M20 12a8 8 0 1 1-2.4-5.7" />
      <path d="M20 4v4.5h-4.5" />
    </Svg>
  );
}

export function HelpIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.5 9.3a2.6 2.6 0 0 1 5 .9c0 1.7-2.5 2-2.5 3.6" />
      <path d="M12 17.2h.01" />
    </Svg>
  );
}

export function CloseIcon(p: IconProps) {
  return <Svg {...p}><path d="m5.5 5.5 13 13M18.5 5.5l-13 13" /></Svg>;
}

export function RoomIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <rect x="3.5" y="4.5" width="17" height="15" rx="1.2" />
      <path d="M3.5 12h6.5M10 4.5v15" />
    </Svg>
  );
}

export function ChevronRightIcon(p: IconProps) {
  return <Svg {...p}><path d="m9.5 6 6 6-6 6" /></Svg>;
}

export function CheckIcon(p: IconProps) {
  return <Svg {...p}><path d="m5 12.5 4.5 4.5L19 6.5" /></Svg>;
}

export function MoveIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M12 3v18M3 12h18M9 6l3-3 3 3M9 18l3 3 3-3M6 9l-3 3 3 3M18 9l3 3-3 3" />
    </Svg>
  );
}
