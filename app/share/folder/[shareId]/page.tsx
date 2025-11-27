'use client';

import React, { useEffect, useState } from 'react';
import { notFound } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ExternalLink, Briefcase, Folder as FolderIcon, Heart, Star, Bookmark, Box, Settings, Home, Globe, FileText, Calendar, Clock, Code, Database, Terminal, Cpu, Lightbulb, Image as ImageIcon, Video, Music, ShoppingCart, Map, Users, User, Shield, AlertTriangle, Info, Mail, Lock, Key, Mic, Headphones, Gamepad, Play, Tag } from 'lucide-react';
import Image from 'next/image';

interface SharedLink {
  id: string;
  title: string;
  description: string;
  url: string;
  thumbnail: string | null;
  favicon_url: string | null;
  platform: string;
  is_favorite: boolean;
  tags: string[] | null;
  created_at: string;
}

interface SharedFolderData {
  id: string;
  name: string;
  description: string | null;
  color: string;
  icon: string;
  shareId: string;
  shareCreatedAt: string;
  links: SharedLink[];
  createdAt: string;
}

async function getSharedFolder(shareId: string): Promise<SharedFolderData | null> {
  try {
    // Use relative path to avoid BASE_URL dependency
    const response = await fetch(`/api/share/${shareId}`, {
      cache: 'no-store'
    });

    if (!response.ok) {
      return null;
    }

    return response.json();
  } catch (error) {
    console.error('Error fetching shared folder:', error);
    return null;
  }
}

// Remove all debug logging from shared page
const logger = {
  info: () => { },
  warn: () => { },
  error: () => { },
  debug: () => { }
};

