import { createClient, SupabaseClient } from "@supabase/supabase-js";

// Initialize Supabase client for storage operations
// Uses the same project as the database
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Lazy initialization to avoid errors during build
let _supabase: SupabaseClient | null = null;

function getSupabaseClient(): SupabaseClient | null {
  if (!supabaseUrl || !supabaseAnonKey) {
    return null;
  }
  if (!_supabase) {
    _supabase = createClient(supabaseUrl, supabaseAnonKey);
  }
  return _supabase;
}

export const supabase = {
  get storage() {
    const client = getSupabaseClient();
    if (!client) {
      throw new Error("Supabase not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.");
    }
    return client.storage;
  },
};

// Storage bucket names
export const BUCKETS = {
  JOB_EVIDENCE: "job-evidence",
  SIGNATURES: "signatures",
  CERTIFICATES: "certificates",
} as const;

export type BucketName = (typeof BUCKETS)[keyof typeof BUCKETS];

function isSupabaseConfigured(): boolean {
  return Boolean(supabaseUrl && supabaseAnonKey);
}

/**
 * Upload a file to Supabase Storage
 */
export async function uploadFile(
  bucket: BucketName,
  path: string,
  file: File | Blob,
  options?: {
    contentType?: string;
    upsert?: boolean;
  }
): Promise<{ success: boolean; url?: string; error?: string }> {
  if (!isSupabaseConfigured()) {
    return { success: false, error: "Supabase storage not configured" };
  }

  try {
    const client = getSupabaseClient()!;
    const { data, error } = await client.storage
      .from(bucket)
      .upload(path, file, {
        cacheControl: "3600",
        upsert: options?.upsert ?? false,
        contentType: options?.contentType,
      });

    if (error) {
      console.error("Upload error:", error);
      return { success: false, error: error.message };
    }

    // Get public URL
    const {
      data: { publicUrl },
    } = client.storage.from(bucket).getPublicUrl(data.path);

    return { success: true, url: publicUrl };
  } catch (error) {
    console.error("Upload exception:", error);
    return { success: false, error: "Upload failed" };
  }
}

/**
 * Delete a file from Supabase Storage
 */
export async function deleteFile(
  bucket: BucketName,
  path: string
): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseConfigured()) {
    return { success: false, error: "Supabase storage not configured" };
  }

  try {
    const client = getSupabaseClient()!;
    const { error } = await client.storage.from(bucket).remove([path]);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error("Delete exception:", error);
    return { success: false, error: "Delete failed" };
  }
}

/**
 * Get signed URL for private files (if bucket is not public)
 */
export async function getSignedUrl(
  bucket: BucketName,
  path: string,
  expiresIn: number = 3600
): Promise<{ success: boolean; url?: string; error?: string }> {
  if (!isSupabaseConfigured()) {
    return { success: false, error: "Supabase storage not configured" };
  }

  try {
    const client = getSupabaseClient()!;
    const { data, error } = await client.storage
      .from(bucket)
      .createSignedUrl(path, expiresIn);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, url: data.signedUrl };
  } catch (error) {
    console.error("Signed URL exception:", error);
    return { success: false, error: "Failed to get signed URL" };
  }
}

/**
 * List files in a folder
 */
export async function listFiles(
  bucket: BucketName,
  folder: string
): Promise<{ success: boolean; files?: string[]; error?: string }> {
  if (!isSupabaseConfigured()) {
    return { success: false, error: "Supabase storage not configured" };
  }

  try {
    const client = getSupabaseClient()!;
    const { data, error } = await client.storage.from(bucket).list(folder);

    if (error) {
      return { success: false, error: error.message };
    }

    return {
      success: true,
      files: data.map((f) => `${folder}/${f.name}`),
    };
  } catch (error) {
    console.error("List files exception:", error);
    return { success: false, error: "Failed to list files" };
  }
}
