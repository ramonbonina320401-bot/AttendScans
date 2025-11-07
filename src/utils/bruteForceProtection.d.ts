type AttemptType = 'login' | 'password-change' | 'instructor-access-key';
export declare const isLockedOut: (identifier: string, type?: AttemptType) => {
    locked: boolean;
    remainingTime: number;
};
export declare const recordFailedAttempt: (identifier: string, type?: AttemptType) => {
    locked: boolean;
    attemptsLeft: number;
    lockoutUntil: number | null;
};
export declare const clearAttempts: (identifier: string, type?: AttemptType) => void;
export declare const getRemainingAttempts: (identifier: string, type?: AttemptType) => number;
export declare const formatRemainingTime: (seconds: number) => string;
export {};
