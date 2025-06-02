import { supabase } from "./client"

export async function uploadImageToSupabase(
  file: File,
  onProgress?: (event: { progress: number }) => void,
  abortSignal?: AbortSignal
): Promise<string> {
  try {
    const filePath = `${Date.now()}_${file.name}`;
    const { data, error } = await supabase.storage
      .from("images")
      .upload(filePath, file, { upsert: false });

    // Log the full result for debugging
    console.log("Supabase upload response:", { data, error, file, filePath });

    if (error) {
      // Log error details from Supabase
      console.error("[Supabase Upload] error:", error);
      throw error;
    }

    // getPublicUrl does NOT return an error property
    const { data: publicUrlData } = supabase.storage
      .from("images")
      .getPublicUrl(filePath);

    if (!publicUrlData?.publicUrl) {
      console.error("[Supabase Upload] No public URL returned");
      throw new Error("No public URL returned");
    }

    return publicUrlData.publicUrl;
  } catch (err) {
    console.error("[Supabase Upload] Exception:", err);
    throw err; // This will propagate up to your UI
  }
}