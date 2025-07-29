// script.js

// --- 定数定義 ---
const LOCAL_STORAGE_ALL_QUESTIONS_KEY = 'allQuestions';
const LOCAL_STORAGE_MISTAKEN_QUESTIONS_KEY = 'mistakenQuestions';
const GITHUB_QUESTIONS_JSON_PATH = 'questions.json'; // GitHub Pages上のJSONファイルのパス
const ADMIN_PASSWORD = "Testcrafter"; // 管理者パスワード
const USER_PASSWORD = "Icandoit"; // ユーザーパスワード (今回はプロンプト認証ではなく、機能の区別のためのみ存在)

// --- グローバル変数 ---
let allQuestions = []; // 全ての問題を保持するリスト
let currentQuizSet = []; // 現在出題中の問題セット (初回 or 不正解問題)
let mistakenQuestions = []; // 間違えた問題を保持するリスト (再出題用)
let answeredQuestionsInCurrentRound = []; // 現在の周回で回答済みの問題IDを保持 (スキップも含む)
let currentQuestionIndex = 0;
let currentQuestion;
let selectedOptionText = null;
let round = 0; // 現在の周回数 (0: 未開始, 1: 1周目, 2: 2周目など)
let initialQuizSize = 0; // ユーザーが設定する初回出題数
let isAdminMode = false; // 管理者モードの状態を追跡するフラグ

// --- UI要素の取得 ---
const quizSizeModal = document.getElementById('quiz-size-modal');
const initialQuizSizeInput = document.getElementById('initial-quiz-size-input');
const startQuizButton = document.getElementById('start-quiz-button');

const adminPasswordModal = document.getElementById('admin-password-modal'); // このモーダルは今回使用しませんが、IDは残しておきます
const adminPasswordInput = document.getElementById('admin-password-input');
const adminPasswordSubmit = document.getElementById('admin-password-submit');
const adminPasswordCancel = document.getElementById('admin-password-cancel');

const roundIndicator = document.getElementById('round-indicator');
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
const addQuestionFormSection = document.getElementById('add-question-form-section');
const addQuestionFormTitle = document.getElementById('add-question-form-title');
const newQuestionText = document.getElementById('new-question-text');
const newCorrectAnswer = document.getElementById('new-correct-answer');
const newExplanation = document.getElementById('new-explanation');
const newCategory = document.getElementById('new-category');
const newOptionInputs = document.querySelectorAll('.new-option-input');
const addQuestionButton = document.getElementById('add-question-button');
const hideAddQuestionFormButton = document.getElementById('hide-add-question-form-button');

// 新しく追加される管理者モード・ユーザーモードのボタン
const showAddQuestionFormButtonUser = document.getElementById('show-add-question-form-button-user');
const enterAdminModeButton = document.getElementById('enter-admin-mode-button'); 
const showAddQuestionFormButtonAdmin = document.getElementById('show-add-question-form-button-admin');
const exitAdminModeButton = document.getElementById('exit-admin-mode-button');

// 問題管理セクションの要素
const adminSection = document.getElementById('admin-section');
const questionList = document.getElementById('question-list');

// アプリのフッターボタン群
const appFooterButtons = document.querySelector('.app-footer-buttons');

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

// 全てのUIセクションを非表示にする
function hideAllSections() {
    quizSizeModal.style.display = 'none';
    adminPasswordModal.style.display = 'none'; // プロンプト認証に切り替えるため、基本的には使わない
    roundIndicator.style.display = 'none';
    quizSection.style.display = 'none';
    adminSection.style.display = 'none';
    addQuestionFormSection.style.display = 'none';
    appFooterButtons.style.display = 'none';
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
async function loadAllQuestions() {
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
        saveAllQuestionsToLocalStorage();
    } catch (error) {
        console.error("GitHub Pagesからの問題読み込みに失敗しました:", error);
        alert(`問題の読み込みに失敗しました。\n原因: ${error.message}\nJSONファイルが正しく設定されているか、GitHub PagesのURLが正しいか確認してください。`);
        allQuestions = []; // 問題が読み込めなかった場合は空にする
    }
}

/**
 * クイズを初期化し、出題する問題セットを準備する
 */
