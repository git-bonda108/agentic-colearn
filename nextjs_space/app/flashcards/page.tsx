'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Brain,
  ChevronRight,
  ChevronLeft,
  RotateCw,
  ThumbsUp,
  ThumbsDown,
  Zap,
  Trophy,
  Clock,
  Sparkles,
} from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface Flashcard {
  id: string;
  front: string;
  back: string;
  subject: string | null;
  difficulty: string;
  reviews: Array<{
    id: string;
    nextReviewAt: string;
  }>;
  note: {
    id: string;
    title: string;
  } | null;
}

const SUBJECTS = ['Math', 'Science', 'History', 'Programming', 'Other'];

export default function FlashcardsPage() {
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [filteredCards, setFilteredCards] = useState<Flashcard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState<string>('all');
  const [showDueOnly, setShowDueOnly] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [reviewedCount, setReviewedCount] = useState(0);
  const [sessionScore, setSessionScore] = useState(0);

  useEffect(() => {
    fetchFlashcards();
  }, [showDueOnly]);

  useEffect(() => {
    let filtered = flashcards;

    if (selectedSubject !== 'all') {
      filtered = filtered.filter((card) => card.subject === selectedSubject);
    }

    setFilteredCards(filtered);
    setCurrentIndex(0);
    setIsFlipped(false);
  }, [flashcards, selectedSubject]);

  const fetchFlashcards = async () => {
    setIsLoading(true);
    try {
      const url = showDueOnly ? '/api/flashcards?dueOnly=true' : '/api/flashcards';
      const response = await fetch(url);
      const data = await response.json();
      if (Array.isArray(data)) {
        setFlashcards(data);
        setFilteredCards(data);
      } else {
        setFlashcards([]);
        setFilteredCards([]);
      }
    } catch (error) {
      console.error('Failed to fetch flashcards:', error);
      setFlashcards([]);
      setFilteredCards([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReview = async (quality: number) => {
    const currentCard = filteredCards[currentIndex];
    if (!currentCard) return;

    try {
      await fetch('/api/flashcards/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          flashcardId: currentCard.id,
          quality,
        }),
      });

      setReviewedCount((prev) => prev + 1);
      if (quality >= 3) {
        setSessionScore((prev) => prev + 1);
      }

      // Move to next card
      setTimeout(() => {
        if (currentIndex < filteredCards.length - 1) {
          setCurrentIndex((prev) => prev + 1);
          setIsFlipped(false);
        } else {
          // Session complete
          alert(
            `Session complete! You reviewed ${reviewedCount + 1} cards with ${sessionScore + (quality >= 3 ? 1 : 0)} correct.`
          );
          fetchFlashcards();
          setCurrentIndex(0);
          setReviewedCount(0);
          setSessionScore(0);
        }
      }, 300);
    } catch (error) {
      console.error('Failed to submit review:', error);
    }
  };

  const currentCard = filteredCards[currentIndex];
  const progress = filteredCards.length > 0 ? ((currentIndex + 1) / filteredCards.length) * 100 : 0;

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy':
        return 'border-green-500/50 text-green-400';
      case 'medium':
        return 'border-yellow-500/50 text-yellow-400';
      case 'hard':
        return 'border-red-500/50 text-red-400';
      default:
        return 'border-gray-500/50 text-gray-400';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900/20 to-gray-900">
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
              <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent mb-2">
                Flashcards Review
              </h1>
              <p className="text-gray-400">
                Spaced repetition learning with SM-2 algorithm
              </p>
            </div>
            <div className="flex gap-4 items-center">
              <div className="text-right">
                <div className="text-sm text-gray-400">Session Progress</div>
                <div className="text-2xl font-bold text-blue-400">
                  {reviewedCount} / {filteredCards.length}
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm text-gray-400">Score</div>
                <div className="text-2xl font-bold text-green-400">
                  {sessionScore} / {reviewedCount || 1}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="mb-6 flex gap-4">
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
          <Button
            variant={showDueOnly ? 'default' : 'outline'}
            onClick={() => setShowDueOnly(!showDueOnly)}
            className={showDueOnly ? 'bg-blue-600 hover:bg-blue-700' : ''}
          >
            <Clock className="w-4 h-4 mr-2" />
            {showDueOnly ? 'Showing Due Cards' : 'Show Due Only'}
          </Button>
        </div>

        {/* Progress Bar */}
        {filteredCards.length > 0 && (
          <div className="mb-6">
            <Progress value={progress} className="h-2" />
            <div className="text-xs text-gray-400 mt-1 text-right">
              Card {currentIndex + 1} of {filteredCards.length}
            </div>
          </div>
        )}

        {/* Flashcard */}
        <div className="max-w-2xl mx-auto">
          {isLoading ? (
            <div className="text-center py-12 text-gray-400">
              <Sparkles className="w-8 h-8 animate-spin mx-auto mb-2" />
              Loading flashcards...
            </div>
          ) : filteredCards.length === 0 ? (
            <div className="text-center py-12">
              <Brain className="w-16 h-16 mx-auto mb-4 text-gray-600" />
              <p className="text-gray-400 mb-4">
                No flashcards available. Create notes and generate flashcards to start learning!
              </p>
              <Link href="/notes">
                <Button className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700">
                  Go to Notes
                </Button>
              </Link>
            </div>
          ) : (
            <AnimatePresence mode="wait">
              <motion.div
                key={currentIndex}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.3 }}
              >
                <Card
                  className="bg-gray-800/50 border-gray-700 cursor-pointer hover:border-blue-500/50 transition-colors"
                  onClick={() => setIsFlipped(!isFlipped)}
                >
                  <CardContent className="p-8">
                    {/* Card Header */}
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex gap-2">
                        {currentCard?.subject && (
                          <Badge
                            variant="outline"
                            className="border-blue-500/50 text-blue-400"
                          >
                            {currentCard.subject}
                          </Badge>
                        )}
                        <Badge
                          variant="outline"
                          className={getDifficultyColor(currentCard?.difficulty || 'medium')}
                        >
                          {currentCard?.difficulty}
                        </Badge>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsFlipped(!isFlipped);
                        }}
                      >
                        <RotateCw className="w-4 h-4 mr-2" />
                        Flip
                      </Button>
                    </div>

                    {/* Card Content */}
                    <div className="min-h-[300px] flex items-center justify-center text-center">
                      <AnimatePresence mode="wait">
                        {!isFlipped ? (
                          <motion.div
                            key="front"
                            initial={{ opacity: 0, rotateY: -90 }}
                            animate={{ opacity: 1, rotateY: 0 }}
                            exit={{ opacity: 0, rotateY: 90 }}
                            className="w-full"
                          >
                            <div className="text-sm text-gray-400 mb-4">Question</div>
                            <p className="text-2xl font-medium text-white">
                              {currentCard?.front}
                            </p>
                          </motion.div>
                        ) : (
                          <motion.div
                            key="back"
                            initial={{ opacity: 0, rotateY: -90 }}
                            animate={{ opacity: 1, rotateY: 0 }}
                            exit={{ opacity: 0, rotateY: 90 }}
                            className="w-full"
                          >
                            <div className="text-sm text-gray-400 mb-4">Answer</div>
                            <p className="text-xl text-gray-200">{currentCard?.back}</p>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* Source Note */}
                    {currentCard?.note && (
                      <div className="mt-6 pt-4 border-t border-gray-700 text-sm text-gray-400">
                        From: {currentCard.note.title}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Review Buttons */}
                {isFlipped && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-6 grid grid-cols-5 gap-2"
                  >
                    {[
                      { label: 'Again', quality: 0, color: 'bg-red-600 hover:bg-red-700' },
                      { label: 'Hard', quality: 2, color: 'bg-orange-600 hover:bg-orange-700' },
                      { label: 'Good', quality: 3, color: 'bg-yellow-600 hover:bg-yellow-700' },
                      { label: 'Easy', quality: 4, color: 'bg-green-600 hover:bg-green-700' },
                      {
                        label: 'Perfect',
                        quality: 5,
                        color: 'bg-blue-600 hover:bg-blue-700',
                      },
                    ].map((option) => (
                      <Button
                        key={option.quality}
                        onClick={() => handleReview(option.quality)}
                        className={option.color}
                      >
                        {option.label}
                      </Button>
                    ))}
                  </motion.div>
                )}

                {/* Navigation Hint */}
                {!isFlipped && (
                  <p className="text-center text-sm text-gray-400 mt-4">
                    Click the card to reveal the answer
                  </p>
                )}
              </motion.div>
            </AnimatePresence>
          )}
        </div>

        {/* Stats */}
        {filteredCards.length > 0 && (
          <div className="mt-12 grid grid-cols-3 gap-4 max-w-2xl mx-auto">
            <Card className="bg-gray-800/50 border-gray-700">
              <CardContent className="pt-6 text-center">
                <Trophy className="w-8 h-8 mx-auto mb-2 text-yellow-400" />
                <div className="text-2xl font-bold text-white">{filteredCards.length}</div>
                <div className="text-sm text-gray-400">Total Cards</div>
              </CardContent>
            </Card>
            <Card className="bg-gray-800/50 border-gray-700">
              <CardContent className="pt-6 text-center">
                <Zap className="w-8 h-8 mx-auto mb-2 text-blue-400" />
                <div className="text-2xl font-bold text-white">{reviewedCount}</div>
                <div className="text-sm text-gray-400">Reviewed Today</div>
              </CardContent>
            </Card>
            <Card className="bg-gray-800/50 border-gray-700">
              <CardContent className="pt-6 text-center">
                <ThumbsUp className="w-8 h-8 mx-auto mb-2 text-green-400" />
                <div className="text-2xl font-bold text-white">
                  {reviewedCount > 0 ? Math.round((sessionScore / reviewedCount) * 100) : 0}%
                </div>
                <div className="text-sm text-gray-400">Accuracy</div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
