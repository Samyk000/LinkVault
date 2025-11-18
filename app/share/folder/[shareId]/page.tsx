import React from 'react';
import { notFound } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ExternalLink, Heart, Tag } from 'lucide-react';
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
    const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/share/${shareId}`, {
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

export default async function SharedFolderPage({
  params
}: {
  params: Promise<{ shareId: string }>
}) {
  const { shareId } = await params;
  const folderData = await getSharedFolder(shareId);

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

  const getFaviconUrl = (url: string, fallback?: string) => {
    try {
      const urlObj = new URL(url);
      return fallback || `https://www.google.com/s2/favicons?domain=${urlObj.hostname}`;
    } catch {
      return fallback || `https://www.google.com/s2/favicons?domain=${url}`;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50">
      {/* Header with LinkVault branding */}
      <header className="bg-white/80 backdrop-blur-sm border-b">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="h-10 w-10 bg-orange-500 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">L</span>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">LinkVault</h1>
                <p className="text-sm text-gray-600">Your links, beautifully organized</p>
              </div>
            </div>
            
            {/* CTA Buttons */}
            <div className="flex space-x-3">
              <Button 
                asChild 
                className="bg-orange-500 text-white px-6 py-2 rounded-lg hover:bg-orange-600 transition-colors"
              >
                <a href="/signup">Sign Up Free</a>
              </Button>
              <Button 
                asChild
                variant="outline" 
                className="border-orange-500 text-orange-500 px-6 py-2 rounded-lg hover:bg-orange-500 hover:text-white transition-colors"
              >
                <a href="/login">Sign In</a>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Shared Content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Folder Header */}
        <div className="text-center mb-12">
          <div className="flex justify-center mb-4">
            <div className="h-16 w-16 bg-orange-500 rounded-xl flex items-center justify-center">
              <span className="text-white text-2xl">{folderData.icon || '📁'}</span>
            </div>
          </div>
          <h2 className="text-4xl font-bold text-gray-900 mb-4">{folderData.name}</h2>
          {folderData.description && (
            <p className="text-xl text-gray-600 mb-6">{folderData.description}</p>
          )}
          <div className="inline-flex items-center space-x-2 text-gray-500">
            <span className="text-sm">{folderData.links.length} saved links</span>
            <span className="text-sm">•</span>
            <span className="text-sm">Shared on {formatDate(folderData.shareCreatedAt)}</span>
          </div>
        </div>

        {/* Links Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {folderData.links.map((link) => (
            <Card 
              key={link.id}
              className="group hover:shadow-xl transition-all duration-300 cursor-pointer border-none"
              onClick={() => window.open(link.url, '_blank')}
            >
              <div className="relative h-40 bg-gray-100 rounded-t-lg overflow-hidden">
                {link.thumbnail ? (
                  <Image 
                    src={link.thumbnail} 
                    alt="" 
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-orange-400 to-red-400">
                    <ExternalLink className="h-12 w-12 text-white" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                <div className="absolute bottom-2 right-2">
                  <ExternalLink className="h-4 w-4 text-white/80" />
                </div>
              </div>
              
              <CardContent className="p-4">
                <h3 className="font-semibold text-gray-900 line-clamp-2 mb-2 text-base">
                  {link.title}
                </h3>
                <p className="text-sm text-gray-600 line-clamp-2 mb-3">
                  {link.description}
                </p>
                
                {/* Link Footer */}
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <div className="flex items-center space-x-1">
                    {link.favicon_url && (
                      <Image 
                        src={link.favicon_url} 
                        alt="" 
                        width={12} 
                        height={12}
                        className="rounded-sm"
                      />
                    )}
                    <span className="truncate max-w-[120px]">
                      {new URL(link.url).hostname}
                    </span>
                  </div>
                  <div className="flex items-center space-x-1">
                    {link.is_favorite && (
                      <Heart className="h-3 w-3 text-red-500 fill-red-500" />
                    )}
                    {link.tags && link.tags.length > 0 && (
                      <div className="flex space-x-1">
                        {link.tags.slice(0, 2).map((tag) => (
                          <div key={tag} className="flex items-center">
                            <Tag className="h-3 w-3 text-gray-400" />
                            <span className="ml-1 text-xs">{tag}</span>
                          </div>
                        ))}
                        {link.tags.length > 2 && (
                          <span className="text-gray-400 text-xs">
                            +{link.tags.length - 2}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Footer CTA */}
        <div className="text-center">
          <div className="bg-white/60 backdrop-blur-sm rounded-3xl p-12 border">
            <h3 className="text-3xl font-bold text-gray-900 mb-4">
              Love this collection?
            </h3>
            <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto">
              Join thousands of users who organize their favorite links with LinkVault. 
              Create your own collections, share them with the world, and never lose a great link again.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                asChild
                size="lg"
                className="bg-orange-500 text-white px-12 py-3 text-lg font-semibold hover:bg-orange-600 transition-colors"
              >
                <a href="/signup">Get Started for Free</a>
              </Button>
              <Button 
                asChild
                variant="outline"
                size="lg"
                className="border-orange-500 text-orange-500 px-12 py-3 text-lg font-semibold hover:bg-orange-500 hover:text-white transition-colors"
              >
                <a href="/login">Sign In</a>
              </Button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}