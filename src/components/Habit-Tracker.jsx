import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
    PlusCircle, Trash2, CheckCircle, CircleDot, CalendarDays,
    Lightbulb, BarChart2, XCircle, Sun, Coffee,
    ClipboardList, Target, Layers, Sparkles, ThumbsUp, ChevronDown, ChevronUp, TrendingUp
} from 'lucide-react';
import { db, auth } from '../config/firebase';
import { collection, addDoc, getDocs, deleteDoc, doc, updateDoc, query, orderBy } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import Navbar from './HOME/Navbar';
import Footer from './HOME/Footer';

// Recharts components for the trend graph
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

// --- Date Helper Functions ---
const getDateString = (date) => {
    if (!(date instanceof Date) || isNaN(date)) {
        console.error("getDateString received invalid date:", date);
        return null;
    }
    return date.toISOString().split('T')[0]; // YYYY-MM-DD
};

const getDayOfWeekString = (date) => {
    if (!(date instanceof Date) || isNaN(date)) {
        console.error("getDayOfWeekString received invalid date:", date);
        return 'sunday';
    }
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    return days[date.getDay()];
};

const getStartOfWeek = (date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust to Monday
    const start = new Date(d.setDate(diff));
    start.setHours(0, 0, 0, 0);
    return start;
};

const getEndOfWeek = (date) => {
    const startOfWeek = getStartOfWeek(date);
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);
    return endOfWeek;
};

const getStartOfMonth = (date) => {
    const start = new Date(date.getFullYear(), date.getMonth(), 1);
    start.setHours(0, 0, 0, 0);
    return start;
};

const getEndOfMonth = (date) => {
    const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);
    end.setHours(23, 59, 59, 999);
    return end;
};

const weekdayMap = {
    'sunday': 0, 'monday': 1, 'tuesday': 2, 'wednesday': 3,
    'thursday': 4, 'friday': 5, 'saturday': 6
};

const countDaysInMonthByWeekday = (year, month, weekdayString) => {
    const targetDay = weekdayMap[weekdayString.toLowerCase()];
    if (targetDay === undefined) return 0;

    let count = 0;
    const date = new Date(year, month, 1);
    while (date.getMonth() === month) {
        if (date.getDay() === targetDay) {
            count++;
        }
        date.setDate(date.getDate() + 1);
    }
    return count;
};

