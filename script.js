// script.js

// --- 定数定義 ---
const LOCAL_STORAGE_ALL_QUESTIONS_KEY = 'allQuestions';
const LOCAL_STORAGE_MISTAKEN_QUESTIONS_KEY = 'mistakenQuestions';
const GITHUB_QUESTIONS_JSON_PATH = 'questions.json'; // GitHub Pages上のJSONファイルのパス

// --- グローバル変数 ---
let allQuestions = []; // 全ての問題を保持するリスト
let mistakenQuestions = []; // 間違えた問題を保持するリスト
let currentQuestionIndex = 0;
let currentQuestion;
let selectedOptionText = null;

// --- UI要素の取得 ---
const questionText = document.getElementById('question-text');
const optionsContainer = document.getElementById('options-container');
const submitAnswerButton = document.getElementById('submit-answer-button');
const resultArea = document.getElementById('result-area');
const feedbackText = document.getElementById('feedback-text');
const explanationText = document.getElementById('explanation-text');
const nextButton = document.getElementById('next-button');
const skipButton = document.getElementById('skip-button');

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
        // ローカルストレージにデータがある場合
        try {
            allQuestions = JSON.parse(storedQuestions);
            console.log("問題をローカルストレージから読み込みました。");
        } catch (e) {
            console.error("ローカルストレージのデータが壊れています。GitHub Pagesから再読み込みします。", e);
            // ローカルストレージが壊れていたら、次のelseブロックでGitHubから読み込む
            await fetchQuestionsFromGitHub();
        }
    } else {
        // ローカルストレージにデータがない場合
        await fetchQuestionsFromGitHub();
    }

    // 問題がまだない場合は、エラーメッセージを表示
    if (allQuestions.length === 0) {
        questionText.textContent = "現在、問題がありません。GitHub Pagesのquestions.jsonファイルを確認するか、新しい問題を追加してください。";
        optionsContainer.innerHTML = '';
        submitAnswerButton.style.display = 'none';
        nextButton.style.display = 'none';
        skipButton.style.display = 'none';
        resultArea.style.display = 'none';
        showAddQuestionFormButton.style.display = 'inline-block'; // 問題追加ボタンは常に表示
        return false; // 問題がないことを示す
    }
    return true; // 問題があることを示す
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
        // GitHubから読み込んだら、ローカルストレージにも保存
        saveAllQuestionsToLocalStorage();
    } catch (error) {
        console.error("GitHub Pagesからの問題読み込みに失敗しました:", error);
        alert(`問題の読み込みに失敗しました。\n原因: ${error.message}\nJSONファイルが正しく設定されているか、GitHub PagesのURLが正しいか確認してください。`);
        allQuestions = []; // 読み込み失敗時は空にする
    }
}


// 問題と選択肢を画面に表示する
function displayQuestion() {
    if (allQuestions.length === 0) {
        // ロード時に問題がない場合はここで表示されるので、重複はしないが念のため
        questionText.textContent = "現在、問題がありません。新しい問題を追加してください。";
        optionsContainer.innerHTML = '';
        submitAnswerButton.style.display = 'none';
        nextButton.style.display = 'none';
        skipButton.style.display = 'none';
        resultArea.style.display = 'none';
        showAddQuestionFormButton.style.display = 'inline-block';
        return;
    }

    currentQuestion = allQuestions[currentQuestionIndex];
    questionText.textContent = currentQuestion.question;

    optionsContainer.innerHTML = '';
    selectedOptionText = null;

    feedbackText.textContent = '';
    explanationText.textContent = '';
    resultArea.classList.remove('correct', 'incorrect');
    resultArea.style.display = 'block';
    nextButton.style.display = 'none';
    submitAnswerButton.style.display = 'inline-block';
    skipButton.style.display = 'inline-block';
    optionsContainer.style.pointerEvents = 'auto';
    clearOptionSelection(); // 以前の選択状態を確実にクリア

    const shuffledOptions = shuffleArray([...currentQuestion.options]);

    shuffledOptions.forEach((option, index) => {
        const button = document.createElement('button');
        button.textContent = `${index + 1}. ${option}`;
        button.dataset.option = option;
        button.classList.add('option-button');

        button.addEventListener('click', () => {
            clearOptionSelection(); // 他のボタンの選択を解除
            button.classList.add('selected'); // クリックされたボタンを選択状態に
            selectedOptionText = option;
            submitAnswerButton.disabled = false;
        });
        optionsContainer.appendChild(button);
    });

    submitAnswerButton.disabled = true;
    showAddQuestionFormButton.style.display = 'none'; // クイズ中は問題追加ボタンを隠す
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

// --- イベントリスナー ---

// 「解答する」ボタン
submitAnswerButton.addEventListener('click', checkAnswer);

// 「次の問題へ」ボタン
nextButton.addEventListener('click', () => {
    currentQuestionIndex++;
    if (currentQuestionIndex < allQuestions.length) {
        displayQuestion();
    } else {
        questionText.textContent = "全ての質問が終了しました！";
        optionsContainer.innerHTML = '';
        optionsContainer.style.display = 'none';
        submitAnswerButton.style.display = 'none';
        skipButton.style.display = 'none';
        nextButton.style.display = 'none';
        resultArea.style.display = 'none';

        alert(`今回の学習で間違えた問題は ${mistakenQuestions.length} 問です。`);
        showAddQuestionFormButton.style.display = 'inline-block'; // 全ての問題が終わったら問題追加ボタンを表示
    }
});

// 「問題を追加」ボタン（表示）
showAddQuestionFormButton.addEventListener('click', () => {
    addQuestionFormSection.style.display = 'block';
    // クイズ画面の要素を全て非表示
    questionText.style.display = 'none';
    optionsContainer.style.display = 'none';
    submitAnswerButton.style.display = 'none';
    nextButton.style.display = 'none';
    skipButton.style.display = 'none';
    resultArea.style.display = 'none';
    showAddQuestionFormButton.style.display = 'none'; // このボタン自体も隠す

    // フォームの入力欄をクリア
    newQuestionText.value = '';
    newCorrectAnswer.value = '';
    newExplanation.value = '';
    newCategory.value = '計画';
    newOptionInputs.forEach(input => input.value = '');
});

// 「キャンセル」ボタン（問題追加フォームを隠す）
hideAddQuestionFormButton.addEventListener('click', () => {
    addQuestionFormSection.style.display = 'none';
    // クイズ画面の要素を表示に戻す
    questionText.style.display = 'block';
    optionsContainer.style.display = 'grid';
    showAddQuestionFormButton.style.display = 'inline-block';
    resultArea.style.display = 'block'; // 結果エリアも表示に戻す（次の問題へ押す前なら）

    // 現在の問題から再開
    displayQuestion();
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
    currentQuestionIndex = 0; // 最初の問題に戻す
    displayQuestion();
    showAddQuestionFormButton.style.display = 'inline-block';
});

// --- アプリ初期化 ---
async function initializeApp() {
    // 問題を読み込む
    const hasQuestions = await loadAndInitializeQuestions();
    if (hasQuestions) {
        // 問題があれば間違えた問題も読み込み、表示を開始
        mistakenQuestions = loadMistakenQuestions();
        displayQuestion();
    }
}

initializeApp(); // アプリを初期化する