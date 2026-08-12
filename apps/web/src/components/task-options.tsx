"use client";

import type { TaskView } from "@/lib/client-api";
import { IMAGE_RATIO_LABEL, IMAGE_RATIO_OPTIONS } from "@/lib/image-options";

interface TaskOptionsProps {
  readonly idPrefix: string;
  readonly ratio: TaskView["ratio"];
  readonly quality: TaskView["quality"];
  readonly onRatioChange: (value: TaskView["ratio"]) => void;
  readonly onQualityChange: (value: TaskView["quality"]) => void;
}

export function TaskOptions({ idPrefix, ratio, quality, onRatioChange, onQualityChange }: TaskOptionsProps) {
  return (
    <div className="workspace-options" aria-label={`${idPrefix} 输出设置`}>
      <fieldset className="workspace-option">
        <legend className="workspace-option__label">画面比例</legend>
        <p className="workspace-option__description">决定输出尺寸</p>
        <div className="workspace-choice-grid">
          {IMAGE_RATIO_OPTIONS.map((option) => (
            <button key={option.value} type="button" className="workspace-choice" data-state={ratio === option.value ? "active" : "inactive"} aria-pressed={ratio === option.value} onClick={() => onRatioChange(option.value)}>
              <span>{IMAGE_RATIO_LABEL[option.value]}</span>
              <span className="workspace-choice__detail">{option.pixels}</span>
            </button>
          ))}
        </div>
      </fieldset>
      <fieldset className="workspace-option">
        <legend className="workspace-option__label">输出质量</legend>
        <p className="workspace-option__description">按积分预算选择</p>
        <div className="workspace-choice-grid workspace-choice-grid--quality">
          <button type="button" className="workspace-choice" data-state={quality === "STANDARD" ? "active" : "inactive"} aria-pressed={quality === "STANDARD"} onClick={() => onQualityChange("STANDARD")}>标准</button>
          <button type="button" className="workspace-choice" data-state={quality === "HIGH" ? "active" : "inactive"} aria-pressed={quality === "HIGH"} onClick={() => onQualityChange("HIGH")}>高质量</button>
        </div>
      </fieldset>
    </div>
  );
}
