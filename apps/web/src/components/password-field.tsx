"use client";

import { Eye, EyeOff, LockKeyhole } from "lucide-react";
import { useState } from "react";
import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from "@/lib/auth-constraints";
import { FormField } from "./form-field";
import { Button } from "./ui/button";
import { Input } from "./ui/input";

interface PasswordFieldProps {
  readonly id: string;
  readonly label: string;
  readonly value: string;
  readonly autoComplete: "current-password" | "new-password";
  readonly onChange: (value: string) => void;
  readonly disabled?: boolean;
  readonly fieldClassName?: string;
}

export function PasswordField({ id, label, value, autoComplete, onChange, disabled = false, fieldClassName }: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);
  const toggleLabel = visible ? "隐藏密码" : "显示密码";
  return (
    <FormField htmlFor={id} label={label} description={`${PASSWORD_MIN_LENGTH}–${PASSWORD_MAX_LENGTH} 位字符`} required className={fieldClassName}>
      <div className="relative">
        <LockKeyhole aria-hidden="true" className="pointer-events-none absolute left-3 top-3.5 size-4 text-muted-foreground" />
        <Input
          id={id}
          name={id}
          type={visible ? "text" : "password"}
          autoComplete={autoComplete}
          required
          minLength={PASSWORD_MIN_LENGTH}
          maxLength={PASSWORD_MAX_LENGTH}
          disabled={disabled}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="pl-10 pr-12"
          aria-describedby={`${id}-message`}
        />
        <Button type="button" variant="ghost" size="icon" className="absolute right-0 top-0" aria-label={toggleLabel} title={toggleLabel} disabled={disabled} onClick={() => setVisible((current) => !current)}>
          {visible ? <EyeOff aria-hidden="true" className="size-4" /> : <Eye aria-hidden="true" className="size-4" />}
        </Button>
      </div>
    </FormField>
  );
}