function startQuiz(quizSize) {
    hideAllSections(); // 全てのセクションを隠す
    
    initialQuizSize = quizSize; // ユーザーが設定した初回出題数を保存
    round = 1; // 1周目から開始
    mistakenQuestions = []; // 新しいクイズ開始時は間違えた問題リストをリセット
    saveMistakenQuestions(); // ローカルストレージもクリア

    resetQuizSet(); // 問題セットをリセットして初回出題準備

    // 問題がまだない場合はここで終了
    if (currentQuizSet.length === 0) {
        endQuiz(allQuestions.length === 0 ? "現在、出題できる問題がありません。" : "全ての学習が終了しました！よく頑張りました！");
        return;
    }

    quizSection.style.display = 'flex'; // クイズセクションを表示
    
    displayQuestion();
}

/**
 * 現在の周回と出題する問題セットを管理する
 */
function resetQuizSet() {
    answeredQuestionsInCurrentRound = []; // 現在の周回で回答済みの問題IDをリセット

    if (round === 1) {
        // 1周目: 全体の問題からランダムにinitialQuizSizeだけ出題
        const availableQuestions = allQuestions.filter(q => !mistakenQuestions.some(mq => mq.id === q.id));
        const shuffledQuestions = shuffleArray([...availableQuestions]);
        currentQuizSet = shuffledQuestions.slice(0, initialQuizSize);

        // 出題数が全問題数より多い場合は、利用可能な全問題を出題
        if (initialQuizSize > availableQuestions.length) {
            currentQuizSet = shuffledQuestions;
        }
        console.log("1周目開始。出題問題数:", currentQuizSet.length);
    } else {
        // 2周目以降: 間違えた問題のみをランダムに再出題
        if (mistakenQuestions.length === 0) {
            endQuiz("全ての学習が終了しました！よく頑張りました！"); // 間違えた問題がなければクイズ終了
            return;
        }
        currentQuizSet = shuffleArray([...mistakenQuestions]);
        // 次の周回のために間違えた問題リストをリセット (現在の周回が終わるまで保持し、次の周回の前にクリア)
        mistakenQuestions = []; 
        saveMistakenQuestions(); // ローカルストレージも更新
        console.log(`${round}周目開始。間違えた問題数:`, currentQuizSet.length);
    }
    currentQuestionIndex = 0; // 問題インデックスをリセット
    updateRoundIndicator(); // 周回表示を更新
}

/**
 * 周回表示を更新する
 */
function updateRoundIndicator() {
    if (round > 0) { // roundが0でない（クイズ開始後）
        if (currentQuizSet.length > 0) { // 問題が残っている場合のみ表示
            roundIndicator.textContent = `${round}周目 (${currentQuestionIndex + 1}/${currentQuizSet.length})`;
            roundIndicator.style.display = 'block';
        } else {
            roundIndicator.style.display = 'none'; // 問題がなければ非表示
        }
    } else {
        roundIndicator.style.display = 'none'; // クイズ開始前は非表示
    }
}

/**
 * クイズを終了する
 */
function endQuiz(message) {
    hideAllSections(); // 全てのセクションを隠す
    
    // クイズ終了時のメッセージを表示するシンプルなUIを出す
    quizSection.style.display = 'flex'; // クイズセクション自体は表示
    questionText.textContent = message;
    optionsContainer.innerHTML = '';
    optionsContainer.style.display = 'none'; // 選択肢コンテナは非表示
    resultArea.style.display = 'none'; // 結果エリアも非表示
    quizButtonsContainer.style.display = 'none'; // クイズボタンも非表示
    roundIndicator.style.display = 'none'; // 周回表示も非表示
    
    alert(message);
    window.scrollTo(0, 0);
    initializeApp(); // アプリを初期状態に戻す
}


