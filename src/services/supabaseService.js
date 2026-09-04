import { supabase } from "../config/supabase";

export const userService = {
  getCurrentUser: async () => {
    try {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();
      if (error) throw error;
      return { user, error: null };
    } catch (error) {
      console.error("Error getting current user:", error.message);
      return { user: null, error };
    }
  },

  getProfile: async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("No user found");

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (error) throw error;
      return { profile: data, error: null };
    } catch (error) {
      console.error("Error fetching profile:", error.message);
      return { profile: null, error };
    }
  },

  updateProfile: async (updates) => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("No user found");

      const { data, error } = await supabase
        .from("profiles")
        .update(updates)
        .eq("id", user.id)
        .select()
        .single();

      if (error) throw error;
      return { profile: data, error: null };
    } catch (error) {
      console.error("Error updating profile:", error.message);
      return { profile: null, error };
    }
  },
};
