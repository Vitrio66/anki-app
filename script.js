// script.js

// 問題データを定義していた部分を完全に削除し、外部ファイルから読み込むように変更します
// const questions = [...] は削除してください！

// --- ローカルストレージ関連の関数 (変更なし) ---
const LOCAL_STORAGE_ALL_QUESTIONS_KEY = 'allQuestions'; // これも今回は使わない可能性が高いですが、後で調整
const LOCAL_STORAGE_MISTAKEN_QUESTIONS_KEY = 'mistakenQuestions';

let allQuestions = []; // 全ての問題を保持するリスト
let mistakenQuestions = []; // 間違えた問題を保持するリスト

// ★変更：問題の読み込み元をGitHub PagesのJSONファイルに変更します★
async function loadAllQuestions() {
    try {
        // GitHub Pagesで公開されたJSONファイルのパスを指定
        // あなたのアプリのルートディレクトリにあることを想定
        const response = await fetch('questions.json'); // 同じフォルダにあるので 'questions.json' でOK
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        console.log("問題をGitHub Pagesから読み込みました:", data); // デバッグ用
        return data;
    } catch (error) {
        console.error("問題の読み込みに失敗しました:", error);
        alert("問題の読み込みに失敗しました。ファイルが正しく設定されているか確認してください。");
        // エラー時は空の配列を返すか、デフォルトの問題を返す
        return [];
    }
}

