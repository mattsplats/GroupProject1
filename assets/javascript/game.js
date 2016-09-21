"use strict";

// Main game object declaration
const game = {
	// Game state vars
	currentLetter: 0,  // Current matching letter for words remaining in matchingWords
	currentWord: 0,  // Used only to give a unique identifier to each word
	currentTimeout: 0,  // Time to next word
	currentSource: "",  // Currently selected word source
	ready: false,
	over: false,

	// Word arrays
	sourceWords: [],  // Source for adding words to game
	activeWords: [],  // Words on screen
	matchingWords: [],  // Words still matching input string
	missedWords: [],  // Words that do not match input string (on current keystroke)

	// Difficulty vars
	length: 50,  // Length of a game in words (game will end when game.length words have been completed/missed)
	startingTimeout: 2000,  // Msec before first new word is added
	minTimeout: 1000,  // Minimum msec between new words being added
	maxWords: 5,  // Most words to be shown on screen at one time
	wordSpeed: 1200,  // Speed of each word relative to its size, smaller numbers are faster

	// Constants
	speedupFactor: 1.01,  // Muliplier for the rate at which new words are added, applies after each added word
	wordBuffer: 10,  // Minimum buffer of source words (will trigger an XHR more if sourceWords.length < wordBuffer)
	missTimeout: 250,  // Msec after which a miss is triggered where new input is not allowed (like iFrames)


	// Methods
	init: function(){},
		// Initializes game - makes all necessary queries for data (XHR or Firebase db)
		// Calls: data.get
		// Sets: (none)
	
	start: function(){},
		// Start adding words to output div on timer (see // Constants for timing vars)
		// Calls: stats.reset, addWord, end, stats.update
		// Sets: currentLetter, currentWord, stats.startTime, ready, over

	end: function(){},
		// Shows "game over" screen and buttons to play again
		// Calls: showGameOptions, stats.addHighScore
		// Sets: ready, over

	addWord: function(){},
		// Places a new falling word on screen, sets a timeout to call removeWord if not completed in wordLiveTime
		// Calls: data.get
		// Sets: stats.timeOffset, stats.emptyStart, sourceWords, activeWords, matchingWords, currentWord

	removeWord: function(word){},
		// Word not completed in time - removes passed word from game, updates game state & stats
		// Calls: stats.update
		// Sets: stats.score, stats.scoreDelta, stats.scoreMultiplier, stats.currentStreak, activeWords, matchingWords, currentLetter

	resetWord: function(word, index){},
		// Resets HTML for passed word and removes word from matchingWords @ index
		// Calls: (none)
		// Sets: missingWords, matchingWords

	completeWord: function(word){},
		// Word successfully completed - removes passed word from game, updates game state & stats
		// Calls: stats.update
		// Sets: stats.score, stats.scoreDelta, stats.scoreMultiplier, stats.hits, stats.currentStreak, activeWords, matchingWords, stats.emptyStart

	wrongKey: function(){},
		// Animates any words remaining in matchingWords when current keystroke results in no word matches, updates game state & stats
		// Calls: stats.update
		// Sets: stats.timeOffset, stats.scoreDelta, stats.scoreMultiplier, ready, stats.hits, stats.misses, stats.currentStreak, stats.currentLetter

	showGameOptions: function(){}
		// Shows word list selector buttons, modifies #output div css, adds onClick handler for these buttons
		// Calls: start
		// Sets: currentSource, sourceWords, over
};


// Method definitions
// game.init
Object.defineProperty(game, "init", { value: function() {
	data.get("all");
	game.showGameOptions();
}});

// game.start
Object.defineProperty(game, "start", { value: function() {
	// Game state & stats reset for new game
	game.currentLetter = 0;
	game.currentWord = 0;
	stats.reset();
	
	let timer = setTimeout(anotherWord, 0);
	game.currentTimeout = game.startingTimeout;

	// Adds new word every time timer's callback function executes
	// Reduces currentTimeout by speedupFactor on each new added word
	function anotherWord() {
	    clearTimeout(timer);
	    if (game.currentWord < game.length) {
		    if (game.activeWords.length < game.maxWords) {
		    	game.addWord();
		    	game.currentTimeout / game.speedupFactor < game.minTimeout ? game.currentTimeout = game.minTimeout : game.currentTimeout /= game.speedupFactor;
		    }
		    timer = setTimeout(anotherWord, game.currentTimeout);
		}
	}

	stats.startTime = Date.now();
	stats.update();
	game.over = false;
	game.ready = true;
}});

// game.end
Object.defineProperty(game, "end", { value: function() {
	if (!game.over) {
		game.over = true;
		game.ready = false;
		
		$("#output").addClass("flex").html($("<div>").addClass("text-center").attr("id", "thanks").html("<h1>Thanks for playing!</h1>").fadeIn());
		game.showGameOptions();
		stats.addHighScore();
	}
}});

