// script.js

// --- 定数定義 ---
const LOCAL_STORAGE_ALL_QUESTIONS_KEY = 'allQuestions';
const LOCAL_STORAGE_MISTAKEN_QUESTIONS_KEY = 'mistakenQuestions';
const GITHUB_QUESTIONS_JSON_PATH = 'questions.json';
const ADMIN_PASSWORD = 'Testcrafter'; // 管理者パスワード

// --- ヘルパー関数 ---
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

/**
 * QuestionManager クラス
 * 問題データのロード、保存、削除など、データ管理を担当
 * ※問題追加機能は削除されました。
 */
class QuestionManager {
    constructor() {
        this.allQuestions = [];
        this.mistakenQuestions = [];
    }

    async loadQuestions() {
        // 間違えた問題は別途ロード
        this.mistakenQuestions = this.loadMistakenQuestionsFromLocalStorage();

        const storedQuestions = this.loadAllQuestionsFromLocalStorage();
        if (storedQuestions) {
            this.allQuestions = storedQuestions;
            console.log("Local Storageから問題をロードしました。", this.allQuestions);
        } else {
            try {
                const response = await fetch(GITHUB_QUESTIONS_JSON_PATH);
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                const data = await response.json();
                this.allQuestions = data;
                this.saveAllQuestionsToLocalStorage(); // 初回ロード時にLocalStorageに保存
                console.log("GitHub Pagesから問題をロードしました。", this.allQuestions);
            } catch (error) {
                console.error("初期問題のロード中にエラーが発生しました:", error);
                // エラー時はダミーデータで続行することも検討
                this.allQuestions = [
                    {
                        "question": "JavaScriptで変数を宣言するキーワードとして適切でないものはどれ？",
                        "options": ["var", "let", "const", "set"],
                        "answer": "set",
                        "explanation": "JavaScriptでは`var`, `let`, `const`が変数を宣言するために使われます。`set`は変数の宣言には使いません。",
                        "category": "JavaScript"
                    },
                    {
                        "question": "HTMLの要素を非表示にするCSSプロパティはどれ？",
                        "options": ["visibility: hidden;", "display: none;", "opacity: 0;", "hidden: true;"],
                        "answer": "display: none;",
                        "explanation": "`display: none;`は要素を完全に削除し、スペースを占有しません。`visibility: hidden;`は要素を非表示にしますが、スペースは占有します。",
                        "category": "CSS"
                    }
                ];
                alert("初期問題のロードに失敗しました。アプリケーションを再読み込みするか、管理者モードで問題を確認してください。");
            }
        }
    }

    getAllQuestions() {
        return [...this.allQuestions]; // 参照渡しを防ぐためコピーを返す
    }

    // addQuestion メソッドは削除されました

    deleteQuestion(index) {
        if (index >= 0 && index < this.allQuestions.length) {
            this.allQuestions.splice(index, 1);
            this.saveAllQuestionsToLocalStorage();
            return true;
        }
        return false;
    }

    // ローカルストレージ関連のプライベートメソッド（クラス内部でのみ使用）
    loadAllQuestionsFromLocalStorage() {
        const data = localStorage.getItem(LOCAL_STORAGE_ALL_QUESTIONS_KEY);
        return data ? JSON.parse(data) : null;
    }

    saveAllQuestionsToLocalStorage() {
        localStorage.setItem(LOCAL_STORAGE_ALL_QUESTIONS_KEY, JSON.stringify(this.allQuestions));
    }

    loadMistakenQuestionsFromLocalStorage() {
        const data = localStorage.getItem(LOCAL_STORAGE_MISTAKEN_QUESTIONS_KEY);
        return data ? JSON.parse(data) : [];
    }

    saveMistakenQuestionsToLocalStorage(questions) {
        this.mistakenQuestions = questions; // 内部の状態も更新
        localStorage.setItem(LOCAL_STORAGE_MISTAKEN_QUESTIONS_KEY, JSON.stringify(this.mistakenQuestions));
    }

    getMistakenQuestions() {
        return [...this.mistakenQuestions];
    }

    clearMistakenQuestions() {
        this.mistakenQuestions = [];
        this.saveMistakenQuestionsToLocalStorage([]);
    }
}