// 全ての問題をローカルストレージに保存する関数 (今回は使用しない可能性が高いですが、残しておきます)
function saveAllQuestions() {
    // ローカルストレージに保存するロジックは、今回は不要になりますが、
    // ユーザーが追加した問題を保存したい場合は、ここに実装します。
    // 今は外部ファイルから読み込むことを優先します。
    // localStorage.setItem(LOCAL_STORAGE_ALL_QUESTIONS_KEY, JSON.stringify(allQuestions));
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

function isQuestionMistaken(questionId) {
    return mistakenQuestions.some(q => q.id === questionId);
}

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

// UI要素の取得 (変更なし)
const questionText = document.getElementById('question-text');
const optionsContainer = document.getElementById('options-container');
const submitAnswerButton = document.getElementById('submit-answer-button');
const resultArea = document.getElementById('result-area');
const feedbackText = document.getElementById('feedback-text');
const explanationText = document.getElementById('explanation-text');
const nextButton = document.getElementById('next-button');
const skipButton = document.getElementById('skip-button');

// 問題追加フォーム関連のUI要素 (★変更：問題追加フォームの表示・非表示ボタンのクリックイベントを調整★)
const showAddQuestionFormButton = document.getElementById('show-add-question-form-button');
const addQuestionFormSection = document.getElementById('add-question-form-section');
const newQuestionText = document.getElementById('new-question-text');
const newCorrectAnswer = document.getElementById('new-correct-answer');
const newExplanation = document.getElementById('new-explanation');
const newCategory = document.getElementById('new-category');
const newOptionInputs = document.querySelectorAll('.new-option-input');
const addQuestionButton = document.getElementById('add-question-button');
const hideAddQuestionFormButton = document.getElementById('hide-add-question-form-button');


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
    if (allQuestions.length === 0) {
        questionText.textContent = "現在、問題がありません。GitHub Pagesのquestions.jsonファイルを確認してください。";
        optionsContainer.innerHTML = '';
        submitAnswerButton.style.display = 'none';
        nextButton.style.display = 'none';
        skipButton.style.display = 'none';
        resultArea.style.display = 'none';
        // 問題追加フォーム表示ボタンは常に表示しておく
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
    // クイズ画面表示中は「問題を追加」ボタンを隠す
    showAddQuestionFormButton.style.display = 'none';
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
    // 結果表示後は「問題を追加」ボタンを隠したままにする
}

// -------------------------------------------------------------
// 問題追加フォーム関連の機能 ★変更・調整あり★
// -------------------------------------------------------------

// 最大IDを取得して新しい問題のIDを生成するヘルパー関数
function getNextQuestionId() {
    if (allQuestions.length === 0) {
        return 1;
    }
    // allQuestionsは現在読み込み専用なので、IDはローカルストレージ用としてのみ意味を持つ
    const maxId = Math.max(...allQuestions.map(q => q.id));
    return maxId + 1;
}

// 問題追加フォームを表示する
showAddQuestionFormButton.addEventListener('click', () => {
    addQuestionFormSection.style.display = 'block'; // フォームを表示
    // クイズ画面の要素を全て非表示にする
    questionText.style.display = 'none';
    optionsContainer.style.display = 'none';
    submitAnswerButton.style.display = 'none';
    nextButton.style.display = 'none';
    skipButton.style.display = 'none';
    resultArea.style.display = 'none';
    showAddQuestionFormButton.style.display = 'none'; // 「問題を追加」ボタンも隠す

    // フォームの入力欄をクリア
    newQuestionText.value = '';
    newCorrectAnswer.value = '';
    newExplanation.value = '';
    newCategory.value = '計画';
    newOptionInputs.forEach(input => input.value = '');
});

// 問題追加フォームを隠す（キャンセル）
hideAddQuestionFormButton.addEventListener('click', () => {
    addQuestionFormSection.style.display = 'none'; // フォームを隠す
    // クイズ画面の要素を表示に戻す
    questionText.style.display = 'block';
    optionsContainer.style.display = 'grid'; // display:grid に戻す
    showAddQuestionFormButton.style.display = 'inline-block'; // 「問題を追加」ボタンを表示
    resultArea.style.display = 'block'; // 結果エリアも表示に戻す（次の問題へ押す前なら）

    // displayQuestion を呼び出してメインのクイズ画面に戻る
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

    // ★追加された問題は、一旦allQuestionsに追加して、ローカルストレージに保存します。★
    // ★これにより、ブラウザを閉じても、追加した問題はそのブラウザでは残ります。★
    // ★ただし、GitHub Pages上のquestions.jsonは更新されません！
    allQuestions.push(newQuestion);
    localStorage.setItem(LOCAL_STORAGE_ALL_QUESTIONS_KEY, JSON.stringify(allQuestions)); // ローカルストレージに保存


    alert("問題が追加されました！この問題は、あなたのブラウザにのみ保存されます。");

    // フォームをクリア
    newQuestionText.value = '';
    newCorrectAnswer.value = '';
    newExplanation.value = '';
    newCategory.value = '計画';
    newOptionInputs.forEach(input => input.value = '');

    // 問題を追加したら、クイズ画面に戻る
    addQuestionFormSection.style.display = 'none';
    // 全体の問題リストが変更されたので、現在のインデックスをリセットし、最初から表示し直す
    currentQuestionIndex = 0;
    displayQuestion(); // displayQuestion内でクイズ要素の表示・非表示を制御
    showAddQuestionFormButton.style.display = 'inline-block'; // 「問題を追加」ボタンを表示に戻す
});

// -------------------------------------------------------------
// ボタンが押された時に何をするかを決める部分（イベントリスナー）
// -------------------------------------------------------------
submitAnswerButton.addEventListener('click', checkAnswer);

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
        showAddQuestionFormButton.style.display = 'inline-block'; // 「問題を追加」ボタンを表示
    }
});

// アプリが始まったら、まずローカルストレージから問題を読み込み、
// それが空であればGitHub Pagesから読み込みます。
// ★アプリの起動処理★
async function initializeApp() {
    let storedQuestions = localStorage.getItem(LOCAL_STORAGE_ALL_QUESTIONS_KEY);
    if (storedQuestions) {
        // ローカルストレージに問題があればそれを使用
        allQuestions = JSON.parse(storedQuestions);
        console.log("問題をローカルストレージから読み込みました。");
    } else {
        // ローカルストレージに問題がなければGitHub Pagesから読み込む
        allQuestions = await loadAllQuestions();
        // 読み込んだ問題をローカルストレージにも保存しておく（次回以降の読み込みを早くするため）
        if (allQuestions.length > 0) {
            localStorage.setItem(LOCAL_STORAGE_ALL_QUESTIONS_KEY, JSON.stringify(allQuestions));
            console.log("問題をGitHub Pagesから読み込み、ローカルストレージに保存しました。");
        }
    }

    mistakenQuestions = loadMistakenQuestions(); // 間違えた問題も読み込む
    displayQuestion(); // 初期表示
}

initializeApp(); // アプリを初期化する関数を呼び出す