// game.addWord
Object.defineProperty(game, "addWord", { value: function() {
	// If no words were available to type, add the lost time to timeOffset
	if (stats.emptyStart > 0) {
		stats.timeOffset += Date.now() - stats.emptyStart;
		stats.emptyStart = 0;
	}

	// Create new word object, remove word from sourceWords, get more words if sourceWords is running low
	const word = {
		str: game.sourceWords[0],
		number: game.currentWord  // Stores the number used in the div and span IDs at HTML creation time
	};
	game.sourceWords.splice(0, 1);
	if (game.sourceWords.length < game.wordBuffer) { game.sourceWords = data.get(game.currentSource); }

	// Create and output series of spans for each character in the word
	let html = "<div id='word_" + game.currentWord + "' class='falling-word'><div id='word_" + game.currentWord + "_wrapper'><h2>";
	for (let i = 0; i < word.str.length; i++) {
		html += "<span id='word_" + game.currentWord + "_letter_" + i + "'>" + word.str[i] + "</span>";
	}
	html += "</h2></div></div>";
	$("#output").append(html);

	// Randomize y position of new word
	const maxXPos = $("#game-body").width() - $("#word_" + game.currentWord).width();
	const rand = Math.floor(Math.random() * maxXPos) + 15;
	$("#word_" + game.currentWord).css("left", rand);

	// Start animation, with callback to destroy word
	$("#word_" + game.currentWord).velocity({ translateY: "540px" },
		{ duration: (word.str.length + 1) * game.wordSpeed, easing: "linear", complete: function() { if (game.activeWords.indexOf(word) != -1) { game.removeWord(word); } } });

	game.activeWords.push(word);
	game.currentWord++;
}});

// game.removeWord
Object.defineProperty(game, "removeWord", { value: function(word) {
	stats.score -= word.str.length * stats.scoreMinusMult;
	stats.scoreDelta = -(word.str.length * stats.scoreMinusMult);
	if (stats.scoreMultiplier > 1) { stats.scoreMultiplier--; }
	stats.currentStreak = 0;
	stats.update();

	// Remove word from HTML and from activeWords
	$("#word_" + word.number).remove();
	game.activeWords.splice(game.activeWords.indexOf(word), 1)

	// If the word still matches the current input, currentLetter = 0 (so new words will match)
	if (game.matchingWords.indexOf(word) != -1) {
		if (game.matchingWords.length == 1) { game.currentLetter = 0; }
		game.matchingWords.splice(game.matchingWords.indexOf(word), 1);
	}

	// Flash game panel
	$("#game-panel").css("box-shadow", "0px 0px 10px 1px red");
	setTimeout(function(){ $("#game-panel").css("box-shadow", ""); }, 50);
	setTimeout(function(){ $("#game-panel").css("box-shadow", "0px 0px 10px 1px red"); }, 120);
	setTimeout(function(){ $("#game-panel").css("box-shadow", ""); }, 170);

	if (game.currentWord == game.length && game.activeWords.length == 0) { game.end(); }
}});

// game.resetWord
Object.defineProperty(game, "resetWord", { value: function(word, index) {
	for (let i = 0; i < game.currentLetter; i++) {
		$("#word_" + word.number + "_letter_" + i).css("color", "black");
		if ($("#word_" + word.number + "_letter_" + i).html() == "_") { $("#word_" + word.number + "_letter_" + i).html(" "); }
	}

	game.missedWords.push(word);
	game.matchingWords.splice(index, 1);
}});

