'use client';

import {
  BookOpen,
  Languages,
  Calculator,
  Palette,
  Globe,
  ScrollText,
  FlaskConical,
  Landmark,
  MonitorSmartphone,
  Atom,
  Dna,
  Receipt,
  Briefcase,
  TrendingUp,
  Scale,
  Brain,
  GraduationCap,
  Trophy,
  type LucideIcon,
} from 'lucide-react';

const ICONS: Record<string, LucideIcon> = {
  BookOpen,
  Languages,
  Calculator,
  Palette,
  Globe,
  ScrollText,
  FlaskConical,
  Landmark,
  MonitorSmartphone,
  Atom,
  Dna,
  Receipt,
  Briefcase,
  TrendingUp,
  Scale,
  Brain,
  Trophy,
};

export function SubjectIcon({ name, className }: { name?: string | null; className?: string }) {
  const Icon = (name && ICONS[name]) || GraduationCap;
  return <Icon className={className} />;
}
