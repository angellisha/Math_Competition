const express = require('express');
const session = require('express-session');
const app = express();
const port = 3000;

app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use(session({
    secret: 'your_secret_key',
    resave: false,
    saveUninitialized: true,
}));

let currentQuestion = {};
let leaderboard = [];
let bestGlobalStreak = 0; // Variable to hold the best global streak
let latestStreak = 0; // Variable to hold the latest streak

// Function to calculate the answer based on the operator
function calculate(num1, num2, op) {
    switch (op) {
        case '+': return num1 + num2;
        case '-': return num1 - num2;
        case '*': return num1 * num2;
        case '/': return num2 !== 0 ? (num1 / num2) : 'undefined';
        default: throw new Error('Invalid operator');
    }
}

// Function to generate a new question
function getQuestion() {
    const ops = ['+', '-', '*', '/'];
    const op = ops[Math.floor(Math.random() * ops.length)];
    let num1, num2;

    if (op === '/') {
        // Generate a clean division question
        num2 = Math.floor(Math.random() * 9) + 1; // Avoid 0
        const quotient = Math.floor(Math.random() * 10) + 1;
        num1 = num2 * quotient; // Ensures num1 is divisible by num2
    } else {
        num1 = Math.floor(Math.random() * 10) + 1;
        num2 = Math.floor(Math.random() * 10) + 1;
    }

    currentQuestion = {
        question: `${num1} ${op} ${num2}`,
        answer: calculate(num1, num2, op)
    };

    return currentQuestion;
}

// Home Page
// Because I could not get the data about the streaks
// to show up on the page, I created a global variable 
// and added the numbers through them
app.get('/', (req, res) => {
    res.render('index', {
        best: bestGlobalStreak,
        latest: latestStreak
    });
});

// Quiz Page
app.get('/quiz', (req, res) => {
    req.session.streak = req.session.streak || 0; // Initialize streak if not set
    getQuestion();
    res.render('quiz', { question: currentQuestion.question, streak: req.session.streak });
});

// Completion Page
app.get('/completion', (req, res) => {
    const total = parseInt(req.query.total) || 0; // Get total correct from query
    const best = parseInt(req.query.best) || 0; // Get best result from query
    const isBest = total > best;

    // Update the global best streak if the current total is higher
    if (total > bestGlobalStreak) {
        bestGlobalStreak = total;
    }

    // Update the latest streak
    latestStreak = total;

    res.render('completion', { total, best, isBest });
});

// Leaderboards Page
app.get('/leaderboards', (req, res) => {
    const sortedLeaderboard = leaderboard.sort((a, b) => b.streak - a.streak);
    res.render('leaderboard', { leaderboard: sortedLeaderboard.slice(0, 10) });
});

// Handle quiz submissions
app.post('/quiz', (req, res) => {
    const userAnswer = req.body.answer;

    // Check if the user's answer is a valid number
    if (!userAnswer || isNaN(userAnswer)) {
        req.session.totalQuestions = (req.session.totalQuestions || 0) + 1; // Count this as an attempt
        return res.redirect('/quiz');
    }

    const answer = parseInt(userAnswer);
    req.session.totalQuestions = (req.session.totalQuestions || 0) + 1; 

    if (answer === currentQuestion.answer) {
        req.session.streak++; 
        res.redirect('/quiz'); // Continue the quiz
    } else {
        // Store total correct answers and timestamp before resetting
        const totalCorrect = req.session.streak; 
        const timestamp = new Date().toLocaleString(); 

        // Add result to leaderboard
        leaderboard.push({ streak: totalCorrect, timestamp }); 
        req.session.best = Math.max(totalCorrect, req.session.best || 0); 

        // Reset for the next quiz
        req.session.streak = 0; 
        req.session.totalQuestions = 0; 

        // Pass the values to the completion page
        res.redirect(`/completion?total=${totalCorrect}&best=${req.session.best}`);
    }
});

// Start the server
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
