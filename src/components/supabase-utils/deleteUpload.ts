import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

/**
 * Deletes a file from the Supabase "files" storage bucket.
 * 
 * @param path - The storage path of the file to delete (e.g., "timestamp_filename.ext")
 * @returns Promise<void>
 * @throws Error if the deletion fails
 */

export async function deleteUploadFromSupabase(path: string): Promise<void> {
  // Create the Supabase client (client-side)
  const supabase = createClientComponentClient();

  // Attempt to remove the file from the 'files' bucket
  const { error } = await supabase
    .storage
    .from('files')
    .remove([path]);

  if (error) {
    throw new Error(`File deletion failed: ${error.message}`);
  }
}