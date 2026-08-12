import type { TaskView } from "@/lib/client-api";

export const IMAGE_RATIO_LABEL: Readonly<Record<TaskView["ratio"], string>> = {
  SQUARE: "1:1",
  PORTRAIT: "9:16",
  LANDSCAPE: "16:9",
};

export const IMAGE_RATIO_OPTIONS = [
  { value: "SQUARE", label: IMAGE_RATIO_LABEL.SQUARE, pixels: "1024×1024" },
  { value: "PORTRAIT", label: IMAGE_RATIO_LABEL.PORTRAIT, pixels: "864×1536" },
  { value: "LANDSCAPE", label: IMAGE_RATIO_LABEL.LANDSCAPE, pixels: "1536×864" },
] as const satisfies ReadonlyArray<{
  value: TaskView["ratio"];
  label: string;
  pixels: string;
}>;
