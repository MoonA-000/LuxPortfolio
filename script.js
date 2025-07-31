// Quote database
const quotes = [
    {
        text: "The only way to do great work is to love what you do.",
        author: "Steve Jobs",
        category: "success"
    },
    {
        text: "Life is what happens when you're busy making other plans.",
        author: "John Lennon",
        category: "life"
    },
    {
        text: "The future belongs to those who believe in the beauty of their dreams.",
        author: "Eleanor Roosevelt",
        category: "inspiration"
    },
    {
        text: "Success is not final, failure is not fatal: it is the courage to continue that counts.",
        author: "Winston Churchill",
        category: "success"
    },
    {
        text: "The only limit to our realization of tomorrow is our doubts of today.",
        author: "Franklin D. Roosevelt",
        category: "inspiration"
    },
    {
        text: "Love is composed of a single soul inhabiting two bodies.",
        author: "Aristotle",
        category: "love"
    },
    {
        text: "The journey of a thousand miles begins with one step.",
        author: "Lao Tzu",
        category: "wisdom"
    },
    {
        text: "Happiness is not something ready made. It comes from your own actions.",
        author: "Dalai Lama",
        category: "life"
    },
    {
        text: "The mind is everything. What you think you become.",
        author: "Buddha",
        category: "wisdom"
    },
    {
        text: "In the middle of difficulty lies opportunity.",
        author: "Albert Einstein",
        category: "inspiration"
    },
    {
        text: "The best way to predict the future is to create it.",
        author: "Peter Drucker",
        category: "success"
    },
    {
        text: "Love yourself first and everything else falls into line.",
        author: "Lucille Ball",
        category: "love"
    },
    {
        text: "The only person you are destined to become is the person you decide to be.",
        author: "Ralph Waldo Emerson",
        category: "inspiration"
    },
    {
        text: "Life is really simple, but we insist on making it complicated.",
        author: "Confucius",
        category: "wisdom"
    },
    {
        text: "Success usually comes to those who are too busy to be looking for it.",
        author: "Henry David Thoreau",
        category: "success"
    },
    {
        text: "The greatest glory in living lies not in never falling, but in rising every time we fall.",
        author: "Nelson Mandela",
        category: "inspiration"
    },
    {
        text: "Love is the bridge between you and everything.",
        author: "Rumi",
        category: "love"
    },
    {
        text: "The purpose of our lives is to be happy.",
        author: "Dalai Lama",
        category: "life"
    },
    {
        text: "Wisdom comes from experience, and experience comes from mistakes.",
        author: "Anonymous",
        category: "wisdom"
    },
    {
        text: "Don't watch the clock; do what it does. Keep going.",
        author: "Sam Levenson",
        category: "success"
    },
    {
        text: "The only impossible journey is the one you never begin.",
        author: "Tony Robbins",
        category: "inspiration"
    },
    {
        text: "Love is the greatest refreshment in life.",
        author: "Pablo Picasso",
        category: "love"
    },
    {
        text: "Life is either a daring adventure or nothing at all.",
        author: "Helen Keller",
        category: "life"
    },
    {
        text: "The more you know, the more you realize you don't know.",
        author: "Aristotle",
        category: "wisdom"
    },
    {
        text: "Success is walking from failure to failure with no loss of enthusiasm.",
        author: "Winston Churchill",
        category: "success"
    }
];

// App state
let currentQuote = null;
let currentCategory = 'all';
let quotesGenerated = 0;
let favorites = JSON.parse(localStorage.getItem('favorites') || '[]');

// DOM elements
const quoteText = document.getElementById('quote-text');
const quoteAuthor = document.getElementById('quote-author');
const quoteCategory = document.getElementById('quote-category');
const generateBtn = document.getElementById('generate-btn');
const copyBtn = document.getElementById('copy-btn');
const shareBtn = document.getElementById('share-btn');
const filterBtns = document.querySelectorAll('.filter-btn');
const quotesGeneratedEl = document.getElementById('quotes-generated');
const favoritesCountEl = document.getElementById('favorites-count');
const notification = document.getElementById('notification');

// Initialize the app
function init() {
    updateStats();
    generateBtn.addEventListener('click', generateQuote);
    copyBtn.addEventListener('click', copyQuote);
    shareBtn.addEventListener('click', shareQuote);
    
    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            setActiveFilter(btn.dataset.category);
        });
    });
    
    // Add keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        if (e.code === 'Space' && e.target === document.body) {
            e.preventDefault();
            generateQuote();
        }
    });
}