/**
 * QuizApp クラス
 * アプリケーションのUI、クイズロジック、イベント処理を管理
 * ※問題追加機能は削除されました。
 */
class QuizApp {
    constructor() {
        this.questionManager = new QuestionManager(); // QuestionManagerのインスタンスを生成

        // --- DOM要素の取得 ---
        this.initialQuizCountModal = document.getElementById('quiz-size-modal');
        this.initialQuizCountInput = document.getElementById('initial-quiz-size-input');
        this.startQuizButtonModal = document.getElementById('start-quiz-button');
        this.quizSection = document.getElementById('quiz-section');
        this.questionText = document.getElementById('question-text');
        this.optionsContainer = document.getElementById('options-container');
        this.feedback = document.getElementById('feedback-text');
        this.nextQuestionButton = document.getElementById('submit-answer-button');
        this.skipQuestionButton = document.getElementById('skip-button');
        this.explanationContainer = document.getElementById('result-area');
        this.explanationText = document.getElementById('explanation-text');
        this.roundIndicator = document.getElementById('round-indicator');
        this.restartButton = document.getElementById('restart-quiz-button');
        this.adminModeButton = document.getElementById('admin-mode-button');
        this.adminPanel = document.getElementById('admin-panel');
        this.closeAdminPanelButton = document.getElementById('close-admin-panel-button');
        this.questionListDiv = document.getElementById('question-list');
        // 問題追加フォーム関連のDOM要素は削除
        this.backToQuizFromAdminButton = document.getElementById('back-to-quiz-from-admin-button');
        // 問題追加フォームからの戻るボタンは削除

        // 合計問題数表示用の要素も取得
        this.totalQuestionsCountSpan = document.getElementById('total-questions-count');

        // --- クイズ状態変数 ---
        this.currentQuizSet = [];
        this.currentQuestionIndex = 0;
        this.quizRound = 1;
        this.isQuizActive = false;
        this.initialQuizCount = 0;

        // イベントリスナーを初期化
        this.initEventListeners();
    }

    // アプリケーションの初期化処理
    async init() {
        await this.questionManager.loadQuestions(); // 問題データをロード
        this.totalQuestionsCountSpan.textContent = this.questionManager.getAllQuestions().length; // 合計問題数を表示
        this.initialQuizCountModal.style.display = 'flex'; // 初回問題数設定モーダルを表示
    }

    // すべてのイベントリスナーを設定するメソッド
    initEventListeners() {
        this.startQuizButtonModal.addEventListener('click', () => this.startQuiz());
        this.nextQuestionButton.addEventListener('click', () => this.nextQuestion());
        this.skipQuestionButton.addEventListener('click', () => this.skipQuestion());
        this.restartButton.addEventListener('click', () => this.restartQuiz());
        this.adminModeButton.addEventListener('click', () => this.enterAdminMode());
        this.closeAdminPanelButton.addEventListener('click', () => this.closeAdminPanel());
        // 問題追加フォーム関連のイベントリスナーは削除
        this.backToQuizFromAdminButton.addEventListener('click', () => this.backToQuiz());
        // 問題追加フォームからの戻るボタンのイベントリスナーは削除
    }

    // クイズを開始するメソッド
    startQuiz() {
        this.initialQuizCount = parseInt(this.initialQuizCountInput.value, 10);
        if (isNaN(this.initialQuizCount) || this.initialQuizCount <= 0) {
            alert("有効な問題数を入力してください。");
            return;
        }
        if (this.questionManager.getAllQuestions().length === 0) {
            alert("問題がありません。管理者モードで問題を確認してください。");
            return;
        }

        this.initialQuizCountModal.style.display = 'none';
        this.quizSection.style.display = 'block';
        // 「問題を追加」ボタンは削除されたため、表示ロジックも削除
        this.roundIndicator.style.display = 'block';
        this.adminPanel.style.display = 'none'; // 管理者パネルを非表示に
        // 問題追加フォームセクションは削除

        this.isQuizActive = true;
        this.quizRound = 1;
        this.questionManager.clearMistakenQuestions(); // 間違えた問題を初期化
        this.currentQuestionIndex = 0;

        // 初回は全問題から指定された数だけ出題
        this.currentQuizSet = shuffleArray(this.questionManager.getAllQuestions()).slice(0, this.initialQuizCount);
        this.displayQuestion();
    }

