// script.js

// --- 定数定義 ---
const LOCAL_STORAGE_ALL_QUESTIONS_KEY = 'allQuestions';
const LOCAL_STORAGE_MISTAKEN_QUESTIONS_KEY = 'mistakenQuestions';
const GITHUB_QUESTIONS_JSON_PATH = 'questions.json'; // GitHub Pages上のJSONファイルのパス
const ADMIN_PASSWORD = 'Testcrafter'; // 管理者パスワード

// --- DOM要素の取得 ---
const initialQuizCountModal = document.getElementById('initialQuizCountModal');
const initialQuizCountInput = document.getElementById('initialQuizCount');
const startQuizButtonModal = document.getElementById('startQuizButtonModal');
const quizSection = document.getElementById('quizSection');
const questionText = document.getElementById('questionText');
const optionsContainer = document.getElementById('optionsContainer');
const feedback = document.getElementById('feedback');
const nextQuestionButton = document.getElementById('nextQuestionButton');
const skipQuestionButton = document.getElementById('skipQuestionButton');
const explanationContainer = document.getElementById('explanationContainer');
const explanationText = document.getElementById('explanationText');
const roundIndicator = document.getElementById('roundIndicator');
const currentQuestionProgress = document.getElementById('currentQuestionProgress');
const restartButton = document.getElementById('restartButton');
const adminModeButton = document.getElementById('adminModeButton');
const adminPanel = document.getElementById('adminPanel');
const closeAdminPanelButton = document.getElementById('closeAdminPanelButton');
const questionListDiv = document.getElementById('questionList');
const showAddQuestionFormButton = document.getElementById('showAddQuestionFormButton');
const addQuestionFormSection = document.getElementById('addQuestionFormSection');
const closeAddQuestionFormButton = document.getElementById('closeAddQuestionFormButton');
const addQuestionForm = document.getElementById('addQuestionForm');
const newQuestionText = document.getElementById('newQuestionText');
const newOptionInputs = [
    document.getElementById('newOption1'),
    document.getElementById('newOption2'),
    document.getElementById('newOption3'),
    document.getElementById('newOption4')
];
const newCorrectAnswer = document.getElementById('newCorrectAnswer');
const newExplanation = document.getElementById('newExplanation');
const newCategory = document.getElementById('newCategory');
const requestAddQuestionButton = document.getElementById('requestAddQuestionButton');
const backToQuizFromAdminButton = document.getElementById('backToQuizFromAdminButton');
const backToQuizFromAddFormButton = document.getElementById('backToQuizFromAddFormButton');

// --- グローバル変数 ---
let allQuestions = []; // 全ての問題を格納
let currentQuizSet = []; // 現在のクイズで出題される問題セット
let currentQuestionIndex = 0; // 現在の問題インデックス
let mistakenQuestions = []; // 間違えた問題を格納
let quizRound = 1; // クイズの周回数
let isQuizActive = false; // クイズがアクティブかどうか
let initialQuizCount = 0; // 初回出題数

// --- ヘルパー関数 ---
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

function clearOptionSelection() {
    optionsContainer.querySelectorAll('button').forEach(button => {
        button.classList.remove('selected', 'correct', 'incorrect');
        button.disabled = false;
    });
}

function updateRoundIndicator() {
    roundIndicator.textContent = `${quizRound}周目 (${currentQuestionIndex + 1}/${currentQuizSet.length})`;
}

// --- ローカルストレージ関連の関数 ---
function loadMistakenQuestions() {
    const data = localStorage.getItem(LOCAL_STORAGE_MISTAKEN_QUESTIONS_KEY);
    return data ? JSON.parse(data) : [];
}

function saveMistakenQuestions() {
    localStorage.setItem(LOCAL_STORAGE_MISTAKEN_QUESTIONS_KEY, JSON.stringify(mistakenQuestions));
}

function loadAllQuestionsFromLocalStorage() {
    const data = localStorage.getItem(LOCAL_STORAGE_ALL_QUESTIONS_KEY);
    return data ? JSON.parse(data) : null;
}

function saveAllQuestionsToLocalStorage() {
    localStorage.setItem(LOCAL_STORAGE_ALL_QUESTIONS_KEY, JSON.stringify(allQuestions));
}

