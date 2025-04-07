'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth/auth-context';
import Link from 'next/link';
import { Megaphone, Pin, Clock, FileText, Calendar } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';

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
};

export function AnnouncementList() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAnnouncements = async () => {
      if (!user) return;
      
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
          setAnnouncements([]);
          return;
        }
        
        const propertyIds = properties.map(p => p.id);
        
        // Get announcements for these properties
        const { data, error: announcementsError } = await supabase
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
            property:property_id(name, id)
          `)
          .in('property_id', propertyIds)
          .order('is_pinned', { ascending: false })
          .order('publish_date', { ascending: false });
          
        if (announcementsError) {
          throw new Error(announcementsError.message);
        }
        
        setAnnouncements(data || []);
      } catch (err) {
        console.error('Error fetching announcements:', err);
        setError(err instanceof Error ? err.message : 'An unexpected error occurred');
      } finally {
        setLoading(false);
      }
    };
    
    fetchAnnouncements();
  }, [user]);

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

  const truncateContent = (content: string, maxLength = 100) => {
    if (content.length <= maxLength) return content;
    return content.substring(0, maxLength) + '...';
  };

  if (loading) {
    return <div className="flex justify-center p-8">Loading announcements...</div>;
  }

  if (error) {
    return (
      <div className="p-4 rounded-md bg-red-50 text-red-500">
        Error loading announcements: {error}
      </div>
    );
  }

  if (announcements.length === 0) {
    return (
      <div className="text-center p-8">
        <h3 className="text-lg font-medium mb-4">No announcements found</h3>
        <p className="text-muted-foreground mb-6">You haven't created any announcements yet.</p>
        <Link href="/dashboard/announcements/new">
          <Button>
            <Megaphone className="mr-2 h-4 w-4" /> Create Your First Announcement
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Announcements</h2>
        <Link href="/dashboard/announcements/new">
          <Button>
            <Megaphone className="mr-2 h-4 w-4" /> Create Announcement
          </Button>
        </Link>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>All Announcements</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Property</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {announcements.map((announcement) => (
                <TableRow key={announcement.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center">
                      {announcement.is_pinned && (
                        <Pin className="h-3 w-3 mr-2 text-primary" />
                      )}
                      {announcement.title}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {truncateContent(announcement.content)}
                    </p>
                  </TableCell>
                  <TableCell>
                    <Link href={`/dashboard/properties/${announcement.property.id}`} className="hover:underline">
                      {announcement.property.name}
                    </Link>
                  </TableCell>
                  <TableCell>
                    {isScheduled(announcement) ? (
                      <Badge variant="outline" className="flex items-center">
                        <Clock className="h-3 w-3 mr-1" /> Scheduled
                      </Badge>
                    ) : (
                      <Badge variant="success" className="flex items-center">
                        <Megaphone className="h-3 w-3 mr-1" /> Published
                      </Badge>
                    )}
                    {announcement.attachment_url && (
                      <Badge variant="secondary" className="flex items-center mt-1">
                        <FileText className="h-3 w-3 mr-1" /> Attachment
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center">
                      <Calendar className="h-3 w-3 mr-1 text-muted-foreground" />
                      {formatDate(announcement.publish_date)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Link href={`/dashboard/announcements/${announcement.id}`}>
                        <Button variant="outline" size="sm">View</Button>
                      </Link>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
