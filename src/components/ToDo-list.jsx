import React, { useState, useEffect } from 'react';
import Footer from './HOME/Footer';
import Navbar from './HOME/Navbar';
import { PlusCircle, Trash2, CheckCircle, CircleDot, Info, CalendarDays, ThumbsUp, XCircle } from 'lucide-react';
import { db, auth } from '../config/firebase'; // Ensure these are correctly exported from your firebase config
import { collection, addDoc, getDocs, deleteDoc, doc, updateDoc, query, orderBy } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth'; // Import for real-time auth state changes

const TodoList = () => {
    // UI State for feedback and loading
    const [feedback, setFeedback] = useState({ type: '', message: '' });
    const [isLoading, setIsLoading] = useState(false);
    const [isDeleting, setIsDeleting] = useState(null); // For main tasks
    const [isDeletingSubtask, setIsDeletingSubtask] = useState(null); // For subtasks
    const [isAddingSubtaskFor, setIsAddingSubtaskFor] = useState(null); // Which main task is adding a subtask
    const [newSubtaskText, setNewSubtaskText] = useState('');

    // Data states
    const [todos, setTodos] = useState([]);
    const [inputValue, setInputValue] = useState('');
    const [inputDueDate, setInputDueDate] = useState(''); // New state for due date
    const [currentUser, setCurrentUser] = useState(null);

    // --- Helper Functions ---
    const showFeedback = (type, message) => {
        setFeedback({ type, message });
        const timer = setTimeout(() => {
            setFeedback({ type: '', message: '' });
        }, 3000);
        return () => clearTimeout(timer);
    };

    const getFormattedDate = (date) => {
        if (!date) return 'No due date';
        // Firestore Timestamps need to be converted to JS Date objects
        const jsDate = date.toDate ? date.toDate() : new Date(date);
        return jsDate.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    // --- Fetch Todos Functionality ---
    const fetchTodos = async (user) => {
        if (!user) {
            setTodos([]);
            showFeedback('info', 'Please log in to see and manage your to-do list. 🔑');
            return;
        }

        setIsLoading(true);
        try {
            const todosCollectionRef = collection(db, "Todo", user.uid, "Todolist");
            const q = query(todosCollectionRef, orderBy("createdAt", "asc"));
            const data = await getDocs(q);
            const items = data.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
                subtasks: doc.data().subtasks || [] // Ensure subtasks array exists
            }));
            setTodos(items);
            if (feedback.type === 'info' || feedback.type === 'error') {
                setFeedback({ type: '', message: '' });
            }
        } catch (err) {
            console.error('Error fetching todos:', err);
            showFeedback('error', 'Failed to load your to-do list. Please try again later. 😟');
            setTodos([]);
        } finally {
            setIsLoading(false);
        }
    };

    // --- Add Main Todo Functionality ---
    const handleAddTodo = async (e) => {
        e.preventDefault();

        if (!currentUser) {
            showFeedback('error', 'You need to be logged in to add tasks. 🚫');
            return;
        }

        const trimmedValue = inputValue.trim();
        if (trimmedValue === '') {
            showFeedback('error', 'Oops! Your to-do can\'t be empty. Please add some text! 📝');
            return;
        }

        setIsLoading(true);
        try {
            const todosCollectionRef = collection(db, "Todo", currentUser.uid, "Todolist");
            await addDoc(todosCollectionRef, {
                text: trimmedValue,
                completed: false,
                createdAt: new Date(),
                dueDate: inputDueDate ? new Date(inputDueDate) : null, // Store as Date or null
                subtasks: [] // Initialize with an empty array for subtasks
            });

            setInputValue('');
            setInputDueDate('');
            showFeedback('success', 'Great! To-do added to your list. 👍');
            fetchTodos(currentUser);
        } catch (err) {
            console.error('Error adding todo:', err);
            showFeedback('error', 'Couldn\'t add your task right now. Please try again! 😥');
        } finally {
            setIsLoading(false);
        }
    };

    // --- Toggle Main Todo Completion Status ---
    const handleToggleComplete = async (id, currentCompletedStatus) => {
        if (!currentUser) {
            showFeedback('error', 'You need to be logged in to update tasks. 🚫');
            return;
        }

        try {
            const todoDocRef = doc(db, "Todo", currentUser.uid, "Todolist", id);
            await updateDoc(todoDocRef, { completed: !currentCompletedStatus });
            showFeedback('info', 'To-do status updated! ✅');
            fetchTodos(currentUser);
        } catch (err) {
            console.error('Error toggling todo:', err);
            showFeedback('error', 'Failed to update task status. Please try again. 🔄');
        }
    };

    // --- Delete Main Todo Functionality ---
    const handleDeleteTodo = async (id) => {
        if (!currentUser) {
            showFeedback('error', 'You need to be logged in to delete tasks. 🚫');
            return;
        }

        setIsDeleting(id);
        try {
            const todoDocRef = doc(db, "Todo", currentUser.uid, "Todolist", id);
            await deleteDoc(todoDocRef);
            showFeedback('success', 'To-do successfully removed. One less thing to worry about! 🎉');
            fetchTodos(currentUser);
        } catch (err) {
            console.error('Error deleting todo:', err);
            showFeedback('error', 'Couldn\'t delete that task. Please try again! ❌');
        } finally {
            setIsDeleting(null);
        }
    };

    // --- Subtask Functionality ---
    const handleAddSubtask = async (mainTodoId, event) => {
        event.preventDefault();

        if (!currentUser) {
            showFeedback('error', 'You need to be logged in to add subtasks. 🚫');
            return;
        }
        if (!newSubtaskText.trim()) {
            showFeedback('error', 'Subtask cannot be empty!');
            return;
        }

        const mainTodoIndex = todos.findIndex(t => t.id === mainTodoId);
        if (mainTodoIndex === -1) {
            showFeedback('error', 'Main task not found to add subtask.');
            return;
        }

        const newSubtaskId = Date.now().toString();
        const updatedSubtasks = [
            ...todos[mainTodoIndex].subtasks,
            { id: newSubtaskId, text: newSubtaskText.trim(), completed: false }
        ];

        try {
            const todoDocRef = doc(db, "Todo", currentUser.uid, "Todolist", mainTodoId);
            await updateDoc(todoDocRef, { subtasks: updatedSubtasks });
            setNewSubtaskText('');
            setIsAddingSubtaskFor(null);
            showFeedback('success', 'Subtask added! 🎉');
            fetchTodos(currentUser);
        } catch (error) {
            console.error("Error adding subtask: ", error);
            showFeedback('error', 'Failed to add subtask.');
        }
    };

    const handleToggleSubtaskComplete = async (mainTodoId, subtaskId, currentSubtaskCompletedStatus) => {
        if (!currentUser) {
            showFeedback('error', 'You need to be logged in to update subtasks. 🚫');
            return;
        }

        const mainTodoIndex = todos.findIndex(t => t.id === mainTodoId);
        if (mainTodoIndex === -1) return;

        const updatedSubtasks = todos[mainTodoIndex].subtasks.map(sub =>
            sub.id === subtaskId ? { ...sub, completed: !currentSubtaskCompletedStatus } : sub
        );

        try {
            const todoDocRef = doc(db, "Todo", currentUser.uid, "Todolist", mainTodoId);
            await updateDoc(todoDocRef, { subtasks: updatedSubtasks });

            // --- Auto-complete/uncomplete main task based on subtasks ---
            const allSubtasksCompleted = updatedSubtasks.every(sub => sub.completed);
            const anySubtaskIncomplete = updatedSubtasks.some(sub => !sub.completed);

            const currentMainTodo = todos[mainTodoIndex];
            let shouldUpdateMainTodo = false;
            let newMainTodoCompletedStatus = currentMainTodo.completed;

            if (allSubtasksCompleted && !currentMainTodo.completed) {
                // If all subtasks are now complete AND main task is not yet complete
                shouldUpdateMainTodo = true;
                newMainTodoCompletedStatus = true; // Mark main task as complete
            } else if (anySubtaskIncomplete && currentMainTodo.completed) {
                // If any subtask is now incomplete AND main task is currently complete
                shouldUpdateMainTodo = true;
                newMainTodoCompletedStatus = false; // Mark main task as incomplete
            }

            if (shouldUpdateMainTodo) {
                await updateDoc(todoDocRef, { completed: newMainTodoCompletedStatus }); // Update main task in Firestore
                showFeedback('info', `Main task status updated: ${newMainTodoCompletedStatus ? 'Completed!' : 'Reopened.'} ✅`);
            } else {
                showFeedback('info', 'Subtask status updated! ✅'); // Generic subtask update message
            }
            // --- End Auto-complete/uncomplete main task ---

            fetchTodos(currentUser); // Re-fetch to ensure local state matches Firestore
        } catch (error) {
            console.error("Error toggling subtask: ", error);
            showFeedback('error', 'Failed to update subtask status.');
        }
    };

    const handleDeleteSubtask = async (mainTodoId, subtaskId) => {
        if (!currentUser) {
            showFeedback('error', 'You need to be logged in to delete subtasks. 🚫');
            return;
        }

        setIsDeletingSubtask({ mainTodoId, subtaskId });

        const mainTodoIndex = todos.findIndex(t => t.id === mainTodoId);
        if (mainTodoIndex === -1) {
            setIsDeletingSubtask(null);
            return;
        }

        const updatedSubtasks = todos[mainTodoIndex].subtasks.filter(sub => sub.id !== subtaskId);

        try {
            const todoDocRef = doc(db, "Todo", currentUser.uid, "Todolist", mainTodoId);
            await updateDoc(todoDocRef, { subtasks: updatedSubtasks });

            // --- Re-check main task completion after subtask deletion ---
            const allSubtasksCompleted = updatedSubtasks.every(sub => sub.completed);
            const currentMainTodo = todos[mainTodoIndex];

            if (updatedSubtasks.length === 0 && currentMainTodo.completed) {
                // If all subtasks are deleted (array becomes empty) AND main task was completed,
                // it implies the main task might have been completed due to subtasks. Revert to incomplete.
                await updateDoc(todoDocRef, { completed: false });
                showFeedback('info', 'Main task reopened as all subtasks were removed.');
            } else if (allSubtasksCompleted && !currentMainTodo.completed) {
                 // If deleting the last incomplete subtask makes all remaining complete
                await updateDoc(todoDocRef, { completed: true });
                showFeedback('info', 'Main task completed as all remaining subtasks are done! ✅');
            } else {
                showFeedback('success', 'Subtask removed! 👋');
            }
            // --- End Re-check main task completion ---

            fetchTodos(currentUser);
        } catch (error) {
            console.error('Error deleting subtask:', error);
            showFeedback('error', 'Couldn\'t delete that subtask. Please try again! ❌');
        } finally {
            setIsDeletingSubtask(null);
        }
    };

    // --- Progress Bar Calculation ---
    const totalTasks = todos.length;
    const completedTasks = todos.filter(todo => todo.completed).length;
    const overallProgress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

    // --- Auth State Change Effect ---
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            setCurrentUser(user);
            fetchTodos(user);
        });
        return () => unsubscribe();
    }, []);

    return (

        <>
            <Navbar />
        <div className='min-h-screen bg-gradient-to-br from-indigo-50 to-pink-100 flex flex-col items-center py-12 px-4 font-sans'>
            <h1 className='text-4xl md:text-5xl font-extrabold text-gray-900 mb-12 text-center'>
                <span className='text-transparent bg-clip-text bg-gradient-to-r from-pink-600 to-indigo-600'>Your Daily To-Do List</span> 📝
            </h1>

            {/* --- Feedback Messages --- */}
            {feedback.message && (
                <div className={`
                    ${feedback.type === 'success' ? 'bg-green-100 border-green-400 text-green-700' :
                       feedback.type === 'error' ? 'bg-red-100 border-red-400 text-red-700' :
                       'bg-blue-100 border-blue-400 text-blue-700'}
                    px-4 py-3 rounded-lg relative mb-8 w-full max-w-md text-center shadow-md animate-fade-in
                `} role="alert">
                    {feedback.message}
                </div>
            )}

            {/* --- Main Content Area: Form & List (Responsive Layout) --- */}
            <div className='w-full max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8'> {/* Changed to grid for responsiveness */}

                {/* Add New Task Container */}
                <div className='bg-white p-8 rounded-2xl shadow-xl w-full'> {/* Removed max-w-md here, now controlled by grid */}
                    <h2 className='text-2xl font-bold text-gray-800 mb-6 flex items-center'>
                        <PlusCircle size={28} className='mr-3 text-indigo-600' /> Add a New Task
                    </h2>
                    <form onSubmit={handleAddTodo} className='space-y-4 mb-8'>
                        <div>
                            <label htmlFor="todo-text" className="sr-only">Task Description</label>
                            <input
                                id="todo-text"
                                type="text"
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                placeholder="What do you need to get done?"
                                className='w-full p-3 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 outline-none transition duration-200 text-gray-800'
                                disabled={!currentUser || isLoading}
                            />
                        </div>
                        <div>
                            <label htmlFor="todo-due-date" className="block text-gray-700 text-sm font-medium mb-2">Due Date (Optional) <CalendarDays className="inline-block ml-1 text-gray-500" size={16}/></label>
                            <input
                                id="todo-due-date"
                                type="date"
                                value={inputDueDate}
                                onChange={(e) => setInputDueDate(e.target.value)}
                                className='w-full p-3 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 outline-none transition duration-200 text-gray-800'
                                disabled={!currentUser || isLoading}
                            />
                        </div>
                        <button
                            type="submit"
                            className='w-full p-3 bg-indigo-600 text-white rounded-lg shadow-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-opacity-75 transition duration-200 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed'
                            title="Add to-do"
                            disabled={!currentUser || isLoading}
                        >
                            {isLoading ? (
                                <div className="w-5 h-5 border-2 border-white border-b-transparent rounded-full animate-spin"></div>
                            ) : (
                                <>
                                    <PlusCircle size={24} />
                                    <span className="ml-2">Add Task</span>
                                </>
                            )}
                        </button>
                    </form>
                </div>

                {/* Your Tasks Container */}
                <div className='bg-white p-8 rounded-2xl shadow-xl w-full'> {/* Removed max-w-md here, now controlled by grid */}
                    <h2 className='text-2xl font-bold text-gray-800 mb-6 flex items-center'>
                        <CircleDot size={28} className='mr-3 text-pink-600' /> Your Tasks
                    </h2>

                    {/* --- Progress Bar --- */}
                    {totalTasks > 0 && (
                        <div className="mb-8">
                            <p className="text-sm font-semibold text-gray-700 mb-2">
                                Overall Progress: {Math.round(overallProgress)}% Done ({completedTasks} / {totalTasks})
                            </p>
                            <div className="w-full bg-gray-200 rounded-full h-3">
                                <div
                                    className="h-full rounded-full transition-all duration-500 ease-in-out"
                                    style={{ width: `${overallProgress}%`, backgroundColor: overallProgress === 100 ? '#22C55E' : '#6366F1' }} // Green for 100%, Indigo otherwise
                                    title={`${Math.round(overallProgress)}% completed`}
                                ></div>
                            </div>
                            <div className="flex justify-between text-xs text-gray-500 mt-2">
                                <span className="text-red-600">Not Completed</span>
                                <span className="text-green-600">Completed</span>
                            </div>
                        </div>
                    )}

                    {isLoading && todos.length === 0 ? (
                        <div className="flex justify-center items-center py-10">
                            <div className="w-8 h-8 border-4 border-purple-400 border-b-transparent rounded-full animate-spin"></div>
                            <p className="ml-4 text-gray-600">Loading your tasks...</p>
                        </div>
                    ) : todos.length === 0 ? (
                        <div className="text-gray-500 text-center py-8 border-t border-gray-100 pt-8">
                            <Info size={30} className="mx-auto mb-3 text-blue-400" />
                            <p className="mb-2">
                                {currentUser ? "No tasks yet! Time to add some. ✨" : "Log in to start your personalized to-do list! ✨"}
                            </p>
                        </div>
                    ) : (
                        <ul className='space-y-4 max-h-96 overflow-y-auto pr-2 custom-scrollbar'>
                            {todos.map((todo) => (
                                <li
                                    key={todo.id}
                                    className={`
                                        flex flex-col p-4 rounded-lg shadow-sm transition-all duration-300
                                        ${todo.completed ? 'bg-green-50 border border-green-200' : 'bg-gray-50 border border-gray-200 hover:bg-gray-100'}
                                    `}
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <span
                                            className={`
                                                flex-1 text-lg font-medium cursor-pointer select-none
                                                ${todo.completed ? 'line-through text-gray-500' : 'text-gray-800'}
                                            `}
                                            onClick={() => handleToggleComplete(todo.id, todo.completed)}
                                        >
                                            {todo.text}
                                        </span>
                                        <div className="flex items-center space-x-2 ml-4 flex-shrink-0">
                                            <button
                                                onClick={() => handleToggleComplete(todo.id, todo.completed)}
                                                className={`
                                                    p-2 rounded-full transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed
                                                    ${todo.completed ? 'bg-indigo-100 text-indigo-600 hover:bg-indigo-200' : 'bg-green-100 text-green-600 hover:bg-green-200'}
                                                `}
                                                title={todo.completed ? "Mark as Incomplete" : "Mark as Complete"}
                                                disabled={!currentUser}
                                            >
                                                {todo.completed ? <CheckCircle size={20} /> : <CircleDot size={20} />}
                                            </button>
                                            <button
                                                onClick={() => handleDeleteTodo(todo.id)}
                                                className='p-2 rounded-full bg-red-100 text-red-600 hover:bg-red-200 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed'
                                                title="Delete to-do"
                                                disabled={!currentUser || isDeleting === todo.id}
                                            >
                                                {isDeleting === todo.id ? (
                                                    <div className="w-5 h-5 border-2 border-red-600 border-b-transparent rounded-full animate-spin"></div>
                                                ) : (
                                                    <Trash2 size={20} />
                                                )}
                                            </button>
                                        </div>
                                    </div>

                                    {/* Due Date Display */}
                                    {todo.dueDate && (
                                        <p className="text-sm text-gray-600 flex items-center mb-2">
                                            <CalendarDays size={14} className="mr-1 text-gray-500" /> Due: {getFormattedDate(todo.dueDate)}
                                        </p>
                                    )}

                                    {/* Subtasks Section */}
                                    <div className="mt-2 pl-4 border-l-2 border-gray-200">
                                        <h4 className="text-md font-semibold text-gray-700 mb-2">Subtasks:</h4>
                                        {todo.subtasks && todo.subtasks.length > 0 ? (
                                            <ul className="space-y-2">
                                                {todo.subtasks.map((subtask) => (
                                                    <li
                                                        key={subtask.id}
                                                        className={`flex items-center justify-between text-sm p-2 rounded ${subtask.completed ? 'bg-green-100' : 'bg-gray-100'}`}
                                                    >
                                                        <span
                                                            className={`flex-1 cursor-pointer ${subtask.completed ? 'line-through text-gray-600' : 'text-gray-800'}`}
                                                            onClick={() => handleToggleSubtaskComplete(todo.id, subtask.id, subtask.completed)}
                                                        >
                                                            {subtask.text}
                                                        </span>
                                                        <div className="flex items-center space-x-1 ml-2 flex-shrink-0">
                                                            <button
                                                                onClick={() => handleToggleSubtaskComplete(todo.id, subtask.id, subtask.completed)}
                                                                className={`
                                                                    p-1 rounded-full transition-colors duration-200
                                                                    ${subtask.completed ? 'text-indigo-600 hover:text-indigo-700' : 'text-green-600 hover:text-green-700'}
                                                                `}
                                                                title={subtask.completed ? "Mark subtask Incomplete" : "Mark subtask Complete"}
                                                                disabled={!currentUser}
                                                            >
                                                                {subtask.completed ? <CheckCircle size={16} /> : <CircleDot size={16} />}
                                                            </button>
                                                            <button
                                                                onClick={() => handleDeleteSubtask(todo.id, subtask.id)}
                                                                className='p-1 rounded-full text-red-600 hover:text-red-700 transition-colors duration-200'
                                                                title="Delete subtask"
                                                                disabled={!currentUser || (isDeletingSubtask && isDeletingSubtask.mainTodoId === todo.id && isDeletingSubtask.subtaskId === subtask.id)}
                                                            >
                                                                {(isDeletingSubtask && isDeletingSubtask.mainTodoId === todo.id && isDeletingSubtask.subtaskId === subtask.id) ? (
                                                                    <div className="w-4 h-4 border-2 border-red-600 border-b-transparent rounded-full animate-spin"></div>
                                                                ) : (
                                                                    <Trash2 size={16} />
                                                                )}
                                                            </button>
                                                        </div>
                                                    </li>
                                                ))}
                                            </ul>
                                        ) : (
                                            <p className="text-sm text-gray-500 italic">No subtasks yet.</p>
                                        )}

                                        {/* Add Subtask Form/Button */}
                                        {isAddingSubtaskFor === todo.id ? (
                                            <form onSubmit={(e) => handleAddSubtask(todo.id, e)} className="flex gap-2 mt-3">
                                                <input
                                                    type="text"
                                                    value={newSubtaskText}
                                                    onChange={(e) => setNewSubtaskText(e.target.value)}
                                                    placeholder="New subtask..."
                                                    className="flex-1 p-2 border border-gray-300 rounded-lg text-sm focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                                                    disabled={!currentUser}
                                                />
                                                <button
                                                    type="submit"
                                                    className="p-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors duration-200 disabled:opacity-50"
                                                    disabled={!currentUser}
                                                    title="Add Subtask"
                                                >
                                                    <ThumbsUp size={18} />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => { setIsAddingSubtaskFor(null); setNewSubtaskText(''); }}
                                                    className="p-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors duration-200"
                                                    title="Cancel"
                                                >
                                                    <XCircle size={18} />
                                                </button>
                                            </form>
                                        ) : (
                                            <button
                                                onClick={() => setIsAddingSubtaskFor(todo.id)}
                                                className="mt-3 px-3 py-1 bg-blue-500 text-white text-sm rounded-lg hover:bg-blue-600 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                                                disabled={!currentUser}
                                            >
                                                Add Subtask
                                            </button>
                                        )}
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>
        </div>
            <Footer />
        </>
    );
};

export default TodoList;