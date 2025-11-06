export declare const generateOTP: () => string;
export declare const sendVerificationEmail: (email: string, password: string) => Promise<{
    success: boolean;
    user: import("@firebase/auth").User;
    error?: undefined;
} | {
    success: boolean;
    error: string;
    user?: undefined;
}>;
export declare const verifyOTP: (inputOTP: string, originalOTP: string) => boolean;
export declare const loginUser: (email: string, password: string) => Promise<{
    success: boolean;
    user: import("@firebase/auth").User;
    error?: undefined;
} | {
    success: boolean;
    error: string;
    user?: undefined;
}>;
export declare const verifyEmailWithCode: (code: string) => Promise<{
    success: boolean;
    error?: undefined;
} | {
    success: boolean;
    error: string;
}>;
