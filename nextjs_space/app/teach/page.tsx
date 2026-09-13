'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  BookOpen,
  Video,
  Globe,
  Brain,
  Clock,
  ChevronRight,
  CheckCircle2,
  PlayCircle,
  ArrowLeft,
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import ReactFlow, { Node, Edge, Background, Controls } from 'reactflow';
import 'reactflow/dist/style.css';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Topic {
  id: string;
  name: string;
  subject: string;
  description: string;
}

interface Student {
  id: string;
  name: string;
  grade: string;
  learningStyle: string;
}

interface LessonSection {
  title: string;
  content: string;
  imageUrl?: string;
  imageCaption?: string;
}

interface VideoResult {
  title: string;
  url: string;
  source: string;
}

interface RealWorldConnection {
  title: string;
  summary: string;
  url?: string;
}

interface QuizQuestion {
  question: string;
  options: string[];
  correct: number;
  explanation: string;
}

interface GeneratedLesson {
  topic: string;
  gradeLevel: string;
  sections: LessonSection[];
  videos: VideoResult[];
  realWorld: RealWorldConnection[];
  quiz: QuizQuestion[];
  mindMap: {
    nodes: Array<{ id: string; label: string; type: string }>;
    edges: Array<{ from: string; to: string }>;
  };
  nextTopics: string[];
  estimatedTime: number;
}