// --- メインロジック ---
async function loadAllQuestions() {
    const storedQuestions = loadAllQuestionsFromLocalStorage();
    if (storedQuestions) {
        allQuestions = storedQuestions;
        console.log("Local Storageから問題をロードしました。", allQuestions);
    } else {
        try {
            const response = await fetch(GITHUB_QUESTIONS_JSON_PATH);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            allQuestions = data;
            saveAllQuestionsToLocalStorage(); // 初回ロード時にLocalStorageに保存
            console.log("GitHub Pagesから問題をロードしました。", allQuestions);
        } catch (error) {
            console.error("問題のロード中にエラーが発生しました:", error);
            // エラー時はダミーデータで続行することも検討
            allQuestions = [
                {
                    "question": "JavaScriptで変数を宣言するキーワードとして適切でないものはどれ？",
                    "options": ["var", "let", "const", "set"],
                    "answer": "set",
                    "explanation": "JavaScriptでは`var`, `let`, `const`が変数を宣言するために使われます。`set`は変数の宣言には使いません。"
                },
                {
                    "question": "HTMLの要素を非表示にするCSSプロパティはどれ？",
                    "options": ["visibility: hidden;", "display: none;", "opacity: 0;", "hidden: true;"],
                    "answer": "display: none;",
                    "explanation": "`display: none;`は要素を完全に削除し、スペースを占有しません。`visibility: hidden;`は要素を非表示にしますが、スペースは占有します。"
                }
            ];
            alert("初期問題のロードに失敗しました。アプリケーションを再読み込みするか、管理者モードで問題を追加してください。");
        }
    }
    // 問題がロードされたら、モーダルを表示
    initialQuizCountModal.style.display = 'flex';
}

function startQuiz() {
    initialQuizCount = parseInt(initialQuizCountInput.value, 10);
    if (isNaN(initialQuizCount) || initialQuizCount <= 0) {
        alert("有効な問題数を入力してください。");
        return;
    }
    if (allQuestions.length === 0) {
        alert("問題がありません。管理者モードで問題を追加してください。");
        return;
    }

    initialQuizCountModal.style.display = 'none';
    quizSection.style.display = 'block';
    showAddQuestionFormButton.style.display = 'block';
    roundIndicator.style.display = 'block';
    adminPanel.style.display = 'none'; // 管理者パネルを非表示に
    addQuestionFormSection.style.display = 'none'; // 問題追加フォームを非表示に

    isQuizActive = true;
    quizRound = 1;
    mistakenQuestions = [];
    saveMistakenQuestions(); // 初期化
    currentQuestionIndex = 0;

    // 初回は全問題から指定された数だけ出題
    currentQuizSet = shuffleArray([...allQuestions]).slice(0, initialQuizCount);
    displayQuestion();
}

function displayQuestion() {
    clearOptionSelection();
    feedback.textContent = '';
    explanationContainer.style.display = 'none';
    nextQuestionButton.style.display = 'none';
    skipQuestionButton.style.display = 'inline-block'; // スキップボタンを表示

    if (currentQuestionIndex < currentQuizSet.length) {
        const question = currentQuizSet[currentQuestionIndex];
        questionText.textContent = question.question;
        optionsContainer.innerHTML = '';
        shuffleArray([...question.options]).forEach(option => {
            const button = document.createElement('button');
            button.textContent = option;
            button.addEventListener('click', () => selectOption(button, option, question));
            optionsContainer.appendChild(button);
        });
        updateRoundIndicator();
    } else {
        // 全問終了
        endQuizRound();
    }
}

function selectOption(selectedButton, selectedAnswer, question) {
    optionsContainer.querySelectorAll('button').forEach(button => {
        button.disabled = true; // 他のボタンを無効化
    });

    if (selectedAnswer === question.answer) {
        selectedButton.classList.add('correct');
        feedback.textContent = '正解！';
    } else {
        selectedButton.classList.add('incorrect');
        feedback.textContent = '不正解！';
        if (!mistakenQuestions.some(q => q.question === question.question)) {
            mistakenQuestions.push(question);
            saveMistakenQuestions();
        }
        // 正解のオプションをハイライト
        optionsContainer.querySelectorAll('button').forEach(button => {
            if (button.textContent === question.answer) {
                button.classList.add('correct');
            }
        });
    }

    explanationText.textContent = question.explanation;
    explanationContainer.style.display = 'block';
    nextQuestionButton.style.display = 'inline-block';
    skipQuestionButton.style.display = 'none'; // 解答したらスキップボタンを非表示
}

function checkAnswer() {
    // この関数はselectOptionに統合されたため、直接は呼ばれない
}

function nextQuestion() {
    currentQuestionIndex++;
    displayQuestion();
}