    // 現在の問題をUIに表示するメソッド
    displayQuestion() {
        this.clearOptionSelection();
        this.feedback.textContent = '';
        this.explanationContainer.style.display = 'none';
        this.nextQuestionButton.style.display = 'none';
        this.skipQuestionButton.style.display = 'inline-block'; // スキップボタンを表示

        if (this.currentQuestionIndex < this.currentQuizSet.length) {
            const question = this.currentQuizSet[this.currentQuestionIndex];
            this.questionText.textContent = question.question;
            this.optionsContainer.innerHTML = '';
            shuffleArray([...question.options]).forEach(option => {
                const button = document.createElement('button');
                button.textContent = option;
                button.classList.add('option-button'); // CSSクラスを追加
                button.addEventListener('click', () => this.selectOption(button, option, question));
                this.optionsContainer.appendChild(button);
            });
            this.updateRoundIndicator();
        } else {
            // 全問終了
            this.endQuizRound();
        }
    }

    // 選択肢が選ばれた際の処理
    selectOption(selectedButton, selectedAnswer, question) {
        this.optionsContainer.querySelectorAll('button').forEach(button => {
            button.disabled = true; // 他のボタンを無効化
        });

        let mistakenQuestions = this.questionManager.getMistakenQuestions(); // ここで取得
        if (selectedAnswer === question.answer) {
            selectedButton.classList.add('correct');
            this.feedback.textContent = '正解！';
        } else {
            selectedButton.classList.add('incorrect');
            this.feedback.textContent = '不正解！';
            if (!mistakenQuestions.some(q => q.question === question.question)) {
                mistakenQuestions.push(question);
                this.questionManager.saveMistakenQuestionsToLocalStorage(mistakenQuestions); // 更新して保存
            }
            // 正解のオプションをハイライト
            this.optionsContainer.querySelectorAll('button').forEach(button => {
                if (button.textContent === question.answer) {
                    button.classList.add('correct');
                }
            });
        }

        this.explanationText.textContent = question.explanation;
        this.explanationContainer.style.display = 'block';
        this.nextQuestionButton.style.display = 'inline-block';
        this.skipQuestionButton.style.display = 'none'; // 解答したらスキップボタンを非表示
    }

    // 次の問題へ進む
    nextQuestion() {
        this.currentQuestionIndex++;
        this.displayQuestion();
    }

    // 問題をスキップする
    skipQuestion() {
        const question = this.currentQuizSet[this.currentQuestionIndex];
        let mistakenQuestions = this.questionManager.getMistakenQuestions(); // ここで取得
        if (!mistakenQuestions.some(q => q.question === question.question)) {
            mistakenQuestions.push(question);
            this.questionManager.saveMistakenQuestionsToLocalStorage(mistakenQuestions); // 更新して保存
        }
        // スキップした場合は不正解として扱い、正解を表示
        this.optionsContainer.querySelectorAll('button').forEach(button => {
            button.disabled = true; // 他のボタンを無効化
            if (button.textContent === question.answer) {
                button.classList.add('correct');
            }
        });
        this.feedback.textContent = 'スキップしました (不正解として記録)';
        this.explanationText.textContent = question.explanation;
        this.explanationContainer.style.display = 'block';
        this.nextQuestionButton.style.display = 'inline-block';
        this.skipQuestionButton.style.display = 'none'; // 解答したらスキップボタンを非表示
    }

    // クイズの1周が終了した際の処理
    endQuizRound() {
        let mistakenQuestions = this.questionManager.getMistakenQuestions(); // ここで取得
        if (mistakenQuestions.length > 0) {
            alert(`${this.quizRound}周目終了！間違えた問題が${mistakenQuestions.length}問あります。もう一度挑戦しましょう！`);
            this.quizRound++;
            this.currentQuizSet = shuffleArray([...mistakenQuestions]); // 間違えた問題のみで次の周回
            this.questionManager.clearMistakenQuestions(); // 間違えた問題をリセット
            this.currentQuestionIndex = 0;
            this.displayQuestion();
        } else {
            alert("全問正解です！おめでとうございます！");
            this.restartQuiz(); // 全問正解の場合は再スタートと同じUIへ
        }
    }

