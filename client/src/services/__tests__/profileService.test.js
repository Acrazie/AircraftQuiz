import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/axios", () => ({
  default: {
    patch: vi.fn(),
    post: vi.fn(),
  },
}));

import api from "@/lib/axios";
import { profileService } from "@/services/profileService";

beforeEach(() => {
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// updateAvatarColor
// ---------------------------------------------------------------------------
describe("profileService.updateAvatarColor", () => {
  it("calls PATCH /profile with avatarColor", () => {
    api.patch.mockResolvedValue({ data: { avatarColor: "sky" } });

    profileService.updateAvatarColor("sky");

    expect(api.patch).toHaveBeenCalledWith("/profile", { avatarColor: "sky" });
  });

  it("passes the exact color key unchanged", () => {
    api.patch.mockResolvedValue({ data: { avatarColor: "crimson" } });

    profileService.updateAvatarColor("crimson");

    expect(api.patch).toHaveBeenCalledWith("/profile", {
      avatarColor: "crimson",
    });
  });
});

// ---------------------------------------------------------------------------
// uploadAvatar
// ---------------------------------------------------------------------------
describe("profileService.uploadAvatar", () => {
  it("calls POST /profile/avatar with FormData containing the file", () => {
    api.post.mockResolvedValue({ data: { avatarUrl: "http://cdn/abc.png" } });
    const file = new File(["img"], "photo.png", { type: "image/png" });

    profileService.uploadAvatar(file);

    const [url, formData, config] = api.post.mock.calls[0];
    expect(url).toBe("/profile/avatar");
    expect(formData).toBeInstanceOf(FormData);
    expect(formData.get("avatar")).toBe(file);
    expect(config.headers["Content-Type"]).toBe("multipart/form-data");
  });

  it("returns the API response", async () => {
    const expected = { data: { avatarUrl: "http://cdn/test.jpg" } };
    api.post.mockResolvedValue(expected);
    const file = new File(["img"], "photo.jpg", { type: "image/jpeg" });

    const result = await profileService.uploadAvatar(file);

    expect(result).toEqual(expected);
  });

  it("calls the endpoint once per invocation", () => {
    api.post.mockResolvedValue({ data: { avatarUrl: "http://cdn/x.png" } });
    const file = new File(["img"], "x.png", { type: "image/png" });

    profileService.uploadAvatar(file);

    expect(api.post).toHaveBeenCalledTimes(1);
  });
});
