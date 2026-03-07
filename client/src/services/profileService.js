import api from "@/lib/axios";

export const profileService = {
  updateAvatarColor: (avatarColor) => api.patch("/profile", { avatarColor }),
  uploadAvatar: (file) => {
    const form = new FormData();
    form.append("avatar", file);
    return api.post("/profile/avatar", form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },
};
