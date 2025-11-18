/**
 * @file constants/folder-icons.ts
 * @description Available icons for folder customization
 * @created 2025-10-18
 */

import {
  Briefcase,
  Code,
  Folder,
  Heart,
  Home,
  Image,
  Music,
  ShoppingCart,
  Star,
  Video,
  // Social Media
  Youtube,
  Github,
  Instagram,
  Twitter,
  Linkedin,
  // Productivity
  FileText,
  Calendar,
  Bookmark,
  Clock,
  // Technical
  Database,
  Terminal,
  Cpu,
  Lightbulb,
  type LucideIcon,
} from "lucide-react";

export interface FolderIconOption {
  name: string;
  icon: LucideIcon;
  category: "social" | "productivity" | "technical" | "general";
  color: string;
}

export const FOLDER_ICONS: FolderIconOption[] = [
  // Social Media
  { name: "Youtube", icon: Youtube, category: "social", color: "#FF0000" },
  { name: "Instagram", icon: Instagram, category: "social", color: "#E4405F" },
  { name: "Github", icon: Github, category: "social", color: "#333333" },
  { name: "Twitter", icon: Twitter, category: "social", color: "#1DA1F2" },
  { name: "Linkedin", icon: Linkedin, category: "social", color: "#0A66C2" },
  
  // Productivity
  { name: "Briefcase", icon: Briefcase, category: "productivity", color: "#8B4513" },
  { name: "FileText", icon: FileText, category: "productivity", color: "#4B5563" },
  { name: "Calendar", icon: Calendar, category: "productivity", color: "#DC2626" },
  { name: "Bookmark", icon: Bookmark, category: "productivity", color: "#FFA500" },
  { name: "Clock", icon: Clock, category: "productivity", color: "#6366F1" },
  
  // Technical
  { name: "Code", icon: Code, category: "technical", color: "#10B981" },
  { name: "Database", icon: Database, category: "technical", color: "#3B82F6" },
  { name: "Terminal", icon: Terminal, category: "technical", color: "#22C55E" },
  { name: "Cpu", icon: Cpu, category: "technical", color: "#8B5CF6" },
  { name: "Lightbulb", icon: Lightbulb, category: "technical", color: "#FCD34D" },
  
  // General
  { name: "Folder", icon: Folder, category: "general", color: "#F59E0B" },
  { name: "Home", icon: Home, category: "general", color: "#059669" },
  { name: "Heart", icon: Heart, category: "general", color: "#EF4444" },
  { name: "Star", icon: Star, category: "general", color: "#FBBF24" },
  { name: "Music", icon: Music, category: "general", color: "#EC4899" },
  { name: "Video", icon: Video, category: "general", color: "#8B5CF6" },
  { name: "Image", icon: Image, category: "general", color: "#14B8A6" },
  { name: "ShoppingCart", icon: ShoppingCart, category: "general", color: "#F97316" },
];

// Pre-defined default folders
export const PLATFORM_FOLDERS = [
  {
    name: "YouTube",
    iconName: "Youtube",
    platform: "youtube" as const,
    color: "#FF0000",
  },
  {
    name: "Instagram",
    iconName: "Instagram",
    platform: "instagram" as const,
    color: "#E4405F",
  },
  {
    name: "Github",
    iconName: "Github",
    platform: "github" as const,
    color: "#333333",
  },
  {
    name: "Development",
    iconName: "Code",
    platform: "other" as const,
    color: "#3B82F6",
  },
  {
    name: "Research",
    iconName: "Lightbulb",
    platform: "other" as const,
    color: "#FCD34D",
  },
];
