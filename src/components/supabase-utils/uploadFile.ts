import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

/**
 * Uploads a file to the Supabase "files" storage bucket and returns the storage path and public URL.
 * 
 * @param file - The File object to upload
 * @returns An object with { path, publicUrl }
 * @throws Error if the upload fails
 */
export async function uploadFileToSupabase(file: File): Promise<{ path: string, publicUrl: string }> {
  // Use timestamp prefix to ensure uniqueness
  const storagePath = `${Date.now()}_${file.name}`;

  // Create the Supabase client (client-side)
  const supabase = createClientComponentClient();

  // Upload the file to the 'files' bucket
  const { data, error } = await supabase
    .storage
    .from('files')
    .upload(storagePath, file, {
      cacheControl: '3600',
      upsert: false, // Prevent overwrite; set to true to allow overwrites
    });

  if (error) {
    throw new Error(`File upload failed: ${error.message}`);
  }

  // Get the public URL for the uploaded file
  const { data: urlData } = supabase
    .storage
    .from('files')
    .getPublicUrl(storagePath);

  const publicUrl = urlData?.publicUrl;

  if (!publicUrl) {
    throw new Error('Could not get public URL for the uploaded file.');
  }

  // Return storage path and public URL
  return {
    path: storagePath,
    publicUrl,
  };
}