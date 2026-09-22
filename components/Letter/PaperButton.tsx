import type { ButtonHTMLAttributes } from "react";

type PaperButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  shape?: "pill" | "circle";
};

const base =
  "inline-flex cursor-pointer items-center justify-center gap-2 border border-[#e4d5c0] bg-white/80 font-sans text-sm text-[#5c4a32] shadow-[0_1px_2px_rgba(58,50,38,0.06)] backdrop-blur transition duration-200 hover:-translate-y-0.5 hover:bg-white hover:shadow-[0_6px_16px_rgba(58,50,38,0.12)]";

export default function PaperButton({
  shape = "pill",
  className = "",
  type = "button",
  children,
  ...props
}: PaperButtonProps) {
  const shapeClass =
    shape === "circle" ? "size-11 rounded-full" : "min-h-11 rounded-full px-4";

  return (
    <button type={type} className={`${base} ${shapeClass} ${className}`} {...props}>
      {children}
    </button>
  );
}
