'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth/auth-context';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Megaphone, Pin, Clock, FileText, Calendar, Building, Download, Edit, Trash } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

type Announcement = {
  id: string;
  title: string;
  content: string;
  property: {
    name: string;
    id: string;
  };
  is_pinned: boolean;
  is_published: boolean;
  publish_date: string;
  attachment_url: string | null;
  attachment_name: string | null;
  created_at: string;
  created_by: {
    user: {
      first_name: string;
      last_name: string;
    }
  };
};

export function AnnouncementDetails() {
  const { id } = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const fetchAnnouncementDetails = async () => {
      if (!user || !id) return;
      
      setLoading(true);
      
      try {
        // Get user profile ID
        const { data: userProfile, error: profileError } = await supabase
          .from('user_profiles')
          .select('id')
          .eq('user_id', user.id)
          .single();
          
        if (profileError || !userProfile) {
          throw new Error('Could not find user profile');
        }
        
        // Get properties managed by this user
        const { data: properties, error: propertiesError } = await supabase
          .from('properties')
          .select('id')
          .eq('property_manager_id', userProfile.id);
          
        if (propertiesError) {
          throw new Error(propertiesError.message);
        }
        
        if (!properties || properties.length === 0) {
          throw new Error('No properties found');
        }
        
        const propertyIds = properties.map(p => p.id);
        
        // Get announcement details
        const { data: announcementData, error: announcementError } = await supabase
          .from('announcements')
          .select(`
            id,
            title,
            content,
            is_pinned,
            is_published,
            publish_date,
            attachment_url,
            attachment_name,
            created_at,
            property:property_id(name, id),
            created_by(
              user:user_id(
                first_name,
                last_name
              )
            )
          `)
          .eq('id', id)
          .in('property_id', propertyIds)
          .single();
          
        if (announcementError) {
          throw new Error(announcementError.message);
        }
        
        if (!announcementData) {
          throw new Error('Announcement not found');
        }
        
        setAnnouncement(announcementData);
      } catch (err) {
        console.error('Error fetching announcement details:', err);
        setError(err instanceof Error ? err.message : 'An unexpected error occurred');
      } finally {
        setLoading(false);
      }
    };
    
    fetchAnnouncementDetails();
  }, [user, id]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const isScheduled = (announcement: Announcement) => {
    return !announcement.is_published && new Date(announcement.publish_date) > new Date();
  };

  const handleDelete = async () => {
    if (!user || !announcement) return;
    
    setDeleting(true);
    
    try {
      // Delete the announcement
      const { error: deleteError } = await supabase
        .from('announcements')
        .delete()
        .eq('id', announcement.id);
        
      if (deleteError) {
        throw new Error(deleteError.message);
      }
      
      // If there's an attachment, delete it from storage
      if (announcement.attachment_url) {
        // Extract the path from the URL
        const urlParts = announcement.attachment_url.split('/');
        const filePath = urlParts.slice(urlParts.indexOf('announcements')).join('/');
        
        const { error: storageError } = await supabase.storage
          .from('property-announcements')
          .remove([filePath]);
          
        if (storageError) {
          console.error('Error deleting attachment:', storageError);
          // Continue even if attachment deletion fails
        }
      }
      
      // Redirect to announcements list
      router.push('/dashboard/announcements');
      router.refresh();
    } catch (err) {
      console.error('Error deleting announcement:', err);
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setDeleting(false);
      setDeleteDialogOpen(false);
    }
  };

  const handlePublishNow = async () => {
    if (!user || !announcement) return;
    
    setLoading(true);
    
    try {
      // Update the announcement to be published immediately
      const { error: updateError } = await supabase
        .from('announcements')
        .update({
          is_published: true,
          publish_date: new Date().toISOString()
        })
        .eq('id', announcement.id);
        
      if (updateError) {
        throw new Error(updateError.message);
      }
      
      // Refresh the page to show updated status
      router.refresh();
    } catch (err) {
      console.error('Error publishing announcement:', err);
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center p-8">Loading announcement details...</div>;
  }

  if (error) {
    return (
      <div className="p-4 rounded-md bg-red-50 text-red-500">
        Error loading announcement details: {error}
      </div>
    );
  }

  if (!announcement) {
    return (
      <div className="text-center p-8">
        <h3 className="text-lg font-medium mb-4">Announcement not found</h3>
        <p className="text-muted-foreground mb-6">The announcement you're looking for doesn't exist or you don't have access to it.</p>
        <Link href="/dashboard/announcements">
          <Button>
            <Megaphone className="mr-2 h-4 w-4" /> Back to Announcements
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center">
          <h2 className="text-2xl font-bold mr-2">{announcement.title}</h2>
          {announcement.is_pinned && (
            <Badge variant="outline" className="flex items-center">
              <Pin className="h-3 w-3 mr-1" /> Pinned
            </Badge>
          )}
        </div>
        <div className="flex gap-2">
          {isScheduled(announcement) && (
            <Button variant="outline" onClick={handlePublishNow}>
              Publish Now
            </Button>
          )}
          <Link href={`/dashboard/announcements/edit/${announcement.id}`}>
            <Button variant="outline">
              <Edit className="h-4 w-4 mr-1" /> Edit
            </Button>
          </Link>
          <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="destructive">
                <Trash className="h-4 w-4 mr-1" /> Delete
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Delete Announcement</DialogTitle>
                <DialogDescription>
                  Are you sure you want to delete this announcement? This action cannot be undone.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDeleteDialogOpen(false)} disabled={deleting}>
                  Cancel
                </Button>
                <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
                  {deleting ? 'Deleting...' : 'Delete Announcement'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
      
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Property</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <Building className="h-4 w-4 mr-2 text-muted-foreground" />
              <Link href={`/dashboard/properties/${announcement.property.id}`} className="text-lg font-medium hover:underline">
                {announcement.property.name}
              </Link>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Status</CardTitle>
          </CardHeader>
          <CardContent>
            {isScheduled(announcement) ? (
              <Badge variant="outline" className="flex items-center">
                <Clock className="h-3 w-3 mr-1" /> Scheduled for {formatDate(announcement.publish_date)}
              </Badge>
            ) : (
              <Badge variant="success" className="flex items-center">
                <Megaphone className="h-3 w-3 mr-1" /> Published on {formatDate(announcement.publish_date)}
              </Badge>
            )}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Created By</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <span>{announcement.created_by.user.first_name} {announcement.created_by.user.last_name}</span>
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {formatDate(announcement.created_at)}
            </div>
          </CardContent>
        </Card>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Announcement Content</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="whitespace-pre-wrap">{announcement.content}</div>
        </CardContent>
      </Card>
      
      {announcement.attachment_url && (
        <Card>
          <CardHeader>
            <CardTitle>Attachment</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <FileText className="h-5 w-5 mr-2 text-muted-foreground" />
                <span>{announcement.attachment_name}</span>
              </div>
              <div className="flex gap-2">
                <a href={announcement.attachment_url} target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" size="sm">
                    View
                  </Button>
                </a>
                <a href={announcement.attachment_url} download>
                  <Button variant="outline" size="sm">
                    <Download className="h-3 w-3 mr-1" /> Download
                  </Button>
                </a>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
