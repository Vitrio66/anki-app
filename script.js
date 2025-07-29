// script.js

// 問題データを定義していた部分を削除し、ローカルストレージから読み込むように変更
// const questions = [...]; <-- この部分は削除またはコメントアウト！

// --- ローカルストレージ関連の関数 ---

// 'allQuestions'という名前で全ての問題をローカルストレージに保存するキー
const LOCAL_STORAGE_ALL_QUESTIONS_KEY = 'allQuestions';
const LOCAL_STORAGE_MISTAKEN_QUESTIONS_KEY = 'mistakenQuestions';

let allQuestions = []; // 全ての問題を保持するリスト
let mistakenQuestions = []; // 間違えた問題を保持するリスト

// 全ての問題をローカルストレージから読み込む関数
function loadAllQuestions() {
    const data = localStorage.getItem(LOCAL_STORAGE_ALL_QUESTIONS_KEY);
    // データがあればJavaScriptの形に戻し、なければデフォルトの問題リストを返す
    // ★初回起動時のみ、ここに初期問題を記述します★
    return data ? JSON.parse(data) : [
        {
            id: 1,
            question: "日本の首都は？",
            correctAnswer: "東京",
            explanation: "東京は日本の政治、経済、文化の中心地です。",
            category: "計画",
            options: ["大阪", "京都", "東京", "名古屋"]
        },
        {
            id: 2,
            question: "1足す1は？",
            correctAnswer: "2",
            explanation: "足し算の一番基本的な問題です。",
            category: "算数",
            options: ["0", "1", "2", "3"]
        },
        {
            id: 3,
            question: "空気調和設備は何のためにある？",
            correctAnswer: "快適な室内環境を作るため",
            explanation: "室内の温度、湿度、空気の汚れなどを調整して、人が快適に過ごせるようにする設備です。",
            category: "環境設備",
            options: ["火災を感知するため", "建物の強度を増すため", "快適な室内環境を作るため", "雨水を貯めるため"]
        },
        {
            id: 4,
            question: "建築基準法が定める建物の安全性に関わるルールは？",
            correctAnswer: "構造強度",
            explanation: "地震や風などで建物が壊れないようにするための、柱や梁の強さなどの基準です。",
            category: "法規",
            options: ["間取りの自由度", "構造強度", "内装の色合い", "庭の広さ"]
        }
    ];
}

// 全ての問題をローカルストレージに保存する関数
function saveAllQuestions() {
    localStorage.setItem(LOCAL_STORAGE_ALL_QUESTIONS_KEY, JSON.stringify(allQuestions));
}

// 間違えた問題をローカルストレージから読み込む関数 (変更なし)
function loadMistakenQuestions() {
    const data = localStorage.getItem(LOCAL_STORAGE_MISTAKEN_QUESTIONS_KEY);
    return data ? JSON.parse(data) : [];
}

// 間違えた問題をローカルストレージに保存する関数 (変更なし)
function saveMistakenQuestions() {
    localStorage.setItem(LOCAL_STORAGE_MISTAKEN_QUESTIONS_KEY, JSON.stringify(mistakenQuestions));
}

// 特定の問題が間違えた問題リストに含まれているかチェックする関数 (変更なし)
function isQuestionMistaken(questionId) {
    return mistakenQuestions.some(q => q.id === questionId);
}

// 間違えた問題リストに追加する関数 (変更なし)
function addMistakenQuestion(question) {
    if (!isQuestionMistaken(question.id)) {
        mistakenQuestions.push(question);
        saveMistakenQuestions();
    }
}
// --- ローカルストレージ関連の関数 ここまで ---


let currentQuestionIndex = 0;
let currentQuestion;
let selectedOptionText = null;

// UI要素の取得（★追加要素あり★）
const questionText = document.getElementById('question-text');
const optionsContainer = document.getElementById('options-container');
const submitAnswerButton = document.getElementById('submit-answer-button');
const resultArea = document.getElementById('result-area');
const feedbackText = document.getElementById('feedback-text');
const explanationText = document.getElementById('explanation-text');
const nextButton = document.getElementById('next-button');
const skipButton = document.getElementById('skip-button');

// 問題追加フォーム関連のUI要素
const showAddQuestionFormButton = document.getElementById('show-add-question-form-button'); // ★追加★
const addQuestionFormSection = document.getElementById('add-question-form-section');       // ★追加★
const newQuestionText = document.getElementById('new-question-text');                     // ★追加★
const newCorrectAnswer = document.getElementById('new-correct-answer');                   // ★追加★
const newExplanation = document.getElementById('new-explanation');                         // ★追加★
const newCategory = document.getElementById('new-category');                               // ★追加★
const newOptionInputs = document.querySelectorAll('.new-option-input');                   // ★追加★
const addQuestionButton = document.getElementById('add-question-button');                 // ★追加★
const hideAddQuestionFormButton = document.getElementById('hide-add-question-form-button'); // ★追加★


// 配列をランダムに並べ替えるヘルパー関数 (変更なし)
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

// -------------------------------------------------------------
// 問題と選択肢を画面に表示する「機能」（関数）
// -------------------------------------------------------------
function displayQuestion() {
    // 問題がない場合は終了
    if (allQuestions.length === 0) {
        questionText.textContent = "現在、問題がありません。新しい問題を追加してください。";
        optionsContainer.innerHTML = '';
        submitAnswerButton.style.display = 'none';
        nextButton.style.display = 'none';
        skipButton.style.display = 'none';
        resultArea.style.display = 'none'; // 結果表示エリアも隠す
        return;
    }

    currentQuestion = allQuestions[currentQuestionIndex];
    questionText.textContent = currentQuestion.question;

    optionsContainer.innerHTML = '';
    selectedOptionText = null;

    feedbackText.textContent = '';
    explanationText.textContent = '';
    resultArea.classList.remove('correct', 'incorrect');
    resultArea.style.display = 'block'; // 結果表示エリアを表示に戻す
    nextButton.style.display = 'none';
    submitAnswerButton.style.display = 'inline-block';
    skipButton.style.display = 'inline-block';
    optionsContainer.style.pointerEvents = 'auto';
    clearOptionSelection();

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
}