function skipQuestion() {
    const question = currentQuizSet[currentQuestionIndex];
    if (!mistakenQuestions.some(q => q.question === question.question)) {
        mistakenQuestions.push(question);
        saveMistakenQuestions();
    }
    // スキップした場合は不正解として扱い、正解を表示
    optionsContainer.querySelectorAll('button').forEach(button => {
        button.disabled = true; // 他のボタンを無効化
        if (button.textContent === question.answer) {
            button.classList.add('correct');
        }
    });
    feedback.textContent = 'スキップしました (不正解として記録)';
    explanationText.textContent = question.explanation;
    explanationContainer.style.display = 'block';
    nextQuestionButton.style.display = 'inline-block';
    skipQuestionButton.style.display = 'none'; // 解答したらスキップボタンを非表示
}

function endQuizRound() {
    if (mistakenQuestions.length > 0) {
        alert(`${quizRound}周目終了！間違えた問題が${mistakenQuestions.length}問あります。もう一度挑戦しましょう！`);
        quizRound++;
        currentQuizSet = shuffleArray([...mistakenQuestions]); // 間違えた問題のみで次の周回
        mistakenQuestions = []; // 間違えた問題をリセット
        saveMistakenQuestions(); // ローカルストレージもリセット
        currentQuestionIndex = 0;
        displayQuestion();
    } else {
        alert("全問正解です！おめでとうございます！");
        isQuizActive = false;
        quizSection.style.display = 'none';
        initialQuizCountModal.style.display = 'flex'; // 最初に戻る
        showAddQuestionFormButton.style.display = 'none'; // 「問題を追加」ボタンを非表示
        roundIndicator.style.display = 'none';
    }
}

function restartQuiz() {
    isQuizActive = false;
    quizSection.style.display = 'none';
    initialQuizCountModal.style.display = 'flex'; // 最初に戻る
    showAddQuestionFormButton.style.display = 'none'; // 「問題を追加」ボタンを非表示
    roundIndicator.style.display = 'none';
    mistakenQuestions = [];
    saveMistakenQuestions(); // リスタート時に間違えた問題もクリア
}

// --- 管理者モード ---
function enterAdminMode() {
    const password = prompt("管理者モードに入るにはパスワードを入力してください:");
    if (password === ADMIN_PASSWORD) {
        adminPanel.style.display = 'block';
        quizSection.style.display = 'none';
        initialQuizCountModal.style.display = 'none';
        showAddQuestionFormButton.style.display = 'none';
        addQuestionFormSection.style.display = 'none';
        roundIndicator.style.display = 'none';
        displayQuestionList();
    } else if (password !== null) { // キャンセルボタンでnullが返るのを避ける
        alert("パスワードが違います。");
    }
}

function displayQuestionList() {
    questionListDiv.innerHTML = '';
    if (allQuestions.length === 0) {
        questionListDiv.innerHTML = '<p>問題がまだありません。</p>';
        return;
    }
    allQuestions.forEach((q, index) => {
        const questionItem = document.createElement('div');
        questionItem.classList.add('question-item');
        questionItem.innerHTML = `
            <p><strong>Q${index + 1}:</strong> ${q.question}</p>
            <ul>
                ${q.options.map(opt => `<li>${opt}</li>`).join('')}
            </ul>
            <p><strong>正解:</strong> ${q.answer}</p>
            <p><strong>解説:</strong> ${q.explanation}</p>
            <p><strong>カテゴリ:</strong> ${q.category || '未設定'}</p>
            <button class="delete-button" data-index="${index}">削除</button>
        `;
        questionListDiv.appendChild(questionItem);
    });

    document.querySelectorAll('.delete-button').forEach(button => {
        button.addEventListener('click', (event) => {
            const indexToDelete = parseInt(event.target.dataset.index, 10);
            deleteQuestion(indexToDelete);
        });
    });
}

function deleteQuestion(index) {
    if (confirm(`本当にQ${index + 1}: 「${allQuestions[index].question}」を削除しますか？`)) {
        allQuestions.splice(index, 1);
        saveAllQuestionsToLocalStorage();
        alert("問題が削除されました。");
        displayQuestionList(); // リストを更新
    }
}

// --- イベントリスナー ---
document.addEventListener('DOMContentLoaded', loadAllQuestions); // DOMContentLoadedで問題をロード

startQuizButtonModal.addEventListener('click', startQuiz);
nextQuestionButton.addEventListener('click', nextQuestion);
skipQuestionButton.addEventListener('click', skipQuestion);
restartButton.addEventListener('click', restartQuiz);
adminModeButton.addEventListener('click', enterAdminMode);
closeAdminPanelButton.addEventListener('click', () => {
    adminPanel.style.display = 'none';
    if (isQuizActive) {
        quizSection.style.display = 'block';
        showAddQuestionFormButton.style.display = 'block';
        roundIndicator.style.display = 'block';
    } else {
        initialQuizCountModal.style.display = 'flex';
        showAddQuestionFormButton.style.display = 'none';
        roundIndicator.style.display = 'none';
    }
});

