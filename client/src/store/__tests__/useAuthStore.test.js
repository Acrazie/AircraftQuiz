import { describe, it, expect, beforeEach } from "vitest";
import useAuthStore from "@/store/useAuthStore";

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

beforeEach(() => {
  localStorage.clear();
  useAuthStore.setState({
    token: null,
    refreshToken: null,
    user: null,
    isAuthenticated: false,
  });
});

// ---------------------------------------------------------------------------
// updateAvatarUrl
// ---------------------------------------------------------------------------
describe("updateAvatarUrl", () => {
  it("sets avatarUrl on the user object", () => {
    useAuthStore.setState({ user: { ...baseUser }, isAuthenticated: true });

    useAuthStore
      .getState()
      .updateAvatarUrl("http://localhost:8080/avatars/abc.png");

    expect(useAuthStore.getState().user.avatarUrl).toBe(
      "http://localhost:8080/avatars/abc.png",
    );
  });

  it("preserves all other user fields", () => {
    useAuthStore.setState({
      user: { ...baseUser, avatarColor: "sky" },
      isAuthenticated: true,
    });

    useAuthStore
      .getState()
      .updateAvatarUrl("http://localhost:8080/avatars/abc.png");

    const user = useAuthStore.getState().user;
    expect(user.avatarColor).toBe("sky");
    expect(user.username).toBe("TestPilot");
    expect(user.email).toBe("pilot@test.com");
  });

  it("does nothing when user is null", () => {
    useAuthStore.setState({ user: null });

    useAuthStore
      .getState()
      .updateAvatarUrl("http://localhost:8080/avatars/abc.png");

    expect(useAuthStore.getState().user).toBeNull();
  });

  it("overwrites an existing avatarUrl", () => {
    useAuthStore.setState({
      user: { ...baseUser, avatarUrl: "http://localhost:8080/avatars/old.png" },
    });

    useAuthStore
      .getState()
      .updateAvatarUrl("http://localhost:8080/avatars/new.png");

    expect(useAuthStore.getState().user.avatarUrl).toBe(
      "http://localhost:8080/avatars/new.png",
    );
  });
});

// ---------------------------------------------------------------------------
// updateAvatarColor
// ---------------------------------------------------------------------------
describe("updateAvatarColor", () => {
  it("sets avatarColor on the user object", () => {
    useAuthStore.setState({ user: { ...baseUser }, isAuthenticated: true });

    useAuthStore.getState().updateAvatarColor("sky");

    expect(useAuthStore.getState().user.avatarColor).toBe("sky");
  });

  it("preserves all other user fields", () => {
    useAuthStore.setState({
      user: { ...baseUser, avatarUrl: "http://cdn/abc.png" },
      isAuthenticated: true,
    });

    useAuthStore.getState().updateAvatarColor("navy");

    const user = useAuthStore.getState().user;
    expect(user.avatarUrl).toBe("http://cdn/abc.png");
    expect(user.username).toBe("TestPilot");
  });

  it("does nothing when user is null", () => {
    useAuthStore.setState({ user: null });

    useAuthStore.getState().updateAvatarColor("sky");

    expect(useAuthStore.getState().user).toBeNull();
  });
});
