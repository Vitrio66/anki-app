// script.js

// --- 定数定義 ---
const LOCAL_STORAGE_ALL_QUESTIONS_KEY = 'allQuestions';
const LOCAL_STORAGE_MISTAKEN_QUESTIONS_KEY = 'mistakenQuestions';
const GITHUB_QUESTIONS_JSON_PATH = 'questions.json'; // GitHub Pages上のJSONファイルのパス

// --- グローバル変数 ---
let allQuestions = []; // 全ての問題を保持するリスト
let currentQuizSet = []; // 現在出題中の問題セット (初回 or 不正解問題)
let mistakenQuestions = []; // 間違えた問題を保持するリスト (再出題用)
let currentQuestionIndex = 0;
let currentQuestion;
let selectedOptionText = null;
let round = 1; // 現在の周回数 (1周目, 2周目など)
const INITIAL_QUIZ_SIZE = 10; // ★ここに出題したい最初の問題数を設定してください

// --- UI要素の取得 ---
const roundIndicator = document.getElementById('round-indicator'); // ★追加: 周回表示要素
const quizSection = document.getElementById('quiz-section');
const questionText = document.getElementById('question-text');
const optionsContainer = document.getElementById('options-container');
const submitAnswerButton = document.getElementById('submit-answer-button');
const resultArea = document.getElementById('result-area');
const feedbackText = document.getElementById('feedback-text');
const explanationText = document.getElementById('explanation-text');
const nextButton = document.getElementById('next-button');
const skipButton = document.getElementById('skip-button');
const quizButtonsContainer = document.querySelector('.quiz-buttons');

// 問題追加フォーム関連のUI要素
const showAddQuestionFormButton = document.getElementById('show-add-question-form-button');
const addQuestionFormSection = document.getElementById('add-question-form-section');
const newQuestionText = document.getElementById('new-question-text');
const newCorrectAnswer = document.getElementById('new-correct-answer');
const newExplanation = document.getElementById('new-explanation');
const newCategory = document.getElementById('new-category');
const newOptionInputs = document.querySelectorAll('.new-option-input');
const addQuestionButton = document.getElementById('add-question-button');
const hideAddQuestionFormButton = document.getElementById('hide-add-question-form-button');

// --- ヘルパー関数 ---

// 配列をランダムに並べ替える
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

// 選択肢の選択状態を解除する
function clearOptionSelection() {
    const allOptions = document.querySelectorAll('.option-button');
    allOptions.forEach(btn => btn.classList.remove('selected', 'correct-option', 'incorrect-option'));
}

// 全ての選択肢ボタンをクリックできないようにする
function disableOptions() {
    const optionButtons = document.querySelectorAll('.option-button');
    optionButtons.forEach(button => {
        button.style.pointerEvents = 'none';
    });
}

// 間違えた問題リストに特定の質問が含まれているかチェック
function isQuestionMistaken(questionId) {
    return mistakenQuestions.some(q => q.id === questionId);
}

// 間違えた問題をリストに追加し、ローカルストレージに保存
function addMistakenQuestion(question) {
    // 間違えた問題リストに既に存在しなければ追加
    if (!isQuestionMistaken(question.id)) {
        mistakenQuestions.push(question);
        saveMistakenQuestions();
    }
}

// 最大IDを取得して新しい問題のIDを生成する
function getNextQuestionId() {
    if (allQuestions.length === 0) {
        return 1;
    }
    const maxId = Math.max(...allQuestions.map(q => q.id));
    return maxId + 1;
}

// --- ローカルストレージ関連の関数 ---

// 間違えた問題をローカルストレージから読み込む
function loadMistakenQuestions() {
    const data = localStorage.getItem(LOCAL_STORAGE_MISTAKEN_QUESTIONS_KEY);
    return data ? JSON.parse(data) : [];
}

// 間違えた問題をローカルストレージに保存する
function saveMistakenQuestions() {
    localStorage.setItem(LOCAL_STORAGE_MISTAKEN_QUESTIONS_KEY, JSON.stringify(mistakenQuestions));
}

// 全ての問題をローカルストレージに保存する（問題追加フォームから追加された際に使用）
function saveAllQuestionsToLocalStorage() {
    localStorage.setItem(LOCAL_STORAGE_ALL_QUESTIONS_KEY, JSON.stringify(allQuestions));
}

// --- メインロジック ---