// 「問題を追加」ボタン（表示）
showAddQuestionFormButton.addEventListener('click', () => {
    const password = prompt("問題追加フォームを開くにはパスワードを入力してください:");
    if (password === ADMIN_PASSWORD) {
        addQuestionFormSection.style.display = 'flex';
        quizSection.style.display = 'none';
        showAddQuestionFormButton.style.display = 'none';
        roundIndicator.style.display = 'none'; // フォーム表示中は周回表示を非表示

        // フォームの入力欄をクリア
        newQuestionText.value = '';
        newCorrectAnswer.value = '';
        newExplanation.value = '';
        newCategory.value = '計画'; // デフォルトカテゴリ
        newOptionInputs.forEach(input => input.value = '');

        window.scrollTo(0, 0); // フォームにスクロール
    } else if (password !== null) {
        alert("パスワードが違います。");
    }
});


closeAddQuestionFormButton.addEventListener('click', () => {
    addQuestionFormSection.style.display = 'none';
    if (isQuizActive) {
        quizSection.style.display = 'block';
        showAddQuestionFormButton.style.display = 'block';
        roundIndicator.style.display = 'block';
    } else {
        initialQuizCountModal.style.display = 'flex';
        showAddQuestionFormButton.style.display = 'none';
        roundIndicator.style.display = 'none';
    }
});

addQuestionForm.addEventListener('submit', (event) => {
    event.preventDefault();

    const question = newQuestionText.value.trim();
    const options = newOptionInputs.map(input => input.value.trim()).filter(Boolean); // 空の選択肢を除外
    const correctAnswer = newCorrectAnswer.value.trim();
    const explanation = newExplanation.value.trim();
    const category = newCategory.value;

    if (!question || options.length < 2 || !correctAnswer || !explanation) {
        alert('問題文、少なくとも2つの選択肢、正解、解説は必須です。');
        return;
    }

    if (!options.includes(correctAnswer)) {
        alert('正解は選択肢の中から選んでください。');
        return;
    }

    const newQuestion = {
        question: question,
        options: options,
        answer: correctAnswer,
        explanation: explanation,
        category: category
    };

    allQuestions.push(newQuestion);
    saveAllQuestionsToLocalStorage();
    alert('新しい問題が追加されました！');

    // フォームをクリア
    newQuestionText.value = '';
    newCorrectAnswer.value = '';
    newExplanation.value = '';
    newCategory.value = '計画';
    newOptionInputs.forEach(input => input.value = '');
});

requestAddQuestionButton.addEventListener('click', () => {
    const question = newQuestionText.value.trim();
    const options = newOptionInputs.map(input => input.value.trim()).filter(Boolean);
    const correctAnswer = newCorrectAnswer.value.trim();
    const explanation = newExplanation.value.trim();
    const category = newCategory.value;

    if (!question || options.length < 2 || !correctAnswer || !explanation) {
        alert('問題文、少なくとも2つの選択肢、正解、解説は必須です。');
        return;
    }

    let requestMessage = `ユーザーから問題追加依頼が届きました！\n\n`;
    requestMessage += `問題: ${question}\n`;
    requestMessage += `選択肢: ${options.join(', ')}\n`;
    requestMessage += `正解: ${correctAnswer}\n`;
    requestMessage += `解説: ${explanation}\n`;
    requestMessage += `カテゴリ: ${category}\n\n`;
    requestMessage += `この情報は管理者に送信されます。(現状は模擬です)`;

    alert(requestMessage);

    // フォームをクリア
    newQuestionText.value = '';
    newCorrectAnswer.value = '';
    newExplanation.value = '';
    newCategory.value = '計画';
    newOptionInputs.forEach(input => input.value = '');
});

backToQuizFromAdminButton.addEventListener('click', () => {
    adminPanel.style.display = 'none';
    if (isQuizActive) {
        quizSection.style.display = 'block';
        showAddQuestionFormButton.style.display = 'block';
        roundIndicator.style.display = 'block';
    } else {
        initialQuizCountModal.style.display = 'flex';
        showAddQuestionFormButton.style.display = 'none';
        roundIndicator.style.display = 'none';
    }
});

backToQuizFromAddFormButton.addEventListener('click', () => {
    addQuestionFormSection.style.display = 'none';
    if (isQuizActive) {
        quizSection.style.display = 'block';
        showAddQuestionFormButton.style.display = 'block';
        roundIndicator.style.display = 'block';
    } else {
        initialQuizCountModal.style.display = 'flex';
        showAddQuestionFormButton.style.display = 'none';
        roundIndicator.style.display = 'none';
    }
});