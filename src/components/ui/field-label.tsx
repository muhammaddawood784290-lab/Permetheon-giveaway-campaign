import * as LabelPrimitive from "@radix-ui/react-label";
import type { ReactNode } from "react";

type FieldLabelProps = {
  htmlFor?: string;
  children: ReactNode;
};

export function FieldLabel({ htmlFor, children }: FieldLabelProps) {
  return (
    <LabelPrimitive.Root
      htmlFor={htmlFor}
      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
    >
      {children}
    </LabelPrimitive.Root>
  );
}