/**
 * 全ての問題データを読み込む関数
 * 1. ローカルストレージにデータがあればそれを優先的に読み込む。
 * 2. ローカルストレージにデータがなければ、GitHub Pages上のJSONファイルを読み込む。
 * 3. GitHub Pagesから読み込んだデータをローカルストレージに保存する（初回アクセス時など）。
 */
async function loadAndInitializeQuestions() {
    const storedQuestions = localStorage.getItem(LOCAL_STORAGE_ALL_QUESTIONS_KEY);

    if (storedQuestions) {
        try {
            allQuestions = JSON.parse(storedQuestions);
            console.log("問題をローカルストレージから読み込みました。");
        } catch (e) {
            console.error("ローカルストレージのデータが壊れています。GitHub Pagesから再読み込みします。", e);
            await fetchQuestionsFromGitHub();
        }
    } else {
        await fetchQuestionsFromGitHub();
    }

    if (allQuestions.length === 0) {
        questionText.textContent = "現在、問題がありません。GitHub Pagesのquestions.jsonファイルを確認するか、新しい問題を追加してください。";
        optionsContainer.innerHTML = '';
        submitAnswerButton.style.display = 'none';
        nextButton.style.display = 'none';
        skipButton.style.display = 'none';
        resultArea.style.display = 'none';
        quizButtonsContainer.style.display = 'none';
        showAddQuestionFormButton.style.display = 'inline-block';
        roundIndicator.style.display = 'none'; // ★追加: 問題がなければ周回表示も非表示
        return false;
    }
    return true;
}

/**
 * GitHub Pages上のJSONファイルから問題を読み込む
 */