// 問題と選択肢を画面に表示する
function displayQuestion() {
    if (currentQuizSet.length === 0 || currentQuestionIndex >= currentQuizSet.length) {
        // 問題セットが空か、インデックスが範囲外の場合はクイズ終了
        endQuiz(allQuestions.length === 0 ? "現在、出題できる問題がありません。" : "全ての学習が終了しました！よく頑張りました！");
        return;
    }

    currentQuestion = currentQuizSet[currentQuestionIndex];
    questionText.textContent = currentQuestion.question;

    optionsContainer.innerHTML = ''; // 選択肢をクリア
    optionsContainer.style.display = 'grid'; // 選択肢コンテナを表示
    selectedOptionText = null;

    feedbackText.textContent = '';
    explanationText.textContent = '';
    resultArea.classList.remove('correct', 'incorrect');
    resultArea.style.display = 'none';
    nextButton.style.display = 'none';
    submitAnswerButton.style.display = 'inline-block';
    skipButton.style.display = 'inline-block';
    optionsContainer.style.pointerEvents = 'auto'; // 選択肢を有効に
    clearOptionSelection(); // 選択状態をクリア

    // 「解答する」ボタンを初期状態で無効にする
    submitAnswerButton.disabled = true; 
    console.log("displayQuestion: 解答ボタンを無効にしました。", submitAnswerButton.disabled);

    const shuffledOptions = shuffleArray([...currentQuestion.options]);

    shuffledOptions.forEach((option, index) => {
        const button = document.createElement('button');
        button.textContent = `${index + 1}. ${option}`;
        button.dataset.option = option;
        // 元の選択肢の番号を保存（displayQuestionの時点で正解番号を振るために必要）
        button.dataset.originalIndex = currentQuestion.options.indexOf(option) + 1; 
        button.classList.add('option-button');

        button.addEventListener('click', () => {
            clearOptionSelection();
            button.classList.add('selected');
            selectedOptionText = option;
            // 選択肢が選ばれたら「解答する」ボタンを有効にする
            submitAnswerButton.disabled = false; 
            console.log("選択肢がクリックされました。解答ボタンを有効にしました。", submitAnswerButton.disabled);
        });
        optionsContainer.appendChild(button);
    });

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
    // 正解の選択肢の元の番号を取得
    const correctOptionNumber = currentQuestion.options.indexOf(correctAnswer) + 1; 

    disableOptions(); // 選択肢を無効化

    const optionButtons = document.querySelectorAll('.option-button');
    optionButtons.forEach(button => {
        if (button.dataset.option === correctAnswer) {
            button.classList.add('correct-option');
        }
        if (button.dataset.option === userAnswer && userAnswer.toLowerCase() !== correctAnswer.toLowerCase()) {
             button.classList.add('incorrect-option');
        }
    });

    feedbackText.textContent = `${userAnswer.toLowerCase() === correctAnswer.toLowerCase() ? '正解' : '不正解'}！ (選択肢${correctOptionNumber})`; 
    feedbackText.className = userAnswer.toLowerCase() === correctAnswer.toLowerCase() ? 'correct' : 'incorrect'; // 色を適用
    explanationText.textContent = `正解は「${correctAnswer}」です。\n${currentQuestion.explanation}`;
    resultArea.style.display = 'block';

    submitAnswerButton.style.display = 'none';
    skipButton.style.display = 'none';
    nextButton.style.display = 'inline-block';

    answeredQuestionsInCurrentRound.push(currentQuestion.id); // 現在の周回で回答済みとして記録
}

// 「解答する」ボタンのイベントリスナー
submitAnswerButton.addEventListener('click', checkAnswer); 


// 「回答をスキップする」機能
skipButton.addEventListener('click', () => {
    // 不正解としてカウントし、間違えた問題リストに追加
    addMistakenQuestion(currentQuestion);

    // 解答済みの状態にする（選択肢を無効化し、正解を表示）
    disableOptions();
    const correctAnswer = currentQuestion.correctAnswer;
    const correctOptionNumber = currentQuestion.options.indexOf(correctAnswer) + 1; // 正解の選択肢の元の番号を取得
    const optionButtons = document.querySelectorAll('.option-button');
    optionButtons.forEach(button => {
        if (button.dataset.option === correctAnswer) {
            button.classList.add('correct-option'); // 正解を表示
        }
    });

    feedbackText.textContent = `スキップしました。 (正解は選択肢${correctOptionNumber})`; 
    feedbackText.className = 'incorrect'; // スキップは不正解扱い
    explanationText.textContent = `正解は「${correctAnswer}」です。\n${currentQuestion.explanation}`;
    resultArea.style.display = 'block';

    submitAnswerButton.style.display = 'none';
    skipButton.style.display = 'none';
    nextButton.style.display = 'inline-block';

    answeredQuestionsInCurrentRound.push(currentQuestion.id); // 現在の周回で回答済みとして記録
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
        // 全問回答済みで、かつ不正解問題がまだある場合のみ次の周回へ
        if (mistakenQuestions.length > 0) {
            round++; // 次の周回へ
            resetQuizSet(); // 新しい問題セットを準備（間違えた問題があればそれを出題）
            if (currentQuizSet.length > 0) {
                displayQuestion();
                window.scrollTo(0, 0);
            } else {
                // ここには到達しないはずだが念のため
                endQuiz("全ての学習が終了しました！よく頑張りました！");
            }
        } else {
            // 全ての問題（初回、間違えた問題も含む）が終了した場合
            endQuiz("全ての学習が終了しました！よく頑張りました！");
        }
    }
});

