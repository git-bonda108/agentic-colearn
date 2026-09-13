'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BookOpen,
  Plus,
  Search,
  Sparkles,
  Tag,
  Clock,
  Trash2,
  Edit3,
  Save,
  X,
  Lightbulb,
  Zap,
} from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const ReactQuill = dynamic(() => import('react-quill'), { ssr: false });
import 'react-quill/dist/quill.snow.css';

interface Note {
  id: string;
  title: string;
  content: string;
  subject: string | null;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  concepts: Array<{
    id: string;
    name: string;
    description: string | null;
  }>;
  flashcards: Array<{ id: string }>;
}

const SUBJECTS = ['Math', 'Science', 'History', 'Programming', 'Other'];

export default function NotesPage() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [filteredNotes, setFilteredNotes] = useState<Note[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubject, setSelectedSubject] = useState<string>('all');
  const [isCreating, setIsCreating] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Form state
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [subject, setSubject] = useState<string>('');

  useEffect(() => {
    fetchNotes();
  }, []);

  useEffect(() => {
    let filtered = notes;

    if (searchQuery) {
      filtered = filtered.filter(
        (note) =>
          note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          note.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
          note.tags.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }

    if (selectedSubject !== 'all') {
      filtered = filtered.filter((note) => note.subject === selectedSubject);
    }

    setFilteredNotes(filtered);
  }, [notes, searchQuery, selectedSubject]);

  const fetchNotes = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/notes');
      const data = await response.json();
      if (Array.isArray(data)) {
        setNotes(data);
        setFilteredNotes(data);
      } else {
        setNotes([]);
        setFilteredNotes([]);
      }
    } catch (error) {
      console.error('Failed to fetch notes:', error);
      setNotes([]);
      setFilteredNotes([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateNote = async () => {
    if (!title.trim() || !content.trim()) {
      alert('Please enter both title and content');
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch('/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, content, subject }),
      });

      if (response.ok) {
        await fetchNotes();
        setIsCreating(false);
        setTitle('');
        setContent('');
        setSubject('');
      }
    } catch (error) {
      console.error('Failed to create note:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateNote = async () => {
    if (!editingNote || !title.trim() || !content.trim()) return;

    setIsSaving(true);
    try {
      const response = await fetch(`/api/notes/${editingNote.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, content, subject }),
      });

      if (response.ok) {
        await fetchNotes();
        setEditingNote(null);
        setTitle('');
        setContent('');
        setSubject('');
      }
    } catch (error) {
      console.error('Failed to update note:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    if (!confirm('Are you sure you want to delete this note?')) return;

    try {
      await fetch(`/api/notes/${noteId}`, { method: 'DELETE' });
      await fetchNotes();
    } catch (error) {
      console.error('Failed to delete note:', error);
    }
  };

  const handleEditNote = (note: Note) => {
    setEditingNote(note);
    setTitle(note.title);
    setContent(note.content);
    setSubject(note.subject || '');
    setIsCreating(true);
  };

  const handleCancel = () => {
    setIsCreating(false);
    setEditingNote(null);
    setTitle('');
    setContent('');
    setSubject('');
  };

  const handleGenerateFlashcards = async (noteId: string) => {
    try {
      const response = await fetch('/api/flashcards/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ noteId }),
      });

      if (response.ok) {
        alert('Flashcards generated successfully!');
        await fetchNotes();
      }
    } catch (error) {
      console.error('Failed to generate flashcards:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900/20 to-gray-900">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link href="/dashboard">
            <Button variant="ghost" className="mb-4">
              ← Back to Dashboard
            </Button>
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent mb-2">
                Second Brain
              </h1>
              <p className="text-gray-400">
                Build your knowledge repository with AI-powered concept extraction
              </p>
            </div>
            <Button
              onClick={() => setIsCreating(true)}
              disabled={isCreating}
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Note
            </Button>
          </div>
        </div>

        {/* Search and Filter */}
        {!isCreating && (
          <div className="mb-6 flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search notes, tags, concepts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-gray-800/50 border-gray-700"
              />
            </div>
            <Select value={selectedSubject} onValueChange={setSelectedSubject}>
              <SelectTrigger className="w-[180px] bg-gray-800/50 border-gray-700">
                <SelectValue placeholder="All Subjects" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Subjects</SelectItem>
                {SUBJECTS.map((subj) => (
                  <SelectItem key={subj} value={subj}>
                    {subj}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Create/Edit Note Form */}
        <AnimatePresence>
          {isCreating && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="mb-8"
            >
              <Card className="bg-gray-800/50 border-gray-700">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <Edit3 className="w-5 h-5 text-purple-400" />
                      {editingNote ? 'Edit Note' : 'Create New Note'}
                    </span>
                    <Button variant="ghost" size="sm" onClick={handleCancel}>
                      <X className="w-4 h-4" />
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Input
                    placeholder="Note Title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="bg-gray-900/50 border-gray-700 text-lg"
                  />
                  <Select value={subject} onValueChange={setSubject}>
                    <SelectTrigger className="bg-gray-900/50 border-gray-700">
                      <SelectValue placeholder="Select Subject" />
                    </SelectTrigger>
                    <SelectContent>
                      {SUBJECTS.map((subj) => (
                        <SelectItem key={subj} value={subj}>
                          {subj}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="bg-gray-900/50 rounded-lg border border-gray-700 overflow-hidden">
                    <Textarea
                      placeholder="Write your notes here... AI will automatically extract key concepts!"
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      rows={12}
                      className="bg-transparent border-0 resize-none"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={editingNote ? handleUpdateNote : handleCreateNote}
                      disabled={isSaving || !title.trim() || !content.trim()}
                      className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                    >
                      {isSaving ? (
                        <>
                          <Sparkles className="w-4 h-4 mr-2 animate-spin" />
                          {editingNote ? 'Updating...' : 'Creating...'}
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4 mr-2" />
                          {editingNote ? 'Update Note' : 'Create Note'}
                        </>
                      )}
                    </Button>
                    <Button variant="outline" onClick={handleCancel}>
                      Cancel
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Notes Grid */}
        {!isCreating && (
          <div className="grid gap-4">
            {isLoading ? (
              <div className="text-center py-12 text-gray-400">
                <Sparkles className="w-8 h-8 animate-spin mx-auto mb-2" />
                Loading notes...
              </div>
            ) : filteredNotes.length === 0 ? (
              <div className="text-center py-12">
                <BookOpen className="w-16 h-16 mx-auto mb-4 text-gray-600" />
                <p className="text-gray-400 mb-4">
                  {searchQuery || selectedSubject !== 'all'
                    ? 'No notes found matching your criteria'
                    : 'No notes yet. Create your first note to start building your second brain!'}
                </p>
              </div>
            ) : (
              filteredNotes.map((note, index) => (
                <motion.div
                  key={note.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card className="bg-gray-800/50 border-gray-700 hover:border-purple-500/50 transition-colors">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-xl mb-2">{note.title}</CardTitle>
                          <div className="flex items-center gap-2 text-sm text-gray-400">
                            {note.subject && (
                              <Badge variant="outline" className="border-purple-500/50 text-purple-400">
                                {note.subject}
                              </Badge>
                            )}
                            <div className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {new Date(note.updatedAt).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditNote(note)}
                          >
                            <Edit3 className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteNote(note.id)}
                          >
                            <Trash2 className="w-4 h-4 text-red-400" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <p className="text-gray-300 line-clamp-3">
                        {note.content.substring(0, 200)}...
                      </p>

                      {/* Concepts */}
                      {note.concepts.length > 0 && (
                        <div>
                          <div className="flex items-center gap-2 mb-2 text-sm text-gray-400">
                            <Lightbulb className="w-4 h-4 text-yellow-400" />
                            AI-Extracted Concepts
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {note.concepts.map((concept) => (
                              <Badge
                                key={concept.id}
                                variant="outline"
                                className="border-yellow-500/50 text-yellow-400"
                              >
                                {concept.name}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Tags */}
                      {note.tags.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {note.tags.map((tag, i) => (
                            <Badge key={i} variant="secondary" className="text-xs">
                              <Tag className="w-3 h-3 mr-1" />
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex gap-2 pt-2 border-t border-gray-700">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleGenerateFlashcards(note.id)}
                          className="flex-1"
                        >
                          <Zap className="w-4 h-4 mr-2" />
                          Generate Flashcards ({note.flashcards.length})
                        </Button>
                        <Link href={`/knowledge-graph?noteId=${note.id}`}>
                          <Button size="sm" variant="outline">
                            View Concept Map
                          </Button>
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
