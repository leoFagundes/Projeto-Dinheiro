"use client";

import EmojiPicker, { type EmojiClickData, Theme } from "emoji-picker-react";
import { BottomSheet } from "./BottomSheet";

export function EmojiPickerSheet({
  open,
  onClose,
  onSelect,
}: {
  open: boolean;
  onClose: () => void;
  onSelect: (emoji: string) => void;
}) {
  function handleClick(data: EmojiClickData) {
    onSelect(data.emoji);
    onClose();
  }

  return (
    <BottomSheet open={open} onClose={onClose}>
      <p className="mb-3 font-medium">Escolher ícone</p>
      <EmojiPicker
        onEmojiClick={handleClick}
        theme={Theme.LIGHT}
        width="100%"
        height={380}
        previewConfig={{ showPreview: false }}
        skinTonesDisabled
      />
    </BottomSheet>
  );
}
