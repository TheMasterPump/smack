import React from "react";
import EmojiPicker from "emoji-picker-react";

export default function EmojiDebug() {
  return (
    <div style={{ padding: 30 }}>
      <EmojiPicker
        onEmojiClick={(emoji, event) => {
          console.log("DEBUG EMOJI PICKER VALUE:", emoji);
          alert(emoji.emoji || emoji.native || JSON.stringify(emoji));
        }}
        theme="dark"
        width={300}
      />
    </div>
  );
}
