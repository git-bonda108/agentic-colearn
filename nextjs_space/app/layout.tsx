import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Link from "next/link";
import { Brain, MessageCircle, BookOpen, CreditCard, LayoutDashboard, GraduationCap, Library, Trophy } from "lucide-react";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Agentic CoLearn · CBSE Learning Companion",
  description:
    "A grounded, adaptive, multi-agent learning companion for CBSE Grades 1-12. Verified NCERT curriculum, board-pattern practice, an AI examiner that grades like a CBSE marking scheme, and a diagnostic engine that knows what you know.",
  openGraph: {
    title: "Agentic CoLearn · CBSE Learning Companion",
    description:
      "Grounded, adaptive, explainable AI tutoring for CBSE Grades 1-12 — every fact cited, every mark traceable.",
    images: ["/og-image.png"],
  },
  icons: {
    icon: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} bg-gradient-to-br from-gray-950 via-gray-900 to-black text-white`}>
        {/* Navigation Header */}
        <nav className="fixed top-0 left-0 right-0 z-50 bg-black/50 backdrop-blur-xl border-b border-gray-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              {/* Logo */}
              <Link href="/" className="flex items-center gap-3 group">
                <div className="relative">
                  <Brain className="w-8 h-8 text-purple-400 group-hover:text-purple-300 transition-colors" />
                  <div className="absolute inset-0 bg-purple-500/20 blur-xl group-hover:bg-purple-400/30 transition-all" />
                </div>
                <div>
                  <div className="text-xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                    Agentic CoLearn
                  </div>
                  <div className="text-xs text-gray-400 -mt-1">CBSE Learning Companion · Grades 1–12</div>
                </div>
              </Link>

              {/* Navigation Links */}
              <div className="hidden md:flex items-center gap-1">
                <NavLink href="/learn" icon={<Library className="w-4 h-4" />} label="Learn" description="CBSE Grades 1-12" />
                <NavLink href="/olympiad" icon={<Trophy className="w-4 h-4" />} label="Olympiad" description="Indian Talent Olympiad prep" />
                <NavLink href="/dashboard" icon={<LayoutDashboard className="w-4 h-4" />} label="Dashboard" description="Mastery & progress" />
                <NavLink href="/knowledge-graph" icon={<GraduationCap className="w-4 h-4" />} label="Map" description="Your knowledge graph" />
                <NavLink href="/parent" icon={<MessageCircle className="w-4 h-4" />} label="Parents" description="Weekly report" />
                <NavLink href="/notes" icon={<BookOpen className="w-4 h-4" />} label="Notes" description="Smart notes & concepts" />
                <NavLink href="/flashcards" icon={<CreditCard className="w-4 h-4" />} label="Review" description="Spaced repetition" />
              </div>

              {/* Mobile Menu Button */}
              <div className="md:hidden">
                <Link
                  href="/dashboard"
                  className="p-2 rounded-lg hover:bg-white/5 transition-colors"
                >
                  <LayoutDashboard className="w-6 h-6 text-gray-400" />
                </Link>
              </div>
            </div>
          </div>

          {/* Mobile Navigation */}
          <div className="md:hidden border-t border-gray-800 bg-black/80 backdrop-blur-xl">
            <div className="grid grid-cols-3 gap-1 p-2">
              <MobileNavLink href="/learn" icon={<Library className="w-5 h-5" />} label="Learn" />
              <MobileNavLink href="/dashboard" icon={<LayoutDashboard className="w-5 h-5" />} label="Dashboard" />
              <MobileNavLink href="/knowledge-graph" icon={<GraduationCap className="w-5 h-5" />} label="Map" />
              <MobileNavLink href="/parent" icon={<MessageCircle className="w-5 h-5" />} label="Parents" />
              <MobileNavLink href="/notes" icon={<BookOpen className="w-5 h-5" />} label="Notes" />
              <MobileNavLink href="/flashcards" icon={<CreditCard className="w-5 h-5" />} label="Review" />
            </div>
          </div>
        </nav>

        {/* Main Content */}
        <main className="pt-16">{children}</main>
      </body>
    </html>
  );
}

// Desktop Navigation Link Component
function NavLink({ href, icon, label, description }: { href: string; icon: React.ReactNode; label: string; description: string }) {
  return (
    <Link
      href={href}
      className="group relative px-4 py-2 rounded-lg hover:bg-white/5 transition-all"
    >
      <div className="flex items-center gap-2">
        <div className="text-gray-400 group-hover:text-purple-400 transition-colors">{icon}</div>
        <div>
          <div className="text-sm font-medium text-white group-hover:text-purple-300 transition-colors">{label}</div>
          <div className="text-[10px] text-gray-500 group-hover:text-gray-400 transition-colors">{description}</div>
        </div>
      </div>
    </Link>
  );
}

// Mobile Navigation Link Component
function MobileNavLink({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  return (
    <Link
      href={href}
      className="flex flex-col items-center gap-1 p-3 rounded-lg hover:bg-white/5 transition-colors"
    >
      <div className="text-gray-400">{icon}</div>
      <div className="text-xs text-gray-400">{label}</div>
    </Link>
  );
}
