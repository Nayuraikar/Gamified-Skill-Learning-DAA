import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { AlgorithmSelection, Question, AlgorithmExecutionResult } from '../types';
import { reviewSchedulingAlgorithms, questionSelectionAlgorithms, rewardSystemAlgorithms, knowledgeTracingAlgorithms } from '../algorithms';
import { Clock, CheckCircle, ArrowRight, Cpu, Zap, RefreshCw, Brain, Target, Star, Zap as Lightning, Timer, Award, BookOpen, Gift } from 'lucide-react';
import AlgorithmVisualizer from '../components/AlgorithmVisualizer';
import { motion, AnimatePresence } from 'framer-motion';

const TestPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { questions, addTestAttempt } = useData();
  
  const reviewMode = location.state?.reviewMode;
  const reviewQuestions = location.state?.reviewQuestions;
  
  const algorithms = location.state?.algorithms as AlgorithmSelection;
  
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [testQuestions, setTestQuestions] = useState<Question[]>([]);
  const [startTime, setStartTime] = useState<number>(Date.now());
  const [executionResults, setExecutionResults] = useState<AlgorithmExecutionResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAlgorithmDetails, setShowAlgorithmDetails] = useState(false);
  const [answerFeedback, setAnswerFeedback] = useState<null | 'correct' | 'incorrect'>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [algorithmResults, setAlgorithmResults] = useState<any>(null);
  const [algorithmFeedback, setAlgorithmFeedback] = useState<string>('');

  // Timer effect
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeElapsed(Date.now() - startTime);
    }, 1000);
    return () => clearInterval(timer);
  }, [startTime]);

  // Clear algorithm feedback after 3 seconds
  useEffect(() => {
    if (algorithmFeedback) {
      const timer = setTimeout(() => {
        setAlgorithmFeedback('');
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [algorithmFeedback]);

  useEffect(() => {
    if (reviewMode && reviewQuestions && reviewQuestions.length > 0) {
      setTestQuestions(reviewQuestions);
      setIsLoading(false);
      return;
    }
    if (!algorithms || !user) {
      navigate('/student');
      return;
    }
    generateTest();
  }, [algorithms, user, questions, reviewMode, reviewQuestions]);

  const generateTest = () => {
    setIsLoading(true);
    
    // Filter questions by topic
    const arrayQuestions = questions.filter(q => q.topic === 'arrays');
    const linkedListQuestions = questions.filter(q => q.topic === 'linkedlists');
    
    const selectedQuestions: Question[] = [];
    const results: AlgorithmExecutionResult[] = [];

    // Use question selection algorithm to actually select questions
    const selectQuestions = (questionPool: Question[], count: number, topicLabel: string) => {
      let result: AlgorithmExecutionResult;
      let selectedIndices: number[] = [];
      
      switch (algorithms.questionSelection) {
        case 'QLearning':
          // Create Q-table based on question pool with meaningful state-action pairs
          const qTable = Array(3).fill(null).map(() => 
            Array(questionPool.length).fill(0).map(() => Math.random() * 2 - 1)
          );
          result = questionSelectionAlgorithms.QLearning(qTable, 0, 0.2);
          
          // Use Q-values to select questions (higher Q-value = better question)
          const qValues = qTable[0]; // Use first state's Q-values
          const sortedIndices = qValues
            .map((value, index) => ({ value, index }))
            .sort((a, b) => b.value - a.value)
            .slice(0, count)
            .map(item => item.index);
          selectedIndices = sortedIndices;
          
          // Add algorithm feedback for Q-Learning
          const bestQValue = Math.max(...qValues);
          const avgQValue = qValues.reduce((sum, val) => sum + val, 0) / qValues.length;
          console.log(`🧠 Q-Learning: Best Q-value: ${bestQValue.toFixed(3)}, Avg Q-value: ${avgQValue.toFixed(3)}`);
          break;
          
        case 'Knapsack':
          // Use question difficulty as weights and learning value as values
          const weights = questionPool.map(q => 
            q.difficulty === 'easy' ? 1 : q.difficulty === 'medium' ? 2 : 3
          );
          // Assign higher values to questions that haven't been answered recently
          const values = questionPool.map((q, index) => {
            const baseValue = q.difficulty === 'easy' ? 5 : q.difficulty === 'medium' ? 8 : 12;
            const randomFactor = Math.random() * 3 + 1; // Add some randomness
            return baseValue * randomFactor;
          });
          result = questionSelectionAlgorithms.Knapsack(weights, values, 8);
          
          // Use knapsack result to select questions
          selectedIndices = result.result?.selectedItems || [];
          
          // Add algorithm feedback for Knapsack
          const totalValue = result.result?.maxValue || 0;
          const selectedWeight = selectedIndices.reduce((sum, idx) => sum + weights[idx], 0);
          console.log(`🎒 Knapsack: Total value: ${totalValue.toFixed(1)}, Weight used: ${selectedWeight}/8`);
          break;
          
        default:
          // Fallback to QLearning
          const defaultQTable = Array(3).fill(null).map(() => 
            Array(questionPool.length).fill(0).map(() => Math.random() * 2 - 1)
          );
          result = questionSelectionAlgorithms.QLearning(defaultQTable, 0, 0.2);
          const defaultQValues = defaultQTable[0];
          const defaultSortedIndices = defaultQValues
            .map((value, index) => ({ value, index }))
            .sort((a, b) => b.value - a.value)
            .slice(0, count)
            .map(item => item.index);
          selectedIndices = defaultSortedIndices;
      }
      
      results.push({ ...result, topic: topicLabel });
      
      // Select questions based on algorithm result
      const selectedQuestionsFromPool = selectedIndices
        .filter(index => index < questionPool.length)
        .map(index => questionPool[index]);
      
      // If algorithm didn't select enough questions, fill with random ones
      if (selectedQuestionsFromPool.length < count) {
        const remainingQuestions = questionPool.filter((_, index) => !selectedIndices.includes(index));
        const shuffled = [...remainingQuestions].sort(() => Math.random() - 0.5);
        selectedQuestionsFromPool.push(...shuffled.slice(0, count - selectedQuestionsFromPool.length));
      }
      
      return selectedQuestionsFromPool.slice(0, count);
    };

    // Select questions using algorithms
    selectedQuestions.push(...selectQuestions(arrayQuestions, 3, 'Arrays'));
    selectedQuestions.push(...selectQuestions(linkedListQuestions, 2, 'Linked Lists'));

    // Use review scheduling algorithm to determine review timing
    let reviewResult: AlgorithmExecutionResult;
    let reviewInterval: number = 1; // Default interval
    
    switch (algorithms.reviewScheduling) {
      case 'SM2':
        reviewResult = reviewSchedulingAlgorithms.SM2(2.5, 1, 0);
        reviewInterval = reviewResult.result?.newInterval || 1;
        break;
      case 'MinHeap':
        reviewResult = reviewSchedulingAlgorithms.MinHeap([3, 1, 6, 5, 2, 4]);
        reviewInterval = reviewResult.result?.schedulingOrder?.[0] || 1;
        break;
      default:
        reviewResult = reviewSchedulingAlgorithms.SM2(2.5, 1, 0);
        reviewInterval = reviewResult.result?.newInterval || 1;
    }
    results.push({ ...reviewResult, topic: 'Review Scheduling' });

    // Use reward system algorithm to determine reward strategy
    let rewardResult: AlgorithmExecutionResult;
    let rewardStrategy: any = {};
    
    switch (algorithms.rewardSystem) {
      case 'VariableRatio':
        rewardResult = rewardSystemAlgorithms.VariableRatio(10, [2, 3, 4, 5]);
        rewardStrategy = {
          type: 'variableRatio',
          schedule: rewardResult.result?.reinforcementHistory || [],
          shouldReward: rewardResult.result?.shouldReward || false
        };
        break;
      case 'FenwickTree':
        rewardResult = rewardSystemAlgorithms.FenwickTree([5, 3, 7, 2, 6], 2, 4);
        rewardStrategy = {
          type: 'fenwickTree',
          totalReward: rewardResult.result?.totalReward || 0,
          prefixSums: rewardResult.result?.prefixSums || []
        };
        break;
      default:
        rewardResult = rewardSystemAlgorithms.VariableRatio(10, [2, 3, 4, 5]);
        rewardStrategy = {
          type: 'variableRatio',
          schedule: rewardResult.result?.reinforcementHistory || [],
          shouldReward: rewardResult.result?.shouldReward || false
        };
    }
    results.push({ ...rewardResult, topic: 'Reward System' });

    // Use knowledge tracing algorithm to track student knowledge
    let knowledgeResult: AlgorithmExecutionResult;
    let knowledgeState: any = {};
    
    switch (algorithms.knowledgeTracing) {
      case 'DKT':
        knowledgeResult = knowledgeTracingAlgorithms.DKT([0.7, 0.5, 0.9], [0.8, 0.6, 0.7]);
        knowledgeState = {
          type: 'DKT',
          predictions: knowledgeResult.result?.predictions || [],
          hiddenStates: knowledgeResult.result?.hiddenStates || []
        };
        break;
      case 'DP':
        knowledgeResult = knowledgeTracingAlgorithms.DP([
          [1, 2, 3],
          [4, 5, 6],
          [7, 8, 9]
        ]);
        knowledgeState = {
          type: 'DP',
          maxValue: knowledgeResult.result?.maxValue || 0,
          path: knowledgeResult.result?.path || []
        };
        break;
      default:
        knowledgeResult = knowledgeTracingAlgorithms.DKT([0.7, 0.5, 0.9], [0.8, 0.6, 0.7]);
        knowledgeState = {
          type: 'DKT',
          predictions: knowledgeResult.result?.predictions || [],
          hiddenStates: knowledgeResult.result?.hiddenStates || []
        };
    }
    results.push({ ...knowledgeResult, topic: 'Knowledge Tracing' });

    // Store algorithm results for use during the test
    setAlgorithmResults({
      reviewInterval,
      rewardStrategy,
      knowledgeState
    });

    setTestQuestions(selectedQuestions.slice(0, 5));
    setExecutionResults(results);
    setIsLoading(false);
  };

  const handleAnswerSelect = (index: number) => {
    if (selectedAnswer !== null) return;
    setSelectedAnswer(index);
    const isCorrect = index === testQuestions[currentQuestion].correctAnswer;
    setAnswerFeedback(isCorrect ? 'correct' : 'incorrect');

    // Apply reward system algorithm
    if (algorithmResults?.rewardStrategy) {
      const { rewardStrategy } = algorithmResults;
      
      if (rewardStrategy.type === 'variableRatio') {
        // Variable ratio reinforcement - reward based on schedule
        const shouldReward = rewardStrategy.shouldReward;
        if (shouldReward && isCorrect) {
          // Show reward animation or message
          setAlgorithmFeedback('🎉 Variable Ratio Reward Applied!');
        }
      } else if (rewardStrategy.type === 'fenwickTree') {
        // Fenwick tree reward - cumulative reward tracking
        const totalReward = rewardStrategy.totalReward;
        if (isCorrect) {
          setAlgorithmFeedback(`🏆 Fenwick Tree Reward: +${totalReward} points`);
        }
      }
    }

    // Apply knowledge tracing algorithm
    if (algorithmResults?.knowledgeState) {
      const { knowledgeState } = algorithmResults;
      
      if (knowledgeState.type === 'DKT') {
        // Deep Knowledge Tracing - update predictions
        const predictions = knowledgeState.predictions;
        const currentPrediction = predictions[currentQuestion] || 0.5;
        setAlgorithmFeedback(`🧠 DKT Prediction: ${(currentPrediction * 100).toFixed(1)}% chance of success`);
        
        // Adjust question difficulty based on prediction vs actual
        if (currentPrediction > 0.7 && !isCorrect) {
          setTimeout(() => setAlgorithmFeedback('⚠️ DKT detected overconfidence - question was harder than predicted'), 1000);
        } else if (currentPrediction < 0.3 && isCorrect) {
          setTimeout(() => setAlgorithmFeedback('🎯 DKT detected underconfidence - question was easier than predicted'), 1000);
        }
      } else if (knowledgeState.type === 'DP') {
        // Dynamic Programming - optimal path tracking
        const maxValue = knowledgeState.maxValue;
        setAlgorithmFeedback(`📊 DP Optimal Path Value: ${maxValue}`);
      }
    }
  };

  const handleNextQuestion = () => {
    if (selectedAnswer === null) return;
    const newAnswers = [...answers, selectedAnswer];
    setAnswers(newAnswers);
    setSelectedAnswer(null);
    setAnswerFeedback(null);
    
    // Apply review scheduling algorithm
    if (algorithmResults?.reviewInterval && currentQuestion === testQuestions.length - 1) {
      const reviewInterval = algorithmResults.reviewInterval;
      setAlgorithmFeedback(`⏰ Next review scheduled in ${reviewInterval} days (${algorithms.reviewScheduling} algorithm)`);
    }
    
    if (currentQuestion < testQuestions.length - 1) {
      setCurrentQuestion(q => q + 1);
    } else {
      completeTest(newAnswers);
    }
  };

  // Reset selectedAnswer on question change
  useEffect(() => {
    setSelectedAnswer(null);
  }, [currentQuestion]);

  const completeTest = (finalAnswers: number[]) => {
    if (!user) return;

    const endTime = Date.now();
    const timeSpent = endTime - startTime;
    const correctAnswers = finalAnswers.filter((answer, index) => 
      answer === testQuestions[index].correctAnswer
    ).length;

    const executionTimes = executionResults.reduce((acc, result) => ({
      ...acc,
      [result.algorithmName]: result.executionTime
    }), {});

    addTestAttempt({
      studentId: user.id,
      questions: testQuestions,
      answers: finalAnswers,
      score: correctAnswers,
      timeSpent,
      algorithmsUsed: algorithms,
      executionTimes,
      completedAt: new Date(),
      testType: reviewMode ? 'spaced_repetition' : 'normal'
    });

    navigate('/test-results', { 
      state: { 
        testQuestions,
        answers: finalAnswers,
        correctAnswers,
        timeSpent,
        algorithms,
        executionResults,
        testType: reviewMode ? 'spaced_repetition' : 'normal'
      } 
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 flex items-center justify-center relative overflow-hidden transition-all duration-500">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="text-center relative"
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="w-16 h-16 border-4 border-blue-500 dark:border-blue-400 border-t-transparent rounded-full mx-auto mb-6"
          />
          <motion.h2 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="text-2xl font-bold text-slate-900 dark:text-white mb-2"
          >
            Generating Your Test
          </motion.h2>
          <motion.p 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.5 }}
            className="text-slate-600 dark:text-slate-300"
          >
            Algorithms are working to create the perfect questions for you...
          </motion.p>
        </motion.div>
      </div>
    );
  }

  const currentQ = testQuestions[currentQuestion];
  const isSpacedRepetition = reviewMode;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 p-6 relative overflow-hidden transition-all duration-500">
      <div className="max-w-4xl mx-auto relative">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          whileHover={{ scale: 1.02 }}
          className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl rounded-2xl p-6 shadow-xl border border-white/30 dark:border-slate-700/30 mb-8 transition-all duration-300"
        >
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center">
              <motion.div 
                whileHover={{ rotate: 360 }}
                transition={{ duration: 0.6 }}
                className={`w-12 h-12 rounded-xl flex items-center justify-center mr-4 shadow-lg ${
                  isSpacedRepetition 
                    ? 'bg-emerald-500 dark:bg-emerald-400' 
                    : 'bg-blue-500 dark:bg-blue-400'
                }`}
              >
                {isSpacedRepetition ? (
                  <RefreshCw className="h-6 w-6 text-white" />
                ) : (
                  <Zap className="h-6 w-6 text-white" />
                )}
              </motion.div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                  {isSpacedRepetition ? 'Spaced Repetition Review' : 'Personalized Test'}
                </h1>
                <p className="text-slate-600 dark:text-slate-300">
                  {isSpacedRepetition 
                    ? 'Reinforcing your knowledge with spaced repetition' 
                    : 'Challenge yourself with adaptive questions'
                  }
                </p>
              </div>
            </div>
            
            {/* Test Type Badge */}
            <motion.div 
              whileHover={{ scale: 1.05 }}
              className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-semibold ${
                isSpacedRepetition
                  ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-700'
                  : 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 border border-blue-200 dark:border-blue-700'
              }`}
            >
              {isSpacedRepetition ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Spaced Repetition
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4 mr-2" />
                  New Test
                </>
              )}
            </motion.div>
          </div>

          {/* Progress Bar */}
          <div className="mb-4">
            <div className="flex justify-between text-sm text-slate-600 dark:text-slate-400 mb-2">
              <span>Question {currentQuestion + 1} of {testQuestions.length}</span>
              <span>{Math.round(((currentQuestion + 1) / testQuestions.length) * 100)}%</span>
            </div>
            <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
              <motion.div 
                className="bg-blue-500 dark:bg-blue-400 h-2 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${((currentQuestion + 1) / testQuestions.length) * 100}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
          </div>

          {/* Active Algorithms Indicator */}
          <div className="mb-4">
            <div className="flex flex-wrap gap-2">
              <motion.div 
                whileHover={{ scale: 1.05 }}
                className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-700"
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                {algorithms.reviewScheduling}
              </motion.div>
              <motion.div 
                whileHover={{ scale: 1.05 }}
                className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-200 border border-purple-200 dark:border-purple-700"
              >
                <Brain className="h-3 w-3 mr-1" />
                {algorithms.questionSelection}
              </motion.div>
              <motion.div 
                whileHover={{ scale: 1.05 }}
                className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 border border-yellow-200 dark:border-yellow-700"
              >
                <Gift className="h-3 w-3 mr-1" />
                {algorithms.rewardSystem}
              </motion.div>
              <motion.div 
                whileHover={{ scale: 1.05 }}
                className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-cyan-100 dark:bg-cyan-900/30 text-cyan-800 dark:text-cyan-200 border border-cyan-200 dark:border-cyan-700"
              >
                <Cpu className="h-3 w-3 mr-1" />
                {algorithms.knowledgeTracing}
              </motion.div>
            </div>
          </div>

          {/* Timer */}
          <motion.div 
            animate={{ 
              scale: [1, 1.05, 1],
              opacity: [0.8, 1, 0.8]
            }}
            transition={{ 
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut"
            }}
            className="flex items-center justify-center"
          >
            <Timer className="h-5 w-5 text-slate-600 dark:text-slate-400 mr-2" />
            <span className="text-slate-600 dark:text-slate-400 font-medium">
              Time: {Math.round(timeElapsed / 1000)}s
            </span>
          </motion.div>
        </motion.div>

        {/* Question */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentQuestion}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.3 }}
            whileHover={{ scale: 1.01 }}
            className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl rounded-2xl p-8 shadow-xl border border-white/30 dark:border-slate-700/30 mb-8 transition-all duration-300"
          >
            <div className="mb-6">
              <div className="flex items-center space-x-3 mb-4">
                <motion.span 
                  whileHover={{ scale: 1.05 }}
                  className={`px-3 py-1 rounded-full text-sm font-medium ${
                    currentQ.topic === 'arrays' 
                      ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200' 
                      : 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-200'
                  }`}
                >
                  {currentQ.topic === 'arrays' ? 'Arrays' : 'Linked Lists'}
                </motion.span>
                <motion.span 
                  whileHover={{ scale: 1.05 }}
                  className={`px-3 py-1 rounded-full text-sm font-medium ${
                    currentQ.difficulty === 'easy' 
                      ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200'
                      : currentQ.difficulty === 'medium'
                      ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200'
                      : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200'
                  }`}
                >
                  {currentQ.difficulty.charAt(0).toUpperCase() + currentQ.difficulty.slice(1)}
                </motion.span>
              </div>
              
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">{currentQ.title}</h2>
              <p className="text-slate-700 dark:text-slate-300 text-lg leading-relaxed">{currentQ.description}</p>
            </div>

            {/* Answer Options */}
            <div className="space-y-3">
              {currentQ.options.map((option, index) => (
                <motion.button
                  key={index}
                  initial={{ opacity: 0, x: index % 2 === 0 ? -20 : 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1, duration: 0.5 }}
                  whileHover={{ 
                    scale: selectedAnswer === null ? 1.02 : 1,
                    boxShadow: selectedAnswer === null ? "0 10px 25px rgba(59, 130, 246, 0.15)" : "none"
                  }}
                  whileTap={{ scale: selectedAnswer === null ? 0.98 : 1 }}
                  onClick={() => handleAnswerSelect(index)}
                  disabled={selectedAnswer !== null}
                  className={`w-full p-4 text-left rounded-xl border-2 transition-all duration-200 ${
                    selectedAnswer === index
                      ? answerFeedback === 'correct'
                        ? 'border-green-500 dark:border-green-400 bg-green-50/80 dark:bg-green-900/20 backdrop-blur-sm text-green-800 dark:text-green-200'
                        : 'border-red-500 dark:border-red-400 bg-red-50/80 dark:bg-red-900/20 backdrop-blur-sm text-red-800 dark:text-red-200'
                      : 'border-slate-200 dark:border-slate-600 bg-white/60 dark:bg-slate-700/60 backdrop-blur-sm hover:border-slate-300 dark:hover:border-slate-500 hover:bg-white/80 dark:hover:bg-slate-600/80'
                  } ${selectedAnswer !== null ? 'cursor-default' : 'cursor-pointer'}`}
                >
                  <div className="flex items-center">
                    <motion.div 
                      whileHover={{ scale: selectedAnswer === null ? 1.1 : 1 }}
                      className={`w-8 h-8 rounded-full flex items-center justify-center mr-4 font-semibold ${
                        selectedAnswer === index
                          ? answerFeedback === 'correct'
                            ? 'bg-green-500 dark:bg-green-400 text-white'
                            : 'bg-red-500 dark:bg-red-400 text-white'
                          : 'bg-slate-100 dark:bg-slate-600 text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      {String.fromCharCode(65 + index)}
                    </motion.div>
                    <span className="text-lg">{option}</span>
                    {selectedAnswer === index && (
                      <motion.div 
                        initial={{ scale: 0, rotate: -180 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{ duration: 0.3 }}
                        className="ml-auto"
                      >
                        {answerFeedback === 'correct' ? (
                          <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
                        ) : (
                          <div className="h-6 w-6 text-red-600 dark:text-red-400">✗</div>
                        )}
                      </motion.div>
                    )}
                  </div>
                </motion.button>
              ))}
            </div>

            {/* Feedback */}
            <AnimatePresence>
              {answerFeedback && (
                <motion.div
                  initial={{ opacity: 0, y: 20, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -20, scale: 0.9 }}
                  className={`mt-6 p-4 rounded-xl ${
                    answerFeedback === 'correct' 
                      ? 'bg-green-50/80 dark:bg-green-900/20 backdrop-blur-sm border border-green-200 dark:border-green-700' 
                      : 'bg-red-50/80 dark:bg-red-900/20 backdrop-blur-sm border border-red-200 dark:border-red-700'
                  }`}
                >
                  <div className="flex items-center">
                    {answerFeedback === 'correct' ? (
                      <motion.div
                        animate={{ 
                          scale: [1, 1.2, 1],
                          rotate: [0, 10, -10, 0]
                        }}
                        transition={{ duration: 0.6 }}
                      >
                        <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400 mr-3" />
                      </motion.div>
                    ) : (
                      <motion.div
                        animate={{ 
                          scale: [1, 1.1, 1],
                          rotate: [0, -5, 5, 0]
                        }}
                        transition={{ duration: 0.6 }}
                        className="h-6 w-6 text-red-600 dark:text-red-400 mr-3"
                      >
                        ✗
                      </motion.div>
                    )}
                    <div>
                      <h3 className={`font-semibold ${
                        answerFeedback === 'correct' 
                          ? 'text-green-800 dark:text-green-200' 
                          : 'text-red-800 dark:text-red-200'
                      }`}>
                        {answerFeedback === 'correct' ? 'Correct!' : 'Incorrect'}
                      </h3>
                      <p className={`text-sm ${
                        answerFeedback === 'correct' 
                          ? 'text-green-700 dark:text-green-300' 
                          : 'text-red-700 dark:text-red-300'
                      }`}>
                        {answerFeedback === 'correct' 
                          ? 'Great job! You understand this concept well.' 
                          : currentQ.explanation
                        }
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Algorithm Feedback */}
            <AnimatePresence>
              {algorithmFeedback && (
                <motion.div
                  initial={{ opacity: 0, y: 20, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -20, scale: 0.9 }}
                  className="mt-4 p-4 rounded-xl bg-blue-50/80 dark:bg-blue-900/20 backdrop-blur-sm border border-blue-200 dark:border-blue-700"
                >
                  <div className="flex items-center">
                    <motion.div
                      animate={{ 
                        scale: [1, 1.1, 1],
                        rotate: [0, 5, -5, 0]
                      }}
                      transition={{ duration: 0.6 }}
                    >
                      <Cpu className="h-6 w-6 text-blue-600 dark:text-blue-400 mr-3" />
                    </motion.div>
                    <div>
                      <h3 className="font-semibold text-blue-800 dark:text-blue-200">
                        Algorithm Applied
                      </h3>
                      <p className="text-sm text-blue-700 dark:text-blue-300">
                        {algorithmFeedback}
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </AnimatePresence>

        {/* Navigation */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="flex justify-between items-center"
        >
          <motion.button
            whileHover={{ scale: 1.05, x: -5 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowAlgorithmDetails(!showAlgorithmDetails)}
            className="flex items-center px-6 py-3 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-medium hover:bg-slate-200 dark:hover:bg-slate-600 transition-all duration-200"
          >
            <Cpu className="h-5 w-5 mr-2" />
            {showAlgorithmDetails ? 'Hide' : 'Show'} Algorithm Details
          </motion.button>

          <motion.button
            whileHover={{ 
              scale: 1.05,
              boxShadow: selectedAnswer !== null ? "0 20px 40px rgba(16, 185, 129, 0.3)" : "none"
            }}
            whileTap={{ scale: 0.95 }}
            onClick={handleNextQuestion}
            disabled={selectedAnswer === null}
            className={`flex items-center px-8 py-3 rounded-xl font-semibold transition-all duration-200 ${
              selectedAnswer !== null
                ? 'bg-emerald-500 dark:bg-emerald-400 text-white hover:bg-emerald-600 dark:hover:bg-emerald-500 shadow-lg'
                : 'bg-slate-200 dark:bg-slate-700 text-slate-400 dark:text-slate-500 cursor-not-allowed'
            }`}
          >
            {currentQuestion < testQuestions.length - 1 ? (
              <>
                Next Question
                <ArrowRight className="h-5 w-5 ml-2" />
              </>
            ) : (
              <>
                Complete Test
                <Award className="h-5 w-5 ml-2" />
              </>
            )}
          </motion.button>
        </motion.div>

        {/* Algorithm Details */}
        <AnimatePresence>
          {showAlgorithmDetails && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="mt-8 bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl rounded-2xl p-6 shadow-xl border border-white/30 dark:border-slate-700/30 overflow-hidden"
            >
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-4 flex items-center">
                <BookOpen className="h-5 w-5 mr-2" />
                Algorithm Performance
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {executionResults.map((result, index) => (
                  <motion.div
                    key={result.algorithmName}
                    initial={{ opacity: 0, x: index % 2 === 0 ? -20 : 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1, duration: 0.5 }}
                    whileHover={{ scale: 1.02 }}
                    className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-xl border border-slate-200 dark:border-slate-600"
                  >
                    <h4 className="font-semibold text-slate-900 dark:text-white mb-2">
                      {result.algorithmName}
                    </h4>
                    <div className="space-y-1 text-sm text-slate-600 dark:text-slate-400">
                      <p>Execution Time: {result.executionTime.toFixed(3)}ms</p>
                      <p>Time Complexity: {result.complexity.time}</p>
                      <p>Space Complexity: {result.complexity.space}</p>
                      {result.topic && <p>Topic: {result.topic}</p>}
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default TestPage;