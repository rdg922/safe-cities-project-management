import { supabase } from "./client"

export async function uploadFileToSupabase(
  file: File,
  onProgress?: (event: { progress: number }) => void,
  abortSignal?: AbortSignal
): Promise<string> {
  try {
    const filePath = `${Date.now()}_${file.name}`;
    const { data, error } = await supabase.storage
      .from("files")
      .upload(filePath, file, { upsert: false });

    // Log the full result for debugging
    console.log("Supabase upload file response:", { data, error, file, filePath });

    if (error) {
      // Log error details from Supabase
      console.error("[Supabase Upload File] error:", error);
      throw error;
    }

    // getPublicUrl does NOT return an error property
    const { data: publicUrlData } = supabase.storage
      .from("files")
      .getPublicUrl(filePath);

    if (!publicUrlData?.publicUrl) {
      console.error("[Supabase Upload File] No public URL returned");
      throw new Error("No public file URL returned");
    }

    return publicUrlData.publicUrl;
  } catch (err) {
    console.error("[Supabase Upload File] Exception:", err);
    throw err; // This will propagate up to your UI
  }
}