// --- 管理者モード関連の機能 ---

// 管理者モードボタンのイベントリスナー (プロンプト認証) 
enterAdminModeButton.addEventListener('click', () => {
    const password = prompt("管理者パスワードを入力してください:");
    if (password === ADMIN_PASSWORD) {
        isAdminMode = true;
        hideAllSections(); // 全てのセクションを隠す
        showAdminSection(); // 管理者セクションを表示
    } else if (password !== null) { // キャンセル時は何もしない
        alert("パスワードが異なります。");
    }
});

// 管理者セクションを表示
function showAdminSection() {
    hideAllSections(); // 全てのセクションを隠す
    adminSection.style.display = 'flex';
    renderQuestionList(); // 問題リストを最新に更新
    window.scrollTo(0, 0);
}

// 問題リストをレンダリング
function renderQuestionList() {
    questionList.innerHTML = '';
    if (allQuestions.length === 0) {
        const li = document.createElement('li');
        li.textContent = "登録されている問題はありません。";
        questionList.appendChild(li);
        return;
    }
    allQuestions.forEach(q => {
        const li = document.createElement('li');
        li.classList.add('question-item');
        li.innerHTML = `
            <span class="question-item-text">ID: ${q.id} - ${q.category}: ${q.question}</span>
            <button class="delete-button" data-id="${q.id}">削除</button>
        `;
        questionList.appendChild(li);
    });

    // 削除ボタンにイベントリスナーを追加
    document.querySelectorAll('.delete-button').forEach(button => {
        button.addEventListener('click', (event) => {
            const questionIdToDelete = parseInt(event.target.dataset.id);
            if (confirm(`ID: ${questionIdToDelete} の問題を本当に削除しますか？`)) {
                deleteQuestion(questionIdToDelete);
            }
        });
    });
}

// 問題を削除する
function deleteQuestion(idToDelete) {
    allQuestions = allQuestions.filter(q => q.id !== idToDelete);
    saveAllQuestionsToLocalStorage(); // ローカルストレージを更新
    // 間違えた問題リストからも削除（整合性を保つため）
    mistakenQuestions = mistakenQuestions.filter(q => q.id !== idToDelete);
    saveMistakenQuestions(); // ローカルストレージを更新
    renderQuestionList(); // リストを再レンダリング
    alert(`問題ID: ${idToDelete} を削除しました。`);
}

// 管理者モード中の「新しい問題を追加」ボタン
showAddQuestionFormButtonAdmin.addEventListener('click', () => {
    showAddQuestionForm(true); // 管理者モードとしてフォームを表示
});

// 管理者モード終了ボタン
exitAdminModeButton.addEventListener('click', () => {
    isAdminMode = false; // 管理者モードを解除
    hideAllSections(); // 全てのセクションを隠す
    initializeApp(); // アプリを初期状態に戻す
});


// 問題追加フォームの表示・初期化 (管理者用/ユーザー依頼用で兼用)
function showAddQuestionForm(forAdmin) {
    hideAllSections(); // 全てのセクションを隠す
    addQuestionFormSection.style.display = 'flex';
    
    // フォームの入力欄をクリア
    newQuestionText.value = '';
    newCorrectAnswer.value = '';
    newExplanation.value = '';
    newCategory.value = '計画';
    newOptionInputs.forEach(input => input.value = '');

    if (forAdmin) {
        addQuestionFormTitle.textContent = "新しい問題を追加 (管理者用)";
        addQuestionButton.textContent = "問題を追加する";
    } else {
        addQuestionFormTitle.textContent = "問題追加を依頼 (ユーザー用)";
        addQuestionButton.textContent = "問題追加を依頼する";
    }
    window.scrollTo(0, 0);
}


