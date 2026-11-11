const quizData = window.quizData;
const sessionStatus = document.getElementById('session-status');
let session;

try {
    session = window.QuizSessionStore.load();
} catch (error) {
    sessionStatus.classList.add('session-status-error');
    sessionStatus.textContent = 'Không thể đọc phiên lưu trên thiết bị này. Tiến độ có thể không được lưu.';
    throw error;
}

function updateSessionStatus() {
    const guestLabel = session.guestId.slice(0, 8);
    const sessionLabel = session.sessionId.slice(0, 8);
    sessionStatus.classList.remove('session-status-error');
    sessionStatus.textContent = `Đã lưu trên thiết bị này · Guest ID: ${guestLabel} · Phiên: ${sessionLabel} · hết hạn sau 10 ngày không hoạt động`;
    sessionStatus.title = `Guest ID: ${session.guestId}\nSession ID: ${session.sessionId}`;
}

// DOM Elements
    const chapterSelect = document.getElementById('chapter-select');
    const autoCheckToggle = document.getElementById('auto-check-toggle');
    const questionsList = document.getElementById('questions-list');
    const chapterBanner = document.getElementById('chapter-banner');
    const chapterTitle = document.getElementById('chapter-title');
    const chapterTotalQ = document.getElementById('chapter-total-q');
    const chapterDoneQ = document.getElementById('chapter-done-q');
    const chapterCorrectQ = document.getElementById('chapter-correct-q');
    const chapterWrongQ = document.getElementById('chapter-wrong-q');
    const chapterAccuracy = document.getElementById('chapter-accuracy');
    const progressFill = document.getElementById('progress-fill');
    const btnResetChapter = document.getElementById('btn-reset-chapter');
    const btnShowAllAnswers = document.getElementById('btn-show-all-answers');
    const badgeTotalQuestions = document.getElementById('badge-total-questions');

    // State
    let activeQuestions = [];
    let userAnswers = {}; // { qIndex: { selected: number, checked: boolean, isCorrect: boolean } }

    function persistSession() {
        const answersByQuestion = { ...session.answersByQuestion };
        activeQuestions.forEach((question, index) => {
            if (userAnswers[index]) {
                answersByQuestion[question.answerKey] = { ...userAnswers[index] };
            } else {
                delete answersByQuestion[question.answerKey];
            }
        });

        try {
            session = window.QuizSessionStore.save({
                ...session,
                chapter: chapterSelect.value,
                autoCheck: autoCheckToggle.checked,
                answersByQuestion
            });
            updateSessionStatus();
        } catch (error) {
            sessionStatus.classList.add('session-status-error');
            sessionStatus.textContent = 'Không thể lưu tiến độ. Hãy kiểm tra dung lượng lưu trữ của trình duyệt.';
            console.error('Không thể lưu phiên làm bài:', error);
        }
    }

    // Tính tổng số câu toàn bộ ngân hàng
    let grandTotalQuestions = 0;
    for (const ch in quizData) {
        grandTotalQuestions += quizData[ch].length;
    }
    badgeTotalQuestions.textContent = `${grandTotalQuestions} Câu hỏi toàn bộ`;

    // Nạp các chương vào Select box, hiển thị kèm TỔNG SỐ CÂU HỎI của mỗi chương
    for (const chapter in quizData) {
        const count = quizData[chapter].length;
        const option = document.createElement('option');
        option.value = chapter;
        // Hiển thị rõ tổng câu hỏi của mỗi phần theo yêu cầu người dùng
        option.textContent = `${chapter} (${count} câu)`;
        chapterSelect.appendChild(option);
    }

    autoCheckToggle.checked = session.autoCheck !== false;
    if (session.chapter === 'ALL' || Object.prototype.hasOwnProperty.call(quizData, session.chapter)) {
        chapterSelect.value = session.chapter;
    } else {
        session.chapter = '';
    }
    updateSessionStatus();

    // Sự kiện khi người dùng chọn chương
    chapterSelect.addEventListener('change', function() {
        const selectedValue = this.value;
        session.chapter = selectedValue;
        if (!selectedValue) {
            chapterBanner.style.display = "none";
            questionsList.innerHTML = `
                <div class="empty-placeholder">
                    <svg viewBox="0 0 24 24">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>
                    </svg>
                    <p>Vui lòng chọn một chương ở menu phía trên để bắt đầu luyện tập câu hỏi trắc nghiệm!</p>
                </div>
            `;
            activeQuestions = [];
            userAnswers = {};
            persistSession();
            return;
        }

        if (selectedValue === "ALL") {
            // Gộp tất cả các câu hỏi
            activeQuestions = [];
            for (const ch in quizData) {
                quizData[ch].forEach((q, idx) => {
                    activeQuestions.push({ ...q, sectionName: ch, answerKey: `${ch}:${idx}` });
                });
            }
            chapterTitle.textContent = "🌟 Toàn Bộ Ngân Hàng Câu Hỏi (Tổng hợp tất cả 8 chương)";
        } else {
            activeQuestions = quizData[selectedValue].map((q, idx) => ({
                ...q,
                sectionName: selectedValue,
                answerKey: `${selectedValue}:${idx}`
            }));
            chapterTitle.textContent = selectedValue;
        }

        userAnswers = {};
        activeQuestions.forEach((question, index) => {
            const answer = session.answersByQuestion[question.answerKey];
            if (answer) userAnswers[index] = { ...answer };
        });
        renderQuestions();
        updateStats();
        chapterBanner.style.display = "block";
        persistSession();
    });

    autoCheckToggle.addEventListener('change', persistSession);

    // Render danh sách câu hỏi
    function renderQuestions() {
        questionsList.innerHTML = "";

        activeQuestions.forEach((qObj, index) => {
            const block = document.createElement('div');
            block.className = 'question-block';
            block.id = `qblock-${index}`;

            // Meta info (số thứ tự + badge chương nếu xem ALL)
            const metaDiv = document.createElement('div');
            metaDiv.className = 'question-meta';

            const numSpan = document.createElement('span');
            numSpan.className = 'question-num';
            numSpan.textContent = `Câu ${index + 1} / ${activeQuestions.length}`;
            metaDiv.appendChild(numSpan);

            if (chapterSelect.value === "ALL" && qObj.sectionName) {
                const secBadge = document.createElement('span');
                secBadge.className = 'badge badge-neutral';
                secBadge.style.fontSize = '11px';
                secBadge.style.padding = '3px 8px';
                secBadge.textContent = qObj.sectionName.split(':')[0];
                metaDiv.appendChild(secBadge);
            }

            block.appendChild(metaDiv);

            // Nội dung câu hỏi
            const title = document.createElement('div');
            title.className = 'question-title';
            title.textContent = qObj.q;
            block.appendChild(title);

            // Danh sách đáp án
            const optionsDiv = document.createElement('div');
            optionsDiv.className = 'options';

            qObj.options.forEach((opt, optIndex) => {
                const label = document.createElement('label');
                label.className = 'option-label';
                label.id = `label-${index}-${optIndex}`;

                const radio = document.createElement('input');
                radio.type = 'radio';
                radio.name = `question-${index}`;
                radio.value = optIndex;

                // Khi click vào lựa chọn
                radio.addEventListener('change', () => {
                    handleOptionSelect(index, optIndex);
                });

                const textSpan = document.createElement('span');
                textSpan.className = 'option-text';
                textSpan.innerHTML = `<strong>${String.fromCharCode(65 + optIndex)}.</strong> ${escapeHtml(opt)}`;

                label.appendChild(radio);
                label.appendChild(textSpan);
                optionsDiv.appendChild(label);
            });

            block.appendChild(optionsDiv);

            // Nút bấm tương tác
            const actionsDiv = document.createElement('div');
            actionsDiv.className = 'question-actions';

            const checkBtn = document.createElement('button');
            checkBtn.type = 'button';
            checkBtn.className = 'btn-check';
            checkBtn.textContent = 'Kiểm tra đáp án';
            checkBtn.onclick = () => checkAnswer(index);
            actionsDiv.appendChild(checkBtn);

            const showBtn = document.createElement('button');
            showBtn.type = 'button';
            showBtn.className = 'btn-show';
            showBtn.textContent = '👁️ Hiện đáp án';
            showBtn.onclick = () => revealAnswer(index);
            actionsDiv.appendChild(showBtn);

            const resetBtn = document.createElement('button');
            resetBtn.type = 'button';
            resetBtn.className = 'btn-reset-q';
            resetBtn.textContent = 'Làm lại câu này';
            resetBtn.onclick = () => resetQuestion(index);
            actionsDiv.appendChild(resetBtn);

            block.appendChild(actionsDiv);

            // Khung thông báo kết quả tức thì
            const resultDiv = document.createElement('div');
            resultDiv.className = 'result-box';
            resultDiv.id = `result-${index}`;
            block.appendChild(resultDiv);

            questionsList.appendChild(block);
        });

        activeQuestions.forEach((_, index) => {
            const answer = userAnswers[index];
            if (!answer) return;

            if (Number.isInteger(answer.selected)) {
                const radio = document.querySelector(`input[name="question-${index}"][value="${answer.selected}"]`);
                if (radio) radio.checked = true;
            }

            if (answer.checked) {
                checkAnswer(index, false);
            } else if (answer.revealed) {
                revealAnswer(index, false);
            }
        });
    }

    // Xử lý khi người dùng chọn 1 option
    function handleOptionSelect(qIndex, selectedOptIndex) {
        if (!userAnswers[qIndex]) {
            userAnswers[qIndex] = {};
        }
        userAnswers[qIndex].selected = selectedOptIndex;

        // Nếu đang bật chế độ tự động hiện kết quả ngay lập tức
        if (autoCheckToggle.checked) {
            checkAnswer(qIndex);
        } else {
            persistSession();
        }
    }

    // Kiểm tra và hiển thị đáp án cho TỪNG CÂU HỎI
    function checkAnswer(qIndex, shouldPersist = true) {
        const qObj = activeQuestions[qIndex];
        const correctAns = qObj.ans;
        const selectedRadio = document.querySelector(`input[name="question-${qIndex}"]:checked`);
        const resultDiv = document.getElementById(`result-${qIndex}`);
        const block = document.getElementById(`qblock-${qIndex}`);

        if (!selectedRadio) {
            resultDiv.className = 'result-box warning show';
            resultDiv.innerHTML = `⚠️ <strong>Vui lòng chọn một đáp án</strong> (A, B, C hoặc D) trước khi kiểm tra!`;
            return;
        }

        const selectedVal = parseInt(selectedRadio.value);
        const isCorrect = (selectedVal === correctAns);

        userAnswers[qIndex] = {
            ...userAnswers[qIndex],
            selected: selectedVal,
            checked: true,
            isCorrect: isCorrect
        };

        // Reset highlights cũ của câu này
        for (let i = 0; i < qObj.options.length; i++) {
            const lbl = document.getElementById(`label-${qIndex}-${i}`);
            lbl.classList.remove('ans-correct', 'ans-wrong');
            const oldTag = lbl.querySelector('.tag-badge');
            if (oldTag) oldTag.remove();
        }

        // Highlight đáp án đúng bằng màu xanh lá
        const correctLabel = document.getElementById(`label-${qIndex}-${correctAns}`);
        correctLabel.classList.add('ans-correct');
        const correctTag = document.createElement('span');
        correctTag.className = 'tag-badge tag-correct';
        correctTag.textContent = '✔ Đáp án chính xác';
        correctLabel.appendChild(correctTag);

        const correctLetter = String.fromCharCode(65 + correctAns);
        const correctText = qObj.options[correctAns];

        if (isCorrect) {
            block.className = 'question-block state-correct';
            resultDiv.className = 'result-box correct show';
            resultDiv.innerHTML = `
                🎉 <strong>Chính xác!</strong> Đáp án đúng là <strong>${correctLetter}:</strong> ${escapeHtml(correctText)}
            `;
        } else {
            // Highlight đáp án sai người dùng đã chọn bằng màu đỏ
            const selectedLabel = document.getElementById(`label-${qIndex}-${selectedVal}`);
            selectedLabel.classList.add('ans-wrong');
            const chosenTag = document.createElement('span');
            chosenTag.className = 'tag-badge tag-chosen';
            chosenTag.textContent = '✖ Lựa chọn của bạn';
            selectedLabel.appendChild(chosenTag);

            block.className = 'question-block state-wrong';
            resultDiv.className = 'result-box incorrect show';
            resultDiv.innerHTML = `
                ❌ <strong>Chưa chính xác!</strong> Bạn chọn <strong>${String.fromCharCode(65 + selectedVal)}</strong>. Đáp án đúng phải là <strong>${correctLetter}:</strong> ${escapeHtml(correctText)}
            `;
        }

        updateStats();
        if (shouldPersist) persistSession();
    }

    // Hiển thị trực tiếp đáp án đúng mà không cần chọn
    function revealAnswer(qIndex, shouldPersist = true) {
        const qObj = activeQuestions[qIndex];
        const correctAns = qObj.ans;
        const resultDiv = document.getElementById(`result-${qIndex}`);
        const block = document.getElementById(`qblock-${qIndex}`);

        // Reset highlights
        for (let i = 0; i < qObj.options.length; i++) {
            const lbl = document.getElementById(`label-${qIndex}-${i}`);
            lbl.classList.remove('ans-correct', 'ans-wrong');
            const oldTag = lbl.querySelector('.tag-badge');
            if (oldTag) oldTag.remove();
        }

        const correctLabel = document.getElementById(`label-${qIndex}-${correctAns}`);
        correctLabel.classList.add('ans-correct');
        const correctTag = document.createElement('span');
        correctTag.className = 'tag-badge tag-correct';
        correctTag.textContent = '✔ Đáp án chính xác';
        correctLabel.appendChild(correctTag);

        block.className = 'question-block state-correct';
        resultDiv.className = 'result-box correct show';
        resultDiv.innerHTML = `
            💡 <strong>Đáp án đúng là:</strong> <strong>${String.fromCharCode(65 + correctAns)}:</strong> ${escapeHtml(qObj.options[correctAns])}
        `;
        userAnswers[qIndex] = { ...userAnswers[qIndex], revealed: true };
        if (shouldPersist) persistSession();
    }

    // Reset làm lại 1 câu hỏi
    function resetQuestion(qIndex) {
        const qObj = activeQuestions[qIndex];
        const block = document.getElementById(`qblock-${qIndex}`);
        const resultDiv = document.getElementById(`result-${qIndex}`);

        block.className = 'question-block';
        resultDiv.className = 'result-box';
        resultDiv.innerHTML = '';

        const radios = document.querySelectorAll(`input[name="question-${qIndex}"]`);
        radios.forEach(r => r.checked = false);

        for (let i = 0; i < qObj.options.length; i++) {
            const lbl = document.getElementById(`label-${qIndex}-${i}`);
            lbl.classList.remove('ans-correct', 'ans-wrong');
            const oldTag = lbl.querySelector('.tag-badge');
            if (oldTag) oldTag.remove();
        }

        delete userAnswers[qIndex];
        updateStats();
        persistSession();
    }

    // Cập nhật thanh tiến độ và số liệu thống kê
    function updateStats() {
        const total = activeQuestions.length;
        chapterTotalQ.textContent = total;

        let doneCount = 0;
        let correctCount = 0;
        let wrongCount = 0;

        for (const idx in userAnswers) {
            if (userAnswers[idx].checked) {
                doneCount++;
                if (userAnswers[idx].isCorrect) {
                    correctCount++;
                } else {
                    wrongCount++;
                }
            }
        }

        chapterDoneQ.textContent = doneCount;
        chapterCorrectQ.textContent = correctCount;
        chapterWrongQ.textContent = wrongCount;

        const accuracy = doneCount > 0 ? Math.round((correctCount / doneCount) * 100) : 0;
        chapterAccuracy.textContent = `${accuracy}%`;

        const progressPercent = total > 0 ? Math.round((doneCount / total) * 100) : 0;
        progressFill.style.width = `${progressPercent}%`;
    }

    // Nút Hiện tất cả đáp án của chương
    btnShowAllAnswers.addEventListener('click', function() {
        if (activeQuestions.length === 0) return;
        if (confirm("Bạn có muốn hiển thị đáp án đúng của tất cả các câu hỏi trong phần này không?")) {
            activeQuestions.forEach((_, idx) => revealAnswer(idx, false));
            persistSession();
        }
    });

    // Nút Làm lại cả chương
    btnResetChapter.addEventListener('click', function() {
        if (activeQuestions.length === 0) return;
        if (confirm("Bạn có chắc chắn muốn làm lại từ đầu phần này không?")) {
            userAnswers = {};
            renderQuestions();
            updateStats();
            persistSession();
            window.scrollTo({ top: chapterBanner.offsetTop - 20, behavior: 'smooth' });
        }
    });

    // Helper escape html
    function escapeHtml(str) {
        if (!str) return '';
        return str
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    if (chapterSelect.value) {
        chapterSelect.dispatchEvent(new Event('change'));
    }