export default function TeachPage() {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedTopic, setSelectedTopic] = useState<string>('');
  const [selectedStudent, setSelectedStudent] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [lesson, setLesson] = useState<GeneratedLesson | null>(null);
  const [currentQuiz, setCurrentQuiz] = useState(0);
  const [quizAnswers, setQuizAnswers] = useState<number[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [agentStatus, setAgentStatus] = useState<string>('');

  useEffect(() => {
    fetchTopics();
    fetchStudents();
  }, []);

  const fetchTopics = async () => {
    try {
      const response = await fetch('/api/teach/topics');
      const data = await response.json();
      if (Array.isArray(data)) {
        setTopics(data);
      } else {
        setTopics([]);
      }
    } catch (error) {
      console.error('Failed to fetch topics:', error);
      setTopics([]);
    }
  };

  const fetchStudents = async () => {
    try {
      const response = await fetch('/api/students');
      const data = await response.json();
      if (Array.isArray(data)) {
        setStudents(data);
      } else {
        setStudents([]);
      }
    } catch (error) {
      console.error('Failed to fetch students:', error);
      setStudents([]);
    }
  };

  const generateLesson = async () => {
    if (!selectedTopic) return;

    setIsGenerating(true);
    setAgentStatus('Initializing teaching agents...');

    try {
      const agentMessages = [
        'Agent 1: Analyzing context and prerequisites...',
        'Agent 2: Generating adaptive content...',
        'Agent 3: Creating visual materials with DALL-E...',
        'Agent 4: Curating educational videos...',
        'Agent 5: Finding real-world connections...',
        'Agent 6: Building assessment and mind map...',
      ];

      let messageIndex = 0;
      const interval = setInterval(() => {
        if (messageIndex < agentMessages.length) {
          setAgentStatus(agentMessages[messageIndex]);
          messageIndex++;
        }
      }, 3000);

      const response = await fetch('/api/teach/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: selectedTopic,
          studentId: selectedStudent || undefined,
        }),
      });

      clearInterval(interval);

      if (!response.ok) {
        throw new Error('Failed to generate lesson');
      }

      const data = await response.json();
      setLesson(data.lesson);
      setQuizAnswers(new Array(data.lesson.quiz.length).fill(-1));
    } catch (error) {
      console.error('Lesson generation error:', error);
      alert('Failed to generate lesson. Please try again.');
    } finally {
      setIsGenerating(false);
      setAgentStatus('');
    }
  };

  const handleQuizAnswer = (questionIndex: number, answerIndex: number) => {
    const newAnswers = [...quizAnswers];
    newAnswers[questionIndex] = answerIndex;
    setQuizAnswers(newAnswers);
  };

  const submitQuiz = () => {
    setShowResults(true);
  };

  const getYouTubeEmbedUrl = (url: string) => {
    const videoId = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/)?.[1];
    return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
  };

  const mindMapNodes: Node[] = lesson?.mindMap.nodes.map((node, i) => ({
    id: node.id,
    type: 'default',
    position: {
      x: node.type === 'main' ? 400 : 200 + (i % 3) * 200,
      y: node.type === 'main' ? 50 : 150 + Math.floor(i / 3) * 100,
    },
    data: { label: node.label },
    style: {
      background: node.type === 'main' ? '#8b5cf6' : '#3b82f6',
      color: '#fff',
      border: '2px solid #fff',
      borderRadius: '8px',
      padding: '10px',
      fontSize: node.type === 'main' ? '16px' : '14px',
      fontWeight: node.type === 'main' ? 'bold' : 'normal',
    },
  })) || [];

  const mindMapEdges: Edge[] = lesson?.mindMap.edges.map((edge, i) => ({
    id: `edge-${i}`,
    source: edge.from,
    target: edge.to,
    animated: true,
    style: { stroke: '#8b5cf6', strokeWidth: 2 },
  })) || [];

  if (isGenerating) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900/20 to-gray-900 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
            className="inline-block"
          >
            <Sparkles className="w-16 h-16 text-purple-400 mb-4" />
          </motion.div>
          <h2 className="text-2xl font-bold text-white mb-2">Generating Your Personalized Lesson</h2>
          <p className="text-purple-300 mb-4">{agentStatus}</p>
          <div className="flex items-center justify-center gap-2">
            <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        </motion.div>
      </div>
    );
  }

  if (lesson) {
    const score = quizAnswers.filter((ans, i) => ans === lesson.quiz[i]?.correct).length;
    const percentage = Math.round((score / lesson.quiz.length) * 100);

    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-indigo-900/20 to-gray-900">
        <div className="container mx-auto px-4 py-8 max-w-6xl">
          {/* Header */}
          <div className="mb-8">
            <Link href="/dashboard">
              <Button variant="ghost" className="mb-4 text-gray-400 hover:text-white">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Dashboard
              </Button>
            </Link>
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent mb-2">
                  {lesson.topic}
                </h1>
                <div className="flex items-center gap-4 text-sm text-gray-400">
                  <Badge variant="outline" className="border-purple-500/50">
                    Grade {lesson.gradeLevel}
                  </Badge>
                  <span className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {lesson.estimatedTime} minutes
                  </span>
                </div>
              </div>
              <Button
                onClick={() => {
                  setLesson(null);
                  setShowResults(false);
                  setQuizAnswers([]);
                }}
                variant="outline"
                className="border-purple-500/50 hover:bg-purple-500/10"
              >
                Choose New Topic
              </Button>
            </div>
          </div>

          {/* Lesson Content */}
          <div className="space-y-8 mb-12">
            {lesson.sections.map((section, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
              >
                <Card className="bg-gray-800/50 border-gray-700 p-8">
                  <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                    <BookOpen className="w-6 h-6 text-purple-400" />
                    {section.title}
                  </h2>
                  <div className="prose prose-invert max-w-none">
                    <p className="text-gray-300 leading-relaxed whitespace-pre-wrap">{section.content}</p>
                  </div>
                  {section.imageUrl && (
                    <div className="mt-6 relative">
                      <div className="relative w-full aspect-video rounded-lg overflow-hidden bg-gray-900/50">
                        <Image
                          src={section.imageUrl}
                          alt={section.imageCaption || section.title}
                          fill
                          className="object-contain"
                        />
                      </div>
                      {section.imageCaption && (
                        <p className="text-sm text-gray-400 mt-2 italic">{section.imageCaption}</p>
                      )}
                    </div>
                  )}
                </Card>
              </motion.div>
            ))}
          </div>

          {/* Videos Section */}
          {lesson.videos.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-12"
            >
              <h2 className="text-3xl font-bold text-white mb-6 flex items-center gap-2">
                <Video className="w-8 h-8 text-pink-400" />
                Watch & Learn
              </h2>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {lesson.videos.map((video, idx) => {
                  const embedUrl = getYouTubeEmbedUrl(video.url);
                  return (
                    <Card key={idx} className="bg-gray-800/50 border-gray-700 overflow-hidden group">
                      <div className="relative aspect-video bg-gray-900">
                        {embedUrl ? (
                          <iframe
                            src={embedUrl}
                            title={video.title}
                            className="w-full h-full"
                            allowFullScreen
                          />
                        ) : (
                          <a
                            href={video.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-center h-full hover:bg-purple-500/10 transition-colors"
                          >
                            <PlayCircle className="w-16 h-16 text-purple-400" />
                          </a>
                        )}
                      </div>
                      <div className="p-4">
                        <p className="text-sm text-gray-300 line-clamp-2">{video.title}</p>
                        <Badge className="mt-2 bg-pink-500/20 text-pink-400">{video.source}</Badge>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* Real-World Connections */}
          {lesson.realWorld.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-12"
            >
              <h2 className="text-3xl font-bold text-white mb-6 flex items-center gap-2">
                <Globe className="w-8 h-8 text-green-400" />
                Real-World Connections
              </h2>
              <div className="grid md:grid-cols-2 gap-6">
                {lesson.realWorld.map((connection, idx) => (
                  <Card key={idx} className="bg-gray-800/50 border-gray-700 p-6 hover:border-green-500/50 transition-colors">
                    <h3 className="text-lg font-bold text-white mb-2">{connection.title}</h3>
                    <p className="text-gray-400 text-sm mb-3">{connection.summary}</p>
                    {connection.url && (
                      <a
                        href={connection.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-green-400 text-sm hover:underline flex items-center gap-1"
                      >
                        Learn more <ChevronRight className="w-4 h-4" />
                      </a>
                    )}
                  </Card>
                ))}
              </div>
            </motion.div>
          )}

          {/* Mind Map */}
          {lesson.mindMap && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-12"
            >
              <h2 className="text-3xl font-bold text-white mb-6 flex items-center gap-2">
                <Brain className="w-8 h-8 text-purple-400" />
                Concept Map
              </h2>
              <Card className="bg-gray-800/50 border-gray-700 p-4" style={{ height: '400px' }}>
                <ReactFlow
                  nodes={mindMapNodes}
                  edges={mindMapEdges}
                  fitView
                  attributionPosition="bottom-left"
                >
                  <Background />
                  <Controls />
                </ReactFlow>
              </Card>
            </motion.div>
          )}

          {/* Quiz */}
          {lesson.quiz.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-12"
            >
              <h2 className="text-3xl font-bold text-white mb-6 flex items-center gap-2">
                <CheckCircle2 className="w-8 h-8 text-blue-400" />
                Test Your Knowledge
              </h2>
              <div className="space-y-6">
                {lesson.quiz.map((question, qIdx) => (
                  <Card key={qIdx} className="bg-gray-800/50 border-gray-700 p-6">
                    <p className="text-lg font-semibold text-white mb-4">
                      {qIdx + 1}. {question.question}
                    </p>
                    <div className="space-y-2">
                      {question.options.map((option, oIdx) => (
                        <button
                          key={oIdx}
                          onClick={() => handleQuizAnswer(qIdx, oIdx)}
                          disabled={showResults}
                          className={`w-full text-left p-4 rounded-lg border-2 transition-colors ${
                            showResults
                              ? oIdx === question.correct
                                ? 'border-green-500 bg-green-500/20'
                                : quizAnswers[qIdx] === oIdx
                                ? 'border-red-500 bg-red-500/20'
                                : 'border-gray-700 bg-gray-800/30'
                              : quizAnswers[qIdx] === oIdx
                              ? 'border-purple-500 bg-purple-500/20'
                              : 'border-gray-700 bg-gray-800/30 hover:border-purple-500/50'
                          }`}
                        >
                          <span className="text-gray-300">{option}</span>
                        </button>
                      ))}
                    </div>
                    {showResults && (
                      <div className="mt-4 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                        <p className="text-sm text-blue-300">
                          <strong>Explanation:</strong> {question.explanation}
                        </p>
                      </div>
                    )}
                  </Card>
                ))}
              </div>
              {!showResults ? (
                <Button
                  onClick={submitQuiz}
                  disabled={quizAnswers.includes(-1)}
                  className="mt-6 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                  size="lg"
                >
                  Submit Quiz
                </Button>
              ) : (
                <Card className="mt-6 bg-gradient-to-r from-purple-500/20 to-pink-500/20 border-purple-500/50 p-6">
                  <h3 className="text-2xl font-bold text-white mb-2">Your Score: {percentage}%</h3>
                  <p className="text-gray-300">
                    You got {score} out of {lesson.quiz.length} questions correct!
                  </p>
                </Card>
              )}
            </motion.div>
          )}

          {/* Next Topics */}
          {lesson.nextTopics.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <h2 className="text-2xl font-bold text-white mb-4">Continue Learning</h2>
              <div className="flex flex-wrap gap-3">
                {lesson.nextTopics.map((topic, idx) => (
                  <Badge
                    key={idx}
                    variant="outline"
                    className="border-purple-500/50 text-purple-300 cursor-pointer hover:bg-purple-500/10"
                    onClick={() => {
                      setSelectedTopic(topic.toLowerCase().replace(/\s+/g, ''));
                      setLesson(null);
                      generateLesson();
                    }}
                  >
                    {topic} <ChevronRight className="w-3 h-3 ml-1" />
                  </Badge>
                ))}
              </div>
            </motion.div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900/20 to-gray-900">
      <div className="container mx-auto px-4 py-16 max-w-4xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="inline-block p-4 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full mb-6">
            <Sparkles className="w-12 h-12 text-white" />
          </div>
          <h1 className="text-5xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent mb-4">
            Adaptive AI Teacher
          </h1>
          <p className="text-xl text-gray-400 mb-2">
            Get personalized lessons with images, videos, and real-world connections
          </p>
          <p className="text-sm text-gray-500">
            Powered by 6 specialized AI agents working together
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="bg-gray-800/50 border-gray-700 p-8">
            <div className="space-y-6">
              {/* Topic Selection */}
              <div>
                <label className="text-sm font-semibold text-gray-300 mb-2 block">
                  Choose a Topic
                </label>
                <Select value={selectedTopic} onValueChange={setSelectedTopic}>
                  <SelectTrigger className="w-full bg-gray-900/50 border-gray-700">
                    <SelectValue placeholder="Select a biology topic..." />
                  </SelectTrigger>
                  <SelectContent>
                    {topics.map((topic) => (
                      <SelectItem key={topic.id} value={topic.id}>
                        <div>
                          <div className="font-semibold">{topic.name}</div>
                          <div className="text-xs text-gray-500">{topic.description}</div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Student Selection */}
              <div>
                <label className="text-sm font-semibold text-gray-300 mb-2 block">
                  Student Profile (Optional)
                </label>
                <Select value={selectedStudent} onValueChange={setSelectedStudent}>
                  <SelectTrigger className="w-full bg-gray-900/50 border-gray-700">
                    <SelectValue placeholder="Use default profile or select student..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="default">Default (Grade 8, Visual Learner)</SelectItem>
                    {students.map((student) => (
                      <SelectItem key={student.id} value={student.id}>
                        {student.name} - Grade {student.grade} ({student.learningStyle})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button
                onClick={generateLesson}
                disabled={!selectedTopic || isGenerating}
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                size="lg"
              >
                <Sparkles className="w-5 h-5 mr-2" />
                Generate Personalized Lesson
              </Button>
            </div>
          </Card>
        </motion.div>

        {/* Features */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-12 grid md:grid-cols-3 gap-6"
        >
          {[
            { icon: Brain, title: 'Grade-Adapted', desc: 'Content adjusted to your level' },
            { icon: Video, title: 'Multi-Modal', desc: 'Text, images, and videos' },
            { icon: Globe, title: 'Real-World', desc: 'Current events and applications' },
          ].map((feature, idx) => (
            <Card key={idx} className="bg-gray-800/30 border-gray-700 p-6 text-center">
              <feature.icon className="w-8 h-8 text-purple-400 mx-auto mb-3" />
              <h3 className="font-semibold text-white mb-1">{feature.title}</h3>
              <p className="text-sm text-gray-400">{feature.desc}</p>
            </Card>
          ))}
        </motion.div>
      </div>
    </div>
  );
}