// game.completeWord
Object.defineProperty(game, "completeWord", { value: function(word) {
	// Increment score, update stats, reset game vars
	stats.score += word.str.length * stats.scorePlusMult * stats.scoreMultiplier;
	stats.scoreDelta = word.str.length * stats.scorePlusMult * stats.scoreMultiplier;
	stats.hits += word.str.length;
	stats.currentStreak++;
	switch (stats.currentStreak) {
		case stats.doublePoint: stats.scoreMultiplier++; break;
		case stats.triplePoint: stats.scoreMultiplier++; break;
		case stats.quadPoint: stats.scoreMultiplier++; break;
		case stats.quintPoint: stats.scoreMultiplier++; break;
	}
	// stats.scoreMultiplier = stats.currentStreak == 50 ? 5 : (stats.currentStreak == 25 ? 4 : (stats.currentStreak == 10 ? 3 : (stats.currentStreak == 5 ? 2 : 1)));
	stats.update();

	game.activeWords.splice(game.activeWords.indexOf(word), 1);
	game.matchingWords.splice(game.matchingWords.indexOf(word), 1);

	// "Blow up word" animation
	blowUpWord();

	// Timer check if screen is empty
	if (game.activeWords.length == 0) {
		stats.emptyStart = Date.now();
	}

	if (game.currentWord == game.length && game.activeWords.length == 0) { game.end(); }

	function blowUpWord() {
		const absPosOffset = $("#word_" + word.number + "_letter_" + 0).width();

		const horizSize = 120 + (8 * word.str.length);  // Horizontal explosion size
		const horizRandMult = 40;  // Horizontal randomness
		function horizOffset(index) { return -(horizSize / 2) + (index * (horizSize / (word.str.length - 1))) }
		
		const vertSize = 60 + (4 * word.str.length);  // Vertical explosion size
		const vertRandMult = 24;  // Vertical randomness
		let flip = Math.random() > 0.5 ? 1 : -1;
		function vertOffset(index) { return Math.sin(index * Math.PI / (word.str.length - 1)) * vertSize * (flip == 1 ? flip = -1 : flip = 1)}
		
		const explodeTime = 250;  // Looks better if you keep the explode time at least 50% longer than the fade time
		const fadeTime = 160;
		
		let horizRand;
		let vertRand;

		// Stop all running animations first
		$("#word_" + word.number).velocity("stop", true);

		for (let i = 0; i < word.str.length; i++) {
			// Remove added dashes
			if ($("#word_" + word.number + "_letter_" + i).html() == "_") { $("#word_" + word.number + "_letter_" + i).html(" "); }
			
			// Set all letters to absolute position and offset left to correct initial position
			$("#word_" + word.number + "_letter_" + i).css("position", "absolute").css("left", (absPosOffset * i) + "px");

			// Set random variation for final letter positions
			horizRand = Math.random() * horizRandMult - (horizRandMult / 2);
			vertRand = Math.random() * vertRandMult - (vertRandMult / 2);

			// Animate explosion
			$("#word_" + word.number + "_letter_" + i).velocity({
				translateX: horizOffset(i) + horizRand,
				translateY: vertOffset(i) + vertRand,
			}, { duration: explodeTime, easing: "easeOutQuad"});
		}

		// Fade out word, then delete
		$("#word_" + word.number).velocity("fadeOut", { duration: fadeTime, easing: "linear",
			completion: function() { $("#word_" + word.number).remove() } });
	}
}});

// game.wrongKey
Object.defineProperty(game, "wrongKey", { value: function() {
	const animationTime = 150;
	
	// Prohibits further input while animation is playing
	game.ready = false;
	
	stats.scoreDelta = 0;
	if (stats.scoreMultiplier > 1) { stats.scoreMultiplier--; }
	stats.hits += game.currentLetter;
	stats.misses++;
	stats.currentStreak = 0;
	stats.timeOffset += animationTime;  // Removes animation wait time from WPM calculation (so you're not penalized for time spent waiting)
	stats.update();

	game.currentLetter = 0;

	// Missed word animation, game.ready == true after game.missTimeout elapses
	for (let i = 0; i < game.missedWords.length; i++) {
		$("#word_" + game.missedWords[i].number + "_wrapper").addClass("word-shake");
		setTimeout(function(){ $("#word_" + game.missedWords[i].number + "_wrapper").removeClass("word-shake"); }, animationTime);
		setTimeout(function(){ game.ready = true; }, game.missTimeout);
	}
}});

// game.showGameOptions
Object.defineProperty(game, "showGameOptions", { value: function() {
	const buttonTemplate = "<button class='btn btn-default startGame' id='hipster' data-type='hipster'>Hipster Words</button> &nbsp;&nbsp;\
		<button class='btn btn-default startGame' id='latin' data-type='latin'>Latin Words</button> &nbsp;&nbsp;\
		<button class='btn btn-default startGame' id='bacon' data-type='bacon'>Bacon Words</button> &nbsp;&nbsp;\
		<button class='btn btn-default startGame' id='random' data-type='random'>Random Words</button>";

	const radioTemplate = "<label class='btn btn-primary active'><input type='radio' name='options' id='option1' autocomplete='off' checked> Easy </label>\
  		<label class='btn btn-primary'><input type='radio' name='options' id='option2' autocomplete='off'> Hard </label>\
  		<label class='btn btn-primary'><input type='radio' name='options' id='option3' autocomplete='off'> Insane </label>";

	if (!game.over) { $("#output").empty(); }
	$("#output").addClass("flex").append($("<div>").html(buttonTemplate).fadeIn());
	$("#output").addClass("flex").append($("<div>").html(radioTemplate).fadeIn());

	$(".startGame").on("click", function(e){
		if (data.isReady()) {
			game.over = false;

			// Set difficulty
			if ($("#option1").prop("checked")) { game.wordSpeed = 1200; }
			else if ($("#option2").prop("checked")) { game.wordSpeed = 900; }
			else { game.wordSpeed = 600; }

			// Set source to selected word source, get words from that source
			game.currentSource = $(this).data("type");
			game.sourceWords = data.get(game.currentSource);

			$("#thanks").fadeOut();
			$(".startGame").fadeOut(function() {
				$("#output").removeClass("flex");
				$("#output").empty();
				if (!game.ready) { game.start(); }
			});
		}
	});
}});