// 選択肢の選択状態を解除する関数 (変更なし)
function clearOptionSelection() {
    const allOptions = document.querySelectorAll('.option-button');
    allOptions.forEach(btn => btn.classList.remove('selected', 'correct-option', 'incorrect-option'));
}

// 全ての選択肢ボタンをクリックできないようにする関数 (変更なし)
function disableOptions() {
    const optionButtons = document.querySelectorAll('.option-button');
    optionButtons.forEach(button => {
        button.style.pointerEvents = 'none';
    });
}


// -------------------------------------------------------------
// あなたの答え（選択肢）が正しいかチェックする「機能」（関数）
// -------------------------------------------------------------
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
        feedbackText.className = 'correct';
    } else {
        feedbackText.textContent = "不正解...";
        feedbackText.className = 'incorrect';
        addMistakenQuestion(currentQuestion);
    }
    explanationText.textContent = `正解は「${correctAnswer}」です。\n${currentQuestion.explanation}`;

    submitAnswerButton.style.display = 'none';
    skipButton.style.display = 'none';
    nextButton.style.display = 'inline-block';
}

// -------------------------------------------------------------
// 問題追加フォーム関連の機能 ★ここから追加・変更★
// -------------------------------------------------------------

// 最大IDを取得して新しい問題のIDを生成するヘルパー関数
function getNextQuestionId() {
    if (allQuestions.length === 0) {
        return 1;
    }
    const maxId = Math.max(...allQuestions.map(q => q.id));
    return maxId + 1;
}

// 問題追加フォームを表示する
showAddQuestionFormButton.addEventListener('click', () => {
    addQuestionFormSection.style.display = 'block'; // フォームを表示
    // 通常のクイズ画面を非表示にする（オプション）
    questionText.style.display = 'none';
    optionsContainer.style.display = 'none';
    submitAnswerButton.style.display = 'none';
    nextButton.style.display = 'none';
    skipButton.style.display = 'none';
    resultArea.style.display = 'none'; // 結果表示エリアも隠す
    showAddQuestionFormButton.style.display = 'none'; // 「問題を追加」ボタンも隠す

    // フォームの入力欄をクリア
    newQuestionText.value = '';
    newCorrectAnswer.value = '';
    newExplanation.value = '';
    newCategory.value = '計画'; // デフォルト値を設定
    newOptionInputs.forEach(input => input.value = '');
});

// 問題追加フォームを隠す（キャンセル）
hideAddQuestionFormButton.addEventListener('click', () => {
    addQuestionFormSection.style.display = 'none'; // フォームを隠す
    // 通常のクイズ画面を表示に戻す
    questionText.style.display = 'block';
    optionsContainer.style.display = 'grid'; // display:grid に戻す
    showAddQuestionFormButton.style.display = 'inline-block'; // 「問題を追加」ボタンを表示

    // フォーム入力値はクリアせず、displayQuestion を呼び出してメインのクイズ画面に戻る
    // currentQuestionIndex をリセットせず、現在の問題から再開
    displayQuestion();
});


// 問題を追加するボタンのクリックイベント
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
        id: getNextQuestionId(), // 新しいIDを生成
        question: question,
        correctAnswer: correctAnswer,
        explanation: explanation,
        category: category,
        options: options
    };

    allQuestions.push(newQuestion); // 全ての問題リストに追加
    saveAllQuestions(); // ローカルストレージに保存

    alert("問題が追加されました！");

    // フォームをクリア
    newQuestionText.value = '';
    newCorrectAnswer.value = '';
    newExplanation.value = '';
    newCategory.value = '計画';
    newOptionInputs.forEach(input => input.value = '');

    // 問題を追加したら、クイズ画面に戻る（または追加した問題から開始する）
    addQuestionFormSection.style.display = 'none';
    questionText.style.display = 'block';
    optionsContainer.style.display = 'grid';
    showAddQuestionFormButton.style.display = 'inline-block';
    // 問題リストが更新されたので、最初の問題から表示し直す
    currentQuestionIndex = 0; // 最初の問題に戻す
    displayQuestion();
});

// -------------------------------------------------------------
// ボタンが押された時に何をするかを決める部分（イベントリスナー） (変更なし)
// -------------------------------------------------------------
submitAnswerButton.addEventListener('click', checkAnswer);

nextButton.addEventListener('click', () => {
    currentQuestionIndex++;
    if (currentQuestionIndex < allQuestions.length) { // allQuestions.length に変更
        displayQuestion();
    } else {
        questionText.textContent = "全ての質問が終了しました！";
        optionsContainer.innerHTML = '';
        optionsContainer.style.display = 'none';
        submitAnswerButton.style.display = 'none';
        skipButton.style.display = 'none';
        nextButton.style.display = 'none';
        resultArea.style.display = 'none'; // 結果表示エリアを隠す

        alert(`今回の学習で間違えた問題は ${mistakenQuestions.length} 問です。`);
        // 全問題終了後、再度「問題を追加」ボタンを表示
        showAddQuestionFormButton.style.display = 'inline-block';
    }
});

// アプリが始まったら、まずローカルストレージから問題を読み込み、最初の問題を表示します。
allQuestions = loadAllQuestions(); // ★最初に全ての問題を読み込む★
mistakenQuestions = loadMistakenQuestions(); // 間違えた問題も読み込む
displayQuestion(); // 初期表示