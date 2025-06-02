import { supabase } from "./client"

export async function uploadImageToSupabase(
  file: File,
  onProgress?: (event: { progress: number }) => void,
  abortSignal?: AbortSignal
): Promise<string> {
  const filePath = `images/${Date.now()}_${file.name}`

  const { error } = await supabase.storage
    .from("images") // <- replace with your supabase bucket name! Mine is images
    .upload(filePath, file, {
      upsert: false,
    })

  if (error) throw error

  const { data } = supabase.storage
    .from("images")
    .getPublicUrl(filePath);

  if (!data?.publicUrl) throw new Error("No public URL returned");
  return data.publicUrl;
}
