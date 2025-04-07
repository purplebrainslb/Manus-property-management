'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth/auth-context';
import Link from 'next/link';
import { FileText, Download, Eye, FileUp } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';

type Document = {
  id: string;
  title: string;
  description: string;
  property: {
    name: string;
    id: string;
  };
  category: string;
  file_url: string;
  file_name: string;
  file_type: string;
  file_size: number;
  is_public: boolean;
  created_at: string;
};

export function DocumentList() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDocuments = async () => {
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
          setDocuments([]);
          return;
        }
        
        const propertyIds = properties.map(p => p.id);
        
        // Get documents for these properties
        const { data, error: documentsError } = await supabase
          .from('documents')
          .select(`
            id,
            title,
            description,
            category,
            file_url,
            file_name,
            file_type,
            file_size,
            is_public,
            created_at,
            property:property_id(name, id)
          `)
          .in('property_id', propertyIds)
          .order('created_at', { ascending: false });
          
        if (documentsError) {
          throw new Error(documentsError.message);
        }
        
        setDocuments(data || []);
      } catch (err) {
        console.error('Error fetching documents:', err);
        setError(err instanceof Error ? err.message : 'An unexpected error occurred');
      } finally {
        setLoading(false);
      }
    };
    
    fetchDocuments();
  }, [user]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric'
    });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' bytes';
    else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    else return (bytes / 1048576).toFixed(1) + ' MB';
  };

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'agreement':
        return 'Building Agreement';
      case 'rules':
        return 'Rules & Regulations';
      case 'financial':
        return 'Financial';
      case 'maintenance':
        return 'Maintenance';
      case 'other':
        return 'Other';
      default:
        return category.charAt(0).toUpperCase() + category.slice(1);
    }
  };

  if (loading) {
    return <div className="flex justify-center p-8">Loading documents...</div>;
  }

  if (error) {
    return (
      <div className="p-4 rounded-md bg-red-50 text-red-500">
        Error loading documents: {error}
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <div className="text-center p-8">
        <h3 className="text-lg font-medium mb-4">No documents found</h3>
        <p className="text-muted-foreground mb-6">You haven't uploaded any documents yet.</p>
        <Link href="/dashboard/documents/upload">
          <Button>
            <FileUp className="mr-2 h-4 w-4" /> Upload Your First Document
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Documents</h2>
        <Link href="/dashboard/documents/upload">
          <Button>
            <FileUp className="mr-2 h-4 w-4" /> Upload Document
          </Button>
        </Link>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>All Documents</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Property</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>File</TableHead>
                <TableHead>Visibility</TableHead>
                <TableHead>Uploaded</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {documents.map((document) => (
                <TableRow key={document.id}>
                  <TableCell className="font-medium">
                    {document.title}
                  </TableCell>
                  <TableCell>
                    <Link href={`/dashboard/properties/${document.property.id}`} className="hover:underline">
                      {document.property.name}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {getCategoryLabel(document.category)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="text-sm truncate max-w-[150px]">{document.file_name}</span>
                      <span className="text-xs text-muted-foreground">{formatFileSize(document.file_size)}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {document.is_public ? (
                      <Badge variant="success">Public</Badge>
                    ) : (
                      <Badge variant="secondary">Private</Badge>
                    )}
                  </TableCell>
                  <TableCell>{formatDate(document.created_at)}</TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <a href={document.file_url} target="_blank" rel="noopener noreferrer">
                        <Button variant="outline" size="sm">
                          <Eye className="h-3 w-3 mr-1" /> View
                        </Button>
                      </a>
                      <a href={document.file_url} download>
                        <Button variant="outline" size="sm">
                          <Download className="h-3 w-3 mr-1" /> Download
                        </Button>
                      </a>
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