// Generate a random quote
function generateQuote() {
    const quoteCard = document.querySelector('.quote-card');
    quoteCard.classList.add('generating');
    
    setTimeout(() => {
        const filteredQuotes = currentCategory === 'all' 
            ? quotes 
            : quotes.filter(quote => quote.category === currentCategory);
        
        if (filteredQuotes.length === 0) {
            showNotification('No quotes available for this category!', 'error');
            quoteCard.classList.remove('generating');
            return;
        }
        
        const randomIndex = Math.floor(Math.random() * filteredQuotes.length);
        currentQuote = filteredQuotes[randomIndex];
        
        // Animate quote change
        quoteText.style.opacity = '0';
        quoteAuthor.style.opacity = '0';
        quoteCategory.style.opacity = '0';
        
        setTimeout(() => {
            quoteText.textContent = currentQuote.text;
            quoteAuthor.textContent = `— ${currentQuote.author}`;
            quoteCategory.textContent = currentQuote.category.charAt(0).toUpperCase() + currentQuote.category.slice(1);
            
            quoteText.style.opacity = '1';
            quoteAuthor.style.opacity = '1';
            quoteCategory.style.opacity = '1';
            
            quotesGenerated++;
            updateStats();
            quoteCard.classList.remove('generating');
        }, 300);
    }, 600);
}

// Set active filter
function setActiveFilter(category) {
    currentCategory = category;
    
    filterBtns.forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.category === category) {
            btn.classList.add('active');
        }
    });
    
    // Generate a new quote for the selected category
    generateQuote();
}

// Copy quote to clipboard
async function copyQuote() {
    if (!currentQuote) {
        showNotification('Generate a quote first!', 'error');
        return;
    }
    
    const textToCopy = `"${currentQuote.text}" — ${currentQuote.author}`;
    
    try {
        await navigator.clipboard.writeText(textToCopy);
        showNotification('Quote copied to clipboard!', 'success');
    } catch (err) {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = textToCopy;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        showNotification('Quote copied to clipboard!', 'success');
    }
}

// Share quote
function shareQuote() {
    if (!currentQuote) {
        showNotification('Generate a quote first!', 'error');
        return;
    }
    
    const text = `"${currentQuote.text}" — ${currentQuote.author}`;
    const url = window.location.href;
    
    if (navigator.share) {
        navigator.share({
            title: 'Random Quote Generator',
            text: text,
            url: url
        }).catch(err => {
            showNotification('Sharing failed', 'error');
        });
    } else {
        // Fallback: copy to clipboard
        copyQuote();
    }
}

// Update statistics
function updateStats() {
    quotesGeneratedEl.textContent = quotesGenerated;
    favoritesCountEl.textContent = favorites.length;
}

// Show notification
function showNotification(message, type = 'success') {
    notification.textContent = message;
    notification.className = `notification ${type}`;
    notification.classList.add('show');
    
    setTimeout(() => {
        notification.classList.remove('show');
    }, 3000);
}

// Add smooth transitions for quote elements
quoteText.style.transition = 'opacity 0.3s ease';
quoteAuthor.style.transition = 'opacity 0.3s ease';
quoteCategory.style.transition = 'opacity 0.3s ease';

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', init);

// Add some fun Easter eggs
let clickCount = 0;
const title = document.querySelector('.title');

title.addEventListener('click', () => {
    clickCount++;
    if (clickCount === 5) {
        showNotification('🎉 You found the secret! Keep clicking for more surprises!', 'success');
    } else if (clickCount === 10) {
        showNotification('🌟 You\'re a quote master!', 'success');
        title.style.transform = 'rotate(360deg)';
        title.style.transition = 'transform 1s ease';
        setTimeout(() => {
            title.style.transform = 'rotate(0deg)';
        }, 1000);
    }
});

// Add confetti effect for milestone quotes
function checkMilestone() {
    if (quotesGenerated === 10) {
        showNotification('🎊 10 quotes generated! You\'re getting started!', 'success');
    } else if (quotesGenerated === 50) {
        showNotification('🎉 50 quotes! You\'re a quote enthusiast!', 'success');
    } else if (quotesGenerated === 100) {
        showNotification('🏆 100 quotes! You\'re a quote master!', 'success');
    }
}

// Override the generateQuote function to include milestone checking
const originalGenerateQuote = generateQuote;
generateQuote = function() {
    originalGenerateQuote();
    setTimeout(checkMilestone, 1000);
};