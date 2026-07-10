import { describe, expect, it } from "vitest";
import {
  isFacebookMessagesPath,
  isFacebookPhotosPath,
  isFacebookPostsPath,
  parseFacebookMessagesFile,
  parseFacebookPhotosFile,
  parseFacebookPostsFile,
} from "../src/parsers/facebook";

describe("parseFacebookPostsFile", () => {
  it("counts posts and reads their epoch-seconds timestamp", () => {
    const result = parseFacebookPostsFile(
      JSON.stringify([{ timestamp: 1622541600 }, { timestamp: 1583020800 }]),
    );
    expect(result.recordCount).toBe(2);
    expect(result.timestamps).toEqual([1622541600000, 1583020800000]);
  });

  it("returns empty for an empty array", () => {
    expect(parseFacebookPostsFile("[]")).toEqual({ recordCount: 0, timestamps: [] });
  });

  it("returns empty for malformed JSON instead of throwing", () => {
    expect(parseFacebookPostsFile("{not json")).toEqual({ recordCount: 0, timestamps: [] });
  });
});

describe("parseFacebookPhotosFile", () => {
  it("counts photos/videos and reads their creation_timestamp", () => {
    const result = parseFacebookPhotosFile(
      JSON.stringify([{ uri: "a.jpg", creation_timestamp: 1583020800 }]),
    );
    expect(result.recordCount).toBe(1);
    expect(result.timestamps).toEqual([1583020800000]);
  });
});

describe("parseFacebookMessagesFile", () => {
  it("counts messages in a thread and reads their epoch-ms timestamp_ms", () => {
    const result = parseFacebookMessagesFile(
      JSON.stringify({
        participants: [{ name: "A" }, { name: "B" }],
        messages: [
          { sender_name: "A", timestamp_ms: 1622541600000, content: "hi" },
          { sender_name: "B", timestamp_ms: 1622541700000, content: "hey" },
        ],
      }),
    );
    expect(result.recordCount).toBe(2);
    expect(result.timestamps).toEqual([1622541600000, 1622541700000]);
  });

  it("returns empty when the file has no messages array", () => {
    expect(parseFacebookMessagesFile(JSON.stringify({ participants: [] }))).toEqual({
      recordCount: 0,
      timestamps: [],
    });
  });

  it("returns empty for malformed JSON instead of throwing", () => {
    expect(parseFacebookMessagesFile("not json")).toEqual({ recordCount: 0, timestamps: [] });
  });

  it("emits null instead of throwing for messages that aren't objects", () => {
    const result = parseFacebookMessagesFile(
      JSON.stringify({ messages: [null, "garbage", { timestamp_ms: 1622541600000 }] }),
    );
    expect(result.recordCount).toBe(3);
    expect(result.timestamps).toEqual([null, null, 1622541600000]);
  });
});

describe("Facebook path matchers", () => {
  it("recognizes posts files under a posts folder", () => {
    expect(isFacebookPostsPath("your_activity_across_facebook/posts/your_posts_1.json")).toBe(true);
    expect(isFacebookPostsPath("messages/inbox/friend_123/message_1.json")).toBe(false);
  });

  it("recognizes messages files under messages/inbox", () => {
    expect(isFacebookMessagesPath("messages/inbox/friend_123/message_1.json")).toBe(true);
    expect(isFacebookMessagesPath("messages/message_requests/message_1.json")).toBe(false);
  });

  it("recognizes photos/videos files under photos_and_videos", () => {
    expect(isFacebookPhotosPath("photos_and_videos/your_photos.json")).toBe(true);
    expect(isFacebookPhotosPath("posts/your_posts_1.json")).toBe(false);
  });

  it("ignores non-JSON files even under a matching folder", () => {
    expect(isFacebookPostsPath("posts/media/photo.jpg")).toBe(false);
  });
});