async function fetchQuestionsFromGitHub() {
    try {
        const response = await fetch(GITHUB_QUESTIONS_JSON_PATH);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status} - Could not load ${GITHUB_QUESTIONS_JSON_PATH}`);
        }
        const data = await response.json();
        allQuestions = data;
        console.log("問題をGitHub Pagesから読み込みました:", allQuestions);
        saveAllQuestionsToLocalStorage();
    } catch (error) {
        console.error("GitHub Pagesからの問題読み込みに失敗しました:", error);
        alert(`問題の読み込みに失敗しました。\n原因: ${error.message}\nJSONファイルが正しく設定されているか、GitHub PagesのURLが正しいか確認してください。`);
        allQuestions = [];
    }
}

/**
 * クイズを初期化し、出題する問題セットを準備する
 */
function startQuiz() {
    mistakenQuestions = loadMistakenQuestions(); // 間違えた問題リストをロード
    round = 1;
    updateRoundIndicator(); // 周回表示を更新
    resetQuizSet(); // 問題セットをリセットして初回出題準備

    // 問題がまだない場合はここで終了
    if (allQuestions.length === 0) {
        displayQuestion(); // 「問題がありません」のメッセージを表示
        return;
    }

    displayQuestion();
}

/**
 * 現在の周回と出題する問題セットを管理する
 */
function resetQuizSet() {
    if (round === 1) {
        // 1周目: 全体の問題からランダムにINITIAL_QUIZ_SIZEだけ出題
        const shuffledAllQuestions = shuffleArray([...allQuestions]);
        currentQuizSet = shuffledAllQuestions.slice(0, INITIAL_QUIZ_SIZE);
        // 出題数が全問題数より多い場合は全問題を出題
        if (INITIAL_QUIZ_SIZE > allQuestions.length) {
            currentQuizSet = shuffledAllQuestions;
        }
        mistakenQuestions = []; // 1周目開始時は間違えた問題リストをリセット
        saveMistakenQuestions();
        console.log("1周目開始。出題問題数:", currentQuizSet.length);
    } else {
        // 2周目以降: 間違えた問題のみをランダムに再出題
        if (mistakenQuestions.length === 0) {
            endQuiz(); // 間違えた問題がなければクイズ終了
            return;
        }
        currentQuizSet = shuffleArray([...mistakenQuestions]);
        mistakenQuestions = []; // 次の周回のために間違えた問題リストをリセット
        saveMistakenQuestions();
        console.log(`${round}周目開始。間違えた問題数:`, currentQuizSet.length);
    }
    currentQuestionIndex = 0; // 問題インデックスをリセット
}

/**
 * 周回表示を更新する
 */
function updateRoundIndicator() {
    if (round > 1) {
        roundIndicator.textContent = `${round}周目`;
        roundIndicator.style.display = 'block';
    } else {
        roundIndicator.style.display = 'none';
    }
}

/**
 * クイズを終了する
 */
function endQuiz() {
    questionText.textContent = "全ての学習が終了しました！よく頑張りました！";
    optionsContainer.innerHTML = '';
    optionsContainer.style.display = 'none';
    submitAnswerButton.style.display = 'none';
    skipButton.style.display = 'none';
    nextButton.style.display = 'none';
    resultArea.style.display = 'none';
    quizButtonsContainer.style.display = 'none';
    showAddQuestionFormButton.style.display = 'inline-block';
    roundIndicator.style.display = 'none'; // ★追加: クイズ終了時は周回表示を非表示
    alert("お疲れ様でした！全ての学習問題が終了しました。");
    window.scrollTo(0, 0);
}


// 問題と選択肢を画面に表示する
function displayQuestion() {
    if (currentQuizSet.length === 0) {
        // currentQuizSetが空の場合（問題が初回で全くない場合や、不正解問題が全て終わった場合）
        if (allQuestions.length === 0) {
            questionText.textContent = "現在、問題がありません。新しい問題を追加してください。";
        } else {
            endQuiz(); // 間違えた問題が全て解決した場合の終了処理
        }
        optionsContainer.innerHTML = '';
        submitAnswerButton.style.display = 'none';
        nextButton.style.display = 'none';
        skipButton.style.display = 'none';
        resultArea.style.display = 'none';
        quizButtonsContainer.style.display = 'none';
        showAddQuestionFormButton.style.display = 'inline-block';
        return;
    }

    currentQuestion = currentQuizSet[currentQuestionIndex];
    questionText.textContent = currentQuestion.question;

    optionsContainer.innerHTML = '';
    selectedOptionText = null;

    feedbackText.textContent = '';
    explanationText.textContent = '';
    resultArea.classList.remove('correct', 'incorrect');
    resultArea.style.display = 'none';
    nextButton.style.display = 'none';
    submitAnswerButton.style.display = 'inline-block';
    skipButton.style.display = 'inline-block';
    optionsContainer.style.pointerEvents = 'auto';
    clearOptionSelection();
    quizButtonsContainer.style.display = 'flex';
    showAddQuestionFormButton.style.display = 'none'; // クイズ中は問題追加ボタンを隠す

    const shuffledOptions = shuffleArray([...currentQuestion.options]);

    shuffledOptions.forEach((option, index) => {
        const button = document.createElement('button');
        button.textContent = `${index + 1}. ${option}`;
        button.dataset.option = option;
        button.classList.add('option-button');

        button.addEventListener('click', () => {
            clearOptionSelection();
            button.classList.add('selected');
            selectedOptionText = option;
            submitAnswerButton.disabled = false;
        });
        optionsContainer.appendChild(button);
    });

    submitAnswerButton.disabled = true;
    updateRoundIndicator(); // 周回表示を更新
}

// あなたの答え（選択肢）が正しいかチェックする
function checkAnswer() {
    if (selectedOptionText === null) {
        alert("選択肢を選んでください。");
        return;
    }

    const userAnswer = selectedOptionText;
    const correctAnswer = currentQuestion.correctAnswer;

    disableOptions();

    const optionButtons = document.querySelectorAll('.option-button');
    optionButtons.forEach(button => {
        if (button.dataset.option === correctAnswer) {
            button.classList.add('correct-option');
        }
        if (button.dataset.option === userAnswer && userAnswer.toLowerCase() !== correctAnswer.toLowerCase()) {
             button.classList.add('incorrect-option');
        }
    });

    if (userAnswer.toLowerCase() === correctAnswer.toLowerCase()) {
        feedbackText.textContent = "正解！";
        feedbackText.className = 'correct'; // 緑色に
    } else {
        feedbackText.textContent = "不正解...";
        feedbackText.className = 'incorrect'; // 赤色に
        addMistakenQuestion(currentQuestion); // 間違えた問題を追加
    }
    explanationText.textContent = `正解は「${correctAnswer}」です。\n${currentQuestion.explanation}`;
    resultArea.style.display = 'block';

    submitAnswerButton.style.display = 'none';
    skipButton.style.display = 'none';
    nextButton.style.display = 'inline-block';
}

// 「回答をスキップする」機能
skipButton.addEventListener('click', () => {
    // 不正解としてカウントし、間違えた問題リストに追加
    addMistakenQuestion(currentQuestion);

    // 解答済みの状態にする（選択肢を無効化し、正解を表示）
    disableOptions();
    const correctAnswer = currentQuestion.correctAnswer;
    const optionButtons = document.querySelectorAll('.option-button');
    optionButtons.forEach(button => {
        if (button.dataset.option === correctAnswer) {
            button.classList.add('correct-option'); // 正解を表示
        }
    });

    feedbackText.textContent = "スキップしました。";
    feedbackText.className = 'incorrect'; // スキップは不正解扱い
    explanationText.textContent = `正解は「${correctAnswer}」です。\n${currentQuestion.explanation}`;
    resultArea.style.display = 'block';

    submitAnswerButton.style.display = 'none';
    skipButton.style.display = 'none';
    nextButton.style.display = 'inline-block';
});

// 「次の問題へ」ボタン
nextButton.addEventListener('click', () => {
    currentQuestionIndex++;
    if (currentQuestionIndex < currentQuizSet.length) {
        // まだ現在の問題セットに問題が残っている場合
        displayQuestion();
        window.scrollTo(0, 0);
    } else {
        // 現在の問題セットを全て回答し終えた場合
        round++; // 次の周回へ
        resetQuizSet(); // 新しい問題セットを準備（間違えた問題があればそれを出題）
        if (currentQuizSet.length > 0) {
            // 新しい問題セットがある場合のみ表示
            displayQuestion();
            window.scrollTo(0, 0);
        } else {
            // 全ての問題（初回、間違えた問題も含む）が終了した場合
            endQuiz();
        }
    }
});

// 「問題を追加」ボタン（表示）
showAddQuestionFormButton.addEventListener('click', () => {
    addQuestionFormSection.style.display = 'flex'; // flexに変更
    quizSection.style.display = 'none';
    showAddQuestionFormButton.style.display = 'none';
    roundIndicator.style.display = 'none'; // ★追加: フォーム表示中は周回表示を非表示

    // フォームの入力欄をクリア
    newQuestionText.value = '';
    newCorrectAnswer.value = '';
    newExplanation.value = '';
    newCategory.value = '計画';
    newOptionInputs.forEach(input => input.value = '');

    window.scrollTo(0, 0);
});

// 「キャンセル」ボタン（問題追加フォームを隠す）
hideAddQuestionFormButton.addEventListener('click', () => {
    addQuestionFormSection.style.display = 'none';
    quizSection.style.display = 'flex'; // flexに変更
    showAddQuestionFormButton.style.display = 'inline-block';
    
    // 現在の問題から再開（またはクイズを再開）
    if (currentQuizSet.length > 0) {
        displayQuestion();
    } else {
        // 問題がない状態でキャンセルされた場合は、クイズを再初期化
        initializeApp();
    }
    window.scrollTo(0, 0);
});

// 「問題を追加する」ボタン（問題追加フォームから）
addQuestionButton.addEventListener('click', () => {
    const question = newQuestionText.value.trim();
    const correctAnswer = newCorrectAnswer.value.trim();
    const explanation = newExplanation.value.trim();
    const category = newCategory.value;
    const options = Array.from(newOptionInputs).map(input => input.value.trim());

    // 入力チェック
    if (!question || !correctAnswer || !explanation || options.some(opt => !opt)) {
        alert("全ての問題項目と4つの選択肢を埋めてください。");
        return;
    }
    if (!options.includes(correctAnswer)) {
        alert("選択肢の中に正解の回答が含まれていません。");
        return;
    }

    const newQuestion = {
        id: getNextQuestionId(),
        question: question,
        correctAnswer: correctAnswer,
        explanation: explanation,
        category: category,
        options: options
    };

    allQuestions.push(newQuestion); // 全ての問題リストに追加
    saveAllQuestionsToLocalStorage(); // ローカルストレージに保存

    alert("問題が追加されました！この問題は、あなたのブラウザにのみ保存されます。GitHub Pages上のquestions.jsonは更新されません。");

    // フォームをクリア
    newQuestionText.value = '';
    newCorrectAnswer.value = '';
    newExplanation.value = '';
    newCategory.value = '計画';
    newOptionInputs.forEach(input => input.value = '');

    // 問題を追加したら、クイズ画面に戻る
    addQuestionFormSection.style.display = 'none';
    quizSection.style.display = 'flex'; // flexに変更
    showAddQuestionFormButton.style.display = 'inline-block';
    
    // クイズを再開
    startQuiz(); // 問題が追加されたので、クイズを最初からやり直す
    window.scrollTo(0, 0);
});

// --- アプリ初期化 ---
async function initializeApp() {
    const hasQuestions = await loadAndInitializeQuestions();
    if (hasQuestions) {
        startQuiz(); // 問題があればクイズ開始
    }
    window.scrollTo(0, 0);
}

initializeApp(); // アプリを初期化する