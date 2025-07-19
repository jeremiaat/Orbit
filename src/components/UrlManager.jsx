import React, { useState, useEffect } from 'react';
import { ExternalLink, Trash2, PlusCircle, Search, Save, XCircle, Info, ThumbsUp, Wrench, PlayCircle, Copy } from 'lucide-react';
import Navbar from './HOME/Navbar';
import Footer from './HOME/Footer';
import { db, auth } from '../config/firebase';
import { collection, doc, addDoc, getDocs, deleteDoc, query, orderBy, where } from 'firebase/firestore'; // Import 'where'
import { onAuthStateChanged } from 'firebase/auth'; // Import for auth state changes

const UrlManager = () => {
    // UI State for feedback and loading
    const [isLoading, setIsLoading] = useState(false);
    const [isDeleting, setIsDeleting] = useState(null);
    const [feedback, setFeedback] = useState({ type: '', message: '' });

    // Form input states
    const [title, setTitle] = useState('');
    const [url, setUrl] = useState('');
    const [description, setDescription] = useState('');
    const [searchTerm, setSearchTerm] = useState('');

    // Data state for URLs
    const [urlItems, setUrlItems] = useState([]);

    // State for the video player modal
    const [showVideoModal, setShowVideoModal] = useState(false);
    const [currentVideoEmbedUrl, setCurrentVideoEmbedUrl] = useState('');
    const [currentVideoTitle, setCurrentVideoTitle] = useState('');
    const [currentOriginalVideoUrl, setCurrentOriginalVideoUrl] = useState('');
    const [copiedToClipboard, setCopiedToClipboard] = useState(null); // Changed to store ID of copied item

    // Get current user (will be null if not logged in)
    const [currentUser, setCurrentUser] = useState(null); // Use useState to manage currentUser

    // Helper to show temporary feedback messages
    const showFeedback = (type, message) => {
        setFeedback({ type, message });
        const timer = setTimeout(() => {
            setFeedback({ type: '', message: '' });
        }, 4000);
        return () => clearTimeout(timer);
    };

    // --- Video URL Parsing and Embedding Logic ---
    const getVideoEmbedUrl = (inputUrl) => {
        let embedUrl = '';
        let videoId = '';

        // YouTube
        const youtubeRegex = /(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
        const youtubeMatch = inputUrl.match(youtubeRegex);
        if (youtubeMatch && youtubeMatch[1]) {
            videoId = youtubeMatch[1];
            // Fix: Use template literal correctly
            embedUrl = `https://www.youtube.com/embed/${videoId}?autoplay=1&modestbranding=1&rel=0`;
            return { platform: 'youtube', embedUrl };
        }

        // TikTok
        const tiktokRegex = /(?:tiktok\.com\/@(?:[^\/]+)\/video\/|vm\.tiktok\.com\/)([0-9]+)/;
        const tiktokMatch = inputUrl.match(tiktokRegex);
        if (tiktokMatch && tiktokMatch[1]) {
            videoId = tiktokMatch[1];
            embedUrl = `https://www.tiktok.com/embed/v2/${videoId}?autoplay=1&embedFrom=oembed`;
            return { platform: 'tiktok', embedUrl };
        }

        // Instagram (Note: Instagram embedding via direct iframe is often restricted or requires oEmbed API)
        const instagramRegex = /(?:instagram\.com\/p\/|instagram\.com\/reel\/|instagr\.am\/p\/|instagr\.am\/reel\/)([a-zA-Z0-9_-]+)/;
        const instagramMatch = inputUrl.match(instagramRegex);
        if (instagramMatch && instagramMatch[1]) {
            videoId = instagramMatch[1];
            // Instagram embedding is complex and often requires their oEmbed API or specific embed codes.
            // A direct iframe might not always work reliably without server-side processing for oEmbed.
            // For a simple client-side example, we'll try a basic embed URL, but expect limitations.
            embedUrl = `https://www.instagram.com/p/${videoId}/embed/`;
            return { platform: 'instagram', embedUrl };
        }

        return null;
    };

    const handlePlayVideo = (itemUrl, itemTitle) => {
        const videoInfo = getVideoEmbedUrl(itemUrl);
        if (videoInfo && videoInfo.embedUrl) {
            setCurrentVideoEmbedUrl(videoInfo.embedUrl);
            setCurrentVideoTitle(itemTitle);
            setCurrentOriginalVideoUrl(itemUrl);
            setCopiedToClipboard(null); // Reset copy status when opening modal
            setShowVideoModal(true);
        } else {
            showFeedback('info', 'This link doesn\'t seem to be a directly embeddable video. Opening in a new tab!');
            window.open(itemUrl, '_blank', 'noopener noreferrer');
        }
    };

    // --- Copy Link Functionality (re-used and adapted) ---
    const copyLink = async (linkToCopy, itemId) => {
        try {
            await navigator.clipboard.writeText(linkToCopy);
            setCopiedToClipboard(itemId); // Set ID of the item whose link was copied
            setTimeout(() => setCopiedToClipboard(null), 2000); // Reset after 2 seconds
        } catch (err) {
            console.error('Failed to copy text: ', err);
            showFeedback('error', 'Could not copy the link. Please try again or copy manually.');
        }
    };

    // --- Fetch URL List from Firestore (UPDATED FOR SEARCH) ---
    const fetchUrlList = async () => {
        if (!currentUser) {
            setUrlItems([]);
            showFeedback('info', 'Please log in to see your personalized links. We\'re waiting for you! 🔑');
            return;
        }

        setIsLoading(true);
        try {
            const urlCollectionRef = collection(db, "Url", currentUser.uid, "userUrls");
            let q = query(urlCollectionRef, orderBy("createdAt", "desc"));

            // Apply search filter if searchTerm is not empty
            const trimmedSearchTerm = searchTerm.trim();
            if (trimmedSearchTerm) {
                // IMPORTANT: This creates a prefix search.
                // It will find titles that START WITH the searchTerm (case-insensitive due to toLowerCase).
                // For "contains" search across multiple fields, you'd need a dedicated search service.
                const searchLower = trimmedSearchTerm.toLowerCase();
                q = query(
                    urlCollectionRef,
                    where("title", ">=", searchLower),
                    where("title", "<=", searchLower + '\uf8ff'), // \uf8ff is a special unicode char to get all prefixes
                    orderBy("title"), // Must order by the field you are querying on
                    orderBy("createdAt", "desc") // Secondary order, but primary orderBy is required for where clauses
                );
                // Note: Firestore requires an index for this composite query.
                // You'll get a console warning with a link to create it if you don't have one.
            }


            const data = await getDocs(q);
            const items = data.docs.map((doc) => ({ ...doc.data(), id: doc.id }));
            setUrlItems(items);
            if (feedback.type === 'info' || feedback.type === 'error') {
                setFeedback({ type: '', message: '' });
            }
        } catch (err) {
            console.error('Oops! Error fetching your URL list:', err);
            showFeedback('error', 'Something went wrong while fetching your links. Please refresh and try again! 😟');
            setUrlItems([]);
        } finally {
            setIsLoading(false);
        }
    };

    // --- Add URL to Firestore ---
    const handleAddLink = async (e) => {
        e.preventDefault();

        if (!currentUser) {
            showFeedback('error', 'Hold on! You need to be logged in to save links. 🚫');
            return;
        }

        if (!title.trim() || !url.trim()) {
            showFeedback('error', 'Oh no! Both the Title and Link are required to save. 📝');
            return;
        }
        if (!/^https?:\/\/\S+/.test(url.trim())) {
            showFeedback('error', 'Hmm, that doesn\'t look like a valid link. Make sure it starts with "http://" or "https://". 🔗');
            return;
        }

        setIsLoading(true);
        setFeedback({ type: '', message: '' });

        try {
            const urlCollectionRef = collection(db, "Url", currentUser.uid, "userUrls");
            await addDoc(urlCollectionRef, {
                title: title.trim().toLowerCase(), // Store in lowercase for easier prefix search
                url: url.trim(),
                description: description.trim(),
                createdAt: new Date(),
            });

            setTitle('');
            setUrl('');
            setDescription('');

            showFeedback('success', 'Awesome! Your link has been successfully saved! 👍');
            fetchUrlList(); // Re-fetch list to include the new item
        } catch (err) {
            console.error('Uh oh! Error adding your link:', err);
            showFeedback('error', 'Couldn\'t save your link right now. Give it another shot! 😥');
        } finally {
            setIsLoading(false);
        }
    };

    // --- Delete URL from Firestore ---
    const handleDeleteLink = async (id) => {
        if (!currentUser) {
            showFeedback('error', 'Just a heads-up! You need to be logged in to delete links. 🚫');
            return;
        }

        setIsDeleting(id);
        setFeedback({ type: '', message: '' });

        try {
            const urlDoc = doc(db, 'Url', currentUser.uid, 'userUrls', id);
            await deleteDoc(urlDoc);

            showFeedback('success', 'Got it! Your link has been removed. 🎉');
            fetchUrlList(); // Re-fetch list to reflect deletion
        } catch (err) {
            console.error('Darn it! Error deleting your link:', err);
            showFeedback('error', 'Couldn\'t delete that link. Please try again! ❌');
        } finally {
            setIsDeleting(null);
        }
    };

    // --- Auth State Change Effect ---
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            setCurrentUser(user);
        });
        return () => unsubscribe();
    }, []);

    // --- Fetch URLs when currentUser or searchTerm changes ---
    useEffect(() => {
        // Only fetch if currentUser is known (not null or undefined)
        if (currentUser !== undefined) {
            fetchUrlList();
        }
    }, [currentUser, searchTerm]); // Depend on currentUser and searchTerm

    // No need for client-side filtering anymore if fetchUrlList handles it
    // const filteredUrlItems = urlItems.filter(...)

    return (
        <>
            <Navbar />
            <div className='min-h-screen bg-gradient-to-br from-blue-50 to-purple-100 flex flex-col items-center py-12 px-4 font-sans'>

                {/* Main Heading with a friendly touch */}
                <h1 className='text-4xl md:text-5xl font-extrabold text-gray-900 mb-12 text-center'>
                    <span className='text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-blue-600'>Your Digital Corner</span> ✨
                </h1>

                {/* --- Humanized Notification Messages --- */}
                {feedback.message && (
                    <div className={`
                        ${feedback.type === 'success' ? 'bg-green-100 border-green-400 text-green-700' :
                           feedback.type === 'error' ? 'bg-red-100 border-red-400 text-red-700' :
                           'bg-blue-100 border-blue-400 text-blue-700'}
                        px-4 py-3 rounded-lg relative mb-8 w-full max-w-xl text-center shadow-md animate-fade-in
                        flex items-center justify-between
                    `} role="alert">
                        <span className="flex-1">{feedback.message}</span>
                        <button className="ml-4 text-current" onClick={() => setFeedback({ type: '', message: '' })}>
                            <XCircle size={18} />
                        </button>
                    </div>
                )}

                {/* --- Main Content Area: Form & List --- */}
                <div className='w-full max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8'>

                    {/* Add New URL Form */}
                    <div className='bg-white p-8 rounded-2xl shadow-xl w-full'>
                        <h2 className='text-3xl font-bold text-gray-800 mb-6 flex items-center'>
                            <PlusCircle size={30} className='mr-3 text-purple-600' /> Add a New URL
                        </h2>
                        <p className='text-gray-600 text-md mb-6'>
                            Found something cool? Save your favorite articles, tools, videos, or anything else here!
                        </p>
                        <form onSubmit={handleAddLink} className='space-y-5'>
                            <div>
                                <label htmlFor="title" className="block text-gray-700 text-sm font-medium mb-2">Title <span className="text-red-500">*</span></label>
                                <input
                                    id="title"
                                    onChange={(e) => setTitle(e.target.value)}
                                    value={title}
                                    className='w-full p-3 border border-gray-300 rounded-lg focus:ring-purple-500 focus:border-purple-500 outline-none transition duration-200 text-gray-800'
                                    placeholder="e.g., My Awesome Recipe Blog"
                                    type="text"
                                />
                            </div>
                            <div>
                                <label htmlFor="url" className="block text-gray-700 text-sm font-medium mb-2">Link/URL <span className="text-red-500">*</span></label>
                                <input
                                    id="url"
                                    onChange={(e) => setUrl(e.target.value)}
                                    value={url}
                                    className='w-full p-3 border border-gray-300 rounded-lg focus:ring-purple-500 focus:border-purple-500 outline-none transition duration-200 text-gray-800'
                                    placeholder="e.g., https://www.yummyrecipes.com"
                                    type="text"
                                />
                            </div>
                            <div>
                                <label htmlFor="description" className="block text-gray-700 text-sm font-medium mb-2">A Little Note (Optional)</label>
                                <textarea
                                    id="description"
                                    onChange={(e) => setDescription(e.target.value)}
                                    value={description}
                                    rows="3"
                                    className='w-full p-3 border border-gray-300 rounded-lg focus:ring-purple-500 focus:border-purple-500 outline-none transition duration-200 resize-y text-gray-800'
                                    placeholder="What's special about this link? Why did you save it?"
                                ></textarea>
                            </div>
                            <button
                                type="submit"
                                className='w-full flex items-center justify-center px-6 py-3 bg-purple-600 text-white font-semibold rounded-lg shadow-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-75 transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed'
                                disabled={isLoading}
                            >
                                {isLoading ? (
                                    <div className="flex items-center space-x-2">
                                        <div className="w-4 h-4 border-2 border-white border-b-transparent rounded-full animate-spin"></div>
                                        <span>Saving your gem...</span>
                                    </div>
                                ) : (
                                    <>
                                        <Save size={20} className='mr-2' /> Keep it Safe!
                                    </>
                                )}
                            </button>
                        </form>
                    </div>

                    {/* URL List Display */}
                    <div className='bg-white p-8 rounded-2xl shadow-xl w-full'>
                        <h2 className='text-3xl font-bold text-gray-800 mb-6 flex items-center'>
                            <Wrench size={30} className='mr-3 text-blue-600' /> Your Curated Collection
                        </h2>
                        <p className='text-sm text-gray-600 mb-4'>
                            Welcome, <span className='font-mono font-semibold bg-gray-100 p-1 rounded-md text-purple-700'>{currentUser?.displayName || currentUser?.email || 'Valued Guest'}</span>! Here are all the awesome things you've gathered.
                        </p>

                        {/* Search Input */}
                        <div className="relative mb-6">
                            <input
                                type="text"
                                placeholder='Quickly find links by title (prefix search)...'
                                className='w-full p-3 pr-10 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 outline-none transition duration-200 text-gray-800'
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)} // searchTerm will trigger useEffect to refetch
                            />
                            <Search
                                className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
                                strokeWidth={2}
                            />
                        </div>

                        {/* List of URLs */}
                        <div className='space-y-4 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar'>
                            {isLoading ? (
                                <div className="flex justify-center items-center py-10">
                                    <div className="w-8 h-8 border-4 border-purple-400 border-b-transparent rounded-full animate-spin"></div>
                                    <p className="ml-4 text-gray-600">Loading your treasures...</p>
                                </div>
                            ) : urlItems.length === 0 ? ( // Display based on urlItems, which is now search-filtered
                                <div className="text-gray-500 text-center py-8">
                                    <Info size={30} className="mx-auto mb-3 text-blue-400" />
                                    <p className="mb-2">
                                        {searchTerm ? "Hmm, no matches for your search. Try a different keyword? 🔎" : "It looks a little empty here! Start by adding your first amazing link using the form on the left. ✨"}
                                    </p>
                                    {!searchTerm && (
                                        <p className="text-sm text-gray-400">Your digital library awaits!</p>
                                    )}
                                </div>
                            ) : (
                                urlItems.map((item) => ( // Render urlItems directly
                                    <div
                                        key={item.id}
                                        className='bg-gray-50 border border-gray-200 rounded-xl p-6 shadow-md transform transition-all duration-300 hover:scale-[1.01] hover:shadow-lg'
                                    >
                                        <div className='flex items-start justify-between mb-3'>
                                            <h3 className='text-xl font-bold text-gray-800 break-words pr-4'>{item.title}</h3>
                                            <button
                                                onClick={() => handleDeleteLink(item.id)}
                                                className='ml-4 p-2 rounded-full bg-red-100 text-red-600 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-75 transition-colors duration-200 flex-shrink-0'
                                                disabled={isDeleting === item.id}
                                                title="Delete this link"
                                            >
                                                {isDeleting === item.id ? (
                                                    <div className="w-4 h-4 border-2 border-red-600 border-b-transparent rounded-full animate-spin"></div>
                                                ) : (
                                                    <Trash2 size={20} />
                                                )}
                                            </button>
                                        </div>
                                        {item.description && (
                                            <p className='text-gray-600 text-sm mb-4 line-clamp-2'>{item.description}</p>
                                        )}
                                        <div className='flex flex-col sm:flex-row justify-between items-start sm:items-center mt-4 pt-4 border-t border-gray-100'>
                                            <div className="flex flex-wrap gap-2 mb-2 sm:mb-0">
                                                {/* Play Video Button */}
                                                {getVideoEmbedUrl(item.url) && (
                                                    <button
                                                        onClick={() => handlePlayVideo(item.url, item.title)}
                                                        className='inline-flex items-center justify-center px-4 py-2 bg-purple-600 text-white text-sm font-semibold rounded-lg shadow-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-75 transition-colors duration-200'
                                                        title="Play video here"
                                                    >
                                                        <PlayCircle size={16} className='mr-2' /> Watch In-Site
                                                    </button>
                                                )}

                                                {/* Copy Link Button */}
                                                <button
                                                    onClick={() => copyLink(item.url, item.id)}
                                                    className={`
                                                        inline-flex items-center justify-center px-4 py-2 text-sm font-semibold rounded-lg shadow-md
                                                        ${copiedToClipboard === item.id ? 'bg-green-100 text-green-600' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}
                                                        focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-75 transition-colors duration-200
                                                    `}
                                                    title={copiedToClipboard === item.id ? "Link copied!" : "Copy original link"}
                                                >
                                                    {copiedToClipboard === item.id ? <ThumbsUp size={16} className='mr-2' /> : <Copy size={16} className='mr-2' />}
                                                    {copiedToClipboard === item.id ? "Copied!" : "Copy Link"}
                                                </button>
                                            </div>

                                            {/* Always show "Visit Link" as an alternative or primary action */}
                                            <a
                                                href={item.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className='inline-flex items-center justify-center px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-75 transition-colors duration-200'
                                                title="Open this link in a new tab"
                                            >
                                                Visit Link
                                                <ExternalLink size={16} className='ml-2' />
                                            </a>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>
            <Footer />

            {/* --- Video Playback Modal --- */}
            {showVideoModal && (
                <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg shadow-2xl p-6 relative w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold text-gray-800 truncate pr-8">{currentVideoTitle}</h2>
                            <div className="flex items-center space-x-2">
                                <button
                                    onClick={() => copyLink(currentOriginalVideoUrl, 'modal')} // Use 'modal' as a special ID
                                    className={`
                                        p-2 rounded-full transition-colors duration-200 flex items-center justify-center
                                        ${copiedToClipboard === 'modal' ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-800'}
                                    `}
                                    title={copiedToClipboard === 'modal' ? "Link copied!" : "Copy original link"}
                                >
                                    {copiedToClipboard === 'modal' ? <ThumbsUp size={20} /> : <Copy size={20} />}
                                    <span className="sr-only">{copiedToClipboard === 'modal' ? "Link copied!" : "Copy original link"}</span>
                                </button>
                                <button
                                    onClick={() => setShowVideoModal(false)}
                                    className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 hover:text-gray-800 transition-colors"
                                    title="Close video"
                                >
                                    <XCircle size={24} />
                                </button>
                            </div>
                        </div>
                        <div className="relative pt-[56.25%] w-full bg-black rounded-lg overflow-hidden">
                            {currentVideoEmbedUrl ? (
                                <iframe
                                    src={currentVideoEmbedUrl}
                                    title={currentVideoTitle}
                                    frameBorder="0"
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                                    allowFullScreen
                                    className="absolute top-0 left-0 w-full h-full"
                                ></iframe>
                            ) : (
                                <div className="absolute top-0 left-0 w-full h-full flex items-center justify-center text-gray-400">
                                    <p>Oops! Could not load video.</p>
                                </div>
                            )}
                        </div>
                        <div className="mt-4 text-center text-sm text-gray-600">
                            <p>Video content is provided by and belongs to the original platform.</p>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default UrlManager;