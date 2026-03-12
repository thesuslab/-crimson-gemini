export { };

declare global {
    interface Window {
        api: {
            triggerShutter: () => Promise<{ success: boolean }>;
            savePhoto: (dataUrl: string) => Promise<{ success: boolean; filePath?: string }>;
            log: (message: string) => void;
            chooseSaveDir: () => Promise<{ dir: string }>;
            getSaveDir: () => Promise<{ dir: string }>;
        };
    }
}