// --- Main HabitTracker Component ---
const HabitTracker = () => {
    // --- State Management ---
    const [currentUser, setCurrentUser] = useState(null);
    const [habits, setHabits] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [feedback, setFeedback] = useState({ type: '', message: '' });
    const [isAddingHabit, setIsAddingHabit] = useState(false);
    const [newHabitName, setNewHabitName] = useState('');
    const [newHabitType, setNewHabitType] = useState('daily');
    const [newHabitFrequency, setNewHabitFrequency] = useState([]);
    const [isDeleting, setIsDeleting] = useState(null);
    const today = useMemo(() => new Date(), []); // Memoize today's date

    const [showAtomicTips, setShowAtomicTips] = useState(false);

    // --- Atomic Habits Tips (Static Data) ---
    const atomicHabitsTips = useMemo(() => [
        { title: "Make it Obvious", description: "Design your environment so that cues for your desired habits are visible and prominent.", icon: <Lightbulb size={20} /> },
        { title: "Make it Attractive", description: "Pair a habit you need to do with a habit you want to do (temptation bundling).", icon: <Sparkles size={20} /> },
        { title: "Make it Easy", description: "Reduce the friction to starting a habit. Use the Two-Minute Rule: make it so easy you can do it in two minutes or less.", icon: <Layers size={20} /> },
        { title: "Make it Satisfying", description: "Immediately reward yourself after completing a habit. Track your habits visually to see your progress.", icon: <ThumbsUp size={20} /> },
        { title: "Break Bad Habits", description: "Make it invisible, unattractive, difficult, and unsatisfying.", icon: <XCircle size={20} /> },
        { title: "Identity-Based Habits", description: "Focus on who you wish to become, not what you want to achieve. 'I am a reader' vs. 'I want to read a book.'", icon: <Target size={20} /> },
        { title: "Habit Stacking", description: "After [CURRENT HABIT], I will [NEW HABIT]. This links your new habit to an existing one.", icon: <ClipboardList size={20} /> },
    ], []);

    // --- Helper for Feedback Messages ---
    const showFeedback = useCallback((type, message) => {
        setFeedback({ type, message });
        const timer = setTimeout(() => {
            setFeedback({ type: '', message: '' });
        }, 3000);
        return () => clearTimeout(timer);
    }, []);

    // --- Firestore Operations ---
    const fetchHabits = useCallback(async (user) => {
        if (!user) {
            setHabits([]);
            setIsLoading(false);
            showFeedback('info', 'Please log in to track your habits. 🔑');
            return;
        }

        setIsLoading(true);
        try {
            const habitsCollectionRef = collection(db, "Habit-Tracker", user.uid, "userHabits");
            const q = query(habitsCollectionRef, orderBy("createdAt", "asc"));
            const snapshot = await getDocs(q);
            const loadedHabits = snapshot.docs.map(doc => {
                const data = doc.data();
                const normalizedFrequency = (data.type === 'weekly' && data.frequency)
                    ? (Array.isArray(data.frequency) ? data.frequency : Object.values(data.frequency))
                        .map(day => String(day).toLowerCase())
                    : [];

                return {
                    id: doc.id,
                    ...data,
                    frequency: normalizedFrequency,
                    createdAt: data.createdAt?.toDate(),
                    completions: data.completions || {},
                };
            });
            setHabits(loadedHabits);
            if (feedback.type === 'info' || feedback.type === 'error') {
                setFeedback({ type: '', message: '' });
            }
        } catch (error) {
            console.error("Error fetching habits:", error);
            showFeedback('error', 'Failed to load habits. Please try again!');
            setHabits([]);
        } finally {
            setIsLoading(false);
        }
    }, [showFeedback, feedback.type]);

    const handleAddHabit = async (e) => {
        e.preventDefault();
        if (!currentUser) { showFeedback('error', 'You must be logged in to add habits.'); return; }
        if (!newHabitName.trim()) { showFeedback('error', 'Habit name cannot be empty.'); return; }
        if (newHabitType === 'weekly' && newHabitFrequency.length === 0) { showFeedback('error', 'Please select at least one day for weekly habits.'); return; }

        setIsLoading(true);
        try {
            const habitsCollectionRef = collection(db, "Habit-Tracker", currentUser.uid, "userHabits");
            const frequencyToSend = newHabitType === 'weekly' ? newHabitFrequency.map(day => String(day).toLowerCase()) : [];
            await addDoc(habitsCollectionRef, {
                name: newHabitName.trim(),
                type: newHabitType,
                frequency: frequencyToSend,
                createdAt: new Date(),
                completions: {},
            });
            showFeedback('success', 'Habit added successfully! 🎉');
            setNewHabitName('');
            setNewHabitType('daily');
            setNewHabitFrequency([]);
            setIsAddingHabit(false);
            fetchHabits(currentUser);
        } catch (error) {
            console.error("Error adding habit:", error);
            showFeedback('error', 'Failed to add habit.');
        } finally {
            setIsLoading(false);
        }
    };

    const toggleHabitCompletion = async (habitId) => {
        if (!currentUser) { showFeedback('error', 'You must be logged in to mark habits.'); return; }

        const habitRef = doc(db, "Habit-Tracker", currentUser.uid, "userHabits", habitId);
        const habitToUpdate = habits.find(h => h.id === habitId);
        if (!habitToUpdate) { showFeedback('error', 'Habit not found.'); return; }

        const dateString = getDateString(today);
        if (!dateString) { showFeedback('error', 'Invalid date for marking completion.'); return; }

        const updatedCompletions = { ...habitToUpdate.completions };
        const isCurrentlyCompleted = !!updatedCompletions[dateString];

        if (isCurrentlyCompleted) {
            delete updatedCompletions[dateString];
            showFeedback('info', `Habit "${habitToUpdate.name}" unmarked for ${dateString}.`);
        } else {
            updatedCompletions[dateString] = true;
            showFeedback('success', `Habit "${habitToUpdate.name}" marked complete for ${dateString}!`);
        }

        try {
            await updateDoc(habitRef, { completions: updatedCompletions });
            fetchHabits(currentUser);
        } catch (error) {
            console.error("Error updating habit completion:", error);
            showFeedback('error', 'Failed to update habit status.');
        }
    };

    const handleDeleteHabit = async (habitId) => {
        if (!currentUser) { showFeedback('error', 'You must be logged in to delete habits.'); return; }
        setIsDeleting(habitId);
        try {
            const habitRef = doc(db, "Habit-Tracker", currentUser.uid, "userHabits", habitId);
            await deleteDoc(habitRef);
            showFeedback('success', 'Habit deleted successfully! 🗑️');
            fetchHabits(currentUser);
        } catch (error) {
            console.error("Error deleting habit:", error);
            showFeedback('error', 'Failed to delete habit.');
        } finally {
            setIsDeleting(null);
        }
    };

    // --- NEW: Delete All Habits Function ---
    const handleDeleteAllHabits = async () => {
        if (!currentUser) {
            showFeedback('error', 'You must be logged in to delete habits.');
            return;
        }

        const confirmDelete = window.confirm(
            "Are you sure you want to delete ALL of your habit data? This action cannot be undone."
        );

        if (!confirmDelete) {
            return; // User cancelled
        }

        setIsLoading(true); // Set loading state for overall operation
        try {
            const habitsCollectionRef = collection(db, "Habit-Tracker", currentUser.uid, "userHabits");
            const snapshot = await getDocs(habitsCollectionRef);

            const deletePromises = [];
            snapshot.docs.forEach(habitDoc => {
                deletePromises.push(deleteDoc(doc(db, "Habit-Tracker", currentUser.uid, "userHabits", habitDoc.id)));
            });

            await Promise.all(deletePromises);
            setHabits([]); // Clear local state immediately
            showFeedback('success', 'All habit data successfully deleted! 🗑️🗑️🗑️');
        } catch (error) {
            console.error("Error deleting all habits:", error);
            showFeedback('error', 'Failed to delete all habit data.');
        } finally {
            setIsLoading(false);
        }
    };

    // --- Habit Analysis & Progress Calculation ---

    const isHabitCompletedInCurrentWeek = useCallback((habit, dateToCheck) => {
        if (!habit || !habit.completions) return false;
        const startOfWeek = getStartOfWeek(dateToCheck);
        const endOfWeek = getEndOfWeek(dateToCheck);
        let tempDate = new Date(startOfWeek);
        while (tempDate <= endOfWeek) {
            const dateString = getDateString(tempDate);
            if (dateString && habit.completions[dateString]) {
                return true;
            }
            tempDate.setDate(tempDate.getDate() + 1);
        }
        return false;
    }, []);

    const morningRoutineHabits = useMemo(() => habits.filter(habit => habit.type === 'morning'), [habits]);
    const dailyHabits = useMemo(() => habits.filter(habit => habit.type === 'daily'), [habits]);
    const weeklyPlans = useMemo(() => habits.filter(habit => habit.type === 'weekly'), [habits]);

    const calculateGroupProgress = useCallback((habitList, progressType) => {
        if (!habitList || habitList.length === 0) return 0;

        const todayDateString = getDateString(today);
        const currentDayOfWeek = getDayOfWeekString(today);

        let completedCount = 0;
        let applicableCount = 0;

        habitList.forEach(habit => {
            if (habit.type === 'daily' || habit.type === 'morning') {
                applicableCount++;
                if (habit.completions && habit.completions[todayDateString]) {
                    completedCount++;
                }
            } else if (habit.type === 'weekly') {
                if (progressType === 'dailyViewProgress') {
                    const isDueToday = Array.isArray(habit.frequency) && habit.frequency.includes(currentDayOfWeek);
                    if (isDueToday) {
                        applicableCount++;
                        if (habit.completions && habit.completions[todayDateString]) {
                            completedCount++;
                        }
                    }
                } else if (progressType === 'weeklyOverallProgress') {
                    applicableCount++;
                    if (isHabitCompletedInCurrentWeek(habit, today)) {
                        completedCount++;
                    }
                }
            }
        });
        return applicableCount === 0 ? 0 : (completedCount / applicableCount) * 100;
    }, [today, isHabitCompletedInCurrentWeek]);

    const morningProgress = calculateGroupProgress(morningRoutineHabits, 'dailyViewProgress');
    const dailyProgress = calculateGroupProgress(dailyHabits, 'dailyViewProgress');
    const weeklyProgress = calculateGroupProgress(weeklyPlans, 'weeklyOverallProgress');

    // --- Weekly Analysis for Morning/Daily Habits ---
    const getWeeklyAnalysisForDailyHabit = useCallback((habit) => {
        if (!habit || !habit.completions) return { completed: 0, total: 7 };
        const start = getStartOfWeek(today);
        let completedCount = 0;
        for (let i = 0; i < 7; i++) {
            const tempDate = new Date(start);
            tempDate.setDate(start.getDate() + i);
            const dateString = getDateString(tempDate);
            if (dateString && habit.completions[dateString]) {
                completedCount++;
            }
        }
        return { completed: completedCount, total: 7 };
    }, [today]);

    // --- Monthly Analysis for Weekly Habits ---
    const getMonthlyAnalysisForWeeklyHabit = useCallback((habit) => {
        if (!habit || !habit.completions || !Array.isArray(habit.frequency) || habit.frequency.length === 0) {
            return { completed: 0, expected: 0 };
        }
        const currentMonth = today.getMonth();
        const currentYear = today.getFullYear();
        const start = getStartOfMonth(today);
        const end = getEndOfMonth(today);

        let completedCount = 0;
        let expectedCompletions = 0;

        habit.frequency.forEach(day => {
            expectedCompletions += countDaysInMonthByWeekday(currentYear, currentMonth, day);
        });

        const tempDate = new Date(start);
        while (tempDate <= end) {
            const dateString = getDateString(tempDate);
            const dayOfWeekString = getDayOfWeekString(tempDate);

            if (dateString && habit.frequency.includes(dayOfWeekString)) {
                if (habit.completions && habit.completions[dateString]) {
                    completedCount++;
                }
            }
            tempDate.setDate(tempDate.getDate() + 1);
        }
        return { completed: completedCount, expected: expectedCompletions };
    }, [today]);

    // --- Overall Progress Trend Data for Graph ---
    const overallProgressTrendData = useMemo(() => {
        const data = [];
        const numDays = 30; // Last 30 days
        const todayForGraph = new Date();

        for (let i = numDays - 1; i >= 0; i--) {
            const date = new Date(todayForGraph);
            date.setDate(todayForGraph.getDate() - i);
            const dateString = getDateString(date);
            const dayOfWeekString = getDayOfWeekString(date);

            let dailyCompleted = 0;
            let dailyApplicable = 0;

            habits.forEach(habit => {
                const isCompletedOnDate = habit.completions && habit.completions[dateString];

                if (habit.type === 'daily' || habit.type === 'morning') {
                    dailyApplicable++;
                    if (isCompletedOnDate) {
                        dailyCompleted++;
                    }
                } else if (habit.type === 'weekly') {
                    const isDueOnDate = Array.isArray(habit.frequency) && habit.frequency.includes(dayOfWeekString);
                    if (isDueOnDate) {
                        dailyApplicable++;
                        if (isCompletedOnDate) {
                            dailyCompleted++;
                        }
                    }
                }
            });

            const percentage = dailyApplicable === 0 ? 0 : (dailyCompleted / dailyApplicable) * 100;
            data.push({
                date: date.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' }),
                progress: Math.round(percentage)
            });
        }
        return data;
    }, [habits]);

    // --- Handle Add Habit Modal ---
    const handleOpenAddHabitModalWithType = (type) => {
        setNewHabitType(type);
        setNewHabitFrequency([]);
        setNewHabitName('');
        setIsAddingHabit(true);
    };

    const handleFrequencyChange = (day) => {
        setNewHabitFrequency(prev =>
            prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
        );
    };

    // --- Auth State Effect ---
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            setCurrentUser(user);
            fetchHabits(user);
        });
        return () => unsubscribe();
    }, [fetchHabits]);

    // --- Render Sections (Memoized for performance) ---
    const renderHabitSection = useCallback((title, icon, habitsList, type) => {
        const sectionProgress = calculateGroupProgress(habitsList, 'dailyViewProgress');
        const todayDateString = getDateString(today);
        const currentDayOfWeek = getDayOfWeekString(today);

        return (
            <div className='bg-white p-6 rounded-xl shadow-lg xl:col-span-1'>
                <h3 className='text-xl font-bold text-gray-800 mb-4 flex items-center justify-between'>
                    <span className="flex items-center">
                        {icon} <span className='ml-2'>{title}</span>
                    </span>
                    <button
                        onClick={() => handleOpenAddHabitModalWithType(type)}
                        className="p-2 rounded-full bg-purple-100 text-purple-600 hover:bg-purple-200 transition-colors"
                        title={`Add new ${title.toLowerCase()} habit`}
                        disabled={!currentUser}
                    >
                        <PlusCircle size={20} />
                    </button>
                </h3>
                <div className="w-full bg-gray-200 rounded-full h-2.5 mb-4">
                    <div
                        className="h-2.5 rounded-full transition-all duration-500 ease-in-out"
                        style={{ width: `${sectionProgress}%`, backgroundColor: sectionProgress === 100 ? '#22C55E' : '#8B5CF6' }}
                        title={`${Math.round(sectionProgress)}% completed`}
                    ></div>
                </div>
                {habitsList.length === 0 ? (
                    <p className="text-gray-500 italic text-sm">No {title.toLowerCase()} habits added yet for today.</p>
                ) : (
                    <ul className='space-y-3 max-h-60 overflow-y-auto custom-scrollbar pr-1'>
                        {habitsList.map(habit => {
                            const isCompletedForDisplay =
                                (habit.type === 'daily' || habit.type === 'morning')
                                ? (habit.completions && habit.completions[todayDateString])
                                : isHabitCompletedInCurrentWeek(habit, today);

                            const isWeeklyAndNotDueToday = (habit.type === 'weekly' && !(Array.isArray(habit.frequency) && habit.frequency.includes(currentDayOfWeek)));

                            return (
                                <li
                                    key={habit.id}
                                    className={`flex items-center justify-between p-3 rounded-lg border transition-all duration-200
                                        ${isCompletedForDisplay
                                            ? 'bg-green-50 border-green-200'
                                            : isWeeklyAndNotDueToday
                                                ? 'bg-gray-100 border-gray-200 opacity-60'
                                                : 'bg-gray-50 border-gray-200 hover:bg-gray-100'}
                                    `}
                                >
                                    <span
                                        className={`flex-1 font-medium cursor-pointer
                                            ${isCompletedForDisplay ? 'line-through text-gray-600' : 'text-gray-800'}
                                            ${isWeeklyAndNotDueToday && !isCompletedForDisplay ? 'italic text-gray-500' : ''}
                                        `}
                                        onClick={() => toggleHabitCompletion(habit.id)}
                                    >
                                        {habit.name}
                                        {isWeeklyAndNotDueToday && (
                                            <span className="ml-2 text-xs text-gray-500">(Not due {currentDayOfWeek.charAt(0).toUpperCase() + currentDayOfWeek.slice(1)})</span>
                                        )}
                                    </span>
                                    <div className="flex items-center space-x-2 ml-2">
                                        <button
                                            onClick={() => toggleHabitCompletion(habit.id)}
                                            className={`p-1.5 rounded-full transition-colors duration-200
                                                ${isCompletedForDisplay
                                                    ? 'bg-indigo-100 text-indigo-600 hover:bg-indigo-200'
                                                    : 'bg-green-100 text-green-600 hover:bg-green-200'}
                                            `}
                                            title={isCompletedForDisplay ? "Mark Incomplete" : "Mark Complete"}
                                            disabled={!currentUser}
                                        >
                                            {isCompletedForDisplay ? <CheckCircle size={18} /> : <CircleDot size={18} />}
                                        </button>
                                        <button
                                            onClick={() => handleDeleteHabit(habit.id)}
                                            className="p-1.5 rounded-full bg-red-100 text-red-600 hover:bg-red-200 transition-colors duration-200"
                                            title="Delete Habit"
                                            disabled={isDeleting === habit.id || !currentUser}
                                        >
                                            {isDeleting === habit.id ? (
                                                <div className="w-4 h-4 border-2 border-red-600 border-b-transparent rounded-full animate-spin"></div>
                                            ) : (
                                                <Trash2 size={18} />
                                            )}
                                        </button>
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </div>
        );
    }, [calculateGroupProgress, today, isHabitCompletedInCurrentWeek, currentUser, toggleHabitCompletion, handleDeleteHabit, isDeleting]);


    return (
        <>
            <Navbar />

            <div className='min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100 flex flex-col items-center py-12 px-4 font-sans'>
                <h1 className='text-4xl md:text-5xl font-extrabold text-gray-900 mb-8 text-center'>
                    <span className='text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600'>Your Habit Hub</span> ✨
                </h1>

                {/* --- Current Date Display --- */}
                <div className="flex items-center justify-center space-x-4 mb-8 bg-white p-4 rounded-xl shadow-md">
                    <span className="text-xl font-semibold text-gray-800">
                        Today: {today.toDateString()}
                    </span>
                </div>

                {/* --- Main Content Grid --- */}
                <div className='w-full max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 xl:grid-cols-4 gap-8'>

                    {/* --- Morning Routine Section --- */}
                    {renderHabitSection(
                        'Morning Routine',
                        <Sun size={24} className='text-orange-500' />,
                        morningRoutineHabits,
                        'morning'
                    )}

                    {/* --- Daily Habits Section --- */}
                    {renderHabitSection(
                        'Daily Habits',
                        <Coffee size={24} className='text-blue-500' />,
                        dailyHabits,
                        'daily'
                    )}

                    {/* --- Weekly Plans Section --- */}
                    {renderHabitSection(
                        'Weekly Plans',
                        <CalendarDays size={24} className='text-green-500' />,
                        weeklyPlans,
                        'weekly'
                    )}

                    {/* --- Overall Progress Section --- */}
                    <div className='bg-white p-6 rounded-xl shadow-lg xl:col-span-1'>
                        <h3 className='text-xl font-bold text-gray-800 mb-4 flex items-center'>
                            <BarChart2 size={24} className='mr-2 text-teal-500' /> Overall Progress
                        </h3>
                        <div className="space-y-4">
                            <div>
                                <p className="text-sm font-semibold text-gray-700 mb-1">Morning Routine (Today)</p>
                                <div className="w-full bg-gray-200 rounded-full h-2.5">
                                    <div
                                        className="h-2.5 rounded-full transition-all duration-500 ease-in-out"
                                        style={{ width: `${morningProgress}%`, backgroundColor: morningProgress === 100 ? '#22C55E' : '#F97316' }}
                                    ></div>
                                </div>
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-gray-700 mb-1">Daily Habits (Today)</p>
                                <div className="w-full bg-gray-200 rounded-full h-2.5">
                                    <div
                                        className="h-2.5 rounded-full transition-all duration-500 ease-in-out"
                                        style={{ width: `${dailyProgress}%`, backgroundColor: dailyProgress === 100 ? '#22C55E' : '#3B82F6' }}
                                    ></div>
                                </div>
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-gray-700 mb-1">Weekly Plans (This Week)</p>
                                <div className="w-full bg-gray-200 rounded-full h-2.5">
                                    <div
                                        className="h-2.5 rounded-full transition-all duration-500 ease-in-out"
                                        style={{ width: `${weeklyProgress}%`, backgroundColor: weeklyProgress === 100 ? '#22C55E' : '#10B981' }}
                                    ></div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* --- Habit Analysis & Trends Container --- */}
                    <div className='bg-white p-6 rounded-xl shadow-lg lg:col-span-3 xl:col-span-4'>
                        <h3 className='text-xl font-bold text-gray-800 mb-4 flex items-center'>
                            <TrendingUp size={24} className='mr-2 text-purple-600' /> Habit Analytics
                        </h3>

                        {/* Weekly Analysis for Morning Habits */}
                        <div className="mb-6 border-b border-gray-200 pb-4">
                            <h4 className='text-lg font-semibold text-gray-700 mb-3 flex items-center'>
                                <Sun size={20} className='mr-2 text-orange-500' /> Morning Habits: Weekly View
                            </h4>
                            {morningRoutineHabits.length === 0 ? (
                                <p className="text-gray-500 italic text-sm">No morning habits to analyze.</p>
                            ) : (
                                <ul className='space-y-2 max-h-48 overflow-y-auto custom-scrollbar pr-1'>
                                    {morningRoutineHabits.map(habit => {
                                        const { completed, total } = getWeeklyAnalysisForDailyHabit(habit);
                                        return (
                                            <li key={habit.id} className='flex justify-between items-center p-2 bg-gray-50 rounded-md text-sm'>
                                                <span className='font-medium text-gray-800'>{habit.name}</span>
                                                <span className='text-gray-600'>{completed}/{total} this week</span>
                                            </li>
                                        );
                                    })}
                                </ul>
                            )}
                        </div>

                        {/* Weekly Analysis for Daily Habits */}
                        <div className="mb-6 border-b border-gray-200 pb-4">
                            <h4 className='text-lg font-semibold text-gray-700 mb-3 flex items-center'>
                                <Coffee size={20} className='mr-2 text-blue-500' /> Daily Habits: Weekly View
                            </h4>
                            {dailyHabits.length === 0 ? (
                                <p className="text-gray-500 italic text-sm">No daily habits to analyze.</p>
                            ) : (
                                <ul className='space-y-2 max-h-48 overflow-y-auto custom-scrollbar pr-1'>
                                    {dailyHabits.map(habit => {
                                        const { completed, total } = getWeeklyAnalysisForDailyHabit(habit);
                                        return (
                                            <li key={habit.id} className='flex justify-between items-center p-2 bg-gray-50 rounded-md text-sm'>
                                                <span className='font-medium text-gray-800'>{habit.name}</span>
                                                <span className='text-gray-600'>{completed}/{total} this week</span>
                                            </li>
                                        );
                                    })}
                                </ul>
                            )}
                        </div>

                        {/* Monthly Analysis for Weekly Habits */}
                        <div className="mb-6 border-b border-gray-200 pb-4">
                            <h4 className='text-lg font-semibold text-gray-700 mb-3 flex items-center'>
                                <CalendarDays size={20} className='mr-2 text-green-500' /> Weekly Plans: Monthly View
                            </h4>
                            {weeklyPlans.length === 0 ? (
                                <p className="text-gray-500 italic text-sm">No weekly plans to analyze.</p>
                            ) : (
                                <ul className='space-y-2 max-h-48 overflow-y-auto custom-scrollbar pr-1'>
                                    {weeklyPlans.map(habit => {
                                        const { completed, expected } = getMonthlyAnalysisForWeeklyHabit(habit);
                                        return (
                                            <li key={habit.id} className='flex justify-between items-center p-2 bg-gray-50 rounded-md text-sm'>
                                                <span className='font-medium text-gray-800'>{habit.name}</span>
                                                <span className='text-gray-600'>{completed}/{expected} this month</span>
                                            </li>
                                        );
                                    })}
                                </ul>
                            )}
                        </div>

                        {/* Overall Progress Trend Graph */}
                        <div>
                            <h4 className='text-lg font-semibold text-gray-700 mb-3 flex items-center'>
                                <BarChart2 size={20} className='mr-2 text-indigo-600' /> Overall Daily Progress Trend (Last 30 Days)
                            </h4>
                            {habits.length === 0 ? (
                                <p className="text-gray-500 italic text-sm">Add habits to see your progress trend.</p>
                            ) : (
                                <ResponsiveContainer width="100%" height={300}>
                                    <LineChart
                                        data={overallProgressTrendData}
                                        margin={{ top: 5, right: 10, left: -20, bottom: 5 }}
                                    >
                                        <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                                        <XAxis dataKey="date" tick={{ fill: '#6b7280', fontSize: 12 }} />
                                        <YAxis
                                            domain={[0, 100]}
                                            tickFormatter={(value) => `${value}%`}
                                            tick={{ fill: '#6b7280', fontSize: 12 }}
                                            label={{ value: 'Progress (%)', angle: -90, position: 'insideLeft', fill: '#4b5563' }}
                                        />
                                        <Tooltip
                                            formatter={(value) => [`${value}%`, 'Progress']}
                                            labelFormatter={(label) => `Date: ${label}`}
                                            contentStyle={{ backgroundColor: '#fff', border: '1px solid #e0e0e0', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}
                                            itemStyle={{ color: '#4b5563' }}
                                        />
                                        <Line
                                            type="monotone"
                                            dataKey="progress"
                                            stroke="#8B5CF6"
                                            strokeWidth={3}
                                            dot={{ r: 4 }}
                                            activeDot={{ r: 6 }}
                                            isAnimationActive={false}
                                        />
                                    </LineChart>
                                </ResponsiveContainer>
                            )}
                        </div>
                    </div>

                    {/* --- Atomic Habits Tips Section (Collapsible - Full Width & Less Height) --- */}
                    <div className='bg-white p-6 rounded-xl shadow-lg lg:col-span-3 xl:col-span-4'>
                        <h3 className='text-xl font-bold text-gray-800 mb-4 flex items-center justify-between cursor-pointer'
                            onClick={() => setShowAtomicTips(!showAtomicTips)}>
                            <span className="flex items-center">
                                <Lightbulb size={24} className='mr-2 text-yellow-500' /> Atomic Habits Insights
                            </span>
                            <button className="p-1 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors">
                                {showAtomicTips ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                            </button>
                        </h3>
                        <div className={`
                            overflow-hidden transition-all duration-500 ease-in-out
                            ${showAtomicTips ? 'max-h-screen opacity-100' : 'max-h-0 opacity-0'}
                        `}>
                            <div className='space-y-4 pt-2 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
                                {atomicHabitsTips.map((tip, index) => (
                                    <div key={index} className='p-4 bg-gray-50 rounded-lg border border-gray-200'>
                                        <h4 className='font-semibold text-gray-800 flex items-center mb-1'>
                                            {tip.icon} <span className='ml-2'>{tip.title}</span>
                                        </h4>
                                        <p className='text-sm text-gray-600'>{tip.description}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* --- NEW: Delete All Habits Button --- */}
                    <div className='bg-red-50 p-6 rounded-xl shadow-lg lg:col-span-3 xl:col-span-4 flex justify-center items-center'>
                        <button
                            onClick={handleDeleteAllHabits}
                            className="bg-red-600 text-white p-4 rounded-lg font-semibold hover:bg-red-700 transition-colors duration-200 flex items-center justify-center space-x-2"
                            disabled={!currentUser || isLoading}
                        >
                            <Trash2 size={20} />
                            <span>Delete All My Habit Data</span>
                        </button>
                    </div>

                </div>

                {/* --- Add Habit Modal --- */}
                {isAddingHabit && (
                    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-lg shadow-2xl p-6 relative w-full max-w-md max-h-[90vh] overflow-y-auto flex flex-col">
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-2xl font-bold text-gray-800">Add New Habit</h2>
                                <button
                                    onClick={() => setIsAddingHabit(false)}
                                    className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 hover:text-gray-800 transition-colors"
                                    title="Close"
                                >
                                    <XCircle size={24} />
                                </button>
                            </div>
                            <form onSubmit={handleAddHabit} className="space-y-4">
                                <div>
                                    <label htmlFor="habit-name" className="block text-gray-700 text-sm font-medium mb-1">Habit Name <span className="text-red-500">*</span></label>
                                    <input
                                        id="habit-name"
                                        type="text"
                                        value={newHabitName}
                                        onChange={(e) => setNewHabitName(e.target.value)}
                                        className="w-full p-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500"
                                        placeholder="e.g., Read 10 pages"
                                        disabled={isLoading}
                                    />
                                </div>
                                <div>
                                    <label htmlFor="habit-type" className="block text-gray-700 text-sm font-medium mb-1">Habit Type</label>
                                    <select
                                        id="habit-type"
                                        value={newHabitType}
                                        onChange={(e) => {
                                            setNewHabitType(e.target.value);
                                            setNewHabitFrequency([]);
                                        }}
                                        className="w-full p-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500 bg-white"
                                        disabled={isLoading}
                                    >
                                        <option value="daily">Daily Habit</option>
                                        <option value="morning">Morning Routine</option>
                                        <option value="weekly">Weekly Plan</option>
                                    </select>
                                </div>
                                {newHabitType === 'weekly' && (
                                    <div>
                                        <label className="block text-gray-700 text-sm font-medium mb-1">Days of Week <span className="text-red-500">*</span></label>
                                        <div className="grid grid-cols-3 gap-2">
                                            {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map(day => (
                                                <button
                                                    key={day}
                                                    type="button"
                                                    onClick={() => handleFrequencyChange(day)}
                                                    className={`
                                                        p-2 rounded-md text-sm font-medium capitalize
                                                        ${newHabitFrequency.includes(day)
                                                            ? 'bg-purple-600 text-white hover:bg-purple-700'
                                                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}
                                                        transition-colors duration-200
                                                    `}
                                                    disabled={isLoading}
                                                >
                                                    {day}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                <button
                                    type="submit"
                                    className="w-full bg-purple-600 text-white p-3 rounded-md font-semibold hover:bg-purple-700 transition-colors duration-200 flex items-center justify-center"
                                    disabled={isLoading}
                                >
                                    {isLoading ? (
                                        <div className="w-5 h-5 border-2 border-white border-b-transparent rounded-full animate-spin"></div>
                                    ) : (
                                        <>
                                            <PlusCircle size={20} className="mr-2" /> Add Habit
                                        </>
                                    )}
                                </button>
                            </form>
                        </div>
                    </div>
                )}
            </div>
            <Footer />
        </>
    );
};

export default HabitTracker;