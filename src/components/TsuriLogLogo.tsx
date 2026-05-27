import Image from "next/image";

type TsuriLogLogoProps = {
  className?: string;
  title?: string;
};

export function TsuriLogLogo({ className, title = "TsuriLog" }: TsuriLogLogoProps) {
  return (
    <Image
      src="/icons/tsurilog-logo.svg"
      alt={title}
      width={930}
      height={155}
      className={className}
      priority
      unoptimized
    />
  );
}