export default function SharedFolderPage({
  params
}: {
  params: Promise<{ shareId: string }>
}) {
  const { shareId } = React.use(params);
  const [folderData, setFolderData] = useState<SharedFolderData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await getSharedFolder(shareId);
        if (data) {
          setFolderData(data);
        } else {
          notFound();
        }
      } catch (error) {
        // Silent error handling to avoid debug logs
        notFound();
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [shareId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin-gpu rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading shared folder...</p>
        </div>
      </div>
    );
  }

  if (!folderData) {
    notFound();
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Icon mapping for folder icons using shadcn LucideReact components
  const getFolderIconComponent = (iconName: string | null | undefined) => {
    if (!iconName) {
      return <FolderIcon className="h-6 w-6" />;
    }

    const iconMap: Record<string, React.ReactNode> = {
      'Briefcase': <Briefcase className="h-6 w-6" />,
      'Folder': <FolderIcon className="h-6 w-6" />,
      'Bookmark': <Bookmark className="h-6 w-6" />,
      'Star': <Star className="h-6 w-6" />,
      'Heart': <Heart className="h-6 w-6" />,
      'Box': <Box className="h-6 w-6" />,
      'Settings': <Settings className="h-6 w-6" />,
      'User': <User className="h-6 w-6" />,
      'Users': <Users className="h-6 w-6" />,
      'Home': <Home className="h-6 w-6" />,
      'Globe': <Globe className="h-6 w-6" />,
      'FileText': <FileText className="h-6 w-6" />,
      'Calendar': <Calendar className="h-6 w-6" />,
      'Clock': <Clock className="h-6 w-6" />,
      'Code': <Code className="h-6 w-6" />,
      'Database': <Database className="h-6 w-6" />,
      'Terminal': <Terminal className="h-6 w-6" />,
      'Cpu': <Cpu className="h-6 w-6" />,
      'Lightbulb': <Lightbulb className="h-6 w-6" />,
      'Image': <ImageIcon className="h-6 w-6" />,
      'Video': <Video className="h-6 w-6" />,
      'Music': <Music className="h-6 w-6" />,
      'ShoppingCart': <ShoppingCart className="h-6 w-6" />,
      'Map': <Map className="h-6 w-6" />,
      'Shield': <Shield className="h-6 w-6" />,
      'AlertTriangle': <AlertTriangle className="h-6 w-6" />,
      'Info': <Info className="h-6 w-6" />,
      'Mail': <Mail className="h-6 w-6" />,
      'Lock': <Lock className="h-6 w-6" />,
      'Key': <Key className="h-6 w-6" />,
      'Mic': <Mic className="h-6 w-6" />,
      'Headphones': <Headphones className="h-6 w-6" />,
      'Gamepad': <Gamepad className="h-6 w-6" />,
      'Play': <Play className="h-6 w-6" />,
      'ShoppingBag': <ShoppingCart className="h-6 w-6" />,
      'DollarSign': <ShoppingCart className="h-6 w-6" />
    };

    // Return mapped icon component or fallback to default folder icon
    return iconMap[iconName] || <FolderIcon className="h-6 w-6" />;
  };

  const getFaviconUrl = (url: string, fallback?: string) => {
    try {
      const urlObj = new URL(url);
      return fallback || `https://www.google.com/s2/favicons?domain=${urlObj.hostname}`;
    } catch {
      return fallback || `https://www.google.com/s2/favicons?domain=${url}`;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header with Minimalist Branding */}
      <header className="border-b bg-card">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="h-8 w-8 border-2 border-foreground rounded-lg flex items-center justify-center">
                <span className="text-foreground font-semibold text-sm">L</span>
              </div>
              <div>
                <h1 className="text-lg font-semibold text-foreground">LinkVault</h1>
                <p className="text-xs text-muted-foreground">Your links, beautifully organized</p>
              </div>
            </div>

            {/* CTA Buttons - Minimalist */}
            <div className="flex space-x-2">
              <Button
                asChild
                variant="outline"
                className="text-sm font-medium border-muted-foreground/20"
              >
                <a href="/signup">Sign Up</a>
              </Button>
              <Button
                asChild
                variant="ghost"
                className="text-sm"
              >
                <a href="/login">Sign In</a>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Shared Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Folder Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="h-12 w-12 border-2 border-foreground rounded-lg flex items-center justify-center">
              <div className="text-foreground">
                {getFolderIconComponent(folderData.icon)}
              </div>
            </div>
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">{folderData.name}</h1>
          {folderData.description && (
            <p className="text-sm text-muted-foreground mb-4">{folderData.description}</p>
          )}
          <div className="inline-flex items-center space-x-2 text-sm text-muted-foreground">
            <span>{folderData.links.length} {folderData.links.length === 1 ? 'link' : 'links'}</span>
            <span>•</span>
            <span>Shared on {formatDate(folderData.shareCreatedAt)}</span>
          </div>
        </div>

        {/* Links Grid */}
        {folderData.links.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            {folderData.links.map((link) => (
              <Card
                key={link.id}
                className="group cursor-pointer hover:shadow-md transition-all duration-200 border-muted-foreground/20"
                onClick={() => window.open(link.url, '_blank')}
              >
                <div className="relative h-32 bg-muted rounded-t-md overflow-hidden">
                  {link.thumbnail ? (
                    <Image
                      src={link.thumbnail}
                      alt=""
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-200"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ExternalLink className="h-8 w-8 text-muted-foreground" />
                    </div>
                  )}
                  <div className="absolute bottom-2 right-2">
                    <ExternalLink className="h-3 w-3 text-white/80" />
                  </div>
                </div>

                <div className="p-3">
                  <h3 className="font-medium text-foreground line-clamp-2 mb-1 text-sm">
                    {link.title}
                  </h3>
                  <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                    {link.description}
                  </p>

                  {/* Link Footer */}
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <div className="flex items-center space-x-1">
                      {link.favicon_url && (
                        <Image
                          src={link.favicon_url}
                          alt=""
                          width={10}
                          height={10}
                          className="rounded-sm"
                        />
                      )}
                      <span className="truncate max-w-[100px] font-mono">
                        {new URL(link.url).hostname}
                      </span>
                    </div>
                    <div className="flex items-center space-x-1">
                      {link.is_favorite && (
                        <Heart className="h-2 w-2 text-muted-foreground fill-muted-foreground" />
                      )}
                      {link.tags && link.tags.length > 0 && (
                        <div className="flex space-x-0.5">
                          {link.tags.slice(0, 1).map((tag) => (
                            <div key={tag} className="flex items-center">
                              <Tag className="h-2 w-2 text-muted-foreground" />
                              <span className="ml-0.5 text-[10px] truncate max-w-[40px]">{tag}</span>
                            </div>
                          ))}
                          {link.tags.length > 1 && (
                            <span className="text-muted-foreground text-[10px]">
                              +{link.tags.length - 1}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="text-foreground mb-4">
              <span className="text-4xl">📭</span>
            </div>
            <h2 className="text-lg font-semibold text-foreground mb-2">No links yet</h2>
            <p className="text-sm text-muted-foreground mb-6">This folder is currently empty.</p>
          </div>
        )}

        {/* Footer CTA */}
        <div className="text-center border-t pt-8">
          <h3 className="text-lg font-semibold text-foreground mb-4">
            Love this collection?
          </h3>
          <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
            Join thousands of users who organize their favorite links with LinkVault.
            Create your own collections, share them with the world, and never lose a great link again.
          </p>
          <div className="flex flex-col sm:flex-row gap-2 justify-center">
            <Button
              asChild
              className="text-sm font-medium"
            >
              <a href="/signup">Get Started for Free</a>
            </Button>
            <Button
              asChild
              variant="outline"
              className="text-sm font-medium border-muted-foreground/20"
            >
              <a href="/login">Sign In</a>
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}