// 問題追加フォームから「キャンセル」ボタン
hideAddQuestionFormButton.addEventListener('click', () => {
    hideAllSections(); // 全てのセクションを隠す
    if (isAdminMode) {
        showAdminSection(); // 管理者モードなら問題管理画面に戻る
    } else {
        initializeApp(); // 通常ユーザーなら初期画面に戻る
    }
});


// 問題追加フォームから「問題を追加する」ボタン
addQuestionButton.addEventListener('click', async () => {
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

    const newQuestionData = {
        id: getNextQuestionId(), // IDは仮で生成
        question: question,
        correctAnswer: correctAnswer,
        explanation: explanation,
        category: category,
        options: options
    };

    if (isAdminMode) {
        // 管理者モードの場合、直接問題をallQuestionsに追加し、保存
        allQuestions.push(newQuestionData);
        saveAllQuestionsToLocalStorage();
        alert("問題が追加されました！");
        showAdminSection(); // 管理者モードの問題管理画面に戻る
    } else {
        // ユーザーからの依頼の場合
        alert("問題追加の依頼を送信しました！\n（実際にはこの内容が管理者に通知されます）\n\n依頼内容:\n" + 
              `問題: ${newQuestionData.question}\n` +
              `正解: ${newQuestionData.correctAnswer}\n` +
              `解説: ${newQuestionData.explanation}\n` +
              `カテゴリ: ${newQuestionData.category}\n` +
              `選択肢: ${newQuestionData.options.join(', ')}`);
        initializeApp(); // 初期画面に戻る
    }

    // フォームをクリア
    newQuestionText.value = '';
    newCorrectAnswer.value = '';
    newExplanation.value = '';
    newCategory.value = '計画';
    newOptionInputs.forEach(input => input.value = '');

    window.scrollTo(0, 0);
});

// --- ユーザーによる問題追加依頼機能 ---
showAddQuestionFormButtonUser.addEventListener('click', () => {
    isAdminMode = false; // ユーザーモードであることを明示
    showAddQuestionForm(false); // ユーザーモードとしてフォームを表示
});


// --- アプリ初期化 ---

async function initializeApp() {
    hideAllSections(); // まず全てのセクションを隠す
    isAdminMode = false; // 初期化時は必ずユーザーモード（管理者モードはボタンからのみ遷移）
    
    const hasQuestions = await loadAllQuestions(); // 全問題の読み込み
    
    if (hasQuestions) {
        showQuizSizeModal(); // 問題があれば問題数設定モーダルを表示
    } else {
        // 問題が読み込めなかった場合でも、フッターボタンは表示する
        alert("問題データの読み込みに失敗しました。管理者モードから問題を管理するか、問題追加を依頼してください。");
        // appFooterButtons.style.display = 'flex'; // この行はshowQuizSizeModal()内に移動
    }
    window.scrollTo(0, 0);
}

// 問題数設定モーダルを表示する関数
function showQuizSizeModal() {
    hideAllSections(); // 他のセクションが非表示であることを確認
    quizSizeModal.style.display = 'flex';
    // 問題数がallQuestions.lengthより多い場合は、allQuestions.lengthを上限とする
    initialQuizSizeInput.max = allQuestions.length;
    // デフォルト値を全問題数か10の少ない方に設定
    initialQuizSizeInput.value = Math.min(10, allQuestions.length);
    appFooterButtons.style.display = 'flex'; // ★この行が追加されたことを確認
}

// モーダルからクイズ開始ボタンのイベントリスナー
startQuizButton.addEventListener('click', () => {
    let size = parseInt(initialQuizSizeInput.value, 10);
    if (isNaN(size) || size <= 0) {
        alert("有効な問題数を入力してください。1以上の整数を入力してください。");
        return;
    }
    if (size > allQuestions.length) {
        size = allQuestions.length; // 全問題数を超えないように調整
        alert(`設定された問題数が全問題数(${allQuestions.length}問)を超えています。全問題数で開始します。`);
        initialQuizSizeInput.value = size; // 入力値を更新
    }
    startQuiz(size);
});

// アプリ起動
initializeApp();