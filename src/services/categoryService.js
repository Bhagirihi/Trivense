import { supabase } from "../config/supabase";
import { getCurrentUser } from "../utils/supabaseAuth";

export const categoryService = {
  async getCategories() {
    try {
      const user = await getCurrentUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .eq("user_id", user.id)
        .order("name");

      if (error) {
        console.error("Error fetching categories:", error.message);
        throw error;
      }

      return data;
    } catch (error) {
      console.error("Error in getCategories:", error.message);
      throw error;
    }
  },

  async importDefaultCategories() {
    try {
      const defaultCategories = [
        {
          id: "0e939106-82df-4856-87da-f02573f5f9e7",
          name: "Education",
          description: "Education and learning",
          icon: "book",
          color: "#D4A5A5",
          is_default: true,
          created_at: "2025-03-23 04:20:36.680139+00",
          updated_at: "2025-03-23 04:20:36.680139+00",
        },
        {
          id: "housing-category-id",
          name: "Housing",
          description: "Housing and accommodation",
          icon: "home",
          color: "#1ABC9C",
          is_default: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        // Add more default categories here as needed
      ];

      const { data, error } = await supabase
        .from("categories")
        .upsert(defaultCategories, {
          onConflict: "id",
          ignoreDuplicates: false,
        })
        .select();

      if (error) {
        console.error("Error importing default categories:", error.message);
        throw error;
      }

      console.log("Successfully imported default categories:");
      return data;
    } catch (error) {
      console.error("Error in importDefaultCategories:", error.message);
      throw error;
    }
  },

  async createCategory(categoryData) {
    try {
      const user = await getCurrentUser();
      if (!user) throw new Error("No authenticated user");

      const processedData = {
        ...categoryData,
        icon:
          typeof categoryData.icon === "object"
            ? categoryData.icon.name
            : categoryData.icon,
        color:
          typeof categoryData.color === "object"
            ? categoryData.color.value
            : categoryData.color,
        user_id: user.id,
      };

      const { data, error } = await supabase
        .from("categories")
        .insert([processedData])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error("Error creating category:", error);
      throw error;
    }
  },

  async updateCategory(id, categoryData) {
    try {
      const user = await getCurrentUser();
      if (!user) throw new Error("No authenticated user");

      const processedData = {
        ...categoryData,
        icon:
          typeof categoryData.icon === "object"
            ? categoryData.icon.name
            : categoryData.icon,
        color:
          typeof categoryData.color === "object"
            ? categoryData.color.value
            : categoryData.color,
      };

      const { data, error } = await supabase
        .from("categories")
        .update(processedData)
        .eq("id", id)
        .eq("user_id", user.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error("Error updating category:", error);
      throw error;
    }
  },

  async deleteCategory(id) {
    try {
      const user = await getCurrentUser();
      if (!user) throw new Error("No authenticated user");

      const { error } = await supabase
        .from("categories")
        .delete()
        .eq("id", id)
        .eq("user_id", user.id);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error("Error deleting category:", error);
      throw error;
    }
  },
};
