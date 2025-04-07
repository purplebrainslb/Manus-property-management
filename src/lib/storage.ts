import { createClient } from '@supabase/supabase-js';

// Initialize Supabase storage client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Upload file to Supabase storage
export async function uploadFile(file: File, bucket: string, path: string) {
  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(path, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      throw error;
    }

    return { success: true, data };
  } catch (error) {
    console.error('Error uploading file:', error);
    return { success: false, error };
  }
}

// Get public URL for a file
export function getFileUrl(bucket: string, path: string) {
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

// Delete file from Supabase storage
export async function deleteFile(bucket: string, path: string) {
  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .remove([path]);

    if (error) {
      throw error;
    }

    return { success: true, data };
  } catch (error) {
    console.error('Error deleting file:', error);
    return { success: false, error };
  }
}

// List files in a bucket with optional prefix
export async function listFiles(bucket: string, prefix?: string) {
  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .list(prefix || '');

    if (error) {
      throw error;
    }

    return { success: true, data };
  } catch (error) {
    console.error('Error listing files:', error);
    return { success: false, error };
  }
}

// Create a signed URL for temporary access to a file
export async function createSignedUrl(bucket: string, path: string, expiresIn = 60) {
  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(path, expiresIn);

    if (error) {
      throw error;
    }

    return { success: true, data };
  } catch (error) {
    console.error('Error creating signed URL:', error);
    return { success: false, error };
  }
}

// Initialize storage buckets
export async function initializeStorageBuckets() {
  const buckets = [
    'property-images',
    'resident-documents',
    'invoice-attachments',
    'meeting-documents',
    'announcement-attachments',
    'ticket-media'
  ];

  const results = [];

  for (const bucket of buckets) {
    try {
      // Check if bucket exists
      const { data: existingBuckets, error: listError } = await supabase.storage.listBuckets();
      
      if (listError) {
        throw listError;
      }

      const bucketExists = existingBuckets.some(b => b.name === bucket);
      
      if (!bucketExists) {
        // Create bucket if it doesn't exist
        const { data, error } = await supabase.storage.createBucket(bucket, {
          public: false,
          fileSizeLimit: 10485760, // 10MB
          allowedMimeTypes: [
            'image/jpeg',
            'image/png',
            'image/gif',
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
          ]
        });

        if (error) {
          throw error;
        }

        results.push({ bucket, status: 'created', data });
      } else {
        results.push({ bucket, status: 'exists' });
      }
    } catch (error) {
      console.error(`Error initializing bucket ${bucket}:`, error);
      results.push({ bucket, status: 'error', error });
    }
  }

  return results;
}