    // クイズを再スタートする
    restartQuiz() {
        this.isQuizActive = false;
        this.quizSection.style.display = 'none';
        this.initialQuizCountModal.style.display = 'flex'; // 最初に戻る
        // 「問題を追加」ボタンは削除されたため、表示ロジックも削除
        this.roundIndicator.style.display = 'none';
        this.questionManager.clearMistakenQuestions(); // リスタート時に間違えた問題もクリア
        this.totalQuestionsCountSpan.textContent = this.questionManager.getAllQuestions().length; // 合計問題数を再表示
    }

    // --- 管理者モード関連 ---
    // 管理者モードに入る
    enterAdminMode() {
        const password = prompt("管理者モードに入るにはパスワードを入力してください:");
        if (password === ADMIN_PASSWORD) {
            this.adminPanel.style.display = 'block';
            this.quizSection.style.display = 'none';
            this.initialQuizCountModal.style.display = 'none';
            // 「問題を追加」ボタンは削除されたため、表示ロジックも削除
            // 問題追加フォームセクションは削除
            this.roundIndicator.style.display = 'none';
            this.displayQuestionList(); // 問題リストを表示
        } else if (password !== null) { // キャンセルボタンでnullが返るのを避ける
            alert("パスワードが違います。");
        }
    }

    // 管理者パネルを閉じる
    closeAdminPanel() {
        this.adminPanel.style.display = 'none';
        this.backToQuiz(); // 元の画面に戻る
    }

    // 問題リストを表示する
    displayQuestionList() {
        this.questionListDiv.innerHTML = '';
        const allQuestions = this.questionManager.getAllQuestions();
        if (allQuestions.length === 0) {
            this.questionListDiv.innerHTML = '<p>問題がまだありません。</p>';
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
            this.questionListDiv.appendChild(questionItem);
        });

        document.querySelectorAll('.delete-button').forEach(button => {
            button.addEventListener('click', (event) => {
                const indexToDelete = parseInt(event.target.dataset.index, 10);
                this.deleteQuestion(indexToDelete);
            });
        });
    }

    // 問題を削除する
    deleteQuestion(index) {
        const allQuestions = this.questionManager.getAllQuestions();
        if (confirm(`本当にQ${index + 1}: 「${allQuestions[index].question}」を削除しますか？`)) {
            if (this.questionManager.deleteQuestion(index)) { // QuestionManagerに削除を依頼
                alert("問題が削除されました。");
                this.displayQuestionList(); // リストを更新
                this.totalQuestionsCountSpan.textContent = this.questionManager.getAllQuestions().length; // 合計問題数を更新
            } else {
                alert("問題の削除に失敗しました。");
            }
        }
    }

    // 問題追加フォーム関連のメソッドはすべて削除されました
    // showAddQuestionForm, closeAddQuestionForm, handleAddQuestionSubmit, handleRequestAddQuestion

    // --- UI表示切り替え共通処理 ---
    // クイズまたは初期画面に戻る共通処理
    backToQuiz() {
        if (this.isQuizActive) {
            this.quizSection.style.display = 'block';
            // 「問題を追加」ボタンは削除されたため、表示ロジックも削除
            this.roundIndicator.style.display = 'block';
        } else {
            this.initialQuizCountModal.style.display = 'flex';
            // 「問題を追加」ボタンは削除されたため、表示ロジックも削除
            this.roundIndicator.style.display = 'none';
        }
        this.totalQuestionsCountSpan.textContent = this.questionManager.getAllQuestions().length; // 合計問題数を更新
    }

    // 選択肢の表示をクリアする（スタイルと無効化の解除）
    clearOptionSelection() {
        this.optionsContainer.querySelectorAll('button').forEach(button => {
            button.classList.remove('selected', 'correct', 'incorrect');
            button.disabled = false;
        });
    }

    // 周回数と進捗表示を更新する
    updateRoundIndicator() {
        this.roundIndicator.textContent = `${this.quizRound}周目 (${this.currentQuestionIndex + 1}/${this.currentQuizSet.length})`;
    }
}

// アプリケーションのエントリポイント
// DOMContentLoadedイベントが発生したら、QuizAppのインスタンスを作成し、初期化処理を開始します。
document.addEventListener('DOMContentLoaded', () => {
    const app = new QuizApp();
    app.init();
});