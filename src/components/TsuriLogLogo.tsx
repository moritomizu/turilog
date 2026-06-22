import Image from "next/image";
import { APP_NAME } from "@/lib/brand";

type TsuriLogLogoProps = {
  className?: string;
  title?: string;
};

export function TsuriLogLogo({ className, title = APP_NAME }: TsuriLogLogoProps) {
  return (
    <Image
      src="/icons/trlg-logo.png"
      alt={title}
      width={1000}
      height={401}
      className={`object-contain ${className ?? ""}`}
      priority
    />
  );
}
