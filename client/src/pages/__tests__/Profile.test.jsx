import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
} from "@testing-library/react";

// ── SVG asset mocks (vite-plugin-svgr ?react imports don't resolve in jsdom) ──
vi.mock("@/assets/unranked.svg?react", () => ({ default: () => null }));
vi.mock("@/assets/bronze.svg?react", () => ({ default: () => null }));
vi.mock("@/assets/silver.svg?react", () => ({ default: () => null }));
vi.mock("@/assets/gold.svg?react", () => ({ default: () => null }));
vi.mock("@/assets/platinum.svg?react", () => ({ default: () => null }));
vi.mock("@/assets/diamond.svg?react", () => ({ default: () => null }));
vi.mock("@/assets/challenger.svg?react", () => ({ default: () => null }));

// ── Router mock (component uses <Navigate> for unauthenticated users) ────────
vi.mock("react-router-dom", () => ({
  Navigate: () => null,
}));

// ── Service mocks ─────────────────────────────────────────────────────────────
vi.mock("@/services/rankingService", () => ({
  getLeaderboard: vi.fn(),
}));

vi.mock("@/services/profileService", () => ({
  profileService: {
    updateAvatarColor: vi.fn(),
    uploadAvatar: vi.fn(),
  },
}));

// ── Auth store mock ───────────────────────────────────────────────────────────
vi.mock("@/store/useAuthStore");

import useAuthStore from "@/store/useAuthStore";
import { getLeaderboard } from "@/services/rankingService";
import { profileService } from "@/services/profileService";
import Profile from "@/pages/Profile";

const mockUpdateAvatarUrl = vi.fn();
const mockUpdateAvatarColor = vi.fn();

const baseUser = {
  id: "abc-123",
  username: "TestPilot",
  email: "pilot@test.com",
  roles: ["ROLE_USER"],
  rank: "unranked",
  division: 4,
  lp: 0,
  avatarColor: null,
  avatarUrl: null,
};

function setupStore(userOverrides = {}) {
  vi.mocked(useAuthStore).mockReturnValue({
    isAuthenticated: true,
    user: { ...baseUser, ...userOverrides },
    logout: vi.fn(),
    updateAvatarColor: mockUpdateAvatarColor,
    updateAvatarUrl: mockUpdateAvatarUrl,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  setupStore();
  getLeaderboard.mockResolvedValue({ data: [] });
});

// ── Avatar display ────────────────────────────────────────────────────────────
describe("Profile — avatar display", () => {
  it("shows the username initial when no avatarUrl is set", async () => {
    await act(async () => render(<Profile />));
    expect(screen.getByText("T")).toBeInTheDocument();
  });

  it("does not render an img element when avatarUrl is null", async () => {
    await act(async () => render(<Profile />));
    expect(screen.queryByAltText("avatar")).not.toBeInTheDocument();
  });

  it("renders an img element when avatarUrl is set", async () => {
    setupStore({ avatarUrl: "http://localhost:8080/avatars/abc.png" });
    await act(async () => render(<Profile />));

    const img = screen.getByAltText("avatar");
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute("src", "http://localhost:8080/avatars/abc.png");
  });

  it("does not show the initial letter when an avatar image is present", async () => {
    setupStore({ avatarUrl: "http://localhost:8080/avatars/abc.png" });
    await act(async () => render(<Profile />));

    // The letter "T" should not appear as standalone text next to the img
    expect(screen.queryByText("T")).not.toBeInTheDocument();
  });
});

// ── Upload validation (client-side) ──────────────────────────────────────────
describe("Profile — avatar upload validation", () => {
  function fileInput() {
    return document.querySelector('input[type="file"]');
  }

  it("shows an error for an invalid MIME type and does not call uploadAvatar", async () => {
    await act(async () => render(<Profile />));
    const file = new File(["data"], "doc.pdf", { type: "application/pdf" });

    fireEvent.change(fileInput(), { target: { files: [file] } });

    expect(await screen.findByText(/only jpeg/i)).toBeInTheDocument();
    expect(profileService.uploadAvatar).not.toHaveBeenCalled();
  });

  it("shows an error when the file exceeds 2 MB and does not call uploadAvatar", async () => {
    await act(async () => render(<Profile />));
    const oversized = new File([new ArrayBuffer(3 * 1024 * 1024)], "big.png", {
      type: "image/png",
    });

    fireEvent.change(fileInput(), { target: { files: [oversized] } });

    expect(await screen.findByText(/too large/i)).toBeInTheDocument();
    expect(profileService.uploadAvatar).not.toHaveBeenCalled();
  });

  it("clears a previous error message on a new valid upload attempt", async () => {
    profileService.uploadAvatar.mockResolvedValue({
      data: { avatarUrl: "http://localhost:8080/avatars/new.png" },
    });
    await act(async () => render(<Profile />));

    // First: invalid file to trigger an error
    const bad = new File(["data"], "doc.pdf", { type: "application/pdf" });
    fireEvent.change(fileInput(), { target: { files: [bad] } });
    await screen.findByText(/only jpeg/i);

    // Second: valid file — error should disappear
    const good = new File(["img"], "photo.png", { type: "image/png" });
    fireEvent.change(fileInput(), { target: { files: [good] } });

    await waitFor(() => {
      expect(screen.queryByText(/only jpeg/i)).not.toBeInTheDocument();
    });
  });
});

// ── Upload success / failure ──────────────────────────────────────────────────
describe("Profile — avatar upload success and failure", () => {
  function fileInput() {
    return document.querySelector('input[type="file"]');
  }

  it("calls uploadAvatar with the file and updates the store on success", async () => {
    profileService.uploadAvatar.mockResolvedValue({
      data: { avatarUrl: "http://localhost:8080/avatars/new.png" },
    });
    await act(async () => render(<Profile />));
    const file = new File(["img"], "photo.png", { type: "image/png" });

    fireEvent.change(fileInput(), { target: { files: [file] } });

    await waitFor(() => {
      expect(profileService.uploadAvatar).toHaveBeenCalledWith(file);
      expect(mockUpdateAvatarUrl).toHaveBeenCalledWith(
        "http://localhost:8080/avatars/new.png",
      );
    });
  });

  it("shows an error and does not update the store when the upload fails", async () => {
    profileService.uploadAvatar.mockRejectedValue(new Error("Network error"));
    await act(async () => render(<Profile />));
    const file = new File(["img"], "photo.png", { type: "image/png" });

    fireEvent.change(fileInput(), { target: { files: [file] } });

    expect(await screen.findByText(/upload failed/i)).toBeInTheDocument();
    expect(mockUpdateAvatarUrl).not.toHaveBeenCalled();
  });
});
