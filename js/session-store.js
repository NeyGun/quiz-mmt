(function() {
    const GUEST_ID_KEY = 'quiz-mmt:guest-id';
    const SESSION_KEY_PREFIX = 'quiz-mmt:session:';
    const SESSION_TTL_MS = 10 * 24 * 60 * 60 * 1000;

    function createId() {
        if (typeof crypto.randomUUID === 'function') {
            return crypto.randomUUID();
        }

        const bytes = new Uint8Array(16);
        crypto.getRandomValues(bytes);
        return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
    }

    function createSession(guestId) {
        return {
            guestId,
            sessionId: createId(),
            expiresAt: Date.now() + SESSION_TTL_MS,
            chapter: '',
            autoCheck: true,
            answersByQuestion: {}
        };
    }

    function getGuestId() {
        let guestId = localStorage.getItem(GUEST_ID_KEY);
        if (!guestId) {
            guestId = createId();
            localStorage.setItem(GUEST_ID_KEY, guestId);
        }
        return guestId;
    }

    function getSessionKey(guestId) {
        return `${SESSION_KEY_PREFIX}${guestId}`;
    }

    function load() {
        const guestId = getGuestId();
        const sessionKey = getSessionKey(guestId);
        const rawSession = localStorage.getItem(sessionKey);

        if (!rawSession) {
            const session = createSession(guestId);
            localStorage.setItem(sessionKey, JSON.stringify(session));
            return session;
        }

        let storedSession;
        try {
            storedSession = JSON.parse(rawSession);
        } catch (error) {
            throw new Error('Dữ liệu phiên lưu trên thiết bị không hợp lệ.', { cause: error });
        }

        if (!storedSession || !Number.isFinite(storedSession.expiresAt) || typeof storedSession.sessionId !== 'string') {
            throw new Error('Dữ liệu phiên lưu trên thiết bị không hợp lệ.');
        }

        if (storedSession.expiresAt <= Date.now()) {
            const session = createSession(guestId);
            localStorage.setItem(sessionKey, JSON.stringify(session));
            return session;
        }

        const session = {
            ...storedSession,
            guestId,
            expiresAt: Date.now() + SESSION_TTL_MS,
            answersByQuestion: storedSession.answersByQuestion && typeof storedSession.answersByQuestion === 'object'
                ? storedSession.answersByQuestion
                : {}
        };
        localStorage.setItem(sessionKey, JSON.stringify(session));
        return session;
    }

    function save(session) {
        const updatedSession = {
            ...session,
            expiresAt: Date.now() + SESSION_TTL_MS
        };
        localStorage.setItem(getSessionKey(updatedSession.guestId), JSON.stringify(updatedSession));
        return updatedSession;
    }

    window.QuizSessionStore = { load, save, ttlMs: SESSION_TTL_MS };
})();
