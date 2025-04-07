'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth/auth-context';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { AlertCircle, CheckCircle, Clock, FileText, Building, Edit, MessageSquare, Paperclip } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { FileUploader } from '../documents/file-uploader';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type Ticket = {
  id: string;
  title: string;
  description: string;
  property: {
    name: string;
    id: string;
  };
  category: string;
  priority: string;
  status: string;
  unit_number: string | null;
  created_at: string;
  updated_at: string;
  created_by: {
    id: string;
    user: {
      first_name: string;
      last_name: string;
    }
  };
};

type TicketMedia = {
  id: string;
  file_url: string;
  file_name: string;
  file_type: string;
  file_size: number;
  created_at: string;
};

type TicketNote = {
  id: string;
  content: string;
  created_at: string;
  created_by: {
    id: string;
    user: {
      first_name: string;
      last_name: string;
    }
  };
};

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ACCEPTED_FILE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'video/mp4'];

export function TicketDetails() {
  const { id } = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [media, setMedia] = useState<TicketMedia[]>([]);
  const [notes, setNotes] = useState<TicketNote[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [newNote, setNewNote] = useState('');
  const [addingNote, setAddingNote] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  useEffect(() => {
    const fetchTicketDetails = async () => {
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
        
        // Get ticket details
        const { data: ticketData, error: ticketError } = await supabase
          .from('tickets')
          .select(`
            id,
            title,
            description,
            category,
            priority,
            status,
            unit_number,
            created_at,
            updated_at,
            property:property_id(name, id),
            created_by(
              id,
              user:user_id(
                first_name,
                last_name
              )
            )
          `)
          .eq('id', id)
          .in('property_id', propertyIds)
          .single();
          
        if (ticketError) {
          throw new Error(ticketError.message);
        }
        
        if (!ticketData) {
          throw new Error('Ticket not found');
        }
        
        setTicket(ticketData);
        
        // Get ticket media
        const { data: mediaData, error: mediaError } = await supabase
          .from('ticket_media')
          .select(`
            id,
            file_url,
            file_name,
            file_type,
            file_size,
            created_at
          `)
          .eq('ticket_id', id)
          .order('created_at');
          
        if (mediaError) {
          throw new Error(mediaError.message);
        }
        
        setMedia(mediaData || []);
        
        // Get ticket notes
        const { data: notesData, error: notesError } = await supabase
          .from('ticket_notes')
          .select(`
            id,
            content,
            created_at,
            created_by(
              id,
              user:user_id(
                first_name,
                last_name
              )
            )
          `)
          .eq('ticket_id', id)
          .order('created_at');
          
        if (notesError) {
          throw new Error(notesError.message);
        }
        
        setNotes(notesData || []);
      } catch (err) {
        console.error('Error fetching ticket details:', err);
        setError(err instanceof Error ? err.message : 'An unexpected error occurred');
      } finally {
        setLoading(false);
      }
    };
    
    fetchTicketDetails();
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

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return <Badge variant="destructive">Urgent</Badge>;
      case 'high':
        return <Badge variant="destructive" className="bg-orange-500">High</Badge>;
      case 'medium':
        return <Badge variant="outline" className="border-yellow-500 text-yellow-700">Medium</Badge>;
      case 'low':
        return <Badge variant="outline">Low</Badge>;
      default:
        return <Badge variant="outline">{priority}</Badge>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'open':
        return <Badge variant="outline" className="flex items-center"><AlertCircle className="h-3 w-3 mr-1" /> Open</Badge>;
      case 'in_progress':
        return <Badge variant="secondary" className="flex items-center"><Clock className="h-3 w-3 mr-1" /> In Progress</Badge>;
      case 'resolved':
        return <Badge variant="success" className="flex items-center"><CheckCircle className="h-3 w-3 mr-1" /> Resolved</Badge>;
      case 'closed':
        return <Badge className="flex items-center bg-gray-500"><CheckCircle className="h-3 w-3 mr-1" /> Closed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'maintenance':
        return 'Maintenance';
      case 'complaint':
        return 'Complaint';
      case 'request':
        return 'Request';
      case 'other':
        return 'Other';
      default:
        return category.charAt(0).toUpperCase() + category.slice(1);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' bytes';
    else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    else return (bytes / 1048576).toFixed(1) + ' MB';
  };

  const handleFileChange = (file: File | null) => {
    setFileError(null);
    
    if (!file) {
      setSelectedFile(null);
      return;
    }
    
    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      setFileError(`File size exceeds the maximum limit of ${MAX_FILE_SIZE / (1024 * 1024)}MB`);
      setSelectedFile(null);
      return;
    }
    
    // Validate file type
    if (!ACCEPTED_FILE_TYPES.includes(file.type)) {
      setFileError('File type not supported. Please upload images or videos.');
      setSelectedFile(null);
      return;
    }
    
    setSelectedFile(file);
  };

  const handleAddNote = async () => {
    if (!user || !ticket || !newNote.trim()) return;
    
    setAddingNote(true);
    
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

      // Add note
      const { data: noteData, error: noteError } = await supabase
        .from('ticket_notes')
        .insert({
          ticket_id: ticket.id,
          content: newNote.trim(),
          created_by: userProfile.id,
        })
        .select(`
          id,
          content,
          created_at,
          created_by(
            id,
            user:user_id(
              first_name,
              last_name
            )
          )
        `)
        .single();

      if (noteError) {
        throw new Error(noteError.message);
      }

      // Add note to state
      setNotes(prev => [...prev, noteData]);
      setNewNote('');
    } catch (err) {
      console.error('Error adding note:', err);
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setAddingNote(false);
    }
  };

  const handleUploadFile = async () => {
    if (!user || !ticket || !selectedFile) return;
    
    setUploadingFile(true);
    
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

      // Upload file to Supabase Storage
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
      const filePath = `tickets/${ticket.id}/${fileName}`;
      
      const { error: uploadError } = await supabase.storage
        .from('property-tickets')
        .upload(filePath, selectedFile);

      if (uploadError) {
        throw new Error(`Error uploading file: ${uploadError.message}`);
      }

      // Get the public URL for the uploaded file
      const { data: publicUrlData } = supabase.storage
        .from('property-tickets')
        .getPublicUrl(filePath);

      // Create ticket media record
      const { data: mediaData, error: mediaError } = await supabase
        .from('ticket_media')
        .insert({
          ticket_id: ticket.id,
          file_path: filePath,
          file_url: publicUrlData.publicUrl,
          file_name: selectedFile.name,
          file_type: selectedFile.type,
          file_size: selectedFile.size,
          uploaded_by: userProfile.id,
        })
        .select(`
          id,
          file_url,
          file_name,
          file_type,
          file_size,
          created_at
        `)
        .single();

      if (mediaError) {
        throw new Error(mediaError.message);
      }

      // Add media to state
      setMedia(prev => [...prev, mediaData]);
      setSelectedFile(null);
    } catch (err) {
      console.error('Error uploading file:', err);
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setUploadingFile(false);
    }
  };

  const handleUpdateStatus = async (newStatus: string) => {
    if (!user || !ticket) return;
    
    setUpdatingStatus(true);
    
    try {
      // Update ticket status
      const { error: updateError } = await supabase
        .from('tickets')
        .update({
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', ticket.id);
        
      if (updateError) {
        throw new Error(updateError.message);
      }
      
      // Update ticket in state
      setTicket(prev => prev ? { ...prev, status: newStatus } : null);
      
      // Add a note about the status change
      const { data: userProfile, error: profileError } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (profileError || !userProfile) {
        throw new Error('Could not find user profile');
      }
      
      const statusChangeNote = `Status changed to ${newStatus.replace('_', ' ')}`;
      
      const { data: noteData, error: noteError } = await supabase
        .from('ticket_notes')
        .insert({
          ticket_id: ticket.id,
          content: statusChangeNote,
          created_by: userProfile.id,
        })
        .select(`
          id,
          content,
          created_at,
          created_by(
            id,
            user:user_id(
              first_name,
              last_name
            )
          )
        `)
        .single();

      if (noteError) {
        throw new Error(noteError.message);
      }

      // Add note to state
      setNotes(prev => [...prev, noteData]);
    } catch (err) {
      console.error('Error updating status:', err);
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setUpdatingStatus(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center p-8">Loading ticket details...</div>;
  }

  if (error) {
    return (
      <div className="p-4 rounded-md bg-red-50 text-red-500">
        Error loading ticket details: {error}
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="text-center p-8">
        <h3 className="text-lg font-medium mb-4">Ticket not found</h3>
        <p className="text-muted-foreground mb-6">The ticket you're looking for doesn't exist or you don't have access to it.</p>
        <Link href="/dashboard/tickets">
          <Button>
            <FileText className="mr-2 h-4 w-4" /> Back to Tickets
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">{ticket.title}</h2>
          <p className="text-muted-foreground">
            Created on {formatDate(ticket.created_at)}
          </p>
        </div>
        <div className="flex gap-2">
          <Select 
            value={ticket.status}
            onValueChange={handleUpdateStatus}
            disabled={updatingStatus}
          >
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
              <SelectItem value="closed">Closed</SelectItem>
            </SelectContent>
          </Select>
          
          <Link href={`/dashboard/tickets/edit/${ticket.id}`}>
            <Button variant="outline">
              <Edit className="h-4 w-4 mr-1" /> Edit
            </Button>
          </Link>
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
              <Link href={`/dashboard/properties/${ticket.property.id}`} className="text-lg font-medium hover:underline">
                {ticket.property.name}
              </Link>
            </div>
            {ticket.unit_number && (
              <div className="mt-2 text-sm">
                Unit: {ticket.unit_number}
              </div>
            )}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <p className="text-xs text-muted-foreground">Category</p>
                <p>{getCategoryLabel(ticket.category)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Priority</p>
                <div>{getPriorityBadge(ticket.priority)}</div>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Status</p>
                <div>{getStatusBadge(ticket.status)}</div>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Last Updated</p>
                <p>{formatDate(ticket.updated_at)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Submitted By</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <span>{ticket.created_by.user.first_name} {ticket.created_by.user.last_name}</span>
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {formatDate(ticket.created_at)}
            </div>
          </CardContent>
        </Card>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Description</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="whitespace-pre-wrap">{ticket.description}</div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Media Attachments</CardTitle>
          <Paperclip className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          {media.length === 0 ? (
            <div className="text-center p-4">
              <p className="text-muted-foreground">No attachments for this ticket.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {media.map((item) => (
                <div key={item.id} className="border rounded-md p-4">
                  {item.file_type.startsWith('image/') ? (
                    <div className="mb-2">
                      <a href={item.file_url} target="_blank" rel="noopener noreferrer">
                        <img 
                          src={item.file_url} 
                          alt={item.file_name} 
                          className="max-h-48 mx-auto object-contain rounded-md"
                        />
                      </a>
                    </div>
                  ) : item.file_type.startsWith('video/') ? (
                    <div className="mb-2">
                      <video 
                        src={item.file_url} 
                        controls 
                        className="max-h-48 w-full object-contain rounded-md"
                      />
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-32 bg-gray-100 rounded-md mb-2">
                      <FileText className="h-12 w-12 text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <div className="truncate text-sm">
                      {item.file_name}
                      <p className="text-xs text-muted-foreground">
                        {formatFileSize(item.file_size)}
                      </p>
                    </div>
                    <a href={item.file_url} download className="ml-2">
                      <Button variant="outline" size="sm">Download</Button>
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
          
          <div className="mt-6 border-t pt-4">
            <h4 className="text-sm font-medium mb-2">Add Attachment</h4>
            <div className="space-y-2">
              <FileUploader 
                onFileSelect={handleFileChange}
                accept=".jpg,.jpeg,.png,.gif,.mp4"
              />
              {fileError && (
                <p className="text-sm text-red-500">{fileError}</p>
              )}
              {selectedFile && (
                <div className="text-sm text-muted-foreground">
                  Selected file: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(2)} KB)
                </div>
              )}
              <Button 
                onClick={handleUploadFile} 
                disabled={!selectedFile || uploadingFile}
                className="mt-2"
              >
                {uploadingFile ? 'Uploading...' : 'Upload Attachment'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Notes & Updates</CardTitle>
          <MessageSquare className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          {notes.length === 0 ? (
            <div className="text-center p-4">
              <p className="text-muted-foreground">No notes for this ticket yet.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {notes.map((note) => (
                <div key={note.id} className="border-b pb-4">
                  <div className="flex justify-between items-start mb-2">
                    <div className="font-medium">
                      {note.created_by.user.first_name} {note.created_by.user.last_name}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {formatDate(note.created_at)}
                    </div>
                  </div>
                  <p className="whitespace-pre-wrap">{note.content}</p>
                </div>
              ))}
            </div>
          )}
          
          <div className="mt-6 border-t pt-4">
            <h4 className="text-sm font-medium mb-2">Add Note</h4>
            <div className="space-y-2">
              <Textarea
                placeholder="Add a note or update about this ticket..."
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                rows={3}
              />
              <Button 
                onClick={handleAddNote} 
                disabled={!newNote.trim() || addingNote}
              >
                {addingNote ? 'Adding...' : 'Add Note'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
